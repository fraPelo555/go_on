<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { createUser } from "../services/userService";

const router = useRouter();

const username = ref("");
const password = ref("");
const email = ref("");  
const error = ref("");
const activeTab = ref("login"); // "login" o "signup"
const showPopup = ref(false);    // per avviso utente esistente
const popupMessage = ref("");


const clientId = "1061830322603-4qocdffrh9aseguk1o7f6j0aj7dfgadf.apps.googleusercontent.com"; // Inserisci qui il tuo Client ID Google

// ==========================
// HANDLE LOGIN / CREATE USER
// ==========================
const handleLogin = async () => {
  error.value = "";
  popupMessage.value = "";
  showPopup.value = false;

  if (!password.value.trim() || !email.value.trim()) {
    error.value = "Password e email sono obbligatori";
    return;
  }

  try {
    const payload = {
      username: username.value.trim(),
      password: password.value,
      email: email.value.trim(),
      // non forziamo il role qui: backend gestisce
    };

    const res = await createUser(payload); // usa il service

    // res.status === 200 -> utente esistente autenticato -> ok
    if (res.status === 200) {
      const newUser = res.data;
      localStorage.setItem("token", newUser.token || "mock-token");
      localStorage.setItem("userId", newUser.id);
      localStorage.setItem("isAdmin", newUser.role === "admin");
      localStorage.setItem("username", newUser.username);
      router.push("/");
      return;
    }

    // res.status === 201 -> backend ha creato l'utente: nel flusso LOGIN vogliamo rifiutare
    if (res.status === 201) {
      popupMessage.value = "Utente non ancora esistente, in creazione. Reindirizzamento...";
      showPopup.value = true;
        
      const newUser = res.data;
        
      localStorage.setItem("token", newUser.token || "mock-token");
      localStorage.setItem("userId", newUser.id);
      localStorage.setItem("isAdmin", newUser.role === "admin");
      localStorage.setItem("username", newUser.username);
        
      setTimeout(() => {
        showPopup.value = false;
        router.push("/");
      }, 1500);
     
      return;
    }


    // caso imprevisto: mostra errore generico
    error.value = "Autenticazione fallita";
  } catch (err) {
    // Gestione errori precisi dal backend (es. 401 wrong password)
    const status = err.response?.status;
    const msg = err.response?.data?.message || "Errore di autenticazione";
    if (status === 401) {
     popupMessage.value = "Password errata. Riprova.";
     showPopup.value = true;

     setTimeout(() => {
       showPopup.value = false;
     }, 1500);
    
     return;
   } else if (status === 400) {
      error.value = msg;
    } else {
      error.value = "Errore durante il login";
    }
    console.error("Errore login/creazione utente:", err);
  }
};



// ==========================
// HANDLE GOOGLE LOGIN
// ==========================
const handleGoogleResponse = async (response) => {
  console.log("JWT ricevuto da Google:", response.credential);

  try {
    // POST a /users con googleToken
    const res = await createUser({ googleToken: response.credential });
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

const handleSignup = async () => {
  error.value = "";

  if (!email.value.trim() || !password.value.trim() || !username.value.trim()) {
    error.value = "Tutti i campi sono obbligatori";
    return;
  }
   
  try {
    const payload = {
      username: username.value.trim(),
      password: password.value,
      email: email.value.trim(),
    };

    const res = await createUser(payload);
    const data = res.data;
    
    // Salvataggio token e info locali
    localStorage.setItem("token", data.token || "mock-token");
    localStorage.setItem("userId", data.id);
    localStorage.setItem("isAdmin", data.role === "admin");
    localStorage.setItem("username", data.username);
    localStorage.setItem("email", data.email);
    
    // Se il backend ha risposto 200 -> utente già esistente: popup + redirect (come prima)
    if (res.status === 200) {
      popupMessage.value = "Utente già esistente, reindirizzamento...";
      showPopup.value = true;
      setTimeout(() => {
        showPopup.value = false;
        router.push("/");
      }, 1000);
      return;
    }
   
    // Status 201 → utente nuovo, redirect normale
    router.push("/");
  } catch (err) {
    console.error("Errore signup:", err);
    error.value = err.response?.data?.message || "Errore durante la creazione dell'utente";
  }

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
    <!-- LOGIN / SIGNUP TAB -->
    <div class="tab-bar">
      <div class="tab" :class="{ active: activeTab === 'login' }" @click="activeTab='login'">
        Login
      </div>
      <div class="tab" :class="{ active: activeTab === 'signup' }" @click="activeTab='signup'">
        Sign Up
      </div>
    </div>

    <!-- BODY -->
    <main class="login-body">
     <div v-if="showPopup" class="popup">
       {{ popupMessage }}
     </div>



      <!-- LEFT TITLE -->
      <section class="left-section">
        <h1 v-if="activeTab!=='signup'">Login</h1>
        <h1 v-else>Signup</h1>
      </section>

      <!-- DIVIDER -->
      <div class="divider"></div>

      <!-- CENTER FORM -->
      <section class="center-section">
        <div class="form">
          <!-- USERNAME solo per signup -->
          <label v-if="activeTab==='signup'">
            Username
            <input type="text" v-model="username" placeholder="Inserisci username" />
          </label>

          <!-- EMAIL -->
          <label>
            Email
            <input type="email" v-model="email" placeholder="Inserisci email" />
          </label>

          <!-- PASSWORD -->
          <label>
            Password
            <input type="password" v-model="password" placeholder="Inserisci password" />
          </label>

          <!-- BOTTONE -->
          <button class="login-btn" @click="activeTab==='login' ? handleLogin() : handleSignup()">
            {{ activeTab==='login' ? 'Login' : 'Sign Up' }}
          </button>

          <p v-if="error && !showPopup" style="color:red">{{ error }}</p>

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

.tab-bar {
  display: flex;
  border-bottom: 1px solid #ccc;
  margin-bottom: 24px;
}

.popup {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  border: 1px solid #333;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  z-index: 9999;
  text-align: center;
}

.tab {
  flex: 1;
  text-align: center;
  padding: 16px;
  cursor: pointer;
  background: #f5f5f5;
  transition: background 0.2s;
}

.tab:hover {
  background: #e0e0e0;
}

.tab.active {
  background: #dcdcdc;
  font-weight: bold;
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
