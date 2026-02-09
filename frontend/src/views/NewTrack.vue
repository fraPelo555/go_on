<script setup>
import { ref } from "vue";

/* =========================
   FORM (backend-aligned)
   ========================= */
const form = ref({
  title: "",
  description: "",
  region: "",
  valley: "",

  difficulty: "Easy", // Easy | Medium | Difficult

  lengthKm: 0, // >= 0

  duration: {
    hours: 0,    // >= 0
    minutes: 0  // 0 - 59
  },

  roadbook: "",
  directions: "",
  parking: "",

  ascentM: 0,
  descentM: 0,
  highestPointM: 0,
  lowestPointM: 0,

  tags: [],

  coordinates: {
    Lat: "", // numero
    Lon: ""  // numero
  },

  idAdmin: "" // TODO: auth
});

/* =========================
   TAG GROUPS
   ========================= */
const tagGroups = {
  Percorso: [
    "linear_route",
    "round_trip",
    "out_and_back",
    "multi_stage_route",
    "summit_route",
    "ridge"
  ],
  Natura: [
    "flora",
    "fauna",
    "scenic",
    "geological_highlights"
  ],
  Accessibilità: [
    "family_friendly",
    "dog_friendly",
    "accessibility",
    "suitable_for_strollers"
  ],
  Tecnico: [
    "scrambling_required",
    "exposed_sections",
    "secured_passages"
  ],
  Servizi: [
    "refreshment_stops_available",
    "cableway_ascent_descent",
    "healthy_climate"
  ],
  Extra: [
    "cultural_historical_interest",
    "insider_tip"
  ]
};

/* =========================
   UTILS
   ========================= */
const toggleValue = (list, value) => {
  const index = list.indexOf(value);
  if (index === -1) list.push(value);
  else list.splice(index, 1);
};

/* =========================
   SAVE TRACK
   ========================= */
const saveTrack = () => {
  // Controlli minimi lato frontend
  if (!form.value.title) {
    alert("Il titolo è obbligatorio");
    return;
  }

  if (form.value.duration.minutes < 0 || form.value.duration.minutes > 59) {
    alert("I minuti devono essere tra 0 e 59");
    return;
  }

  if (
    form.value.coordinates.Lat === "" ||
    form.value.coordinates.Lon === ""
  ) {
    alert("Inserire coordinate valide");
    return;
  }

  /* =========================
     PAYLOAD JSON (POST)
     =========================
     Backend si aspetta qualcosa di simile:

  const payload = {
    title: form.value.title,
    description: form.value.description,
    region: form.value.region,
    valley: form.value.valley,
    difficulty: form.value.difficulty,
    lengthKm: Number(form.value.lengthKm),
    duration: {
      hours: Number(form.value.duration.hours),
      minutes: Number(form.value.duration.minutes)
    },
    roadbook: form.value.roadbook,
    directions: form.value.directions,
    parking: form.value.parking,
    ascentM: Number(form.value.ascentM),
    descentM: Number(form.value.descentM),
    highestPointM: Number(form.value.highestPointM),
    lowestPointM: Number(form.value.lowestPointM),
    tags: form.value.tags,
    coordinates: {
      lat: Number(form.value.coordinates.Lat),
      lon: Number(form.value.coordinates.Lon)
    },
    idAdmin: form.value.idAdmin
  };

  axios.post("/trails", payload)
  */

  console.log("Payload pronto per POST:", JSON.stringify(form.value, null, 2));
};
</script>

<template>
  <div class="new-track-page">

    <!-- HEADER -->
    <header class="header">
      <div class="header-left">
        <router-link to="/statistics" class="nav-btn">Statistiche</router-link>
      </div>

      <div class="header-center">
        <img src="../assets/goon_logo.png" class="logo" alt="GO-ON Logo" />
      </div>

      <div class="header-right">
        <router-link to="/" class="nav-btn">Home</router-link>
        <router-link to="/profile" class="nav-btn">Profilo</router-link>
      </div>
    </header>

    <!-- BODY -->
    <main class="form-body">

      <!-- LEFT COLUMN -->
      <section class="column">
        <div class="field">
          <label>Nome *</label>
          <input v-model="form.title" />
        </div>

        <div class="field">
          <label>Descrizione breve</label>
          <textarea v-model="form.description" />
        </div>

        <div class="row">
          <div class="field">
            <label>Regione</label>
            <input v-model="form.region" />
          </div>

          <div class="field">
            <label>Valle</label>
            <input v-model="form.valley" />
          </div>
        </div>

        <div class="row">
          <div class="field">
            <label>Lunghezza (km)</label>
            <input type="number" min="0" step="0.1" v-model="form.lengthKm" />
          </div>

          <div class="field">
            <label>Difficoltà</label>
            <select v-model="form.difficulty">
              <option>Easy</option>
              <option>Medium</option>
              <option>Difficult</option>
            </select>
          </div>
        </div>

        <div class="row">
          <div class="field">
            <label>Ore</label>
            <input type="number" min="0" v-model="form.duration.hours" />
          </div>

          <div class="field">
            <label>Minuti</label>
            <input type="number" min="0" max="59" v-model="form.duration.minutes" />
          </div>
        </div>

        <div class="field">
          <label>Roadbook</label>
          <textarea v-model="form.roadbook" />
        </div>

        <div class="field">
          <label>Indicazioni</label>
          <textarea v-model="form.directions" />
        </div>


      </section>

      <!-- RIGHT COLUMN -->
      <section class="column">
        <div class="field">
          <label>Parcheggio</label>
          <input v-model="form.parking" />
        </div>
        <div class="row">
          <div class="field">
            <label>Salita (m)</label>
            <input type="number" min="0" v-model="form.ascentM" />
          </div>

          <div class="field">
            <label>Discesa (m)</label>
            <input type="number" min="0" v-model="form.descentM" />
          </div>
        </div>

        <div class="row">
          <div class="field">
            <label>Quota max (m)</label>
            <input type="number" v-model="form.highestPointM" />
          </div>

          <div class="field">
            <label>Quota min (m)</label>
            <input type="number" v-model="form.lowestPointM" />
          </div>
        </div>

        <!-- TAGS -->
        <div class="field">
          <div
            v-for="(tags, groupName) in tagGroups"
            :key="groupName"
            class="tag-group"
          >
            <span class="tag-title">{{ groupName }}</span>

            <div class="buttons">
              <button
                v-for="tag in tags"
                :key="tag"
                type="button"
                @click="toggleValue(form.tags, tag)"
                :class="{ active: form.tags.includes(tag) }"
              >
                {{ tag.replaceAll('_', ' ') }}
              </button>
            </div>
          </div>
        </div>

        <div class="field">
          <label>Coordinate (centro mappa) *</label>
          <input type="number" step="0.000001" placeholder="Latitudine" v-model="form.coordinates.Lat" />
          <input type="number" step="0.000001" placeholder="Longitudine" v-model="form.coordinates.Lon" />
        </div>

        <button class="save-btn" @click="saveTrack">
          Salva
        </button>
      </section>

    </main>
  </div>
</template>

<style scoped>
/* invariato, solo estetica */
</style>


<style scoped>
.new-track-page {
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

.form-body {
  flex: 1;
  display: flex;
  padding: 24px;
  gap: 24px;
}

.column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.field label {
  font-weight: bold;
}

.field input,
.field textarea,
.field select {
  width: 100%;
  padding: 6px;
}

textarea {
  min-height: 80px;
}

.row {
  display: flex;
  gap: 12px;
}

.row > .field {
  flex: 1;
  min-width: 0;
}

.tag-group {
  margin-bottom: 8px;
}

.tag-title {
  font-weight: bold;
  font-size: 0.9rem;
}

.buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.buttons button {
  padding: 6px 10px;
  border: 1px solid #aaa;
  background: #f5f5f5;
  cursor: pointer;
  border-radius: 6px;
}

.buttons button.active {
  background: #2c7be5;
  color: white;
  border-color: #2c7be5;
}

.save-btn {
  margin-top: 16px;
  width: 120px;
  padding: 10px;
  background: #2c7be5;
  align-self: flex-end;
  color: white;
  border: none;
  cursor: pointer;
}
</style>
