<script setup>
  import { ref, watch, onMounted } from "vue";
  import { useRoute, useRouter } from "vue-router";
  import TrailMap from "../components/TrailMap.vue";
  import { getTrails } from "../services/trailService";

  /* ROUTER */
  const route = useRoute();
  const router = useRouter();

  /* STATE */
  const trails = ref([]);
  const visibleTrails = ref([]);
  const showAdvanced = ref(false);
  const selectedTags = ref([]);

  /* AUTH STATE */
  const isLogged = ref(false);
  const userId = ref(null);
  const isAdmin = ref(false);

  const checkAuth = () => {
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

  onMounted(() => {
    checkAuth();
  });

  /* TAG DINAMICI */
  const tagGroups = ref({});

  /* FETCH TAGS (DERIVATI) */
  const fetchTags = (trailList) => {
    const allTags = new Set();
  
    trailList.forEach(trail => {
      (trail.tags || []).forEach(tag => allTags.add(tag));
  });

  const tags = Array.from(allTags);

  tagGroups.value = {
    Percorso: tags.filter(t =>
      ["linear_route", "round_trip", "out_and_back", "multi_stage_route", "summit_route", "ridge"].includes(t)
    ),
    Natura: tags.filter(t =>
      ["flora", "fauna", "scenic", "geological_highlights"].includes(t)
    ),
    Accessibilità: tags.filter(t =>
      ["family_friendly", "dog_friendly", "accessibility", "suitable_for_strollers"].includes(t)
    ),
    Tecnico: tags.filter(t =>
      ["scrambling_required", "exposed_sections", "secured_passages"].includes(t)
    ),
    Servizi: tags.filter(t =>
      ["refreshment_stops_available", "cableway_ascent_descent", "healthy_climate"].includes(t)
    ),
    Extra: tags.filter(t =>
      ["cultural_historical_interest", "insider_tip"].includes(t)
    )
   };
  };

  /* FETCH TRAILS */
  const fetchTrails = async () => {
    try {
      const response = await getTrails(route.query);

      trails.value = response.data.map(trail => ({
        id: trail._id,
        title: trail.title,
        description: trail.description || "Nessuna descrizione",
        region: trail.region,
        valley: trail.valley,
        difficulty: trail.difficulty,
        lengthKm: trail.lengthKm,
        lengthLabel: `${trail.lengthKm} km`,
        duration: trail.duration,
        durationLabel: `${trail.duration.hours}h ${trail.duration.minutes}m`,
        ascentM: trail.ascentM,
        descentM: trail.descentM,
        highestPointM: trail.highestPointM,
        lowestPointM: trail.lowestPointM,
        roadbook: trail.roadbook,
        directions: trail.directions,
        parking: trail.parking,
        tags: trail.tags || [],
        coordinates: trail.coordinates,
        location: trail.location?.coordinates
          ? { lon: trail.location.coordinates[0], lat: trail.location.coordinates[1] }
          : null
      }));
     
      visibleTrails.value = trails.value;

    /* 👇 TAG DINAMICI */
    fetchTags(trails.value);

    } catch (err) {
      console.error("Errore fetching trails:", err);
    }
  };

  /* WATCH QUERY */
  watch(
    () => route.query,
    fetchTrails,
    { immediate: true }
  );

  /* TAG HANDLER */
  const toggleTag = (tag) => {
    if (selectedTags.value.includes(tag)) {
      selectedTags.value = selectedTags.value.filter(t => t !== tag);
    } else {
      selectedTags.value.push(tag);
    }
    updateFilter("tags", selectedTags.value.join(","));
  };

  /* UPDATE FILTER */
  const updateFilter = (key, value) => {
    const query = { ...route.query };
    if (!value || value.length === 0) delete query[key];
    else query[key] = value;
    router.replace({ query });
  };
</script>


<template>
  <div class="homepage">

    <!-- HEADER -->
    <header class="header">
      <div></div>
      <div class="header-center">
        <img src="../assets/goon_logo.png" class="logo" />
      </div>
      <div class="header-right">
      
        <router-link v-if="!isLogged" to="/login" class="login-btn" >
          Login
        </router-link>
       
        <div v-else class="user-box">
          <span class="user-id">
            {{ userId }}
          </span>
         
          <router-link to="/profile" class="login-btn" >
          Profile
        </router-link>
        </div>
       
      </div>

    </header>

    <!-- BODY -->
    <main class="main-content">

      <!-- MAP -->
      <section class="map-section">
        <TrailMap :markers="visibleTrails" />
        <button class="geo-btn" @click="enableGeolocation">📍</button>
      </section>

      <!-- SIDEBAR -->
      <aside class="sidebar">

        <!-- SEARCH -->
        <input
          type="text"
          placeholder="Cerca un sentiero..."
          class="search-input"
          @input="handleSearch"
        />

        <button class="advanced-btn" @click="showAdvanced = !showAdvanced">
          Advanced Search
        </button>

        <!-- ADVANCED SEARCH -->
        <section v-if="showAdvanced" class="advanced-search">

          <div class="filter-row">
            <label>Region</label>
            <input @input="e => updateFilter('region', e.target.value)" />
          </div>

          <div class="filter-row">
            <label>Valley</label>
            <input @input="e => updateFilter('valley', e.target.value)" />
          </div>

          <div class="filter-row">
            <label>Difficulty</label>
            <select @change="e => updateFilter('difficulty', e.target.value)">
              <option value="">All</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Difficult">Difficult</option>
            </select>
          </div>

          <div class="filter-row">
            <label>Length (km)</label>
            <div class="range">
              <input type="number" placeholder="Min" @input="e => updateFilter('minLength', e.target.value)" />
              <input type="number" placeholder="Max" @input="e => updateFilter('maxLength', e.target.value)" />
            </div>
          </div>

          <div class="filter-row">
            <label>Duration (minutes)</label>
            <div class="range">
              <input type="number" placeholder="Min" @input="e => updateFilter('minDuration', e.target.value)" />
              <input type="number" placeholder="Max" @input="e => updateFilter('maxDuration', e.target.value)" />
            </div>
          </div>

          <div class="filter-row">
            <label>Tags</label>

            <div
              v-for="(tags, group) in tagGroups"
              :key="group"
              class="tag-group"
            >
              <h5>{{ group }}</h5>
              <div class="tag-scroll">
                <button
                  v-for="tag in tags"
                  :key="tag"
                  :class="{ active: selectedTags.includes(tag) }"
                  @click="toggleTag(tag)"
                >
                  {{ tag.replaceAll("_", " ") }}
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- RESULTS -->
        <div class="results">
          <router-link
            v-for="trail in visibleTrails"
            :key="trail.id"
            :to="`/tracks/${trail.id}`"
            class="trail-card"
          >
            <h4>{{ trail.title }}</h4>
            <p>{{ trail.description }}</p>
            <div class="trail-meta">
              <span>{{ trail.lengthLabel }}</span>
              <span>{{ trail.durationLabel }}</span>
              <span>{{ trail.difficulty }}</span>
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


</style>
