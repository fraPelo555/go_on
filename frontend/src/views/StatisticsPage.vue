<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { getUserById } from "../services/userService";

/* =========================
   ADMIN GUARD
   ========================= */
const router = useRouter();

const isAuthorized = ref(false);
const authError = ref("");

const checkAdminAccess = async () => {
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");
  const isAdmin = localStorage.getItem("isAdmin");

  if (!token || !userId) {
    authError.value = "Devi essere loggato per accedere a questa pagina.";
    return;
  }

  if (isAdmin !== "true") {
    authError.value = "Accesso negato: permessi amministratore richiesti.";
    return;
  }

  isAuthorized.value = true;
};

onMounted(checkAdminAccess);

/* =========================
   STATISTICHE MOCK
   ========================= */
const stats = ref({
  totalRoutes: 124,
  createdMonth: 12,
  modifiedMonth: 8,
  users: 342,
  usersMonth: 27,
  avgRating: 4,
  gpxPercent: 68,
  photoPercent: 82
});

const mostCommented = ref([
  "Sentiero delle Aquile",
  "Anello del Bosco",
  "Percorso del Lago",
  "Trail Panoramico"
]);

const mostViewed = ref([
  "Dolomiti Trail",
  "Sentiero Storico",
  "Percorso Cascata",
  "Anello Alpino"
]);

const mostReported = ref([
  "Sentiero Innevato",
  "Percorso Frana",
  "Trail Chiuso",
  "Sentiero Ripido"
]);

const tags = ref([
  "Panoramico",
  "Lago",
  "Famiglia",
  "Trekking",
  "Storico",
  "MTB"
]);
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
          <router-link to="/new-track" class="nav-btn">New Track</router-link>
        </div>

        <div class="header-center">
          <img src="../assets/goon_logo.png" class="logo" alt="GO-ON Logo" />
        </div>

        <div class="header-right">
          <router-link to="/" class="nav-btn">Home</router-link>
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

        <!-- SENTIERI CON FOTO -->
        <div class="card center">
          <h3>Sentieri con foto</h3>
          <div class="pie">{{ stats.photoPercent }}%</div>
        </div>

      </main>

    </div>
  </div>
</template>

<style scoped>
.stats-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

/* HEADER */
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

.header-left,
.header-right {
  display: flex;
  gap: 12px;
}

.nav-btn {
  text-decoration: none;
  padding: 6px 12px;
  background: #2c7be5;
  color: white;
  border-radius: 6px;
}

/* GRID */
.grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 16px;
  padding: 16px;
}

.card {
  border: 1px solid #ddd;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.center {
  align-items: center;
  justify-content: center;
  text-align: center;
}

.row {
  display: flex;
  justify-content: space-between;
}

.stars {
  font-size: 32px;
}

/* Fake pie chart */
.pie {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

/* Inputs */
input {
  text-align: center;
  padding: 6px;
}

/* Tags */
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tags span {
  padding: 4px 8px;
  background: #eee;
  border-radius: 4px;
}

/* Error */
.auth-error {
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.back-btn {
  margin-top: 16px;
  padding: 8px 16px;
  background: #2c7be5;
  color: white;
  text-decoration: none;
  border-radius: 6px;
}
</style>
