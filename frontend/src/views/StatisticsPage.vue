<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import dayjs from "dayjs";
import { getTrailById } from "../services/trailService"; // Assicurati di importare
import { getGPX } from "../services/trailService";


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

    // ================= GPX REAL CHECK =================
    let gpxCount = 0;
       
    await Promise.all(
      trailsData.map(async (t) => {
        const id = t._id ?? t.id;
        if (!id) return;
      
        try {
          await getGPX(id); // prova a scaricare il GPX
          gpxCount++;       // se non lancia errore → GPX esiste
        } catch (err) {
          // 404 o errore → niente GPX
        }
      })
    );
     
    stats.value.gpxPercent = trailsData.length
      ? Math.round((gpxCount / trailsData.length) * 100)
      : 0;

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
          <div class="row"><span>Total Routes: </span><span>{{ stats.totalRoutes }}</span></div>
          <div class="row"><span>Created This Month: </span><span>{{ stats.createdMonth }}</span></div>
          <div class="row"><span>Modified This Month: </span><span>{{ stats.modifiedMonth }}</span></div>
          <div class="row"><span>Registered Users: </span><span>{{ stats.users }}</span></div>
          <div class="row"><span>Registrations This Month: </span><span>{{ stats.usersMonth }}</span></div>
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


/* ================= HEADER ================= */
.header {
  height: 80px;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 0 24px;
  border-bottom: 1px solid #ddd;
  gap: 12px;
}

.logo {
  height: 50px;
  max-width: 100%;
  object-fit: contain;
}

.header-left,
.header-right {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.header-left {
  justify-content: flex-start;
}

.header-right {
  justify-content: flex-end;
}

.nav-btn {
  padding: 8px 16px;
  border-radius: 6px;
  background-color: #2c7be5;
  color: white;
  text-decoration: none;
  font-size: 0.9rem;
}

/* ================= GRID CARDS ================= */
.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr); /* desktop */
  gap: 16px;
  margin-top: 24px;
}

.card {
  aspect-ratio: 16 / 12; /* card quadrata */
  display: flex;
  flex-direction: column;
  justify-content: center;  /* centra verticalmente */
  align-items: center;      /* centra orizzontalmente */
  text-align: center;
  border: 1px solid #ddd;
  padding: 16px;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
  overflow: hidden;
}

.card .scrollable {
  overflow-y: auto;
}

.card input[readonly] {
  width: 100%;
  border: none;
  background: #f0f0f0;
  padding: 6px 8px;
  margin-bottom: 4px;
  border-radius: 4px;
}

.card h3 {
  white-space: normal;   
  word-break: break-word;
  margin-bottom: 12px;
}

/* ================= CONTENT CENTER ================= */
.center {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.row {
  display: flex;
  justify-content: space-between;
  margin: 6px 0;
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
  padding: 6px 8px;
  font-size: 0.9rem;
  border-radius: 4px;
  background: #2c7be5;
  color: white;
}

.pie {
  font-size: 1.6rem;
  font-weight: bold;
  color: #2c7be5;
}

/* ================= ERROR ================= */
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

/* ===================== MEDIA QUERIES ===================== */
@media (max-width: 1200px) {
  .grid {
    grid-template-columns: repeat(2, 1fr); /* tablet / small desktop */
  }
}

@media (max-width: 768px) {
  .grid {
    grid-template-columns: 1fr; /* mobile */
  }

  .header {
    padding: 0 12px;
    grid-template-columns: 1fr auto 1fr;
  }

  .header-left,
  .header-right {
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
  }

  .nav-btn {
    padding: 6px 12px;
    font-size: 0.85rem;
  }

  .card {
    padding: 12px;
  }

  .tags span {
    font-size: 0.85rem;
    padding: 4px 6px;
  }

  .row {
    margin: 4px 0;
  }
}
</style>
