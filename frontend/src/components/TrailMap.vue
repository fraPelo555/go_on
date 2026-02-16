<script setup>
import { ref, onMounted, watch } from "vue";
import L from "leaflet";
import "leaflet-gpx";
import "leaflet/dist/leaflet.css";

const props = defineProps({
  center: { type: Object, required: true },
  zoom: { type: Number, default: 13 },
  markers: { type: Array, default: () => [] },
  gpx: { type: String, default: null }
});

let gpxLayer = null;
const emit = defineEmits(["centerChanged", "markerClicked"]);

const mapRef = ref(null);       // riferimento al div
let mapInstance = null;         // istanza Leaflet
let markersLayer = null;


const renderMarkers = () => {
  if (!mapInstance || !markersLayer) return;
  
  markersLayer.clearLayers();
 
  const customIcon = L.divIcon({
    className: "custom-marker",
    html: `
      <svg width="40" height="50" viewBox="0 0 24 24" fill="#e53935" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
        <circle cx="12" cy="9" r="3" fill="white"/>
      </svg>
    `,
    iconSize: [40, 50],
    iconAnchor: [20, 50]
  });


  props.markers.forEach(m => {
    const marker = L.marker([m.lat, m.lon], { icon: customIcon })
     .bindTooltip(m.title, {
       permanent: false,
       direction: "top",
       offset: [0, -40]
     })
     .bindPopup(`<strong>${m.title}</strong>`);


    marker.on("click", () => {
      emit("markerClicked", m.id);
    });
   
    marker.addTo(markersLayer);
  });

};

onMounted(() => {
  // inizializza mappa
  mapInstance = L.map(mapRef.value).setView([props.center.lat, props.center.lon], props.zoom);
  markersLayer = L.layerGroup().addTo(mapInstance);

  // tile layer OpenStreetMap
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19
  }).addTo(mapInstance);

  // ascolta movimenti della mappa
  mapInstance.on("moveend", () => {
    const c = mapInstance.getCenter();
    emit("centerChanged", { lat: c.lat, lon: c.lng });
  });
  renderMarkers();
});

// Aggiorna la vista quando cambia props.center
watch(
  () => props.center,
  (newCenter) => {
    if (!mapInstance || !newCenter) return;
    mapInstance.setView([Number(newCenter.lat), Number(newCenter.lon)], props.zoom, { animate: true });
  },
  { deep: true }
);

watch(
  () => props.markers,
  () => {
    renderMarkers();
  },
  { deep: true }
);

watch(
  () => props.gpx,
  (newGpx) => {
    if (!mapInstance) return;

    if (gpxLayer) {
      mapInstance.removeLayer(gpxLayer);
      gpxLayer = null;
    }

    if (newGpx) {
      gpxLayer = new L.GPX(newGpx, {
        async: true,
        marker_options: {
          startIconUrl: '',
          endIconUrl: '',
          shadowUrl: '',
          wptIconUrls: {}
        },
        polyline_options: {
          color: "#e53935",
          weight: 4,
          opacity: 0.9
        }
      })
      .on("loaded", function(e) {
        mapInstance.fitBounds(e.target.getBounds());
      })
      .addTo(mapInstance);

    }
  }
);


</script>

<template>
  <div ref="mapRef" class="map-container"></div>
</template>

<style scoped>
.map-container {
  width: 100%;
  height: 100%;
}

:deep(.custom-marker) {
  font-size: 38px;
  display: flex;
  justify-content: center;
  align-items: center;
}

</style>

