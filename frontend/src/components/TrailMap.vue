<script setup>
import { ref, onMounted, watch } from "vue";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const props = defineProps({
  center: { type: Object, required: true }, // {lat, lon}
  zoom: { type: Number, default: 13 }
});

const emit = defineEmits(["centerChanged"]);

const mapRef = ref(null);       // riferimento al div
let mapInstance = null;         // istanza Leaflet

onMounted(() => {
  // inizializza mappa
  mapInstance = L.map(mapRef.value).setView([props.center.lat, props.center.lon], props.zoom);

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
</script>

<template>
  <div ref="mapRef" class="map-container"></div>
</template>

<style scoped>
.map-container {
  width: 100%;
  height: 100%;
}
</style>
