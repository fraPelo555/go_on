import { createRouter, createWebHistory } from "vue-router";
import HomePage from "../views/HomePage.vue";
import LoginPage from "../views/LoginPage.vue";
import ProfilePage from "../views/ProfilePage.vue";
import NewTrack from "../views/NewTrack.vue";
import StatisticsPage from "../views/StatisticsPage.vue";
import TrackDetails from "../views/TrackDetails.vue";
import AdminInfo from "../views/AdminInfo.vue";

const routes = [
  {
   path: "/",
   name: "Home",
   component: HomePage
  },
  {
   path: "/login",
   name: "Login",
   component: LoginPage
  },
  {
  path: "/profile",
  name: "Profile",
  component: ProfilePage
  },
  {
  path: "/new-track",
  name: "NewTrack",
  component: NewTrack
  },
  {
   path: "/statistics",
   name: "Statistics",
   component: StatisticsPage
  },
  {
   path: "/tracks/:id",
   name: "TrackDetails",
   component: TrackDetails,
   props: true
  },
    {
   path: "/admin",
   name: "AdminInfo",
   component: AdminInfo,
   props: true
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;
