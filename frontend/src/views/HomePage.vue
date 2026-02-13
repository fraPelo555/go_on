<script setup>
import { ref, watch, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import TrailMap from "../components/TrailMap.vue";
import { getTrails, deleteTrail, getNearbyTrails } from "../services/trailService";
import { addFavourite, removeFavourite, getFavourites } from "../services/userService";

/* =========================
   ROUTER
========================= */
const route = useRoute();
const router = useRouter();

/* =========================
   STATE
========================= */
const trails = ref([]);
const visibleTrails = ref([]);
const showAdvanced = ref(false);
const selectedTags = ref([]);
const searchText = ref("");
const favouriteIds = ref(new Set());
const checkingFav = ref(false);

/* =========================
   AUTH
========================= */
const isLogged = ref(false);
const userId = ref(null);
const isAdmin = ref(false);
const username = ref(localStorage.getItem("username") || "");

const checkAuth = async () => {
  const token = localStorage.getItem("token");
  if (token) {
    isLogged.value = true;
    userId.value = localStorage.getItem("userId");
    isAdmin.value = localStorage.getItem("isAdmin") === "true";
  } else {
    isLogged.value = false;
    userId.value = null;
    isAdmin.value = false;
  }
};

onMounted(async () => {
  await checkAuth();
  await fetchTrails();
  if (isLogged.value) await loadFavourites();
});

/* =========================
   TAG DINAMICI
========================= */
const tagGroups = ref({});
const fetchTags = (trailList) => {
  const allTags = new Set();
  trailList.forEach(t => (t.tags || []).forEach(tag => allTags.add(tag)));
  const tags = Array.from(allTags);

  tagGroups.value = {
    Percorso: tags.filter(t => ["linear_route","round_trip","out_and_back","multi_stage_route","summit_route","ridge"].includes(t)),
    Natura: tags.filter(t => ["flora","fauna","scenic","geological_highlights"].includes(t)),
    Accessibilità: tags.filter(t => ["family_friendly","dog_friendly","accessibility","suitable_for_strollers"].includes(t)),
    Tecnico: tags.filter(t => ["scrambling_required","exposed_sections","secured_passages"].includes(t)),
    Servizi: tags.filter(t => ["refreshment_stops_available","cableway_ascent_descent","healthy_climate"].includes(t)),
    Extra: tags.filter(t => ["cultural_historical_interest","insider_tip"].includes(t)),
  };
};

const toggleTag = (tag) => {
  selectedTags.value.includes(tag)
    ? selectedTags.value.splice(selectedTags.value.indexOf(tag),1)
    : selectedTags.value.push(tag);
  updateFilter("tags", selectedTags.value.join(","));
};

/* =========================
   FETCH TRAILS
========================= */
const fetchTrails = async () => {
  try {
    const { data } = await getTrails(route.query);
    trails.value = data.map(trail => ({
      id: trail.id,
      title: trail.title,
      description: trail.description || "Nessuna descrizione",
      difficulty: trail.difficulty,
      lengthLabel: `${trail.lengthKm} km`,
      durationLabel: `${trail.duration?.hours || 0}h ${trail.duration?.minutes || 0}m`,
      tags: trail.tags || [],
      location: trail.location?.coordinates ? { lon: trail.location.coordinates[0], lat: trail.location.coordinates[1] } : null
    }));
    visibleTrails.value = trails.value;
    fetchTags(trails.value);
  } catch (err) { console.error(err); }
};

watch(() => route.query, fetchTrails, { immediate: true });

/* =========================
   SEARCH & FILTER
========================= */
const handleSearch = (event) => {
  searchText.value = event.target.value.toLowerCase();
  visibleTrails.value = trails.value.filter(t =>
    t.title.toLowerCase().includes(searchText.value) ||
    t.description.toLowerCase().includes(searchText.value)
  );
};

const updateFilter = async (key,value) => {
  const query = { ...route.query };
  if (!value) delete query[key]; else query[key] = value;
  router.replace({ query });
  await applyNearbyFilter();
};

/* =========================
   FAVOURITES
========================= */
const loadFavourites = async () => {
  if (!userId.value) { favouriteIds.value = new Set(); return; }
  checkingFav.value = true;
  try {
    const res = await getFavourites(userId.value);
    const normalize = p => Array.isArray(p) ? p : (p.favourites||p.data||[]);
    const ids = normalize(res.data).map(item => (item?._id || item?.id || item).toString());
    favouriteIds.value = new Set(ids);
  } catch { favouriteIds.value = new Set(); }
  finally { checkingFav.value = false; }
};

const toggleFavourite = async (trailId) => {
  if (!isLogged.value) { alert("Devi essere loggato"); return; }
  try {
    if (!favouriteIds.value.has(trailId)) { await addFavourite(userId.value, trailId); favouriteIds.value.add(trailId); }
    else { await removeFavourite(userId.value, trailId); favouriteIds.value.delete(trailId); }
    favouriteIds.value = new Set(favouriteIds.value);
  } catch (err) { console.error(err); alert("Errore preferiti"); }
};

/* =========================
   TRAIL ACTIONS
========================= */
const handleEditTrail = (trailId) => router.push({ path:"/new-track", query:{editId:trailId} });
const handleDeleteTrail = async (trailId) => {
  if (!isAdmin.value) return;
  if (!confirm("Sei sicuro di voler eliminare il sentiero?")) return;
  try {
    await deleteTrail(trailId);
    trails.value = trails.value.filter(t=>t.id!==trailId);
    visibleTrails.value = visibleTrails.value.filter(t=>t.id!==trailId);
  } catch(err){ console.error(err); }
};

/* =========================
   GEOLOC
========================= */
const geolocCenter = ref(null);
const geolocLoading = ref(false);
const geolocError = ref("");
const centerMode = ref("trails");
const enableGeolocation = () => {
  if (!navigator.geolocation) { geolocError.value="Browser non supportato"; return; }
  geolocLoading.value = true; geolocError.value="";
  navigator.geolocation.getCurrentPosition(
    pos => { geolocCenter.value={lat:pos.coords.latitude, lon:pos.coords.longitude}; centerMode.value="geoloc"; geolocLoading.value=false; },
    () => { geolocError.value="Errore geolocalizzazione"; geolocLoading.value=false; },
    { enableHighAccuracy:true }
  );
};

/* =========================
   MAP CENTER
========================= */
const mapCenter = computed(() => {
  if(centerMode.value==="geoloc" && geolocCenter.value) return geolocCenter.value;
  if(visibleTrails.value?.length) return visibleTrails.value[0].location || {lat:45.4394, lon:7.6473};
  return {lat:45.4394, lon:7.6473};
});

/* =========================
   PROXIMITY FILTER
========================= */
const radiusKm = ref(5);
const filterLat = ref(mapCenter.value.lat);
const filterLon = ref(mapCenter.value.lon);

const applyNearbyFilter = async () => {
  if(!filterLat.value || !filterLon.value || !radiusKm.value) return;
  try {
    const { data } = await getNearbyTrails(filterLat.value, filterLon.value, radiusKm.value);
    visibleTrails.value = data.map(trail => ({
      id: trail.id,
      title: trail.title,
      description: trail.description || "Nessuna descrizione",
      difficulty: trail.difficulty,
      lengthLabel: `${trail.lengthKm} km`,
      durationLabel: `${trail.duration?.hours||0}h ${trail.duration?.minutes||0}m`,
      tags: trail.tags || [],
      location: trail.location?.coordinates ? { lon: trail.location.coordinates[0], lat: trail.location.coordinates[1] } : null
    }));
    fetchTags(visibleTrails.value);
  } catch(err){ console.error(err); }
};
</script>

<template>
<div class="homepage">

  <!-- HEADER -->
  <header class="header">
    <div class="header-left">
      <router-link v-if="isAdmin" to="/new-track" class="login-btn">NewTrack</router-link>
      <router-link v-if="isAdmin" to="/statistics" class="login-btn">Statistics</router-link>
    </div>
    <div class="header-center"><img src="../assets/goon_logo.png" class="logo"/></div>
    <div class="header-right">
      <router-link v-if="isAdmin" to="/admin" class="login-btn">AdminInfo</router-link>
      <div v-if="isLogged" class="user-info"><span class="username-box">👤 {{ username }}</span></div>
      <router-link v-if="!isLogged" to="/login" class="login-btn">Login</router-link>
      <router-link v-else to="/profile" class="login-btn">Profile</router-link>
    </div>
  </header>

  <!-- BODY -->
  <main class="main-content">

    <!-- MAP -->
    <section class="map-section">
      <TrailMap :center="mapCenter" :zoom="13" @centerChanged="c=>{filterLat=c.lat; filterLon=c.lon}"/>
      <button class="geo-btn" @click="enableGeolocation" :disabled="geolocLoading" title="Usa la tua posizione">
        <span v-if="geolocLoading">…</span>
        <span v-else>📍</span>
      </button>
      <div v-if="geolocError" class="geoloc-error">{{ geolocError }}</div>
    </section>

    <!-- SIDEBAR -->
    <aside class="sidebar">
      <input type="text" placeholder="Cerca un sentiero..." class="search-input" @input="handleSearch"/>
      <button class="advanced-btn" @click="showAdvanced=!showAdvanced">Advanced Search</button>

      <section v-if="showAdvanced" class="advanced-search">
        <div class="filter-row"><label>Raggio (km)</label><input type="number" min="0" v-model="radiusKm" @input="applyNearbyFilter"/></div>
        <div class="filter-row"><label>Latitudine</label><input type="number" step="0.0001" v-model="filterLat" @input="applyNearbyFilter"/></div>
        <div class="filter-row"><label>Longitudine</label><input type="number" step="0.0001" v-model="filterLon" @input="applyNearbyFilter"/></div>

        <div class="filter-row"><label>Region</label><input @input="e=>updateFilter('region',e.target.value)"/></div>
        <div class="filter-row"><label>Valley</label><input @input="e=>updateFilter('valley',e.target.value)"/></div>
        <div class="filter-row"><label>Difficulty</label>
          <select @change="e=>updateFilter('difficulty',e.target.value)">
            <option value="">All</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Difficult">Difficult</option>
          </select>
        </div>

        <div v-for="(tags,group) in tagGroups" :key="group" class="tag-group">
          <span class="tag-group-title">{{ group }}</span>
          <div class="tag-container">
            <button v-for="tag in tags" :key="tag" class="tag-btn" :class="{active:selectedTags.includes(tag)}" @click="toggleTag(tag)">
              {{ tag.replaceAll('_',' ') }}
            </button>
          </div>
        </div>
      </section>

      <!-- RESULTS -->
      <div class="results">
        <div v-for="trail in visibleTrails" :key="trail.id" class="trail-card">
          <router-link :to="`/tracks/${trail.id}`">
            <h4>{{ trail.title }}</h4>
            <p>{{ trail.description }}</p>
            <div class="trail-meta">
              <span>{{ trail.lengthLabel }}</span>
              <span>{{ trail.durationLabel }}</span>
              <span>{{ trail.difficulty }}</span>
            </div>
          </router-link>

          <div class="trail-actions">
            <button v-if="isLogged" class="fav-btn" :class="{active:favouriteIds.has(trail.id)}" @click.stop="toggleFavourite(trail.id)">
              <span v-if="favouriteIds.has(trail.id)">★</span><span v-else>☆</span>
            </button>
            <button v-if="isAdmin" @click="handleEditTrail(trail.id)">✏️</button>
            <button v-if="isAdmin" @click="handleDeleteTrail(trail.id)">🗑️</button>
          </div>
        </div>
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

/* ================= HEADER ================= */
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
  gap: 12px;
  justify-content: flex-end;
}

.login-btn {
  padding: 8px 16px;
  border-radius: 6px;
  background-color: #2c7be5;
  color: white;
  text-decoration: none;
}

/* ================= BODY ================= */
.main-content {
  flex: 1;
  display: flex;
}

.fav-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
}

.fav-btn.active {
  color: gold;
}

/* ================= MAP ================= */
.map-section {
  flex: 2;
  position: relative;
}

.map-container {
  width: 100%;
  height: 100%;
}

/* GEO BUTTON */
.geo-btn {
  position: absolute;
  bottom: 20px;
  left: 20px;
  z-index: 1000;          /* 👈 FONDAMENTALE */
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background-color: white;
  font-size: 20px;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
}

.tag-group {
  margin-bottom: 10px;
}

.tag-group-title {
  font-size: 13px;
  font-weight: 600;
  display: block;
  margin-bottom: 4px;
}

.tag-container {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-btn {
  padding: 4px 8px;
  font-size: 12px;
  border-radius: 14px;
  border: 1px solid #ccc;
  background: #f5f5f5;
  cursor: pointer;
  transition: 0.2s ease;
}

.tag-btn:hover {
  background: #e2e2e2;
}

.tag-btn.active {
  background: #2c7be5;
  color: white;
  border-color: #2c7be5;
}

/* ================= SIDEBAR ================= */
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

/* ================= RESULTS ================= */
.results {
  flex: 1;
  overflow-y: auto;
}

.no-trails {
  font-style: italic;
  color: #888;
  text-align: center;
  margin-top: 12px;
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

.trail-card a {
  text-decoration: none;
  color: inherit;
}

.trail-card a:hover {
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

.user-box {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-left {
  display: flex;
  gap: 12px;
}

.trail-actions {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}
</style>