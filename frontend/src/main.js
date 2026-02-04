import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";  // <-- importa il router

const app = createApp(App);

app.use(router);  // <-- registra il router
app.mount("#app");
