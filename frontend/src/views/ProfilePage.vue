<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";

import {
  getUserById,
  updateUser,
  deleteUser,
  getFavourites
} from "../services/userService";

import { getUserFeedbacks } from "../services/feedbackService";
import { getUserReports } from "../services/reportService";
import { getTrailById } from "../services/trailService";

const trailMap = ref({}); // { [idTrail]: trailObject }

/* ======================
   ROUTER & AUTH
   ====================== */
const router = useRouter();
const userId = localStorage.getItem("userId");

if (!userId) {
  router.push("/login");
}

/* ======================
   STATE
   ====================== */
const user = ref(null);
const favourites = ref([]); // array di trail (oggetti)
const feedbacks = ref([]);  // array di feedback (oggetti)
const reports = ref([]);    // array di reports (oggetti)

const loading = ref(false);
const fetchError = ref(null);

const editMode = ref(false);
const showPassword = ref(false);

const form = ref({
  username: "",
  email: "",
  currentPassword: "",
  newPassword: ""
});

/* ======================
   HELPERS
   ====================== */

const extractCoords = (trail) => {
  if (!trail) return null;
  // case: trail.coordinates?.DD?.lat / lon
  if (trail.coordinates && trail.coordinates.DD) {
    const lat = trail.coordinates.DD.lat;
    const lon = trail.coordinates.DD.lon;
    if (lat !== undefined && lon !== undefined) return { lat, lon };
  }
  // case: trail.location?.coordinates [lon, lat]
  if (trail.location && Array.isArray(trail.location.coordinates)) {
    const [lon, lat] = trail.location.coordinates;
    if (lat !== undefined && lon !== undefined) return { lat, lon };
  }
  return null;
};

/* ======================
   FETCH USER
   ====================== */
const fetchUser = async () => {
  try {
    const res = await getUserById(userId);
    // il backend può rispondere con res.data o res.data.user
    const userData = res?.data?.user ?? res?.data ?? null;
    if (!userData) {
      console.warn("fetchUser: risposta senza payload user");
      return;
    }
    user.value = userData;
    form.value.username = userData.username ?? "";
    form.value.email = userData.email ?? "";
    form.value.currentPassword = "";
    form.value.newPassword = "";
  } catch (err) {
    console.error("Errore fetch user:", err);
    fetchError.value = "Impossibile caricare i dati utente.";
  }
};

/* ======================
   FETCH EXTRA DATA
   ====================== */
const fetchExtras = async () => {
  loading.value = true;
  fetchError.value = null;

  try {
    const [favRes, fbRes, repRes] = await Promise.allSettled([
      getFavourites(userId),
      getUserFeedbacks(userId),
      getUserReports(userId)
    ]);


    // --- helper per estrarre array dalle varie forme possibili ---
    const extractArray = (settled) => {
      if (!settled) return [];

      if (settled.status === "rejected") return [];

      const resp = settled.value; // axios response
      let d = resp?.data;

      // Caso 1: è già un array
      if (Array.isArray(d)) return d;

      // Caso 2: l'array è dentro d.data (double-wrapped)
      if (d && Array.isArray(d.data)) return d.data;

      // Caso 3: wrapper con nomi comuni
      const commonNames = ["favourites", "favs", "items", "payload", "results", "body"];
      for (const name of commonNames) {
        if (d && Array.isArray(d[name])) return d[name];
      }

      // Caso 4: l'API ha ritornato un oggetto con indici numerici (es. {"0": {...}, "1": {...}})
      if (d && typeof d === "object") {
        const numericKeys = Object.keys(d).filter(k => /^\d+$/.test(k));
        if (numericKeys.length > 0) {
          // ordina per chiave numerica e ritorna valori
          return numericKeys.sort((a,b)=>Number(a)-Number(b)).map(k => d[k]);
        }
      }

      // Caso 5: la risposta è una stringa JSON
      if (typeof d === "string") {
        try {
          const parsed = JSON.parse(d);
          if (Array.isArray(parsed)) return parsed;
          // se parsed ha wrapper comuni:
          for (const name of commonNames) if (parsed && Array.isArray(parsed[name])) return parsed[name];
        } catch(e) {
          // not JSON
        }
      }

      // fallback: niente array trovato
      return [];
    };

    // usa l'helper per estrarre i tre array
    favourites.value = extractArray(favRes);
    feedbacks.value = extractArray(fbRes);
    reports.value = extractArray(repRes);

  } catch (err) {
    console.error("Errore fetchExtras:", err);
    fetchError.value = "Errore caricamento dati aggiuntivi";
    favourites.value = [];
    feedbacks.value = [];
    reports.value = [];
  } finally {
    loading.value = false;
  }
};

/* ======================
   LOGOUT
   ====================== */
const logout = () => {
  localStorage.clear();
  router.push("/login");
};

/* ======================
   EDIT PROFILE
   ====================== */
const toggleEdit = () => {
  editMode.value = !editMode.value;
  if (!editMode.value) {
    form.value.currentPassword = "";
    form.value.newPassword = "";
  }
};

/* ======================
   SAVE PROFILE
   ====================== */

const saveProfile = async () => {
  try {
    const payload = { username: form.value.username };
    if (form.value.newPassword) {
      if (!form.value.currentPassword) {
        alert("Inserisci la password attuale");
        return;
      }
      payload.password = form.value.newPassword;
      payload.currentPassword = form.value.currentPassword;
    }
    await updateUser(userId, payload);
    editMode.value = false;
    await fetchUser();
  } catch (err) {
    console.error(err);
    alert("Errore durante il salvataggio del profilo");
  }
};

/* ======================
   DELETE PROFILE
   ====================== */
const deleteProfileConfirm = async () => {
  if (!confirm("Sei sicuro di voler eliminare definitivamente il profilo?")) return;
  try {
    await deleteUser(userId);
    localStorage.clear();
    router.push("/login");
  } catch (err) {
    console.error(err);
    alert("Errore eliminazione profilo");
  }
};

/* ======================
   UTILS UI
   ====================== */
const togglePassword = () => {
  showPassword.value = !showPassword.value;
};

// helper per creare chiave per v-for (safe)
const safeKey = (obj, idx) => obj?._id ?? obj?.id ?? obj?.title ?? `item-${idx}`;

const loadTrailDetails = async (idTrail) => {
  if (!idTrail || trailMap.value[idTrail]) return; // già caricato
  try {
    const res = await getTrailById(idTrail);
    trailMap.value[idTrail] = res.data;
  } catch (err) {
    console.error("Errore caricamento trail:", idTrail, err);
    trailMap.value[idTrail] = { title: "Sentiero non trovato" };
  }
};

const enrichTrails = async () => {
  // feedbacks
  for (const fb of feedbacks.value) {
    if (fb.idTrail) await loadTrailDetails(fb.idTrail);
  }
  // reports
  for (const rep of reports.value) {
    if (rep.idTrail) await loadTrailDetails(rep.idTrail);
  }
};

/* ======================
   LIFECYCLE
   ====================== */
onMounted(async () => {
  await fetchUser();
  await fetchExtras();
  await enrichTrails();
});

</script>

<template>
  <div class="profile-page">

    <!-- HEADER -->
    <header class="header">
      <div></div>
      <div class="header-center">
        <img src="../assets/goon_logo.png" class="logo" alt="logo" />
      </div>
      <div class="header-right">
        <router-link to="/" class="home-btn">Home</router-link>
      </div>
    </header>

    <!-- MAIN -->
    <main class="content">
      <!-- LEFT -->
      <aside class="left-column">

        <div class="actions">
          <button @click="logout">Log Out</button>
          <button @click="toggleEdit">
            {{ editMode ? "Annulla" : "Modifica Profilo" }}
          </button>
          <button v-if="editMode" @click="saveProfile">Salva Modifiche</button>
          <button class="danger" @click="deleteProfileConfirm">Elimina Profilo</button>
        </div>
      </aside>

      <!-- CENTER -->
      <section class="center-column">
        <!-- USER INFO -->
        <table class="info-table">
          <tbody>
            <tr>
              <td>Username</td>
              <td><input v-model="form.username" :disabled="!editMode" /></td>
            </tr>

            <tr>
              <td>Email</td>
              <td><input type="email" v-model="form.email" disabled /></td>
            </tr>

            <tr v-if="editMode">
              <td>Password</td>
              <td class="password-cell">
                <input :type="showPassword ? 'text' : 'password'" v-model="form.currentPassword" placeholder="Password attuale" />
                <input :type="showPassword ? 'text' : 'password'" v-model="form.newPassword" placeholder="Nuova password" />
                <button type="button" @click="togglePassword">👁</button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- possible loading / error -->
        <div v-if="loading" class="muted">Caricamento dati...</div>
        <div v-if="fetchError" class="error">{{ fetchError }}</div>

        <!-- HISTORY -->
        <div class="history-section">
          <div class="history-box">
            <h3>Recensioni ({{ feedbacks.length }})</h3>
            <div class="history-scroll">
              <div v-if="feedbacks.length === 0" class="history-entry muted">Nessuna recensione</div>
              <div v-for="(fb, idx) in feedbacks" :key="safeKey(fb, idx)" class="history-entry">
                <div class="meta">
                  <strong>Valutazione:</strong> {{ fb.rating ?? fb.valutazione ?? "n/d" }}
                  <span class="date">{{ fb.createdAt ? new Date(fb.createdAt).toLocaleString() : "" }}</span>
                </div>
                <div class="body">{{ fb.text ?? fb.testo ?? fb.message ?? "Nessun commento" }}</div>
                <div class="small">
                  Trail:
                  <span v-if="fb.idTrail">
                    {{ trailMap[fb.idTrail]?.title ?? fb.idTrail }}
                    <router-link
                      :to="`/tracks/${fb.idTrail}`"
                      class="link"
                    >
                   Dettagli
                 </router-link>
                  </span>
                  <span v-else>-</span>
                </div>
              </div>
            </div>
          </div>

          <div class="history-box">
            <h3>Segnalazioni ({{ reports.length }})</h3>
            <div class="history-scroll">
              <div v-if="reports.length === 0" class="history-entry muted">Nessuna segnalazione</div>
              <div v-for="(rep, idx) in reports" :key="safeKey(rep, idx)" class="history-entry">
                <div class="meta">
                  <strong>Stato:</strong> {{ rep.state ?? rep.stato ?? "-" }}
                  <span class="date">{{ rep.createdAt ? new Date(rep.createdAt).toLocaleString() : "" }}</span>
                </div>
                <div class="body">{{ rep.testo ?? rep.reason ?? rep.description ?? "-" }}</div>
                <div class="small">
                  Trail:
                  <span v-if="rep.idTrail">
                    {{ trailMap[rep.idTrail]?.title ?? rep.idTrail }}
                    <router-link
                      :to="`/tracks/${rep.idTrail}`"
                      class="link"
                    >
                      Dettagli
                    </router-link>
                  </span>
                  <span v-else>-</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- RIGHT -->
      <aside class="right-column">
        <h3>Preferiti ({{ favourites.length }})</h3>

        <ul class="search-list">
          <li v-if="favourites.length === 0" class="muted">Nessun preferito</li>

          <!-- favourites come come array di trail (vedi esempio che mi hai mandato) -->
          <li v-for="(trail, idx) in favourites" :key="safeKey(trail, idx)" class="fav-entry">
            <div class="fav-left">
              <strong class="fav-title">{{ trail.title ?? 'Sentiero' }}</strong>
              <div class="fav-meta">
                <span v-if="trail.lengthKm">Lunghezza: {{ trail.lengthKm }} km</span>
                <span v-if="trail.difficulty"> • {{ trail.difficulty }}</span>
              </div>
            </div>

            <div class="fav-right">
              <div v-if="extractCoords(trail)" class="coords">
                {{ extractCoords(trail).lat }}, {{ extractCoords(trail).lon }}
              </div>
              <!-- link alla pagina dettaglio (se avete rotta trail/:id) -->
              <router-link
                v-if="trail._id || trail.id"
                :to="`/tracks/${trail._id ?? trail.id}`"
                class="link"
              >
                Dettagli
              </router-link>
            </div>
          </li>
        </ul>
      </aside>
    </main>
  </div>
</template>

<style scoped>
.profile-page {
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

.home-btn {
  padding: 8px 16px;
  border-radius: 6px;
  background: #2c7be5;
  color: white;
  text-decoration: none;
}

/* LAYOUT */
.content {
  flex: 1;
  display: grid;
  grid-template-columns: 240px 1fr 320px;
  gap: 16px;
  padding: 16px;
}

/* LEFT */
.left-column {
  display: flex;
  flex-direction: column;
  align-items: center;
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

.actions .danger {
  color: red;
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
  max-height: 240px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-entry {
  padding: 8px;
  background: #f9f9f9;
  border-radius: 6px;
}

.meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  color: #555;
}

.body {
  margin-top: 6px;
}

/* RIGHT - FAVOURITES */
.right-column {
  border-left: 1px solid #ddd;
  padding-left: 12px;
}

.search-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.fav-entry {
  display: flex;
  justify-content: space-between;
  padding: 10px;
  border-bottom: 1px solid #eee;
  align-items: center;
}

.fav-title {
  display: block;
}

.fav-meta {
  font-size: 0.85rem;
  color: #666;
}

.coords {
  font-size: 0.85rem;
  color: #666;
  margin-bottom: 4px;
}

.link {
  display: block;
  margin-top: 4px;
  font-size: 0.85rem;
  color: #2c7be5;
  text-decoration: none;
}


/* MISC */
.muted {
  color: #777;
}
.error {
  color: red;
}
</style>
