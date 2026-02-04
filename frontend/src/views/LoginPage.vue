<script setup>
import { ref } from "vue";

const username = ref("");
const password = ref("");

const handleLogin = () => {
  console.log("Login:", username.value, password.value);
};

const handleGoogleSignup = () => {
  console.log("Google Sign Up");
};
</script>

<template>
  <div class="login-page">

    <!-- HEADER -->
    <header class="header">
      <div class="header-left"></div>

      <div class="header-center">
        <img
          src="../assets/goon_logo.png"
          alt="GO-ON Logo"
          class="logo"
        />
      </div>

      <div class="header-right">
        <!-- Torna alla Home -->
        <router-link to="/" class="home-btn">
          Home
        </router-link>
      </div>
    </header>

    <!-- BODY -->
    <main class="login-body">

      <!-- LEFT TITLE -->
      <section class="left-section">
        <h1>Login</h1>
      </section>

      <!-- CENTER FORM -->
      <section class="center-section">

        <div class="form">

          <label>
            Username
            <input
              type="text"
              v-model="username"
              placeholder="Inserisci username"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              v-model="password"
              placeholder="Inserisci password"
            />
          </label>

          <a href="#" class="forgot">
            Forgot password?
          </a>

          <button class="login-btn" @click="handleLogin">
            Login
          </button>

        </div>

      </section>

      <!-- DIVIDER -->
      <div class="divider"></div>

      <!-- RIGHT SECTION -->
      <section class="right-section">
        <button class="google-btn" @click="handleGoogleSignup">
          Sign up with Google
        </button>
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
  height: 48px;
  padding: 0 24px;
  background-color: #db4437;
  color: white;
  border: none;
  cursor: pointer;
}
</style>
