<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import {
  getUserById,
  updateUser,
  deleteUser
} from "../services/userService";

/* ROUTER */
const router = useRouter();

/* AUTH */
const userId = localStorage.getItem("userId");
if (!userId) router.push("/login");

/* STATE */
const user = ref(null);
const editMode = ref(false);

const form = ref({
  username: "",
  email: "",
  newPassword: "",
  currentPassword: "",
  avatar: null
});

const showPassword = ref(false);

/* ======================
   FETCH USER
   ====================== */
const fetchUser = async () => {
  try {
    const res = await getUserById(userId);
    user.value = res.data;

    form.value.username = user.value.username;
    form.value.email = user.value.email;
  } catch (err) {
    console.error("Errore fetch user", err);
  }
};

onMounted(fetchUser);

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
const editProfile = () => {
  editMode.value = !editMode.value;
};

/* ======================
   SAVE PROFILE
   ====================== */
const saveProfile = async () => {
  try {
    if (form.value.newPassword && !form.value.currentPassword) {
      alert("Inserisci la password attuale");
      return;
    }

    const payload = {
      username: form.value.username,
      email: form.value.email,
    };

    if (form.value.newPassword) {
      payload.password = form.value.newPassword;
      payload.currentPassword = form.value.currentPassword;
    }

    await updateUser(userId, payload);
    editMode.value = false;
    fetchUser();
  } catch (err) {
    alert("Errore aggiornamento profilo");
  }
};

/* ======================
   DELETE PROFILE
   ====================== */
const deleteProfileConfirm = async () => {
  if (!confirm("Sei sicuro di voler eliminare il profilo?")) return;

  try {
    await deleteUser(userId);
    localStorage.clear();
    router.push("/login");
  } catch (err) {
    alert("Errore eliminazione profilo");
  }
};

/* ======================
   PASSWORD TOGGLE
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

      <!-- LEFT COLUMN -->
      <aside class="left-column">
        <div class="avatar">
          <!-- Futuro upload avatar -->
        </div>

        <div class="actions">
          <button @click="logout">Log Out</button>
          <button @click="editProfile">
            {{ editMode ? "Annulla" : "Modifica Profilo" }}
          </button>
          <button v-if="editMode" @click="saveProfile">Salva Modifiche</button>
          <button @click="deleteProfileConfirm" class="danger">Elimina Profilo</button>
          <button @click="exportData">Esporta Dati</button>
          <button @click="manageCookies">Cambia Gestione Cookie</button>
        </div>
      </aside>

      <!-- CENTER COLUMN -->
      <section class="center-column">

        <!-- USER INFO TABLE -->
        <table class="info-table">
          <tbody>
            <tr>
              <td>Username</td>
              <td>
                <input type="text" v-model="form.username" :disabled="!editMode" />
              </td>
            </tr>

            <tr>
              <td>Email</td>
              <td>
                <input type="email" v-model="form.email" :disabled="!editMode" />
              </td>
            </tr>

            <tr>
              <td>Password</td>
              <td class="password-cell">
                <input
                  :type="showPassword ? 'text' : 'password'"
                  v-model="form.currentPassword"
                  :disabled="!editMode"
                  placeholder="Password attuale"
                />
                <input
                  :type="showPassword ? 'text' : 'password'"
                  v-model="form.newPassword"
                  :disabled="!editMode"
                  placeholder="Nuova password"
                />
                <button @click="togglePassword">👁</button>
              </td>
            </tr>

            <tr>
              <td>Avatar</td>
              <td>
                <input type="file" :disabled="!editMode" @change="e => form.avatar = e.target.files[0]" />
              </td>
            </tr>
          </tbody>
        </table>

        <!-- LOWER SECTION: HISTORY -->
        <div class="history-section">

          <div class="history-box">
            <h3>Storico Recensioni</h3>
            <div class="scroll-pane">
              <div class="history-content">
                <div
                  v-for="(entry, idx) in user?.feedbacks || []"
                  :key="idx"
                  class="history-entry"
                >
                  {{ entry }}
                </div>
              </div>
            </div>
          </div>

          <div class="history-box">
            <h3>Storico Segnalazioni</h3>
            <div class="scroll-pane">
              <div class="history-content">
                <div
                  v-for="(entry, idx) in user?.reports || []"
                  :key="idx"
                  class="history-entry"
                >
                  {{ entry }}
                </div>
              </div>
            </div>
          </div>

        </div>

      </section>

      <!-- RIGHT COLUMN -->
      <aside class="right-column">
        <h3>Ultime 10 Ricerche</h3>
        <ul class="search-list">
          <li v-for="(search, idx) in user?.recentSearches || []" :key="idx">{{ search }}</li>
        </ul>
      </aside>

    </main>
  </div>
</template>


<style>
.profile-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

/* HEADER */
.header {
  height: 80px;
  min-height: 80px; /* assicura altezza minima */
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

.nav-btn {
  padding: 8px 14px;
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

.home-btn {
  padding: 8px 16px;
  border-radius: 6px;
  background-color: #2c7be5;
  color: white;
  text-decoration: none;
}

.search-list {
  list-style: none;
  padding: 0;
}
</style>
