<script setup>
import { ref, onMounted } from "vue";
import api from "../api/axios.js";

const trails = ref([]);

onMounted(async () => {
  const res = await api.get("/trails");
  trails.value = res.data;
});
</script>

<template>
  <h1>Lista Sentieri</h1>
  <ul>
    <li v-for="t in trails" :key="t.id">
      {{ t.title }} - {{ t.region }}
    </li>
  </ul>
</template>