<script setup>
import { ref } from "vue";
import TrailMap from "../components/TrailMap.vue";

/* =========================
   DATI MOCK
========================= */
const trails = ref([
  {
    id: "sentiero-aquile",
    name: "Sentiero delle Aquile",
    description: "Percorso panoramico tra creste rocciose.",
    start: "Rifugio Alpino",
    duration: "3h",
    length: "8 km"
  },
  {
    id: "anello-bosco",
    name: "Anello del Bosco",
    description: "Giro facile immerso nel verde.",
    start: "Parcheggio Nord",
    duration: "1h 30m",
    length: "4 km"
  },
  {
    id: "percorso-lago",
    name: "Percorso del Lago",
    description: "Passeggiata rilassante lungo il lago.",
    start: "Centro Visite",
    duration: "2h",
    length: "6 km"
  }
]);

const visibleTrails = ref([...trails.value]);


const handleSearch = () => {
  const input = document.getElementById("trail-search");
  if (!input) return;

  const query = input.value.toLowerCase();

  visibleTrails.value = trails.value.filter(trail =>
    trail.name.toLowerCase().includes(query)
  );
};

/* =========================
   PLACEHOLDER
========================= */
const enableGeolocation = () => {
  console.log("Geolocalizzazione attivata");
};

const openAdvancedSearch = () => {
  console.log("Advanced search");
};
</script>

<template>
  <div class="homepage">

    <!-- ================= HEADER ================= -->
    <header class="header">
      <div></div>

      <div class="header-center">
        <img
          src="../assets/goon_logo.png"
          alt="GO-ON Logo"
          class="logo"
        />
      </div>

      <div class="header-right">
        <router-link to="/login" class="login-btn">
          Login
        </router-link>
      </div>
    </header>

    <!-- ================= BODY ================= -->
    <main class="main-content">

      <!-- MAPPA -->
      <section class="map-section">
        <div class="map-container">
          <TrailMap gpx="/test.gpx" />
        </div>

        <button class="geo-btn" @click="enableGeolocation">
          📍
        </button>
      </section>

      <!-- SIDEBAR -->
      <aside class="sidebar">

        <!-- SEARCH -->
        <input
          id="trail-search"
          type="text"
          placeholder="Cerca un sentiero..."
          class="search-input"
          @input="handleSearch"
        />

        <button class="advanced-btn" @click="openAdvancedSearch">
          Advanced Search
        </button>

        <!-- RISULTATI -->
        <div class="results">
          <router-link
            v-for="trail in visibleTrails"
            :key="trail.id"
            :to="`/tracks/${trail.id}`"
            class="trail-card"
          >
            <h4 class="trail-name">{{ trail.name }}</h4>

            <p class="trail-desc">
              {{ trail.description }}
            </p>

            <div class="trail-meta">
              <span><strong>Partenza:</strong> {{ trail.start }}</span>
              <span><strong>Durata:</strong> {{ trail.duration }}</span>
              <span><strong>Lunghezza:</strong> {{ trail.length }}</span>
            </div>
          </router-link>
        </div>

      </aside>

    </main>

  </div>
</template>

<style scoped>
.homepage {
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

.login-btn {
  padding: 8px 16px;
  border-radius: 6px;
  background-color: #2c7be5;
  color: white;
  text-decoration: none;
}

/* BODY */
.main-content {
  flex: 1;
  display: flex;
}

/* MAP */
.map-section {
  flex: 2;
  position: relative;
}

.map-container {
  width: 100%;
  height: 100%;
  min-height: 400px;
}

/* GEO BUTTON */
.geo-btn {
  position: absolute;
  bottom: 20px;
  left: 20px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background-color: white;
  font-size: 20px;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
}

/* SIDEBAR */
.sidebar {
  width: 360px;
  padding: 16px;
  border-left: 1px solid #ddd;
  display: flex;
  flex-direction: column;
}

.search-input {
  padding: 8px;
  margin-bottom: 8px;
}

.advanced-btn {
  margin-bottom: 16px;
}

/* RESULTS */
.results {
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;
}

.trail-card {
  display: block;
  padding: 12px;
  margin-bottom: 10px;
  background-color: #f5f5f5;
  border-radius: 8px;
  text-decoration: none;
  color: inherit;
}

.trail-card:hover {
  background-color: #e9e9e9;
}

.trail-name {
  margin: 0 0 4px 0;
}

.trail-desc {
  font-size: 14px;
  margin-bottom: 6px;
}

.trail-meta {
  font-size: 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
</style>
