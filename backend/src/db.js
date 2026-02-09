const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const uri = process.env.MONGO_URI;
if (!uri) {
  console.error("MONGO_URI non impostato in .env");
  process.exit(1);
}

async function connectToMongo() {
  try {
    await mongoose.connect(uri);
    console.log("Connesso a MongoDB");
  } catch (err) {
    console.error("Errore connessione MongoDB", err);
    process.exit(1);
  }
}

module.exports = {
  connectToMongo,
};
