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
const username = ref(localStorage.getItem("username") || "");

/* =========================
   ADMIN GUARD
   ========================= */
const checkAdminAccess = () => {
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");
  const isAdmin = localStorage.getItem("isAdmin");

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
import { getTrails, deleteTrail } from "../services/trailService";
import { getUsers, updateUser, deleteUser } from "../services/userService";
import { getAllReports, deleteReport } from "../services/reportService";
import { getAllFeedbacks, deleteFeedback } from "../services/feedbackService";

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
    users.value = res.data.users || res.data;
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
   DELETE ACTIONS
   ========================= */
const handleDeleteTrail = async (id) => {
  if (!confirm("Confermi la cancellazione del sentiero?")) return;
  try {
    await deleteTrail(id);
    loadSentieri();
  } catch (err) {
    alert("Errore cancellazione sentiero");
  }
};

const handleDeleteUser = async (id) => {
  if (!confirm("Confermi la cancellazione dell'utente?")) return;
  try {
    await deleteUser(id);
    loadUtenti();
  } catch (err) {
    alert("Errore cancellazione utente");
  }
};

const handleDeleteReport = async (id) => {
  if (!confirm("Confermi la cancellazione del report?")) return;
  try {
    await deleteReport(id);
    loadReports();
  } catch (err) {
    alert("Errore cancellazione report");
  }
};

const handleDeleteFeedback = async (id) => {
  if (!confirm("Confermi la cancellazione del feedback?")) return;
  try {
    await deleteFeedback(id);
    loadFeedbacks();
  } catch (err) {
    alert("Errore cancellazione feedback");
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
   NAVIGATION ACTIONS
   ========================= */
const editTrail = (id) => router.push({ path:"/new-track", query:{editId:id} });
const viewTrailDetails = (idTrail) => router.push({ path: `/track-details/${idTrail}` });

/* =========================
   USER INLINE EDIT
   ========================= */
const editUserId = ref(null);
const editedUsername = ref("");

const startEditUser = (user) => {
  editUserId.value = user._id;
  editedUsername.value = user.username;
};

const saveUserEdit = async (userId) => {
  try {
    await updateUser(userId, { username: editedUsername.value });
    editUserId.value = null;
    loadUtenti();
  } catch (err) {
    alert("Errore durante il salvataggio dell'utente");
  }
};

const cancelUserEdit = () => {
  editUserId.value = null;
};

/* =========================
   INIT
   ========================= */
onMounted(() => {
  const ok = checkAdminAccess();
  checkingAuth.value = false;
  if (!ok) return;
  loadSentieri();
});
</script>

<template>
  <!-- BLOCCO VERIFICA -->
  <div v-if="checkingAuth" class="center">Verifica permessi...</div>

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
        <div class="user-info"><span class="username-box">👤 {{ username }}</span></div>
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

      <!-- SENTIERI -->
      <div v-if="activeTab === 'sentieri'">
        <div v-for="t in trails" :key="t._id" class="box">
          <h3>{{ t.title }}</h3>
          <p>ID: {{ t._id }}</p>
          <div class="btn-group">
            <button @click="editTrail(t._id)">Modifica</button>
            <button @click="handleDeleteTrail(t._id)">Elimina</button>
          </div>
        </div>
      </div>

      <!-- UTENTI -->
      <div v-if="activeTab === 'utenti'">
        <div v-for="u in users" :key="u._id" class="box">
          <div v-if="editUserId === u._id" class="user-edit">
            <input v-model="editedUsername" />
            <button @click="saveUserEdit(u._id)">Salva</button>
            <button @click="cancelUserEdit">Annulla</button>
          </div>
          <div v-else>
            <h3>{{ u.username }}</h3>
            <p>Email: {{ u.email }}</p>
            <div class="btn-group">
              <button @click="startEditUser(u)">Modifica</button>
              <button @click="handleDeleteUser(u._id)">Elimina</button>
            </div>
          </div>
        </div>
      </div>

      <!-- REPORT -->
      <div v-if="activeTab === 'report'">
        <div v-for="r in reports" :key="r._id" class="box">
          <h3>Report #{{ r._id }}</h3>
          <p>Motivazione: {{ r.reason || r.description }}</p>
          <p>Trail: {{ r.idTrail?._id || r.idTrail }}</p>
          <p>Utente: {{ r.idUser?.username || r.idUser }}</p>
          <div class="btn-group">
            <button @click="viewTrailDetails(r.idTrail)">Visualizza</button>
            <button @click="handleDeleteReport(r._id)">Elimina</button>
          </div>
        </div>
      </div>

      <!-- FEEDBACK -->
      <div v-if="activeTab === 'feedback'">
        <div v-for="f in feedbacks" :key="f._id" class="box">
          <h3>Feedback #{{ f._id }}</h3>
          <p>Valutazione: {{ f.valutazione || f.rating }}</p>
          <p>Testo: {{ f.text }}</p>
          <p>Trail: {{ f.idTrail }}</p>
          <p>Utente: {{ f.idUser }}</p>
          <div class="btn-group">
            <button @click="viewTrailDetails(f.idTrail)">Visualizza</button>
            <button @click="handleDeleteFeedback(f._id)">Elimina</button>
          </div>
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
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.btn-group {
  display: flex;
  gap: 8px;
}

.btn-group button {
  padding: 6px 12px;
  background: #2c7be5;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.user-edit input {
  margin-bottom: 8px;
  padding: 4px 8px;
}

.error {
  color: red;
}

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
