const path = require("path");

const uploadDir = path.join(__dirname, "uploads");
process.env.UPLOAD_BASE_DIR = uploadDir;

const request = require("supertest");
const app = require("../src/app.js");
const db = require("./setup.js");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const fs = require("fs");

const { User } = require("../src/models/User");
const { Trail } = require("../src/models/Trail");
const { Feedback } = require("../src/models/Feedback.js");
const { Report } = require("../src/models/Report.js");

dotenv.config();

beforeAll(async () => {
  await db.connect();
});

afterEach(async () => {
  await db.clearDatabase();
});

afterAll(async () => {
  /* Per rimuovere automaticamente i file nel tests/uploads
  if (fs.existsSync(uploadDir)) {
    fs.rmSync(uploadDir, { recursive: true, force: true });
  }
  */
  await db.closeDatabase();
});

