<script setup>
import { ref } from "vue";

/* Mock data */
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
  <div class="stats-page">

    <!-- HEADER -->
    <header class="header">
      <div class="header-left">
        <router-link to="/" class="nav-btn">Home</router-link>
        <router-link to="/new-track" class="nav-btn">New Track</router-link>
      </div>

      <div class="header-center">
        <img src="../assets/goon_logo.png" class="logo" alt="GO-ON Logo" />
      </div>

      <div class="header-right">
        <router-link to="/profile" class="nav-btn">Profilo</router-link>
      </div>
    </header>

    <!-- BODY -->
    <main class="grid">

      <!-- [0][0] -->
      <div class="card">
        <div class="row"><span>Total Routes</span><span>{{ stats.totalRoutes }}</span></div>
        <div class="row"><span>Created This Month</span><span>{{ stats.createdMonth }}</span></div>
        <div class="row"><span>Modified This Month</span><span>{{ stats.modifiedMonth }}</span></div>
        <div class="row"><span>Registered Users</span><span>{{ stats.users }}</span></div>
        <div class="row"><span>Registrations This Month</span><span>{{ stats.usersMonth }}</span></div>
      </div>

      <!-- [1][0] -->
      <div class="card center">
        <h3>Media Globale Recensioni</h3>
        <div class="stars">
          <span v-for="n in 5" :key="n">
            {{ n <= stats.avgRating ? "★" : "☆" }}
          </span>
        </div>
      </div>

      <!-- [0][1] -->
      <div class="card">
        <h3>Tracce più commentate</h3>
        <input v-for="(t,i) in mostCommented" :key="i" :value="t" readonly />
      </div>

      <!-- [1][1] -->
      <div class="card center">
        <h3>Sentieri con traccia GPX</h3>
        <div class="pie">
          {{ stats.gpxPercent }}%
        </div>
      </div>

      <!-- [0][2] -->
      <div class="card">
        <h3>Tag più utilizzati</h3>
        <div class="tags">
          <span v-for="(t,i) in tags" :key="i">{{ t }}</span>
        </div>
      </div>

      <!-- [1][2] -->
      <div class="card">
        <h3>Tracce più visualizzate</h3>
        <input v-for="(t,i) in mostViewed" :key="i" :value="t" readonly />
      </div>

      <!-- [0][3] -->
      <div class="card">
        <h3>Tracce più segnalate</h3>
        <input v-for="(t,i) in mostReported" :key="i" :value="t" readonly />
      </div>

      <!-- [1][3] -->
      <div class="card center">
        <h3>Sentieri con foto</h3>
        <div class="pie">
          {{ stats.photoPercent }}%
        </div>
      </div>

    </main>

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
  background: conic-gradient(
    #2c7be5 {{ stats.gpxPercent }}%,
    #ddd 0
  );
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
</style>
