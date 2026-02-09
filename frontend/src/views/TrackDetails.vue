<script setup>
import { useRoute } from "vue-router";
import { ref, onMounted } from "vue";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-gpx";

const route = useRoute();
const trackId = route.params.id;
const comments = ref([]);
const track = ref(null);
const map = ref(null);

// MOCK DATABASE (simula il backend)
const mockTracks = [
  {
    id: "sentiero-aquile",
    name: "Sentiero delle Aquile",
    description: "Percorso panoramico tra le creste.",
    duration: "3h",
    length: "8 km",
    elevation: "450 m",
  },
  {
    id: "anello-bosco",
    name: "Anello del Bosco",
    description: "Giro facile immerso nel verde.",
    duration: "1h 30m",
    length: "4 km",
    elevation: "120 m",
  },
  {
    id: "percorso-lago",
    name: "Percorso del Lago",
    description: "Passeggiata rilassante lungo il lago.",
    duration: "2h",
    length: "6 km",
    elevation: "200 m",
  },
];

// Simula chiamata API
const loadTrack = () => {
  track.value = mockTracks.find(t => t.id === trackId);
};

const initMap = () => {
  map.value = L.map("leaflet-map").setView([45.4642, 9.19], 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap"
  }).addTo(map.value);

  // GPX
  new L.GPX("/test.gpx", {
    async: true,
    marker_options: {
      startIconUrl: null,
      endIconUrl: null,
      shadowUrl: null
    }
  })
    .on("loaded", e => {
      map.value.fitBounds(e.target.getBounds());
    })
    .addTo(map.value);
};

onMounted(() => {
  loadTrack();
  initMap();
});

//  const loadTrack = async () => { 
//   const response = await fetch(
//     `http://localhost:3000/tracks/${trackId}`
//   );
//   track.value = await response.json();
// }; 

</script>

<template>
  <div class="track-details-page">

    <!-- HEADER -->
    <!-- HEADER -->
    <header class="header">
      <div class="header-left">
      </div>
      
      <div class="header-center">
       <img src="../assets/goon_logo.png" alt="GO-ON Logo" class="logo" /> </div>
       <div class="header-right">
        <router-link to="/login" class="nav-btn">
         Login
        </router-link>
        <router-link to="/" class="nav-btn">Home</router-link>
      </div>
    </header>

    <!-- BODY WRAPPER -->
    <main class="body-wrapper">

      <!-- LEFT SECTION -->
      <section class="left-pane">

        <!-- TOP BAR -->
        <div class="top-bar">
          <!-- HOME ICON BUTTON -->
          <!-- CLASSE: home-icon-btn -->

          <h2 class="track-title">{{ track?.name }}</h2>

          <!-- PDF ICON BUTTON -->
          <!-- CLASSE: pdf-icon-btn -->
          <button class="icon-btn pdf-icon-btn">📄</button>
        </div>

        <!-- INFO -->
        <div class="info-section">
          <p class="description">
            Descrizione dettagliata del percorso. Qui verranno riportate le
            caratteristiche principali, il contesto ambientale e le indicazioni
            utili.
          </p>

          <div class="details">
            <p><strong>Durata:</strong> {{ track?.duration }}</p>
            <p><strong>Dislivello:</strong> {{ track?.elevation }}</p>
            <p><strong>Mappa:</strong> RendereDinamico </p>
            <p><strong>Traccia:</strong> RendereDinamico</p>
            <p><strong>Difficoltà:</strong> RendereDinamico</p>
          </div>

          <div class="extras">
            <p><strong>Servizi disponibili:</strong> RendereDinamico</p>
            <p><strong>Punti di rilievo:</strong> RendereDinamico</p>
          </div>
        </div>

        <!-- GALLERY -->
        <div class="gallery-section">
          <h3>Galleria</h3>
          <div class="gallery">
            <div class="gallery-item" v-for="i in 5" :key="i"></div>
          </div>
        </div>

        <!-- COMMENTS -->
        <div class="comments-section">
          <h3>Lascia un commento</h3>
          <textarea placeholder="Scrivi qui il tuo commento..."></textarea>

          <h3>Commenti</h3>
          <div class="comment" v-for="(c,i) in comments" :key="i">
            {{ c }}
          </div>
        </div>

      </section>

      <!-- RIGHT SECTION -->
      <section class="right-pane">

        <!-- MAP -->
        <div class="map-container">
          <!-- Placeholder Leaflet -->
          <div id="leaflet-map" class="leaflet-map"></div>
        </div>

        <!-- ACTIONS -->
        <div class="actions">
          <div class="ratings">
            <span class="avg">RD ★</span>
            <span class="count">(RD)</span>
          </div>

          <!-- ICON BUTTONS -->
          <button class="icon-btn">⬇️</button>
          <button class="icon-btn">🔗</button>
          <button class="icon-btn">⚠️</button>
        </div>

      </section>

    </main>

  </div>
</template>

<style scoped>
.track-details-page {
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
  gap: 12px;
}

.nav-btn {
  padding: 6px 12px;
  background: #2c7be5;
  color: white;
  border-radius: 6px;
  text-decoration: none;
}

.leaflet-map {
  width: 100%;
  height: 100%;
  min-height: 400px;
  border-radius: 8px;
}

/* BODY */
.body-wrapper {
  flex: 1;
  margin: 16px;
  border: 1px solid #ddd;
  display: flex;
  overflow: hidden;
}

/* LEFT */
.left-pane {
  width: 50%;
  overflow-y: auto;
  padding: 16px;
}

.top-bar {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  margin-bottom: 16px;
}

.track-title {
  text-align: center;
}

.icon-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
}

.info-section {
  margin-bottom: 24px;
}

.details,
.extras {
  margin-top: 12px;
}

/* GALLERY */
.gallery {
  display: flex;
  gap: 8px;
  overflow-x: auto;
}

.gallery-item {
  min-width: 120px;
  height: 80px;
  background: #ccc;
}

/* COMMENTS */
.comments-section textarea {
  width: 100%;
  min-height: 80px;
  margin-bottom: 16px;
}

.comment {
  padding: 8px;
  border-bottom: 1px solid #ddd;
}

/* RIGHT */
.right-pane {
  width: 50%;
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.map-container {
  flex: 1;
}

.actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
}

.ratings {
  font-size: 18px;
}
</style>
