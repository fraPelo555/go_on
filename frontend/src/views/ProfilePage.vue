<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";

import {
  getUserById,
  updateUser,
  deleteUser,
  getFavourites
} from "../services/userService";

import { getUserFeedbacks } from "../services/feedbackService";
import { getUserReports } from "../services/reportService";

/* ======================
   ROUTER & AUTH
   ====================== */
const router = useRouter();
const userId = localStorage.getItem("userId");

if (!userId) {
  router.push("/login");
}

/* ======================
   STATE
   ====================== */
const user = ref(null);
const favourites = ref([]);
const feedbacks = ref([]);
const reports = ref([]);

const editMode = ref(false);
const showPassword = ref(false);

const form = ref({
  username: "",
  email: "", // SOLO READ-ONLY
  currentPassword: "",
  newPassword: ""
});

/* ======================
   FETCH USER
   ====================== */
const fetchUser = async () => {
  try {
    const res = await getUserById(userId);

    // 👉 supporta sia res.data che res.data.user
    const userData = res.data.user || res.data;

    user.value = userData;

    form.value.username = userData.username || "";
    form.value.email = userData.email || "";
    form.value.currentPassword = "";
    form.value.newPassword = "";
  } catch (err) {
    console.error("Errore fetch user:", err);
  }
};

const fetchExtras = async () => {
  try {
    const [favRes, fbRes, repRes] = await Promise.all([
      getFavourites(userId),
      getUserFeedbacks(userId),
      getUserReports(userId)
    ]);

    favourites.value = favRes.data || [];
    feedbacks.value = fbRes.data || [];
    reports.value = repRes.data || [];
  } catch (err) {
    console.error("Errore fetch dati utente:", err);
  }
};

onMounted(async () => {
  await fetchUser();
  await fetchExtras();
});

/* ======================
   LOGOUT
   ====================== */
const logout = () => {
  localStorage.clear();
  router.push("/login");
};

/* ======================
   EDIT PROFILE
   ====================== */
const toggleEdit = () => {
  editMode.value = !editMode.value;

  if (!editMode.value) {
    form.value.currentPassword = "";
    form.value.newPassword = "";
  }
};

/* ======================
   SAVE PROFILE
   ====================== */
const saveProfile = async () => {
  try {
    const payload = {
      username: form.value.username
    };

    if (form.value.newPassword) {
      if (!form.value.currentPassword) {
        alert("Inserisci la password attuale");
        return;
      }

      payload.password = form.value.newPassword;
      payload.currentPassword = form.value.currentPassword;
    }

    await updateUser(userId, payload);

    editMode.value = false;
    await fetchUser();
  } catch (err) {
    console.error(err);
    alert("Errore durante il salvataggio del profilo");
  }
};

/* ======================
   DELETE PROFILE
   ====================== */
const deleteProfileConfirm = async () => {
  if (!confirm("Sei sicuro di voler eliminare definitivamente il profilo?")) return;

  try {
    await deleteUser(userId);
    localStorage.clear();
    router.push("/login");
  } catch (err) {
    alert("Errore eliminazione profilo");
  }
};

/* ======================
   UTILS
   ====================== */
const togglePassword = () => {
  showPassword.value = !showPassword.value;
};
</script>

<template>
  <div class="profile-page">

    <!-- HEADER -->
    <header class="header">
      <div></div>
      <div class="header-center">
        <img src="../assets/goon_logo.png" class="logo" />
      </div>
      <div class="header-right">
        <router-link to="/" class="home-btn">Home</router-link>
      </div>
    </header>

    <!-- BODY -->
    <main class="content">

      <!-- LEFT -->
      <aside class="left-column">
        <div class="avatar"></div>

        <div class="actions">
          <button @click="logout">Log Out</button>
          <button @click="toggleEdit">
            {{ editMode ? "Annulla" : "Modifica Profilo" }}
          </button>
          <button v-if="editMode" @click="saveProfile">
            Salva Modifiche
          </button>
          <button class="danger" @click="deleteProfileConfirm">
            Elimina Profilo
          </button>
        </div>
      </aside>

      <!-- CENTER -->
      <section class="center-column">

        <!-- USER INFO -->
        <table class="info-table">
          <tbody>
            <tr>
              <td>Username</td>
              <td>
                <input
                  v-model="form.username"
                  :disabled="!editMode"
                />
              </td>
            </tr>

            <tr>
              <td>Email</td>
              <td>
                <input
                  type="email"
                  v-model="form.email"
                  disabled
                />
              </td>
            </tr>

            <tr v-if="editMode">
              <td>Password</td>
              <td class="password-cell">
                <input
                  :type="showPassword ? 'text' : 'password'"
                  v-model="form.currentPassword"
                  placeholder="Password attuale"
                />
                <input
                  :type="showPassword ? 'text' : 'password'"
                  v-model="form.newPassword"
                  placeholder="Nuova password"
                />
                <button type="button" @click="togglePassword">👁</button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- HISTORY -->
        <div class="history-section">

          <div class="history-box">
            <h3>Recensioni</h3>
            <div class="history-scroll">
              <div
                v-for="fb in feedbacks"
                :key="fb._id"
                class="history-entry"
              >
                ⭐ {{ fb.rating }} – {{ fb.text || "Nessun commento" }}
              </div>
            </div>
          </div>

          <div class="history-box">
            <h3>Segnalazioni</h3>
            <div class="history-scroll">
              <div
                v-for="rep in reports"
                :key="rep._id"
                class="history-entry"
              >
                🚩 {{ rep.reason || "Segnalazione" }}
              </div>
            </div>
          </div>

        </div>
      </section>

      <!-- RIGHT -->
      <aside class="right-column">
        <h3>Preferiti</h3>
        <ul class="search-list">
          <li v-for="trail in favourites" :key="trail._id">
            {{ trail.title || "Sentiero" }}
          </li>
        </ul>
      </aside>

    </main>
  </div>
</template>

<style scoped>
.profile-page {
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

.header-right {
  display: flex;
  justify-content: flex-end;
}

.home-btn {
  padding: 8px 16px;
  border-radius: 6px;
  background: #2c7be5;
  color: white;
  text-decoration: none;
}

/* BODY */
.content {
  flex: 1;
  display: grid;
  grid-template-columns: 240px 1fr 240px;
  gap: 16px;
  padding: 16px;
}

/* LEFT */
.left-column {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.avatar {
  width: 140px;
  height: 140px;
  border-radius: 50%;
  background: #ccc;
  margin-bottom: 16px;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.actions button {
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
}

.actions .danger {
  color: red;
}

/* CENTER */
.center-column {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.info-table {
  width: 100%;
  border-collapse: collapse;
}

.info-table td {
  padding: 8px;
}

.info-table input {
  width: 100%;
}

.password-cell {
  display: flex;
  gap: 8px;
}

/* HISTORY */
.history-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.history-box {
  border: 1px solid #ddd;
  padding: 12px;
}

.history-scroll {
  max-height: 160px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-entry {
  padding: 8px;
  background: #f2f2f2;
  border-radius: 6px;
}

/* RIGHT */
.right-column {
  border-left: 1px solid #ddd;
  padding-left: 12px;
}

.search-list {
  list-style: none;
  padding: 0;
}
</style>
