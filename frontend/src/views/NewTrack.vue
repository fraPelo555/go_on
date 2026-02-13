<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { createTrail } from "../services/trailService";

const router = useRouter();


/* =========================
   ADMIN GUARD
   ========================= */
const isAuthorized = ref(false);
const authError = ref("");

onMounted(() => {
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
});

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
  duration: { hours: 0, minutes: 0 }, // verrà stringificato
  ascentM: 0,
  descentM: 0,
  highestPointM: 0,
  lowestPointM: 0,
  roadbook: "",
  directions: "",
  parking: "",
  tags: [], // verrà stringificato
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
   SAVE TRACK
   - serializziamo duration, coordinates, tags come stringhe JSON
   - idAdmin deve assomigliare a ObjectId
   ========================= */
const saveTrack = async () => {
  // obbligatori
  if (!form.value.title || !form.value.title.trim()) {
    alert("Il titolo è obbligatorio.");
    return;
  }
  if (form.value.lat === "" || form.value.lon === "") {
    alert("Latitudine e longitudine sono obbligatorie.");
    return;
  }
  if (!form.value.idAdmin) {
    alert("idAdmin mancante.");
    return;
  }
  if (!isValidObjectId(form.value.idAdmin)) {
    alert("idAdmin non ha il formato di un Mongo ObjectId (24 esadecimali). Controlla il valore in localStorage.");
    return;
  }

  // costruzione payload: NOTA -> duration/coordinates/tags sono STRINGHE JSON
  const payload = {
    title: String(form.value.title).trim(),
    description: form.value.description || "",
    region: form.value.region || "",
    valley: form.value.valley || "",
    difficulty: form.value.difficulty || "Easy",
    lengthKm: form.value.lengthKm === "" ? 0 : Number(form.value.lengthKm),

    // stringifico duration: il backend fa JSON.parse(req.body.duration)
    duration: JSON.stringify({
      hours: Number(form.value.duration.hours || 0),
      minutes: Number(form.value.duration.minutes || 0)
    }),

    ascentM: form.value.ascentM === "" ? 0 : Number(form.value.ascentM),
    descentM: form.value.descentM === "" ? 0 : Number(form.value.descentM),
    highestPointM: form.value.highestPointM === "" ? 0 : Number(form.value.highestPointM),
    lowestPointM: form.value.lowestPointM === "" ? 0 : Number(form.value.lowestPointM),

    roadbook: form.value.roadbook || "",
    directions: form.value.directions || "",
    parking: form.value.parking || "",

    // tags come come stringa, backend farà JSON.parse
    tags: JSON.stringify(form.value.tags || []),

    // coordinates come come stringa JSON (così il backend può JSON.parse)
    // manteniamo struttura DD se il backend la usa; usa questa variante:
    coordinates: JSON.stringify({ DD: { lat: Number(form.value.lat), lon: Number(form.value.lon) } }),

    idAdmin: form.value.idAdmin
  };

  // LOG per debug - copia esatta dell'oggetto che stiamo inviando
  // ATTENZIONE: alcune proprietà sono stringhe JSON (duration, tags, coordinates)
  console.log("Payload da inviare:", payload);

  try {
    // createTrail in trailService è: api.post("/trails", formDataOrObject)
    // qui inviamo un JSON (object con stringhe annidate) - il backend farà JSON.parse sui campi attesi
    await createTrail(payload);
    router.back();
  } catch (err) {
    // stampa dettagliata per debugging
    console.error("Errore createTrail:", err.response?.data || err.message || err);
    alert("Errore durante la creazione del sentiero. Controlla la console per dettagli.");
  }
};
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
        <router-link to="/statistics" class="nav-btn">Statistiche</router-link>
        <img src="../assets/goon_logo.png" class="logo" />
        <router-link to="/" class="nav-btn">Home</router-link>
        <router-link to="/profile" class="nav-btn">Profilo</router-link>
      </header>

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
            <button class="save-btn" @click="saveTrack">Salva sentiero</button>
          </div>

          <p style="margin-top:12px; font-size:0.9rem; color:#666">
            Nota: Se dovrai caricare anche un file GPX, dovremo adattare il form per inviare FormData (multipart/form-data).
          </p>
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
</style>
