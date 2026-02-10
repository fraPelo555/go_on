<script setup>
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";

/* =========================
   SERVICES
   ========================= */
import { getTrailById } from "../services/trailService";
import { getTrailFeedbacks } from "../services/feedbackService";
import { addFavourite } from "../services/userService";

/* =========================
   ROUTE
   ========================= */
const route = useRoute();
const trailId = route.params.id;

/* =========================
   STATE
   ========================= */
const trail = ref(null);
const feedbacks = ref([]);
const loading = ref(true);
const error = ref(null);

const userId = localStorage.getItem("userId");

/* =========================
   FETCH
   ========================= */
const loadTrail = async () => {
  try {
    const res = await getTrailById(trailId);
    trail.value = res.data;
  } catch {
    error.value = "Errore caricamento sentiero";
  }
};

const loadFeedbacks = async () => {
  try {
    const res = await getTrailFeedbacks(trailId);
    feedbacks.value = res.data;
  } catch {
    feedbacks.value = [];
  }
};

/* =========================
   ACTIONS (placeholder)
   ========================= */
const addToFavourites = () => {
  // addFavourite(userId, trailId);
  console.log("Aggiungi ai preferiti");
};

const exportPDF = () => {
  console.log("Export PDF");
};

/* =========================
   INIT
   ========================= */
onMounted(async () => {
  await loadTrail();
  await loadFeedbacks();
  loading.value = false;
});
</script>

<template>
  <div class="track-details-page">

    <!-- HEADER -->
    <header class="header">
      <div></div>

      <div class="header-center">
        <img src="../assets/goon_logo.png" class="logo" alt="GO-ON Logo" />
      </div>

      <div class="header-right">
        <router-link to="/" class="nav-btn">Home</router-link>
        <router-link to="/login" class="nav-btn">Login</router-link>
       </div>
    </header>

    <!-- BODY -->
    <main class="body-wrapper">
      <div v-if="loading">Caricamento...</div>
      <div v-if="error" class="error">{{ error }}</div>

      <div v-if="trail" class="content-box">

        <!-- LEFT -->
        <section class="left">

          <!-- TITLE ROW -->
          <div class="title-row">
            <button class="icon-btn" @click="addToFavourites">★</button>
            <h1 class="title">{{ trail.title }}</h1>
            <button class="icon-btn" @click="exportPDF">📄</button>
          </div>

          <!-- INFO -->
          <div class="info">
            <p>{{ trail.description }}</p>
            <p><strong>Durata:</strong> {{ trail.duration?.hours }}h {{ trail.duration?.minutes }}m</p>
            <p><strong>Dislivello:</strong> {{ trail.ascentM }} m</p>
            <p><strong>Difficoltà:</strong> {{ trail.difficulty }}</p>
          </div>

          <!-- GALLERY -->
          <div class="section">
            <h3>Galleria</h3>
            <div class="gallery-placeholder">[Galleria immagini]</div>
          </div>

          <!-- COMMENT INPUT -->
          <div class="section">
            <h3>Lascia un commento</h3>
            <textarea placeholder="Scrivi un commento..."></textarea>
          </div>

          <!-- COMMENTS -->
          <div class="section">
            <h3>Commenti</h3>
            <div
              v-for="fb in feedbacks"
              :key="fb._id"
              class="comment"
            >
              <p><strong>Valutazione:</strong> {{ fb.rating }}</p>
              <p>{{ fb.text }}</p>
            </div>
          </div>
        </section>

        <!-- RIGHT -->
        <section class="right">

          <!-- MAP -->
          <div class="map-placeholder">[MAPPA LEAFLET]</div>

          <!-- ICON ROW -->
          <div class="icon-row">
            <div>⭐ Media</div>
            <div>👥 N°</div>
            <div>⬇️</div>
            <div>🔗</div>
            <div>⚠️</div>
          </div>

        </section>
      </div>
    </main>
  </div>
</template>

<style scoped>
.track-details-page {
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

.header-right {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.logo {
  height: 50px;
}

.nav-btn {
  text-decoration: none;
  padding: 6px 12px;
  background: #2c7be5;
  color: white;
  border-radius: 6px;
}

.body-wrapper {
  flex: 1;
  padding: 24px;
}

.content-box {
  height: 100%;
  display: flex;
  gap: 24px;
  border: 1px solid #ccc;
  padding: 16px;
}

.left {
  flex: 1;
  overflow-y: auto;
}

.right {
  width: 40%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title {
  flex: 1;
  text-align: center;
}

.icon-btn {
  background: none;
  border: none;
  font-size: 1.4rem;
  cursor: pointer;
}

.map-placeholder {
  height: 300px;
  background: #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-row {
  display: flex;
  justify-content: space-between;
  text-align: center;
}

.section {
  margin-top: 24px;
}

.gallery-placeholder {
  height: 120px;
  background: #f0f0f0;
}

.comment {
  border-top: 1px solid #ddd;
  padding: 8px 0;
}

.error {
  color: red;
}
</style>
