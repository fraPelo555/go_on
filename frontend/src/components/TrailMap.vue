<script setup>
import { onMounted, ref } from "vue";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-gpx";

const props = defineProps({
  markers: {
    type: Array,
    default: () => []
  },
  gpx: {
    type: String,
    required: false,   // 🔴 NON obbligatorio
    default: null
  }
});


const mapContainer = ref(null);
let map = null;

onMounted(() => {
  map = L.map(mapContainer.value).setView([45.4394, 7.6473], 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  new L.GPX(props.gpx, { async: true })
    .on("loaded", function (e) {
      map.fitBounds(e.target.getBounds());
    })
    .addTo(map);
});
</script>

<template>
  <div ref="mapContainer" class="map"></div>
</template>

<style scoped>
.map {
  width: 100%;
  height: 100%;
  z-index:0;
}
</style>
