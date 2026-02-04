<script setup>
import { ref } from "vue";

/* Form data (mock) */
const form = ref({
  nome: "",
  descrizioneBreve: "",
  descrizioneEstesa: "",
  dislivello: "",
  lunghezza: "",
  durata: "",
  difficolta: 1,
  coordPartenza: "",
  coordArrivo: "",
  stagione: [],
  gpx: "",
  foto: "",
  puntiInteresse: "",
  pubblico: [],
  attivita: [],
  ambiente: [],
  caratteristiche: []
});

/* Utils per toggle bottoni */
const toggleValue = (list, value) => {
  const index = list.indexOf(value);
  if (index === -1) list.push(value);
  else list.splice(index, 1);
};

const saveTrack = () => {
  console.log("Nuovo percorso:", form.value);
};
</script>

<template>
  <div class="new-track-page">

    <!-- HEADER -->
    <header class="header">
      <div class="header-left">
        <router-link to="/profile" class="nav-btn">Profilo</router-link>
      </div>

      <div class="header-center">
        <img src="../assets/goon_logo.png" class="logo" alt="GO-ON Logo" />
      </div>

      <div class="header-right">
        <router-link to="/" class="nav-btn">Home</router-link>
        <router-link to="/statistics" class="nav-btn">Statistiche</router-link>
      </div>
    </header>

    <!-- BODY -->
    <main class="form-body">

      <!-- LEFT COLUMN -->
      <section class="column">

        <div class="field">
          <label>Nome</label>
          <input v-model="form.nome" />
        </div>

        <div class="field">
          <label>Descrizione Breve</label>
          <input v-model="form.descrizioneBreve" />
        </div>

        <div class="field">
          <label>Descrizione Estesa</label>
          <textarea v-model="form.descrizioneEstesa"></textarea>
        </div>

        <div class="row">
          <div class="field">
            <label>Dislivello</label>
            <input v-model="form.dislivello" />
          </div>
          <div class="field">
            <label>Lunghezza</label>
            <input v-model="form.lunghezza" />
          </div>
        </div>

        <div class="row">
          <div class="field">
            <label>Durata</label>
            <input v-model="form.durata" />
          </div>

          <div class="field">
            <label>Difficoltà</label>
            <div class="difficulty">
              <span
                v-for="n in 5"
                :key="n"
                :class="{ active: n <= form.difficolta }"
                @click="form.difficolta = n"
              ></span>
            </div>
          </div>
        </div>

        <div class="field">
          <label>Coordinate di partenza</label>
          <input v-model="form.coordPartenza" />
        </div>

        <div class="field">
          <label>Coordinate di arrivo</label>
          <input v-model="form.coordArrivo" />
        </div>

        <button class="save-btn" @click="saveTrack">
          Salva
        </button>

      </section>

      <!-- RIGHT COLUMN -->
      <section class="column">

        <div class="field">
          <label>Stagione</label>
          <div class="buttons">
            <button @click="toggleValue(form.stagione,'Primavera')">Primavera</button>
            <button @click="toggleValue(form.stagione,'Estate')">Estate</button>
            <button @click="toggleValue(form.stagione,'Autunno')">Autunno</button>
            <button @click="toggleValue(form.stagione,'Inverno')">Inverno</button>
          </div>
        </div>

        <div class="field">
          <label>Traccia GPX</label>
          <input placeholder="File GPX" />
        </div>

        <div class="field">
          <label>Foto</label>
          <input placeholder="Carica foto" />
        </div>

        <div class="field">
          <label>Punti Interesse</label>
          <input v-model="form.puntiInteresse" />
        </div>

        <div class="field">
          <label>Pubblico</label>
          <div class="buttons">
            <button @click="toggleValue(form.pubblico,'Famiglia')">Famiglia</button>
            <button @click="toggleValue(form.pubblico,'Anziani')">Anziani</button>
            <button @click="toggleValue(form.pubblico,'Esperti')">Esperti</button>
            <button @click="toggleValue(form.pubblico,'Principianti')">Principianti</button>
            <button @click="toggleValue(form.pubblico,'Scuola')">Scuola</button>
            <button @click="toggleValue(form.pubblico,'Passeggini')">Passeggini</button>
          </div>
        </div>

        <div class="field">
          <label>Attività</label>
          <div class="buttons">
            <button @click="toggleValue(form.attivita,'Trail Running')">Trail Running</button>
            <button @click="toggleValue(form.attivita,'Trekking')">Trekking</button>
            <button @click="toggleValue(form.attivita,'Passeggiata')">Passeggiata</button>
            <button @click="toggleValue(form.attivita,'Mountain Bike')">Mountain Bike</button>
          </div>
        </div>

        <div class="field">
          <label>Ambiente</label>
          <div class="buttons">
            <button @click="toggleValue(form.ambiente,'Lago')">Lago</button>
            <button @click="toggleValue(form.ambiente,'Fiume')">Fiume</button>
            <button @click="toggleValue(form.ambiente,'Grotte')">Grotte</button>
            <button @click="toggleValue(form.ambiente,'Cascata')">Cascata</button>
            <button @click="toggleValue(form.ambiente,'Storico')">Storico</button>
            <button @click="toggleValue(form.ambiente,'Panoramico')">Panoramico</button>
          </div>
        </div>

        <div class="field">
          <label>Caratteristiche</label>
          <div class="buttons">
            <button @click="toggleValue(form.caratteristiche,'Ripido')">Ripido</button>
            <button @click="toggleValue(form.caratteristiche,'Lineare')">Lineare</button>
            <button @click="toggleValue(form.caratteristiche,'Circolare')">Circolare</button>
          </div>
        </div>

      </section>

    </main>

  </div>
</template>

<style scoped>
.new-track-page {
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

.header-left {
  display: flex;
  gap: 12px;
}

.nav-btn {
  text-decoration: none;
  padding: 6px 12px;
  background: #2c7be5;
  color: white;
  border-radius: 6px;
}

/* BODY */
.form-body {
  flex: 1;
  display: flex;
  padding: 24px;
  gap: 24px;
}

.column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.field label {
  font-weight: bold;
}

.field input,
.field textarea {
  width: 100%;
  padding: 6px;
}

textarea {
  min-height: 100px;
}

.row {
  display: flex;
  gap: 12px;
}

.buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.buttons button {
  padding: 6px 10px;
  border: 1px solid #aaa;
  background: #f5f5f5;
  cursor: pointer;
}

.difficulty {
  display: flex;
  gap: 6px;
}

.difficulty span {
  width: 20px;
  height: 20px;
  background: #ddd;
  cursor: pointer;
}

.difficulty span.active {
  background: #2c7be5;
}

.save-btn {
  margin-top: 16px;
  width: 120px;
  padding: 10px;
  background: #2c7be5;
  color: white;
  border: none;
  cursor: pointer;
}
</style>
