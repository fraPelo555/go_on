<script setup>


const logout = () => console.log("Logout");
const editProfile = () => console.log("Modifica Profilo");
const deleteProfile = () => console.log("Elimina Profilo");
const exportData = () => console.log("Esporta Dati");
const manageCookies = () => console.log("Gestione Cookie");

const togglePassword = () => console.log("Toggle password");
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
        <div class="avatar"></div>

        <div class="actions">
          <button @click="logout">Log Out</button>
          <button @click="editProfile">Modifica Profilo</button>
          <button @click="deleteProfile">Elimina Profilo</button>
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
      <td><input type="text" value="username123" /></td>
    </tr>

    <tr>
      <td>Password</td>
      <td class="password-cell">
        <input type="password" value="password" />
        <button @click="togglePassword">👁</button>
      </td>
    </tr>

    <tr>
      <td>E-Mail</td>
      <td><input type="email" value="email@example.com" /></td>
    </tr>
  </tbody>
</table>

<!-- LOWER SECTION -->
<div class="history-section">

  <div class="history-box">
    <h3>Storico Recensioni</h3>

           <div class="scroll-pane">
             <div class="history-content">
               <div class="history-entry">⭐ 4 – Sentiero Monte X</div>
               <div class="history-entry">⭐ 5 – Lago Y</div>
               <div class="history-entry">⭐ 3 – Cascata Z</div>
               <div class="history-entry">⭐ 4 – Val di Fassa</div>
               <div class="history-entry">⭐ 5 – Passo Rolle</div>
             </div>
           </div>
         </div>

         <div class="history-box">
           <h3>Storico Segnalazioni</h3>

          <div class="scroll-pane">
            <div class="history-content">
              <div class="history-entry">🚧 Sentiero interrotto</div>
              <div class="history-entry">⚠ Frana segnalata</div>
              <div class="history-entry">🌲 Albero caduto</div>
              <div class="history-entry">❗ Segnaletica mancante</div>
              <div class="history-entry">💧 Guado impraticabile</div>
            </div>
          </div>
        </div>
       
      </div>

      </section>

      <!-- RIGHT COLUMN -->
      <aside class="right-column">
        <h3>Ultime 10 Ricerche</h3>
        <ul class="search-list">
          <li>Monte Rosa</li>
          <li>Lago Blu</li>
          <li>Cascata Verde</li>
          <li>Valle X</li>
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
