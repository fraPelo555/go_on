<script setup>
import { ref, onMounted } from "vue";

/* =========================
   SERVICES
   ========================= */
import { getTrails } from "../services/trailService";
import { getUsers } from "../services/userService";
import { getReports } from "../services/reportService";
import { getFeedbacks } from "../services/feedbackService";

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
   LOADERS
   ========================= */
const loadSentieri = async () => {
  loading.value = true;
  try {
    const res = await getTrails();
    trails.value = res.data;
  } catch (e) {
    error.value = "Errore caricamento sentieri";
  } finally {
    loading.value = false;
  }
};

const loadUtenti = async () => {
  loading.value = true;
  try {
    const res = await getUsers();
    users.value = res.data;
  } catch (e) {
    error.value = "Errore caricamento utenti";
  } finally {
    loading.value = false;
  }
};

const loadReports = async () => {
  loading.value = true;
  try {
    const res = await getReports();
    reports.value = res.data;
  } catch (e) {
    error.value = "Errore caricamento report";
  } finally {
    loading.value = false;
  }
};

const loadFeedbacks = async () => {
  loading.value = true;
  try {
    const res = await getFeedbacks();
    feedbacks.value = res.data;
  } catch (e) {
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
  error.value = null;

  if (tab === "sentieri") await loadSentieri();
  if (tab === "utenti") await loadUtenti();
  if (tab === "report") await loadReports();
  if (tab === "feedback") await loadFeedbacks();
};

/* =========================
   INIT
   ========================= */
onMounted(() => {
  loadSentieri();
});
</script>

<template>
  <div class="admin-info-page">

    <!-- HEADER -->
    <header class="header">
      <div class="header-left">
        <router-link to="/statistics" class="nav-btn">Statistiche</router-link>
        <router-link to="/new-track" class="nav-btn">Nuovo Sentiero</router-link>
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
      <div
        class="tab"
        :class="{ active: activeTab === 'sentieri' }"
        @click="selectTab('sentieri')"
      >
        Sentieri
      </div>

      <div
        class="tab"
        :class="{ active: activeTab === 'utenti' }"
        @click="selectTab('utenti')"
      >
        Utenti
      </div>

      <div
        class="tab"
        :class="{ active: activeTab === 'report' }"
        @click="selectTab('report')"
      >
        Report
      </div>

      <div
        class="tab"
        :class="{ active: activeTab === 'feedback' }"
        @click="selectTab('feedback')"
      >
        Feedback
      </div>
    </div>

    <!-- BODY -->
    <main class="content">

      <p v-if="loading">Caricamento...</p>
      <p v-if="error" class="error">{{ error }}</p>

      <!-- SENTIERI -->
      <div v-if="activeTab === 'sentieri'">
        <div v-for="trail in trails" :key="trail.id" class="box">
          <h3>{{ trail.title || "Sentiero" }}</h3>
          <p>ID: {{ trail.id }}</p>
          <p>Difficoltà: {{ trail.difficulty }}</p>
        </div>
      </div>

      <!-- UTENTI -->
      <div v-if="activeTab === 'utenti'">
        <div v-for="user in users" :key="user.id" class="box">
          <h3>{{ user.username || "Utente" }}</h3>
          <p>Email: {{ user.email }}</p>
          <p>ID: {{ user.id }}</p>
        </div>
      </div>

      <!-- REPORT -->
      <div v-if="activeTab === 'report'">
        <div v-for="report in reports" :key="report.id" class="box">
          <h3>Report #{{ report.id }}</h3>
          <p>{{ report.reason || report.description }}</p>
        </div>
      </div>

      <!-- FEEDBACK -->
      <div v-if="activeTab === 'feedback'">
        <div v-for="fb in feedbacks" :key="fb.id" class="box">
          <h3>Feedback #{{ fb.id }}</h3>
          <p>{{ fb.message || fb.text }}</p>
        </div>
      </div>

    </main>
  </div>
</template>

<style scoped>
.admin-info-page {
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

/* TAB BAR */
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
  transition: background 0.2s;
}

.tab:hover {
  background: #e0e0e0;
}

.tab.active {
  background: #dcdcdc;
  font-weight: bold;
}

/* CONTENT */
.content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.box {
  border: 1px solid #ccc;
  padding: 16px;
  margin-bottom: 12px;
  background: #fafafa;
}

.error {
  color: red;
}
</style>
