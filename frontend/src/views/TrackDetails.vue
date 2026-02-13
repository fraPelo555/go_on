<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { getTrailById, downloadGPX as apiDownloadGPX } from "../services/trailService";
import { getTrailFeedbacks, createFeedback, deleteFeedback } from "../services/feedbackService";
import { getFavourites, addFavourite, removeFavourite } from "../services/userService";
import TrailMap from "../components/TrailMap.vue";
import { getTrailReports, createReport, deleteReport } from "../services/reportService";

/* --------------------------
   ROUTE
-------------------------- */
const route = useRoute();
const trailId = route.params.id;

/* --------------------------
   STATE
-------------------------- */
const loading = ref(true);
const error = ref("");
const trail = ref(null);

const feedbacks = ref([]);
const ratingAvg = ref(0);
const ratingCount = ref(0);

const newComment = ref("");
const selectedRating = ref(0);
const hoverRating = ref(0);

const userId = localStorage.getItem("userId") || null;
const isFav = ref(false);
const checkingFav = ref(false);

/* --------------------------
   HEADER LOGIC
-------------------------- */
const token = localStorage.getItem("token");
const isAdmin = localStorage.getItem("isAdmin") === "true";
const showProfile = !!token;

/* --------------------------
   HELPERS
-------------------------- */
function computeRatings(list) {
  if (!Array.isArray(list) || list.length === 0) {
    ratingAvg.value = 0;
    ratingCount.value = 0;
    return;
  }
  const vals = list
    .map(f => f.valutazione ?? f.rating ?? f.val ?? f.score)
    .map(v => typeof v === "string" ? Number(v) : v)
    .filter(v => typeof v === "number" && !Number.isNaN(v));

  if (!vals.length) {
    ratingAvg.value = 0;
    ratingCount.value = 0;
    return;
  }

  const sum = vals.reduce((s, x) => s + x, 0);
  ratingAvg.value = Math.round((sum / vals.length) * 10) / 10;
  ratingCount.value = vals.length;
}

/* --------------------------
   FETCH TRAIL
-------------------------- */
const loadTrail = async () => {
  loading.value = true;
  error.value = "";
  try {
    const res = await getTrailById(trailId);
    trail.value = res.data;
  } catch (err) {
    console.error(err);
    error.value = "Errore caricamento sentiero";
  } finally {
    loading.value = false;
  }
};

/* --------------------------
   FEEDBACKS
-------------------------- */

const loadFeedbacks = async () => {
  try {
    const res = await getTrailFeedbacks(trailId);
    feedbacks.value = Array.isArray(res.data) ? res.data : [];
    computeRatings(feedbacks.value);
  } catch (err) {
    console.error(err);
    feedbacks.value = [];
    computeRatings([]);
  }
};

const removeFeedback = async (feedbackId) => {
  try {
    await deleteFeedback(feedbackId);
    await loadFeedbacks();
  } catch (err) {
    console.error("Errore eliminazione commento", err);
    alert("Errore durante l'eliminazione del commento");
  }
};

const canDeleteFeedback = (feedback, index) => {
  if (!userId) return false;

  // Admin può eliminare tutto
  if (isAdmin) return true;

  // Utente normale → solo il proprio (sempre il primo)
  const feedbackUserId =
    feedback.idUser?._id ??
    feedback.idUser ??
    feedback.userId;

  return (
    index === 0 &&
    String(feedbackUserId) === String(userId)
  );
};



const setRating = (value) => selectedRating.value = value;

const submitComment = async () => {
  if (!userId) return alert("Devi essere loggato per commentare.");
  if (!selectedRating.value) return alert("Devi selezionare una valutazione.");

  try {
    await createFeedback(trailId, {
      idUser: userId,
      idTrail: trailId,
      valutazione: selectedRating.value,
      testo: newComment.value
    });

    newComment.value = "";
    selectedRating.value = 0;
    await loadFeedbacks();

  } catch (err) {
    console.error(err.response?.data || err);
    alert("Errore invio commento");
  }
};

/* --------------------------
   FAVOURITES
-------------------------- */
const checkIsFavourite = async () => {
  if (!userId) {
    isFav.value = false;
    return;
  }
  checkingFav.value = true;
  try {
    const res = await getFavourites(userId);

    const normalize = (payload) => {
      if (!payload) return [];
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload.favourites)) return payload.favourites;
      if (Array.isArray(payload.data)) return payload.data;
      if (payload.user && Array.isArray(payload.user.favourites)) return payload.user.favourites;
      if (typeof payload === "object") {
        const vals = Object.values(payload).filter(v => Array.isArray(v)).flat();
        if (vals.length) return vals;
      }
      return [];
    };

    const data = normalize(res.data);

    const found = data.some(item => {
      if (!item) return false;
      if (typeof item === "string" || typeof item === "number") return String(item) === String(trailId);
      if (item._id) return String(item._id) === String(trailId);
      if (item.id) return String(item.id) === String(trailId);
      return false;
    });

    isFav.value = found;
  } catch (err) {
    console.error("Errore getFavourites", err);
    isFav.value = false;
  } finally {
    checkingFav.value = false;
  }
};

const toggleFavourite = async () => {
  if (!userId) return alert("Devi essere loggato per aggiungere ai preferiti.");
  try {
    if (!isFav.value) {
      await addFavourite(userId, trailId);
      isFav.value = true;
    } else {
      await removeFavourite(userId, trailId);
      isFav.value = false;
    }
  } catch (err) {
    console.error("Errore toggleFavourite", err);
    alert("Errore durante l'operazione sui preferiti.");
  }
};

/* --------------------------
   GPX & SHARE
-------------------------- */
const gpPopupMessage = ref("");     // messaggio da mostrare nel popup
const gpPopupVisible = ref(false);

const showGPPopup = (msg) => {
  gpPopupMessage.value = msg;
  gpPopupVisible.value = true;
  setTimeout(() => (gpPopupVisible.value = false), 1800);
};

const downloadFileFromBlob = (blobOrData, filename, mime = "application/gpx+xml") => {
  const blob = blobOrData instanceof Blob ? blobOrData : new Blob([blobOrData], { type: mime });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

const downloadGPX = async () => {
  const safeTitle = (trail.value?.title ?? "track")
    .replace(/\s+/g, "_")
    .replace(/[^\w.-]/g, "");
  const filename = `${safeTitle}.gpx`;

  // 1) prova endpoint /download/gpx (blob)
  try {
    const res = await apiDownloadGPX(trailId); // responseType: blob
    if (res?.data) {
      downloadFileFromBlob(res.data, filename);
      showGPPopup("GPX scaricato!");
      return;
    }
  } catch (err) {
    // log dettagli per debug
    console.warn("download/gpx fallito:", err.response?.status, err.response?.data || err.message);
    // se l'errore NON è 404 possiamo comunque provare il fallback,
    // ma mettiamo il dettaglio nel log e continuiamo
  }

  // 2) fallback: prova /gpx (testo)
  try {
    const resText = await apiGetGPX(trailId); // responseType: text
    const text = resText?.data;
    if (text) {
      downloadFileFromBlob(text, filename, "application/gpx+xml");
      showGPPopup("GPX scaricato (via testo)!");
      return;
    } else {
      console.warn("/gpx ha risposto ma senza testo:", resText);
    }
  } catch (err) {
    console.warn("GET /gpx fallito:", err.response?.status, err.response?.data || err.message);
  }

  // 3) se siamo qui, fallimento completo
  showGPPopup("Errore: impossibile scaricare il GPX");
  console.error("Scaricamento GPX fallito per trailId:", trailId);
};




const showSharePopup = ref(false);

const shareTrack = async () => {
  try {
    const url = window.location.href;

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
    } else {
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }

    showSharePopup.value = true;

    setTimeout(() => {
      showSharePopup.value = false;
    }, 1000);

  } catch (err) {
    console.error("Errore copia:", err);
  }
};


/* --------------------------
   MAP CENTER
-------------------------- */
const mapCenter = computed(() => {
  if (!trail.value?.location?.coordinates) return null;
  return {
    lat: trail.value.location.coordinates[1],
    lon: trail.value.location.coordinates[0]
  };
});

/* --------------------------
   INIT
-------------------------- */
onMounted(async () => {
  await loadTrail();
  await checkIsFavourite();
  await loadFeedbacks();
  loadReports();
});

/* --------------------------
   REPORTS
-------------------------- */
const reports = ref([]);
const newReport = ref("");

const loadReports = async () => {
  try {
    const res = await getTrailReports(trailId);
    reports.value = Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error("Errore caricamento segnalazioni", err);
    reports.value = [];
  }
};

const submitReport = async () => {
  if (!userId) return alert("Devi essere loggato per segnalare.");
  if (!newReport.value.trim()) return;

  try {
    await createReport(trailId, {
      idTrail: trailId,   // richiesto doppio inserimento
      idUser: userId,
      testo: newReport.value
    });

    newReport.value = "";
    await loadReports();

  } catch (err) {
    console.error(err);
    alert("Errore invio segnalazione");
  }
};

const removeReport = async (reportId) => {
  try {
    await deleteReport(reportId);
    await loadReports();
  } catch (err) {
    console.error("Errore eliminazione report", err);
    alert("Errore durante l'eliminazione della segnalazione");
  }
};

const canDeleteReport = (report, index) => {
  if (!userId) return false;

  if (isAdmin) return true;

  const reportUserId =
    report.idUser?._id ??
    report.idUser;

  return (
    index === 0 &&
    String(reportUserId) === String(userId)
  );
};

const exportPDF = async () => {
  if (!trail.value) return alert("Nessun sentiero caricato");

  // helper: carica immagine remota come dataURL
  const loadImageDataURL = async (url) => {
    try {
      const resp = await fetch(url, { mode: "cors" });
      const blob = await resp.blob();
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.warn("Impossibile caricare immagine:", url, err);
      return null;
    }
  };

  // dati
  const title = trail.value.title || "Sentiero";
  const region = trail.value.region || "-";
  const difficulty = trail.value.difficulty || "-";
  const duration = trail.value.duration
    ? `${trail.value.duration.hours ?? "-"}h ${trail.value.duration.minutes ?? "-"}m`
    : "-";
  const ascent = trail.value.ascentM ?? "-";
  const descent = trail.value.descentM ?? "-";
  const avg = ratingAvg.value ?? 0;
  const count = ratingCount.value ?? 0;

  // setup PDF
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 16;
  let cursorY = 18;

  // carica logo da DOM se presente
  let logoData = null;
  try {
    const logoEl = document.querySelector(".header-center img.logo");
    if (logoEl && logoEl.src) {
      logoData = await loadImageDataURL(logoEl.src);
    }
  } catch (e) {
    console.warn("Errore caricamento logo", e);
  }

  // --- PREPARA MAPPA: nascondi controlli temporaneamente per screenshot ---
  let mapDataURL = null;
  let hiddenControls = [];
  try {
    const mapEl =
      document.querySelector(".map-wrap .leaflet-container") ||
      document.querySelector(".map-wrap .map") ||
      document.querySelector(".map-wrap");

    if (mapEl) {
      // nascondi controlli leaflet per cattura
      const selectors = [".leaflet-control-zoom", ".leaflet-control-attribution", ".leaflet-control-scale", ".leaflet-control-container"];
      selectors.forEach(sel => {
        const els = mapEl.querySelectorAll(sel);
        els.forEach(el => {
          hiddenControls.push({ el, prev: el.style.visibility });
          el.style.visibility = "hidden";
        });
      });

      const canvas = await html2canvas(mapEl, {
        useCORS: true,
        allowTaint: false,
        scale: 2
      });
      mapDataURL = canvas.toDataURL("image/jpeg", 0.9);

      // ripristina visibilità controlli
      hiddenControls.forEach(h => {
        try { h.el.style.visibility = h.prev || ""; } catch (e) {}
      });
      hiddenControls = [];
    } else {
      console.warn("Elemento mappa non trovato per screenshot");
    }
  } catch (err) {
    console.warn("html2canvas fallito (mappa):", err);
    // prova a ripristinare i controlli se qualcosa è andato storto
    hiddenControls.forEach(h => { try { h.el.style.visibility = h.prev || ""; } catch(e){} });
    hiddenControls = [];
    mapDataURL = null;
  }

  // --- LOGO: posiziona top-right e calcola spazio occupato ---
  let logoBottomY = 0;
  const logoWidthMM = 30; // larghezza logo (mm) se presente
  if (logoData) {
    try {
      const props = doc.getImageProperties(logoData);
      const imgHmm = (props.height / props.width) * logoWidthMM;
      doc.addImage(logoData, "PNG", pageW - margin - logoWidthMM, 10, logoWidthMM, imgHmm);
      logoBottomY = 10 + imgHmm; // posizione inferiore del logo in mm
    } catch (e) {
      console.warn("Errore aggiunta logo al PDF", e);
    }
  }

  // --- TITOLO: wrap e posizionamento per evitare sovrapposizioni col logo ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  // calcola larghezza disponibile per il titolo (se logo presente lasciamo margine a destra)
  const titleAvailW = pageW - margin * 2 - (logoData ? (logoWidthMM + 6) : 0);
  const titleLines = doc.splitTextToSize(title, titleAvailW);
  const titleTopY = Math.max(cursorY, logoBottomY ? logoBottomY + 6 : cursorY);
  doc.text(titleLines, pageW / 2, titleTopY, { align: "center", maxWidth: titleAvailW });

  // aggiorna cursorY
  const titleLineHeight = (doc.getFontSize() * 0.352778) * 1.2; // pt -> mm
  cursorY = titleTopY + titleLines.length * titleLineHeight + 6;

  // linea sottile
  doc.setDrawColor(220);
  doc.setLineWidth(0.5);
  doc.line(margin, cursorY, pageW - margin, cursorY);
  cursorY += 8;

  // footer reserve: spazio extra (3 righe) + base footer
  const fontSizeForCalc = 13; // useremo per lineHeight calcolo successivo
  const lineHeight = fontSizeForCalc * 0.352778 * 1.25; // mm per linea
  const extraLines = 3;
  const footerBase = 18; // spazio footer di base in mm
  const footerReserve = footerBase + extraLines * lineHeight;

  // --- MAPPA: mantieni proporzioni originali, non deformare ---
  if (mapDataURL) {
    try {
      const imgProps = doc.getImageProperties(mapDataURL);
      const availableW = pageW - margin * 2;
      let imgH = (imgProps.height / imgProps.width) * availableW;
      // limite in altezza secondo spazio rimanente
      const maxAllowedH = pageH - margin - cursorY - footerReserve;
      if (imgH > maxAllowedH) {
        // ridimensiona proporzionalmente
        const scale = maxAllowedH / imgH;
        imgH = maxAllowedH;
        const imgW = availableW * scale;
        const x = margin + (availableW - imgW) / 2;
        doc.addImage(mapDataURL, "JPEG", x, cursorY, imgW, imgH);
      } else {
        doc.addImage(mapDataURL, "JPEG", margin, cursorY, availableW, imgH);
      }
      cursorY += imgH + 8;
    } catch (err) {
      console.warn("Errore disegno mappa PDF:", err);
    }
  }

  // --- BOX INFORMAZIONI (sfondo leggermente scuro) + CHIP RATING (più chiaro) ---
  const boxH = 46;
  doc.setFillColor(245, 245, 245); // box info (leggermente grigio)
  doc.roundedRect(margin, cursorY, pageW - margin * 2, boxH, 3, 3, "F");

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  const infoX = margin + 8;
  let infoY = cursorY + 10;
  doc.text(`Regione: ${region}`, infoX, infoY);
  infoY += 6;
  doc.text(`Difficoltà: ${difficulty}`, infoX, infoY);
  infoY += 6;
  doc.text(`Durata: ${duration}`, infoX, infoY);
  infoY += 6;
  doc.text(`Dislivello salita: ${ascent} m`, infoX, infoY);

  // chip rating a destra (sfondo più chiaro rispetto al box)
  const chipW = 78;
  const chipX = pageW - margin - chipW;
  const chipY = cursorY + 8;
  doc.setFillColor(250, 250, 250); // tonalità più chiara del box info
  doc.roundedRect(chipX, chipY - 6, chipW, 32, 2, 2, "F");

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  const ratingLines = [
    `Media Valutazioni: ${avg} ★`,
    ` Numero valutazioni: ${count}`
  ];
  doc.setTextColor(40);
  doc.text(ratingLines, chipX + 6, chipY + 4);

  cursorY += boxH + 10;

  // --- DESCRIZIONE: font più grande e gestione paginazione robusta ---
  doc.setFontSize(13);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(20);
  const desc = trail.value.description || "-";
  const descLines = doc.splitTextToSize(desc, pageW - margin * 2);

  // paginazione generica per linee di testo
  const paginateAndWrite = (lines, startY) => {
    let y = startY;
    const usableHeight = () => pageH - margin - footerReserve;
    const maxLinesOnPage = () => Math.floor((usableHeight() - (y - margin)) / lineHeight);
    let i = 0;
    while (i < lines.length) {
      let availableLines = maxLinesOnPage();
      if (availableLines <= 0) {
        doc.addPage();
        y = margin + 6;
        continue;
      }
      const slice = lines.slice(i, i + availableLines);
      doc.text(slice, margin, y);
      y += slice.length * lineHeight;
      i += slice.length;
      if (i < lines.length) {
        doc.addPage();
        y = margin + 6;
      }
    }
    return y;
  };

  cursorY = paginateAndWrite(descLines, cursorY + 0);

  // --- FOOTER su tutte le pagine ---
  const footerText = `Export generato da GO-ON — ${new Date().toLocaleString()}`;
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(footerText, margin, pageH - 12);
  }

  // nome file sicuro e salvataggio
  const safeTitle = title.replace(/\s+/g, "_").replace(/[^\w.-]/g, "");
  doc.save(`${safeTitle}.pdf`);
};



</script>

<template>
  <div class="track-details-page">
    <!-- HEADER -->
    <header class="header">
      <div class="header-left">
        <template v-if="isAdmin">
          <router-link to="/new-track" class="nav-btn">NewTrack</router-link>
          <router-link to="/admin" class="nav-btn">AdminInfo</router-link>
          <router-link to="/statistics" class="nav-btn">Statistiche</router-link>
        </template>
      </div>

      <div class="header-center">
        <img src="../assets/goon_logo.png" class="logo" alt="GO-ON Logo" />
      </div>

      <div class="header-right">
        <router-link to="/" class="nav-btn">Home</router-link>
        <router-link v-if="showProfile" to="/profile" class="nav-btn">Profilo</router-link>
        <router-link v-else to="/login" class="nav-btn">Login</router-link>
      </div>
    </header>

    <main class="body-wrapper">
      <div v-if="loading" class="center">Caricamento...</div>
      <div v-else-if="error" class="center error">{{ error }}</div>

      <div v-else-if="trail" class="content-box">
        <!-- LEFT COLUMN -->
        <section class="left">
          <div class="title-row">
            <button class="icon-btn fav" :class="{ active: isFav }" @click="toggleFavourite" title="Aggiungi/Rimuovi dai preferiti">
              <span v-if="isFav">★</span><span v-else>☆</span>
            </button>
            <h1 class="title">{{ trail.title }}</h1>
            <button class="icon-btn" @click="exportPDF" title="Esporta PDF">📄</button>
          </div>

          <div class="info">
            <p v-if="trail.description">{{ trail.description }}</p>
            <div class="meta">
              <div><strong>Durata:</strong> {{ trail.duration?.hours ?? "-" }}h {{ trail.duration?.minutes ?? "-" }}m</div>
              <div><strong>Dislivello:</strong> {{ trail.ascentM ?? "-" }} m</div>
              <div><strong>Difficoltà:</strong> {{ trail.difficulty ?? "-" }}</div>
              <div><strong>Regione:</strong> {{ trail.region ?? "-" }}</div>
            </div>
          </div>

          <div class="section">
            <h3>Galleria</h3>
            <div class="gallery-placeholder">[Galleria immagini]</div>
          </div>

          <div class="section">
            <h3>Lascia un commento</h3>
            <div class="stars">
              <span v-for="n in 5" :key="n" class="star" :class="{ active: n <= (hoverRating || selectedRating) }" @click="setRating(n)" @mouseover="hoverRating=n" @mouseleave="hoverRating=0">★</span>
            </div>
            <textarea v-model="newComment" placeholder="Scrivi qui il tuo commento..."></textarea>
            <button class="small-btn" @click="submitComment">Invia commento</button>
          </div>

          <div class="section">
            <h3>Commenti ({{ ratingCount }})</h3>
            <div v-if="feedbacks.length===0">Nessun commento</div>
            <div
              v-for="(fb, index) in feedbacks"
              :key="fb._id"
              class="comment"
            >
              <div class="comment-meta">
                <span>
                 <strong>Utente:</strong>
                 {{ fb.idUser?.username ?? "anon" }}
                 <span v-if="fb.idUser?.email">
                   ({{ fb.idUser.email }})
                 </span>
                </span>
               
                <span>
                  <strong>Valutazione:</strong> {{ fb.valutazione ?? fb.rating ?? "-" }}
                </span>
               
                <button
                  v-if="canDeleteFeedback(fb, index)"
                  class="delete-comment-btn"
                  @click="removeFeedback(fb._id)"
                  title="Elimina commento"
                >
                  🗑️
                </button>
              </div>
             
              <p class="comment-text">
                {{ fb.testo ?? fb.text ?? fb.message ?? "" }}
              </p>
            </div>

          </div>
        </section>

        <!-- RIGHT COLUMN -->
        <section class="right">
          <div class="map-wrap">
            <TrailMap v-if="mapCenter" :center="mapCenter" :zoom="14" />
          </div>

          <div class="actions-row">
            <div class="rating">
              <div class="avg">{{ ratingAvg }} ★</div>
              <div class="count">({{ ratingCount }})</div>
            </div>

            <div class="icons">
              <button class="icon-action" @click="downloadGPX" title="Download GPX">⬇️</button>
            
              <transition name="fade">
                <div v-if="gpPopupVisible" class="share-popup">
                  {{ gpPopupMessage }}
                </div>
              </transition>
             <div class="share-wrapper">
                <button class="icon-btn" @click="shareTrack">🔗</button>
              
                <transition name="fade">
                  <div v-if="showSharePopup" class="share-popup">
                    Link copiato!
                  </div>
                </transition>
              </div>         
            </div>
          </div>
             <div class="reports-section">
           <h3>Segnalazioni</h3>

           <div class="report-input">
             <textarea
               v-model="newReport"
               placeholder="Scrivi una segnalazione..."
             ></textarea>
             <button class="small-btn" @click="submitReport">
               Invia segnalazione
             </button>
           </div>
          
           <div v-if="reports.length === 0" class="no-reports">
             Nessuna segnalazione
           </div>
          
           <div
             v-for="(rep, index) in reports"
             :key="rep._id"
             class="report"
           >
             <div class="report-meta">
               <span><strong>Utente:</strong>
               {{ rep.idUser?.username ?? "anon" }}
               <span v-if="rep.idUser?.email">
                 ({{ rep.idUser.email }})
               </span>
               </span>
             
               <button
                 v-if="canDeleteReport(rep, index)"
                 class="delete-report-btn"
                 @click="removeReport(rep._id)"
                 title="Elimina segnalazione"
               >
                 🗑️
               </button>
             </div>
            
             <p class="report-text">
               {{ rep.testo ?? rep.text ?? rep.message ?? "" }}
             </p>
           </div>

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
  font-family: system-ui, Avenir, Helvetica, Arial, sans-serif;
}

.comment-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  font-size: 0.9rem;
  color: #333;
}

.delete-comment-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
}


/* REPORTS SECTION */
.reports-section {
  margin-top: 16px;
  border-top: 1px solid #eee;
  padding-top: 12px;
}

.report-input textarea {
  width: 100%;
  min-height: 70px;
  resize: vertical;
}

.report {
  border-top: 1px solid #eee;
  padding: 8px 0;
}

.report-meta {
  font-size: 0.85rem;
  color: #444;
}

.report-text {
  margin: 6px 0 0;
}

.no-reports {
  font-size: 0.9rem;
  color: #666;
  margin-top: 6px;
}

.report-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  color: #444;
}

.delete-report-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
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

.header-right {
  display: flex;
  justify-content: flex-end;
  gap:12px;
}

.nav-btn {
  text-decoration: none;
  padding: 6px 12px;
  background: #2c7be5;
  color: white;
  border-radius: 6px;
}

/* layout */
.body-wrapper {
  flex: 1;
  padding: 16px;
}

.center {
  display:flex;
  align-items:center;
  justify-content:center;
  height: calc(100vh - 80px);
}

.content-box {
  display: flex;
  gap: 24px;
  border: 1px solid #ccc;
  padding: 16px;
  box-sizing: border-box;
  min-height: 100%;
}

/* left / right */
.left {
  flex: 1;
  overflow-y: auto;
  padding-right: 8px;
}

.right {
  width: 420px;
  flex-shrink: 0;
}

/* title row */
.title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.title {
  flex: 1;
  text-align: center;
  font-size: 1.4rem;
  margin: 0;
}

.stars {
  display: flex;
  gap: 4px;
  font-size: 1.6rem;
  cursor: pointer;
  margin-bottom: 8px;
}

.star {
  color: #ccc;
  transition: color 0.2s;
}

.star.active {
  color: #ffb400;
}

/* icon buttons */
.icon-btn {
  background: none;
  border: none;
  font-size: 1.4rem;
  cursor: pointer;
}

/* favourite active */
.icon-btn.fav {
  font-size: 1.6rem;
}
.icon-btn.fav.active {
  color: #ffb400;
}

/* info */
.info .meta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 8px;
}

/* gallery placeholder */
.gallery-placeholder {
  height: 120px;
  background: #f4f4f4;
  display:flex;
  align-items:center;
  justify-content:center;
  border:1px dashed #ddd;
}

/* comments */
.section {
  margin-top: 16px;
}

.comment {
  border-top: 1px solid #eee;
  padding: 8px 0;
}

.comment-meta {
  display:flex;
  gap:12px;
  font-size: 0.9rem;
  color: #333;
}

.comment-text {
  margin: 8px 0 0;
}

/* map */
.map-wrap {
  width: 100%;
  height: 320px;
}

/* actions row: rating and icons inline */
.actions-row {
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap: 12px;
  margin-top: 8px;
}

.rating {
  display:flex;
  align-items:center;
  gap:8px;
  font-size:1.1rem;
}

.leaflet-map {
  width: 100%;
  height: 320px;
  border: 1px solid #aaa;
}

.icons {
  display:flex;
  gap:8px;
  position: relative;
}

.share-wrapper {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
}

.share-popup {
  position: absolute;
  top: 120%;
  background: #333;
  color: white;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 0.8rem;
  white-space: nowrap;
  pointer-events: none;
  opacity: 1;
}

/* Fade animation */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}


.icon-action {
  background: none;
  border: none;
  cursor:pointer;
  padding: 8px;
  font-size: 1.2rem;
}

/* small button */
.small-btn {
  margin-top: 6px;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid #ccc;
  background: #fff;
  cursor: pointer;
}

/* misc */
.error {
  color: red;
}
</style>
