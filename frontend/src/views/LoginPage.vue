<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import api from "../api/axios"; // axios già configurato con baseURL

const router = useRouter();

const username = ref("");
const password = ref("");
const email = ref("");  
const error = ref("");
const user = ref(null);

const clientId = "1061830322603-4qocdffrh9aseguk1o7f6j0aj7dfgadf.apps.googleusercontent.com"; // Inserisci qui il tuo Client ID Google

// ==========================
// HANDLE LOGIN / CREATE USER
// ==========================
const handleLogin = async () => {
  error.value = "";

  if (!username.value.trim() || !password.value.trim() || !email.value.trim()) {
    error.value = "Username, password e email sono obbligatori";
    return;
  }

  try {
    const payload = {
      username: username.value.trim(),
      password: password.value,
      email: email.value.trim(),
      role: "admin"
    };

    const res = await api.post("/users", payload);
    const newUser = res.data;

    // Salvataggio token e info locali
    localStorage.setItem("token", newUser.token || "mock-token");
    localStorage.setItem("userId", newUser.id);
    localStorage.setItem("isAdmin", newUser.role === "admin");
    localStorage.setItem("username", newUser.username);

    router.push("/");

  } catch (err) {
    console.error("Errore login/creazione utente:", err);
    error.value = err.response?.data?.message || "Errore durante la creazione dell'utente";
  }
};

// ==========================
// HANDLE GOOGLE LOGIN
// ==========================
const handleGoogleResponse = async (response) => {
  console.log("JWT ricevuto da Google:", response.credential);

  try {
    // POST a /users con googleToken
    const res = await api.post("/users", { googleToken: response.credential });
    const googleUser = res.data;

    // Salvataggio info locali
    localStorage.setItem("token", googleUser.token || "mock-token");
    localStorage.setItem("userId", googleUser.id);
    localStorage.setItem("username", googleUser.username);
    localStorage.setItem("email", googleUser.email);

    // Redirect alla pagina dell'utente
    router.push("/");
  } catch (err) {
    console.error("Errore login Google:", err);
    error.value = err.response?.data?.message || "Errore durante il login con Google";
  }
};

// ==========================
// INITIALIZE GOOGLE BUTTON
// ==========================
const handleGoogleSignup = () => {
  google.accounts.id.prompt(); // mostra il One Tap / popup
};

onMounted(() => {
  // Funzione globale richiesta da Google
  window.handleCredentialResponse = handleGoogleResponse;

  google.accounts.id.initialize({
    client_id: clientId,
    callback: handleGoogleResponse,
  });

  // Render del pulsante Google classico (opzionale se vuoi anche il bottone)
  google.accounts.id.renderButton(
    document.querySelector(".google-btn"),
    { theme: "outline", size: "large", text: "signin_with" }
  );
});
</script>

<template>
  <div class="login-page">
    <!-- HEADER -->
    <header class="header">
      <div class="header-left"></div>

      <div class="header-center">
        <img src="../assets/goon_logo.png" alt="GO-ON Logo" class="logo" />
      </div>

      <div class="header-right">
        <router-link to="/" class="home-btn">Home</router-link>
      </div>
    </header>

    <!-- BODY -->
    <main class="login-body">
      <!-- LEFT TITLE -->
      <section class="left-section">
        <h1>Login</h1>
      </section>

      <!-- DIVIDER -->
      <div class="divider"></div>

      <!-- CENTER FORM -->
      <section class="center-section">
        <div class="form">
          <label>
            Username
            <input type="text" v-model="username" placeholder="Inserisci username" />
          </label>

          <label>
            Email *
            <input type="email" v-model="email" placeholder="Inserisci email" />
          </label>

          <label>
            Password
            <input type="password" v-model="password" placeholder="Inserisci password" />
          </label>

          <button class="login-btn" @click="handleLogin">
            Login / Crea Utente
          </button>

          <p v-if="error" style="color:red">{{ error }}</p>
        </div>
      </section>

      <!-- RIGHT SECTION -->
      <section class="right-section">
        <!-- Questo div sarà sostituito dal pulsante Google -->
        <div class="google-btn"></div>
      </section>
    </main>
  </div>
</template>

<style scoped>
/* PAGE */
.login-page {
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
  gap: 12px;
}

.home-btn {
  padding: 8px 16px;
  border-radius: 6px;
  background-color: #2c7be5;
  color: white;
  text-decoration: none;
}

/* BODY */
.login-body {
  flex: 1;
  display: flex;
  align-items: center;
}

/* LEFT */
.left-section {
  flex: 1;
  text-align: center;
}

.left-section h1 {
  font-size: 48px;
}

/* CENTER */
.center-section {
  flex: 1;
  display: flex;
  justify-content: center;
}

.form {
  width: 280px;
  display: flex;
  flex-direction: column;
}

label {
  display: flex;
  flex-direction: column;
  margin-bottom: 12px;
}

input {
  padding: 8px;
  margin-top: 4px;
}

.forgot {
  font-size: 12px;
  margin-bottom: 16px;
  text-decoration: none;
  color: #2c7be5;
}

.login-btn {
  padding: 10px;
  background-color: #2c7be5;
  color: white;
  border: none;
  cursor: pointer;
}

/* DIVIDER */
.divider {
  width: 1px;
  height: 50%;
  background-color: #ddd;
}

/* RIGHT */
.right-section {
  flex: 1;
  display: flex;
  justify-content: center;
}

.google-btn {
  margin-top: 20px;
}
</style>
