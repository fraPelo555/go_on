<script setup>
import { ref, onMounted, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { createTrail, updateTrail, getTrailById, uploadGPX } from "../services/trailService";

const router = useRouter();
const route = useRoute();

const username = ref(localStorage.getItem("username") || "");
const editId = route.query.editId || null;

// GPX upload state
const gpxFile = ref(null);
const gpxPreviewName = ref("");

// file input handler
const onFileSelected = (event) => {
  const f = event.target.files && event.target.files[0];
  if (f) {
    gpxFile.value = f;
    gpxPreviewName.value = f.name;
  }
};

// drag & drop handlers
const onDrop = (event) => {
  event.preventDefault();
  const f = event.dataTransfer?.files?.[0];
  if (f) {
    gpxFile.value = f;
    gpxPreviewName.value = f.name;
  }
};

const onDragOver = (event) => {
  event.preventDefault();
};


/* =========================
   MODE BAR (CREATE / UPDATE)
   ========================= */
const activeMode = ref(editId ? "update" : "create");

/* =========================
   ADMIN GUARD
   ========================= */
const isAuthorized = ref(false);
const authError = ref("");

/* =========================
   FORM DATA
   ========================= */
const form = ref({
  title: "",
  description: "",
  region: "",
  valley: "",
  difficulty: "Easy",
  lengthKm: 0,
  duration: { hours: 0, minutes: 0 },
  ascentM: 0,
  descentM: 0,
  highestPointM: 0,
  lowestPointM: 0,
  roadbook: "",
  directions: "",
  parking: "",
  tags: [],
  lat: 0,
  lon: 0,
  idAdmin: localStorage.getItem("userId") || ""
});

/* =========================
   TAG GROUPS
   ========================= */
const tagGroups = {
  Percorso: ["linear_route", "round_trip", "out_and_back"],
  Natura: ["flora", "fauna", "scenic"],
  Accessibilità: ["family_friendly", "dog_friendly"],
  Tecnico: ["scrambling_required", "exposed_sections"],
  Servizi: ["refreshment_stops_available"],
  Extra: ["cultural_historical_interest"]
};

const toggleTag = (tag) => {
  const idx = form.value.tags.indexOf(tag);
  idx === -1 ? form.value.tags.push(tag) : form.value.tags.splice(idx, 1);
};

/* =========================
   HELPERS
   ========================= */
const isValidObjectId = (id) => {
  return typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);
};

/* =========================
   LOAD TRAIL (solo se update)
   ========================= */
const loadTrailData = async () => {
  if (!editId || !isValidObjectId(editId)) return;

  try {
    const { data } = await getTrailById(editId);

    form.value.title = data.title || "";
    form.value.description = data.description || "";
    form.value.region = data.region || "";
    form.value.valley = data.valley || "";
    form.value.difficulty = data.difficulty || "Easy";
    form.value.lengthKm = data.lengthKm ?? 0;

    if (data.duration) {
      if (typeof data.duration === "string") {
        try { form.value.duration = JSON.parse(data.duration); } catch {}
      } else {
        form.value.duration.hours = Number(data.duration.hours || 0);
        form.value.duration.minutes = Number(data.duration.minutes || 0);
      }
    }

    form.value.ascentM = data.ascentM ?? 0;
    form.value.descentM = data.descentM ?? 0;
    form.value.highestPointM = data.highestPointM ?? 0;
    form.value.lowestPointM = data.lowestPointM ?? 0;

    form.value.roadbook = data.roadbook || "";
    form.value.directions = data.directions || "";
    form.value.parking = data.parking || "";

    if (data.tags) {
      if (Array.isArray(data.tags)) form.value.tags = data.tags;
      else {
        try { form.value.tags = JSON.parse(data.tags); } catch {}
      }
    }

    if (data.coordinates) {
      try {
        const coords = typeof data.coordinates === "string"
          ? JSON.parse(data.coordinates)
          : data.coordinates;

        if (coords.DD) {
          form.value.lat = Number(coords.DD.lat || 0);
          form.value.lon = Number(coords.DD.lon || 0);
        }
      } catch {}
    }

  } catch (err) {
    console.error("Errore caricamento trail:", err);
  }
};

/* =========================
   SAVE TRACK
   ========================= */
const saveTrack = async () => {

  if (!form.value.title.trim()) {
    alert("Il titolo è obbligatorio.");
    return;
  }

  if (!form.value.idAdmin || !isValidObjectId(form.value.idAdmin)) {
    alert("idAdmin non valido.");
    return;
  }

  const payload = {
    title: form.value.title.trim(),
    description: form.value.description || "",
    region: form.value.region || "",
    valley: form.value.valley || "",
    difficulty: form.value.difficulty || "Easy",
    lengthKm: Number(form.value.lengthKm || 0),
    duration: JSON.stringify({
      hours: Number(form.value.duration.hours || 0),
      minutes: Number(form.value.duration.minutes || 0)
    }),
    ascentM: Number(form.value.ascentM || 0),
    descentM: Number(form.value.descentM || 0),
    highestPointM: Number(form.value.highestPointM || 0),
    lowestPointM: Number(form.value.lowestPointM || 0),
    roadbook: form.value.roadbook || "",
    directions: form.value.directions || "",
    parking: form.value.parking || "",
    tags: JSON.stringify(form.value.tags || []),
    coordinates: JSON.stringify({
      DD: { lat: Number(form.value.lat), lon: Number(form.value.lon) }
    }),
  };

  try {
    // esegui create o update e cattura la response
    let response = null;
    let trailIdForUpload = null;
    
    if (activeMode.value === "update") {
      if (!editId || !isValidObjectId(editId)) {
        alert("ID del sentiero mancante o non valido nell'URL.");
        return;
      }
      response = await updateTrail(editId, payload);
      trailIdForUpload = editId;
    } else {
      response = await createTrail(payload);
      // prova a ricavare l'id creato da più possibili shape di response
      trailIdForUpload =
        response?.data?.trail?._id ||
        response?.data?._id ||
        response?.data?.id ||
        null;
    }
    
    // se create/update ha avuto successo e abbiamo un file GPX selezionato => upload
    
    //SE BINARIO
    if (gpxFile.value && trailIdForUpload) {
      try {
        const fd = new FormData();
        // inviamo il file così com'è: backend lo riceverà come file; se vuoi inviare solo testo usa File/Blob con tipo text/xml
        fd.append("gpx", gpxFile.value, gpxFile.value.name);
      
        await uploadGPX(trailIdForUpload, fd);
        // opzionale: notifica di successo upload
        console.log("GPX caricato con successo per trail:", trailIdForUpload);
      } catch (uploadErr) {
        console.error("Errore upload GPX:", uploadErr);
        // qui puoi decidere se considerare l'operazione fallita o meno; io avviso l'admin
        alert("Attenzione: il sentiero è stato salvato ma l'upload del GPX è fallito.");
      }
    }

    router.back();
   
  } catch (err) {
    console.error("Errore salvataggio:", err.response?.data || err.message || err);
    alert("Errore durante il salvataggio del sentiero.");
  }

};

/* =========================
   ON MOUNT
   ========================= */
onMounted(async () => {

  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");
  const isAdmin = localStorage.getItem("isAdmin");

  if (!token || !userId) {
    authError.value = "Devi essere loggato.";
    return;
  }

  if (isAdmin !== "true") {
    authError.value = "Permessi amministratore richiesti.";
    return;
  }

  isAuthorized.value = true;

  if (activeMode.value === "update") {
    await loadTrailData();
  }
});

/* Se l'admin cambia tab */
watch(activeMode, async (newVal) => {
  if (newVal === "update") {
    await loadTrailData();
  }
});
</script>

<template>
  <div>
    <div v-if="authError" class="auth-error">
      <h2>⛔ Accesso negato</h2>
      <p>{{ authError }}</p>
      <router-link to="/" class="back-btn">Torna alla Home</router-link>
    </div>

    <div v-else-if="!isAuthorized">
      <p>Verifica permessi…</p>
    </div>

    <div v-else class="new-track-page">

      <header class="header">
        <router-link to="/admin" class="nav-btn">AdminInfo</router-link>
        <router-link to="/statistics" class="nav-btn">Statistiche</router-link>
        <img src="../assets/goon_logo.png" class="logo" />
        <router-link to="/" class="nav-btn">Home</router-link>
        <div class="user-info">
          <span class="username-box">👤 {{ username }}</span>
        </div>
        <router-link to="/profile" class="nav-btn">Profilo</router-link>
      </header>

      <!-- MODE BAR -->
       <h2 class="mode-label">
        {{ activeMode === 'update' ? 'Update track' : 'Create Track' }}
       </h2>


      <main class="form-body">

        <section class="column">
          <label>Titolo *</label>
          <input v-model="form.title" />

          <label>Descrizione</label>
          <textarea v-model="form.description" />

          <label>Regione</label>
          <input v-model="form.region" />

          <label>Valle</label>
          <input v-model="form.valley" />

          <label>Lunghezza (km)</label>
          <input type="number" v-model.number="form.lengthKm" />

          <label>Difficoltà</label>
          <select v-model="form.difficulty">
            <option>Easy</option>
            <option>Medium</option>
            <option>Difficult</option>
          </select>

          <label>Durata</label>
          <div class="inline">
            <input type="number" placeholder="Ore" v-model.number="form.duration.hours" />
            <input type="number" placeholder="Minuti" v-model.number="form.duration.minutes" />
          </div>

          
          <!-- GPX upload (drag & drop o seleziona file) -->
          <div
            class="gpx-drop"
            @drop="onDrop"
            @dragover="onDragOver"
            @click="$refs.gpxInput && $refs.gpxInput.click()"
            role="button"
          >
            <input
              ref="gpxInput"
              type="file"
              accept=".gpx,.xml,text/xml,application/gpx+xml"
              style="display:none"
              @change="onFileSelected"
            />
            <div class="gpx-drop-content">
              <p v-if="!gpxPreviewName">Trascina qui il file GPX o clicca per selezionare</p>
              <p v-else>File selezionato: <strong>{{ gpxPreviewName }}</strong> — clicca per cambiare</p>
            </div>
          </div>
        </section>

        <section class="column">
          <label>Dislivello +</label>
          <input type="number" v-model.number="form.ascentM" />

          <label>Dislivello -</label>
          <input type="number" v-model.number="form.descentM" />

          <label>Punto più alto (m)</label>
          <input type="number" v-model.number="form.highestPointM" />

          <label>Punto più basso (m)</label>
          <input type="number" v-model.number="form.lowestPointM" />

          <label>Roadbook</label>
          <textarea v-model="form.roadbook" />

          <label>Indicazioni</label>
          <textarea v-model="form.directions" />

          <label>Parcheggio</label>
          <input v-model="form.parking" />

          <label>Latitudine *</label>
          <input type="number" v-model.number="form.lat" step="0.000001" />

          <label>Longitudine *</label>
          <input type="number" v-model.number="form.lon" step="0.000001" />
        </section>

        <section class="column">
          <label>Tag</label>
          <div v-for="(tags, group) in tagGroups" :key="group">
            <strong>{{ group }}</strong>
            <div class="tag-row">
              <button
                v-for="tag in tags"
                :key="tag"
                type="button"
                class="tag-btn"
                :class="{ active: form.tags.includes(tag) }"
                @click="toggleTag(tag)"
              >
                {{ tag }}
              </button>
            </div>
          </div>

          <div style="margin-top:16px">
            <button class="save-btn" @click="saveTrack">
              {{ activeMode === "update" ? "Aggiorna sentiero" : "Crea sentiero" }}
            </button>
          </div>
        </section>

      </main>
    </div>
  </div>
</template>

<style scoped>
.new-track-page { height: 100vh; display:flex; flex-direction:column; }
.header { height:80px; display:flex; justify-content:space-between; align-items:center; padding:0 24px; border-bottom:1px solid #ddd; }
.logo { height:50px }
.form-body { flex:1; display:flex; gap:24px; padding:24px; }
.column { flex:1; display:flex; flex-direction:column; gap:8px; }
.inline { display:flex; gap:8px; }
.nav-btn { background:#2c7be5; color:white; padding:6px 12px; border-radius:6px; text-decoration:none; }
.save-btn { margin-top:8px; background:#2c7be5; color:white; padding:10px 14px; border:none; cursor:pointer; }
.tag-row { display:flex; flex-wrap:wrap; gap:6px; margin-top:6px }
.tag-btn { border:1px solid #aaa; background:#f5f5f5; padding:4px 8px; cursor:pointer }
.tag-btn.active { background:#2c7be5; color:white; border-color:#2c7be5 }
.auth-error { height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center }
.back-btn { margin-top:16px; padding:8px 16px; background:#2c7be5; color:white; text-decoration:none; border-radius:6px }

.mode-label {
  text-align:center;
  font-weight:bold;
  margin-bottom:4px;
  color:#333;
}

.gpx-drop {
  border: 2px dashed #ccc;
  padding: 12px;
  border-radius: 8px;
  text-align: center;
  cursor: pointer;
  user-select: none;
}

.gpx-drop:hover { background: #fafafa; }

.gpx-drop-content p { margin: 0; font-size: 0.95rem; }

</style>
