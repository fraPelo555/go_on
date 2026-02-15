<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import dayjs from "dayjs";

/* =========================
   SERVICES
   ========================= */
import { getTrails } from "../services/trailService";
import { getUsers, getFavourites } from "../services/userService";
import { getAllReports } from "../services/reportService";
import { getAllFeedbacks } from "../services/feedbackService";

/* =========================
   AUTH / ADMIN GUARD
   ========================= */
const router = useRouter();
const username = ref(localStorage.getItem("username") || "");
const userId = localStorage.getItem("userId");
const isAdmin = localStorage.getItem("isAdmin");

const isAuthorized = ref(false);
const authError = ref("");

const checkAdminAccess = () => {
  if (!userId || !localStorage.getItem("token")) {
    authError.value = "Devi essere loggato per accedere a questa pagina.";
    return;
  }
  if (isAdmin !== "true") {
    authError.value = "Accesso negato: permessi amministratore richiesti.";
    return;
  }
  isAuthorized.value = true;
};

/* =========================
   STATISTICHE
   ========================= */
const stats = ref({
  totalRoutes: 0,
  createdMonth: 0,
  modifiedMonth: 0,
  users: 0,
  usersMonth: 0,
  avgRating: 0,
  gpxPercent: 0,
  photoPercent: 0
});

const mostCommented = ref([]);
const mostViewed = ref([]);
const mostReported = ref([]);
const tags = ref([]);

/* =========================
   LOAD STATISTICHE
   ========================= */
const unwrap = (res) => {
  // normalizza le risposte axios / oggetti vari in un array
  if (!res) return [];
  if (Array.isArray(res)) return res;
  const d = res.data ?? res;
  if (Array.isArray(d)) return d;
  // cerca la prima proprietà che sia un array (es. { users: [...] } )
  const arr = Object.values(d).find(v => Array.isArray(v));
  return Array.isArray(arr) ? arr : [];
};

const loadStatistics = async () => {
  try {
    // 1) TRAILS (sempre prima, ci servono per tag/mostViewed)
    const trailsRes = await getTrails();
    const trailsData = unwrap(trailsRes);
    stats.value.totalRoutes = trailsData.length;

    // tag più usati
    const tagCount = {};
    trailsData.forEach(t => t.tags?.forEach(tag => {
      tagCount[tag] = (tagCount[tag] || 0) + 1;
    }));
    tags.value = Object.entries(tagCount)
      .sort((a,b) => b[1]-a[1])
      .slice(0,6)
      .map(([tag]) => tag);

    // most viewed (NON mutiamo trailsData: facciamo slice())
    mostViewed.value = trailsData
      .slice()
      .sort((a,b) => (b.views || 0) - (a.views || 0))
      .slice(0,4)
      .map(t => t.title || t.name || t._id);

    const lastMonth = dayjs().subtract(1, "month");

    stats.value.createdMonth = trailsData.filter(t =>
      t.createdAt && dayjs(t.createdAt).isAfter(lastMonth)
    ).length;

    stats.value.modifiedMonth = trailsData.filter(t =>
      t.updatedAt && dayjs(t.updatedAt).isAfter(lastMonth)
    ).length;

    const trailsWithGPX = trailsData.filter(t => t.gpxFile).length;
    stats.value.gpxPercent = trailsData.length ? Math.round((trailsWithGPX / trailsData.length) * 100) : 0;

    const trailsWithPhotos = trailsData.filter(t => (t.photos?.length || 0) > 0).length;
    stats.value.photoPercent = trailsData.length ? Math.round((trailsWithPhotos / trailsData.length) * 100) : 0;

    // 2) Carichiamo in parallelo users, feedbacks, reports
    const [usersRes, feedbackRes, reportsRes] = await Promise.all([
      getUsers().catch(e => { console.warn("getUsers error", e); return null; }),
      getAllFeedbacks().catch(e => { console.warn("getAllFeedbacks error", e); return null; }),
      getAllReports().catch(e => { console.warn("getAllReports error", e); return null; })
    ]);

    const usersData = unwrap(usersRes);
    const feedbackData = unwrap(feedbackRes);
    const reportsData = unwrap(reportsRes);

    stats.value.users = usersData.length;
    stats.value.usersMonth = usersData.filter(u => u.createdAt && dayjs(u.createdAt).isAfter(lastMonth)).length;

    // feedback: media e conteggio per trail
    stats.value.avgRating = feedbackData.length
      ? Math.round(feedbackData.reduce((sum,f) => sum + (Number(f.valutazione) || 0), 0) / feedbackData.length)
      : 0;

    const feedbackCount = {};
    feedbackData.forEach(f => {
      const idTrail = f.idTrail?._id || f.idTrail; // populate -> idTrail è oggetto
      if (!idTrail) return;
      feedbackCount[idTrail] = (feedbackCount[idTrail] || 0) + 1;
    });
    mostCommented.value = Object.entries(feedbackCount)
      .sort((a,b) => b[1]-a[1])
      .slice(0,4)
      .map(([trailId]) => {
        const t = trailsData.find(tr => tr._id === trailId || tr.id === trailId);
        return t?.title || t?.name || trailId;
      });


    // reports: conteggio per trail
    const reportCount = {};
    reportsData.forEach(r => {
      const idTrail = r.idTrail ?? r.trailId ?? r.trail;
      if (!idTrail) return;
      reportCount[idTrail] = (reportCount[idTrail] || 0) + 1;
    });
    mostReported.value = Object.entries(reportCount)
      .sort((a,b) => b[1]-a[1])
      .slice(0,4)
      .map(([trailId]) => {
        const t = trailsData.find(tr => tr._id === trailId || tr.id === trailId);
        return t?.title || t?.name || trailId;
      });

    // 3) SENTIERI INTERAGITI: feedback OR report OR preferiti
    // Recuperiamo preferiti per ogni utente (ma non falliamo se qualche chiamata va in errore)
    const favPromises = usersData.map(u => getFavourites(u._id).catch(e => { console.warn("fav error for user", u._id, e); return null; }));
    const favResults = await Promise.all(favPromises);

    // normalizziamo gli id dei trail preferiti
    const favTrailIds = new Set();
    favResults.forEach(res => {
      const list = unwrap(res); // array di oggetti (spesso sono i trail)
      list.forEach(item => {
        // prova varie proprietà possibili per ricavare l'id del trail
        const tid = item.idTrail ?? item._id ?? item.id ?? item.trailId;
        if (tid) favTrailIds.add(tid);
        // se l'API ritorna direttamente i trail (es. { _id, title }), usiamo _id
        else if (item._id) favTrailIds.add(item._id);
      });
    });

    const interagitiSet = new Set();
    trailsData.forEach(t => {
      const id = t._id ?? t.id;
      if (!id) return;
      if (feedbackCount[id] || reportCount[id] || favTrailIds.has(id)) interagitiSet.add(id);
    });
    stats.value.interactedPercent = trailsData.length ? Math.round((interagitiSet.size / trailsData.length) * 100) : 0;

  } catch (e) {
    console.error("Errore caricamento statistiche:", e);
  }
};

/* =========================
   INIT
   ========================= */
onMounted(() => {
  checkAdminAccess();
  if(isAuthorized.value) loadStatistics();
});
</script>

<template>
  <div>
    <!-- UTENTI NON AUTORIZZATI -->
    <div v-if="authError" class="auth-error">
      <h2>⛔ Accesso non autorizzato</h2>
      <p>{{ authError }}</p>
      <router-link to="/" class="back-btn">Torna alla Home</router-link>
    </div>

    <div v-else-if="!isAuthorized">
      <p>Verifica permessi in corso...</p>
    </div>

    <!-- PAGINA STATISTICHE -->
    <div v-else class="stats-page">

      <!-- HEADER -->
      <header class="header">
        <div class="header-left">
          <router-link to="/admin" class="nav-btn">AdminInfo</router-link>
          <router-link to="/new-track" class="nav-btn">New Track</router-link>
         </div>

        <div class="header-center">
          <img src="../assets/goon_logo.png" class="logo" alt="GO-ON Logo" />
        </div>

        <div class="header-right">
          <router-link to="/" class="nav-btn">Home</router-link>
          <div class="user-info"><span class="username-box">👤 {{ username }}</span></div>
          <router-link to="/profile" class="nav-btn">Profilo</router-link>
        </div>
      </header>

      <!-- GRID -->
      <main class="grid">
        <!-- STATISTICHE GENERALI -->
        <div class="card">
          <div class="row"><span>Total Routes</span><span>{{ stats.totalRoutes }}</span></div>
          <div class="row"><span>Created This Month</span><span>{{ stats.createdMonth }}</span></div>
          <div class="row"><span>Modified This Month</span><span>{{ stats.modifiedMonth }}</span></div>
          <div class="row"><span>Registered Users</span><span>{{ stats.users }}</span></div>
          <div class="row"><span>Registrations This Month</span><span>{{ stats.usersMonth }}</span></div>
        </div>

        <!-- MEDIA RECENSIONI -->
        <div class="card center">
          <h3>Media Globale Recensioni</h3>
          <div class="stars">
            <span v-for="n in 5" :key="n">{{ n <= stats.avgRating ? "★" : "☆" }}</span>
          </div>
        </div>

        <!-- TRACCE PIÙ COMMENTATE -->
        <div class="card">
          <h3>Tracce più commentate</h3>
          <div v-for="(t,i) in mostCommented" :key="`commented-${i}`">
            <input :value="t" readonly />
          </div>
        </div>

        <!-- SENTIERI GPX -->
        <div class="card center">
          <h3>Sentieri con traccia GPX</h3>
          <div class="pie">{{ stats.gpxPercent }}%</div>
        </div>

        <!-- TAG PIÙ UTILIZZATI -->
        <div class="card">
          <h3>Tag più utilizzati</h3>
          <div class="tags">
            <span v-for="(t,i) in tags" :key="`tag-${i}`">{{ t }}</span>
          </div>
        </div>

        <!-- TRACCE PIÙ VISUALIZZATE -->
        <div class="card">
          <h3>Tracce più visualizzate</h3>
          <div v-for="(t,i) in mostViewed" :key="`viewed-${i}`">
            <input :value="t" readonly />
          </div>
        </div>

        <!-- TRACCE PIÙ SEGNALATE -->
        <div class="card">
          <h3>Tracce più segnalate</h3>
          <div v-for="(t,i) in mostReported" :key="`reported-${i}`">
            <input :value="t" readonly />
          </div>
        </div>

        <!-- SENTIERI INTERAGITI -->
        <div class="card center">
          <h3>Sentieri interagiti</h3>
          <div class="pie">{{ stats.interactedPercent }}%</div>
        </div>


      </main>
    </div>
  </div>
</template>

<style scoped>
.stats-page {
  display: flex;
  flex-direction: column;
  padding: 16px;
}

.header {
  height: 80px;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 0 24px;
  border-bottom: 1px solid #ddd;
}

.logo {
  height: 50px;
}

.nav-btn {
  text-decoration: none;
  padding: 6px 12px;
  background: #2c7be5;
  color: white;
  border-radius: 6px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill,minmax(200px,1fr));
  gap: 16px;
  margin-top: 24px;
}

.header-right {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.header-left {
  display: flex;
  gap: 12px;
  justify-content: flex-start;
}

.card {
  border: 1px solid #ccc;
  padding: 12px;
  background: #fafafa;
}

.center {
  text-align: center;
}

.row {
  display: flex;
  justify-content: space-between;
  margin: 4px 0;
}

.stars {
  font-size: 1.2rem;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tags span {
  background: #2c7be5;
  color: white;
  padding: 4px 6px;
  border-radius: 4px;
}

.pie {
  font-size: 1.6rem;
  font-weight: bold;
  color: #2c7be5;
}

.auth-error {
  padding: 24px;
  text-align: center;
  color: red;
}

.back-btn {
  margin-top: 12px;
  display: inline-block;
  padding: 6px 12px;
  background: #2c7be5;
  color: white;
  border-radius: 6px;
  text-decoration: none;
}
</style>
