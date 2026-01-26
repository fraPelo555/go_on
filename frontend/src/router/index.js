import { createRouter, createWebHistory } from 'vue-router';
import Trails from '../views/Trails.vue';
import TrailDetails from '../views/TrailDetails.vue';

const routes = [
  { path: '/', component: Trails },
  { path: '/trail/:id', component: TrailDetails }
];

export default createRouter({
  history: createWebHistory(),
  routes
});