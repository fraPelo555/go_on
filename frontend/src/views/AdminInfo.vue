<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";

/* =========================
   ROUTER
   ========================= */
const router = useRouter();

/* =========================
   AUTH STATE
   ========================= */
const isAuthorized = ref(false);
const authError = ref("");
const checkingAuth = ref(true);

/* =========================
   ADMIN GUARD
   ========================= */
const checkAdminAccess = () => {
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");
  const isAdmin = localStorage.getItem("isAdmin"); // stringa!

  if (!token || !userId) {
    authError.value = "Devi essere loggato per accedere a questa pagina.";
    return false;
  }

  if (isAdmin !== "true") {
    authError.value = "Accesso negato: permessi amministratore richiesti.";
    return false;
  }

  isAuthorized.value = true;
  return true;
};

/* =========================
   SERVICES
   ========================= */
import { getTrails } from "../services/trailService";
import { getUsers } from "../services/userService";
import { getAllReports } from "../services/reportService";
import { getAllFeedbacks } from "../services/feedbackService";

/* =========================
   STATE
   ========================= */
const activeTab = ref("sentieri");

const trails = ref([]);
const users = ref([]);
const reports = ref([]);
const feedbacks = ref([]);

const loading = ref(false);
const error = ref(null);

/* =========================
   LOADERS (ADMIN ONLY)
   ========================= */
const loadSentieri = async () => {
  loading.value = true;
  error.value = null;
  try {
    const res = await getTrails();
    trails.value = res.data;
  } catch {
    error.value = "Errore caricamento sentieri";
  } finally {
    loading.value = false;
  }
};

const loadUtenti = async () => {
  loading.value = true;
  error.value = null;
  try {
    const res = await getUsers();
    users.value = res.data;
  } catch {
    error.value = "Errore caricamento utenti";
  } finally {
    loading.value = false;
  }
};

const loadReports = async () => {
  loading.value = true;
  error.value = null;
  try {
    const res = await getAllReports();
    reports.value = res.data;
  } catch {
    error.value = "Errore caricamento report";
  } finally {
    loading.value = false;
  }
};

const loadFeedbacks = async () => {
  loading.value = true;
  error.value = null;
  try {
    const res = await getAllFeedbacks();
    feedbacks.value = res.data;
  } catch {
    error.value = "Errore caricamento feedback";
  } finally {
    loading.value = false;
  }
};

/* =========================
   TAB HANDLER
   ========================= */
const selectTab = async (tab) => {
  activeTab.value = tab;

  if (tab === "sentieri") await loadSentieri();
  if (tab === "utenti") await loadUtenti();
  if (tab === "report") await loadReports();
  if (tab === "feedback") await loadFeedbacks();
};

/* =========================
   INIT
   ========================= */
onMounted(async () => {
  const ok = checkAdminAccess();
  checkingAuth.value = false;

  if (!ok) {
    // opzionale: redirect automatico
    // setTimeout(() => router.push("/"), 2000);
    return;
  }

  await loadSentieri();
});
</script>

<template>
  <!-- BLOCCO TOTALE FINCHÉ CONTROLLA -->
  <div v-if="checkingAuth" class="center">
    Verifica permessi...
  </div>

  <!-- ERRORE AUTH -->
    <div v-if="authError" class="auth-error">
      <h2>⛔ Accesso non autorizzato</h2>
      <p>{{ authError }}</p>
      <router-link to="/" class="back-btn">Torna alla Home</router-link>
    </div>

  <!-- PAGINA ADMIN -->
  <div v-else class="admin-info-page">

    <!-- HEADER -->
    <header class="header">
      <div class="header-left">
        <router-link to="/new-track" class="nav-btn">New-Track</router-link>
        <router-link to="/statistics" class="nav-btn">Statistiche</router-link>
      </div>

      <div class="header-center">
        <img src="../assets/goon_logo.png" class="logo" alt="GO-ON Logo" />
      </div>

      <div class="header-right">
        <router-link to="/" class="nav-btn">Home</router-link>
        <router-link to="/profile" class="nav-btn">Profilo</router-link>
      </div>
    </header>

    <!-- TAB BAR -->
    <div class="tab-bar">
      <div class="tab" :class="{ active: activeTab === 'sentieri' }" @click="selectTab('sentieri')">Sentieri</div>
      <div class="tab" :class="{ active: activeTab === 'utenti' }" @click="selectTab('utenti')">Utenti</div>
      <div class="tab" :class="{ active: activeTab === 'report' }" @click="selectTab('report')">Report</div>
      <div class="tab" :class="{ active: activeTab === 'feedback' }" @click="selectTab('feedback')">Feedback</div>
    </div>

    <!-- BODY -->
    <main class="content">
      <p v-if="loading">Caricamento...</p>
      <p v-if="error" class="error">{{ error }}</p>

      <div v-if="activeTab === 'sentieri'">
        <div v-for="t in trails" :key="t._id" class="box">
          <h3>{{ t.title }}</h3>
          <p>ID: {{ t._id }}</p>
        </div>
      </div>

      <div v-if="activeTab === 'utenti'">
        <div v-for="u in users" :key="u._id" class="box">
          <h3>{{ u.username }}</h3>
          <p>{{ u.email }}</p>
        </div>
      </div>

      <div v-if="activeTab === 'report'">
        <div v-for="r in reports" :key="r._id" class="box">
          <h3>Report {{ r._id }}</h3>
          <p>{{ r.reason || r.description }}</p>
        </div>
      </div>

      <div v-if="activeTab === 'feedback'">
        <div v-for="f in feedbacks" :key="f._id" class="box">
          <h3>Feedback {{ f._id }}</h3>
          <p>{{ f.text }}</p>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.center {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
}

.admin-info-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
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

.tab-bar {
  display: flex;
  border-bottom: 1px solid #ccc;
}

.tab {
  flex: 1;
  text-align: center;
  padding: 16px;
  cursor: pointer;
  background: #f5f5f5;
}

.tab.active {
  background: #dcdcdc;
  font-weight: bold;
}

.content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.box {
  border: 1px solid #ccc;
  padding: 16px;
  margin-bottom: 12px;
}

.error {
  color: red;
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
