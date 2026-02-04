<script setup>
import { ref } from "vue";

/* Dati mock */
const user = ref({
  nome: "Mario",
  cognome: "Rossi",
  username: "mrossi",
  password: "password123",
  email: "mario.rossi@email.it",
  cellulare: "+39 333 1234567"
});

const showPassword = ref(false);

const lastSearches = ref([
  "Sentieri Dolomiti",
  "Percorsi lago",
  "Trail facili",
  "Sentieri panoramici",
  "Percorsi MTB",
  "Sentieri innevati",
  "Percorsi lunghi",
  "Trail brevi",
  "Sentieri famiglie",
  "Percorsi al tramonto"
]);

const reviews = ref([
  "Recensione Sentiero delle Aquile",
  "Recensione Anello del Bosco",
  "Recensione Percorso del Lago"
]);

const reports = ref([
  "Segnalazione frana",
  "Segnalazione albero caduto",
  "Segnalazione sentiero chiuso"
]);

/* Placeholder actions */
const logout = () => console.log("Logout");
const editProfile = () => console.log("Edit Profile");
const deleteProfile = () => console.log("Delete Profile");
const exportData = () => console.log("Export Data");
const cookieSettings = () => console.log("Cookie Settings");
</script>

<template>
  <div class="profile-page">

    <!-- HEADER -->
    <header class="header">
      <div></div>

      <div class="header-center">
        <img src="../assets/goon_logo.png" alt="GO-ON Logo" class="logo" />
      </div>

      <div class="header-right">
        <router-link to="/" class="home-btn">
          Home
        </router-link>
      </div>
    </header>

    <!-- BODY -->
    <main class="profile-body">

      <!-- LEFT SECTION -->
      <aside class="left-section">
        <div class="avatar">
          Foto
        </div>

        <nav class="actions">
          <button @click="logout">Log Out</button>
          <button @click="editProfile">Modifica Profilo</button>
          <button @click="deleteProfile">Elimina Profilo</button>
          <button @click="exportData">Esporta Dati</button>
          <button @click="cookieSettings">Cambia Gestione Cookie</button>
        </nav>
      </aside>

      <!-- CENTER SECTION -->
      <section class="center-section">
        <table class="profile-table">
          <tbody>
            <tr>
              <td>Nome</td>
              <td><input type="text" :value="user.nome" readonly /></td>
            </tr>
            <tr>
              <td>Cognome</td>
              <td><input type="text" :value="user.cognome" readonly /></td>
            </tr>
            <tr>
              <td>Username</td>
              <td><input type="text" :value="user.username" readonly /></td>
            </tr>
            <tr>
              <td>Password</td>
              <td class="password-cell">
                <input
                  :type="showPassword ? 'text' : 'password'"
                  :value="user.password"
                  readonly
                />
                <button @click="showPassword = !showPassword">
                  {{ showPassword ? "Nascondi" : "Mostra" }}
                </button>
              </td>
            </tr>
            <tr>
              <td>E-Mail</td>
              <td><input type="text" :value="user.email" readonly /></td>
            </tr>
            <tr>
              <td>Cellulare</td>
              <td><input type="text" :value="user.cellulare" readonly /></td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- RIGHT SECTION -->
      <aside class="right-section">

        <!-- Last searches -->
        <div class="last-searches">
          <div class="title">
            Ultime 10 Ricerche
            <span class="icon">🔍</span>
          </div>

          <ul>
            <li v-for="(search, i) in lastSearches" :key="i">
              {{ search }}
            </li>
          </ul>
        </div>

        <!-- History sections -->
        <div class="history">

          <div class="history-block">
            <h3>Storico Recensioni</h3>
            <ul>
              <li v-for="(r, i) in reviews" :key="i">
                {{ r }}
              </li>
            </ul>
          </div>

          <div class="history-block">
            <h3>Storico Segnalazioni</h3>
            <ul>
              <li v-for="(s, i) in reports" :key="i">
                {{ s }}
              </li>
            </ul>
          </div>

        </div>

      </aside>

    </main>

  </div>
</template>

<style scoped>
/* PAGE */
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
  background-color: #2c7be5;
  color: white;
  text-decoration: none;
  border-radius: 6px;
}

/* BODY */
.profile-body {
  flex: 1;
  display: flex;
}

/* LEFT */
.left-section {
  width: 240px;
  padding: 16px;
  border-right: 1px solid #ddd;
}

.avatar {
  width: 140px;
  height: 140px;
  margin: 0 auto 24px;
  border-radius: 50%;
  background-color: #eee;
  display: flex;
  align-items: center;
  justify-content: center;
}

.actions button {
  display: block;
  background: none;
  border: none;
  padding: 8px 0;
  text-align: left;
  cursor: pointer;
}

/* CENTER */
.center-section {
  flex: 1;
  padding: 24px;
}

.profile-table {
  width: 100%;
  border-collapse: collapse;
}

.profile-table td {
  padding: 10px;
}

.profile-table input {
  width: 100%;
  padding: 6px;
}

.password-cell {
  display: flex;
  gap: 8px;
}

/* RIGHT */
.right-section {
  width: 320px;
  padding: 16px;
  border-left: 1px solid #ddd;
  display: flex;
  flex-direction: column;
}

.last-searches {
  margin-bottom: 16px;
}

.title {
  font-weight: bold;
  display: flex;
  justify-content: space-between;
}

.last-searches ul,
.history-block ul {
  margin-top: 8px;
  padding-left: 16px;
}

.history {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.history-block {
  flex: 1;
  overflow-y: auto;
}
</style>
