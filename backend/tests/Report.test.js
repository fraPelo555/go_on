const path = require("path");

const uploadDir = path.join(__dirname, "uploads");
process.env.UPLOAD_BASE_DIR = uploadDir;

const request = require("supertest");
const app = require("../src/app.js");
const db = require("./setup.js");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const fs = require("fs");

const { User } = require("../src/models/User");
const { Trail } = require("../src/models/Trail");
const { Report } = require("../src/models/Report");

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

let admin;
beforeEach(async () => {
  admin = await User.create({
    username: "admin",
    email: `admin@test.com`,
    password: "test",
    role: "admin",
  });
});

const createTrail = async (overrides = {}) => {
  return Trail.create({
    title: "Trail Test",
    description: "Percorso di test",
    region: "Trentino",
    valley: "Val di Fassa",
    difficulty: "Medium",
    lengthKm: 10,
    duration: {
      hours: 2,
      minutes: 30,
    },
    ascentM: 600,
    descentM: 600,
    highestPointM: 2100,
    lowestPointM: 1500,
    roadbook: "Seguire il sentiero",
    directions: "Partenza dal parcheggio principale",
    parking: "Parcheggio gratuito presso il rifugio",
    tags: ["scenic", "family_friendly"],
    coordinates: {
      DD: {
        lat: 46.4,
        lon: 11.7,
      },
    },
    idAdmin: admin.id,
    ...overrides,
  });
};

const getToken = (user) => {
  const JWT_SECRET = process.env.JWT_SECRET;

  const payload = {
    id: user.id,
    role: user.role,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "1h",
  });
};

const normalize = (reports) =>
  reports.map(
    ({ _id, id, idUser, idTrail, createdAt, updatedAt, __v, ...rest }) => rest,
  );

describe("POST /reports/:idTrail", () => {
  let trail;
  let token;
  let user;

  beforeEach(async () => {
    user = await User.create({
      username: "user",
      email: "user@test.com",
      password: "password",
      role: "base",
    });
    trail = await createTrail();
    token = getToken(admin);
  });

  it("201 - crea un report valido", async () => {
    const res = await request(app)
      .post(`/reports/${trail._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        idUser: user.id,
        idTrail: trail.id,
        testo: "Report di test",
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("idUser", user.id);
    expect(res.body).toHaveProperty("idTrail", trail.id);
    expect(res.body).toHaveProperty("testo", "Report di test");

    const reportInDb = await Report.findById(res.body.id);
    expect(reportInDb).not.toBeNull();
    expect(reportInDb.testo).toBe("Report di test");
    expect(normalize([res.body])).toMatchSnapshot();
  });

  it("401 - token mancante", async () => {
    const res = await request(app)
      .post(`/reports/${trail._id}`)
      .send({ testo: "Test without token" });

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("message", "Authorization header missing");
  });

  it("401 - token malformato", async () => {
    const res = await request(app)
      .post(`/reports/${trail._id}`)
      .set("Authorization", "Bearer xyz.invalid.token")
      .send({ testo: "Test with invalid token" });

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("message", "Invalid or expired token");
  });

  it("400 - manca il testo", async () => {
    const res = await request(app)
      .post(`/reports/${trail._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message", "'text' is required");
  });

  it("404 - idTrail inesistente", async () => {
    const res = await request(app)
      .post(`/reports/${new mongoose.Types.ObjectId()}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ testo: "Test invalid trail id" });

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty("message", "Trail not found");
  });

  it("400 - idUser inesistente", async () => {
    const invalidUserId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .post(`/reports/${trail._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        idUser: invalidUserId,
        idTrail: trail._id,
        testo: "Report con idUser inesistente",
      });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/idUser/);
  });
});

describe("GET /reports/all", () => {
  let adminToken;
  let userToken;
  let user;
  let trail;

  beforeEach(async () => {
    user = await User.create({
      username: "user",
      email: "user@test.com",
      password: "password",
      role: "base",
    });

    trail = await createTrail();

    adminToken = getToken(admin);
    userToken = getToken(user);

    await Report.create([
      {
        idUser: user._id,
        idTrail: trail._id,
        testo: "Report New",
        state: "Nuovo",
      },
      {
        idUser: user._id,
        idTrail: trail._id,
        testo: "Report In progress",
        state: "In progresso",
      },
      {
        idUser: user._id,
        idTrail: trail._id,
        testo: "Report Resolved",
        state: "Risolto",
      },
    ]);
  });

  it("401 - token mancante", async () => {
    const res = await request(app).get("/reports/all");

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("message");
  });

  it("403 - utente non admin", async () => {
    const res = await request(app)
      .get("/reports/all")
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty("message");
  });

  it("200 - admin senza filtri", async () => {
    const res = await request(app)
      .get("/reports/all")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(3);
    const sorted = normalize(res.body).sort((a, b) =>
      a.state.localeCompare(b.state)
    );
    expect(sorted).toMatchSnapshot();
  });

  it("200 - filtro state=Nuovo", async () => {
    const res = await request(app)
      .get("/reports/all?state=Nuovo")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toHaveProperty("state", "Nuovo");
    expect(normalize(res.body)).toMatchSnapshot();
  });

  it("200 - filtro multiplo state=Nuovo,Risolto", async () => {
    const res = await request(app)
      .get("/reports/all?state=Nuovo,Risolto")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(2);

    const states = res.body.map((r) => r.state);
    expect(states).toEqual(expect.arrayContaining(["Nuovo", "Risolto"]));
    const sorted = normalize(res.body).sort((a, b) =>
  a.state.localeCompare(b.state)
);
expect(sorted).toMatchSnapshot();
  });

  it("200 - filtro senza match", async () => {
    const res = await request(app)
      .get("/reports/all?state=InvalidState")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
    expect(normalize(res.body)).toMatchSnapshot();
  });
});

describe("GET /reports/:id", () => {
  let token;
  let user;
  let trail;
  let report;

  beforeEach(async () => {
    user = await User.create({
      username: "user",
      email: "user@test.com",
      password: "password",
      role: "base",
    });

    trail = await createTrail();
    token = getToken(user);

    report = await Report.create({
      idUser: user._id,
      idTrail: trail._id,
      testo: "Report di test",
      state: "Nuovo",
    });
  });

  it("401 - token mancante", async () => {
    const res = await request(app).get(`/reports/${report._id}`);

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("message");
  });

  it("401 - token non valido", async () => {
    const res = await request(app)
      .get(`/reports/${report._id}`)
      .set("Authorization", "Bearer invalid.token.here");

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("message");
  });

  it("200 - report esistente", async () => {
  const res = await request(app)
    .get(`/reports/${report._id}`)
    .set("Authorization", `Bearer ${token}`);

  expect(res.statusCode).toBe(200);

  expect(res.body).toHaveProperty("id", report.id);
  expect(res.body).toHaveProperty("testo", "Report di test");
  expect(res.body).toHaveProperty("state", "Nuovo");
  expect(res.body.idUser).toBeDefined();
  expect(res.body.idUser.id).toBe(user.id);
  expect(res.body.idTrail).toBeDefined();
  expect(res.body.idTrail.id).toBe(trail.id);

  expect(normalize([res.body])).toMatchSnapshot();
});


  it("404 - report inesistente", async () => {
    const nonExistingId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .get(`/reports/${nonExistingId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty("message", "Report non trovato");
  });

  it("400 - id malformato", async () => {
    const res = await request(app)
      .get("/reports/invalid-id")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message", "Invalid report id");
  });
});

describe("PUT /reports/:id", () => {
  let adminToken;
  let ownerToken;
  let otherUserToken;
  let owner;
  let otherUser;
  let trail;
  let report;

  beforeEach(async () => {
    owner = await User.create({
      username: "owner",
      email: "owner@test.com",
      password: "password",
      role: "base",
    });

    otherUser = await User.create({
      username: "other",
      email: "other@test.com",
      password: "password",
      role: "base",
    });

    trail = await createTrail();

    report = await Report.create({
      idUser: owner._id,
      idTrail: trail._id,
      testo: "Testo originale",
      state: "Nuovo",
    });

    adminToken = getToken(admin);
    ownerToken = getToken(owner);
    otherUserToken = getToken(otherUser);
  });

  it("401 - token mancante", async () => {
    const res = await request(app).put(`/reports/${report._id}`);

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("message");
  });

  it("401 - token non valido", async () => {
    const res = await request(app)
      .put(`/reports/${report._id}`)
      .set("Authorization", "Bearer invalid.token");

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("message");
  });

  it("400 - id malformato", async () => {
    const res = await request(app)
      .put("/reports/invalid-id")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message", "Invalid report id");
  });

  it("404 - report inesistente", async () => {
    const res = await request(app)
      .put(`/reports/${new mongoose.Types.ObjectId()}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty("message", "Report not found");
  });

  it("403 - utente non owner né admin", async () => {
    const res = await request(app)
      .put(`/reports/${report._id}`)
      .set("Authorization", `Bearer ${otherUserToken}`)
      .send({ testo: "Tentativo illecito" });

    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty("message");
  });

  it("400 - nessun campo valido da aggiornare", async () => {
    const res = await request(app)
      .put(`/reports/${report._id}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ state: "Risolto" }); // base user non può

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message", "No valid fields to update");
  });

  it("200 - owner aggiorna solo testo", async () => {
    const res = await request(app)
      .put(`/reports/${report._id}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ testo: "Testo aggiornato" });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("testo", "Testo aggiornato");
    expect(res.body).toHaveProperty("state", "Nuovo");

    const updated = await Report.findById(report._id);
    expect(updated.testo).toBe("Testo aggiornato");
    expect(normalize([res.body])).toMatchSnapshot();
  });

  it("200 - admin aggiorna state", async () => {
    const res = await request(app)
      .put(`/reports/${report._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ state: "Risolto" });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("state", "Risolto");
    expect(normalize([res.body])).toMatchSnapshot();
  });

  it("400 - admin state non valido", async () => {
    const res = await request(app)
      .put(`/reports/${report._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ state: "INVALID_STATE" });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/state/);
  });
});

describe("DELETE /reports/:id", () => {
  let owner;
  let otherUser;
  let trail;
  let report;
  let ownerToken;
  let otherUserToken;
  let adminToken;

  beforeEach(async () => {
    owner = await User.create({
      username: "owner",
      email: "owner@test.com",
      password: "password",
      role: "base",
    });

    otherUser = await User.create({
      username: "other",
      email: "other@test.com",
      password: "password",
      role: "base",
    });

    trail = await createTrail();

    report = await Report.create({
      idUser: owner._id,
      idTrail: trail._id,
      testo: "Report da eliminare",
      state: "Nuovo",
    });

    ownerToken = getToken(owner);
    otherUserToken = getToken(otherUser);
    adminToken = getToken(admin);
  });

  it("401 - token mancante", async () => {
    const res = await request(app).delete(`/reports/${report._id}`);

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("message");
  });

  it("401 - token non valido", async () => {
    const res = await request(app)
      .delete(`/reports/${report._id}`)
      .set("Authorization", "Bearer invalid.token");

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("message");
  });

  it("400 - id malformato", async () => {
    const res = await request(app)
      .delete("/reports/invalid-id")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message", "Invalid report id");
  });

  it("404 - report inesistente", async () => {
    const nonExistingId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .delete(`/reports/${nonExistingId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty("message", "Report not found");
  });

  it("403 - utente non owner né admin", async () => {
    const res = await request(app)
      .delete(`/reports/${report._id}`)
      .set("Authorization", `Bearer ${otherUserToken}`);

    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty("message");
  });

  it("403 - owner non può eliminare se stato != 'Nuovo'", async () => {
    report.state = "In progresso";
    await report.save();

    const res = await request(app)
      .delete(`/reports/${report._id}`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty("message");

    const stillExists = await Report.findById(report._id);
    expect(stillExists).not.toBeNull();
  });

  it("204 - owner elimina il report se stato 'Nuovo'", async () => {
    const res = await request(app)
      .delete(`/reports/${report._id}`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.statusCode).toBe(204);

    const deleted = await Report.findById(report._id);
    expect(deleted).toBeNull();
  });

  it("204 - admin elimina anche se stato != 'Nuovo'", async () => {
    report.state = "Risolto";
    await report.save();

    const res = await request(app)
      .delete(`/reports/${report._id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(204);

    const deleted = await Report.findById(report._id);
    expect(deleted).toBeNull();
  });
});

describe("GET /reports/all/trail/:idTrail", () => {
  let token;
  let user;
  let trailWithReports;
  let trailWithoutReports;

  beforeEach(async () => {
    user = await User.create({
      username: "user",
      email: "user@test.com",
      password: "password",
      role: "base",
    });

    token = getToken(user);

    trailWithReports = await createTrail({
      title: "Trail con report",
    });

    trailWithoutReports = await createTrail({
      title: "Trail senza report",
    });

    await Report.create([
      {
        idUser: user._id,
        idTrail: trailWithReports._id,
        testo: "Report 1",
        state: "Nuovo",
      },
      {
        idUser: user._id,
        idTrail: trailWithReports._id,
        testo: "Report 2",
        state: "Risolto",
      },
    ]);
  });

  it("401 - token mancante", async () => {
    const res = await request(app).get(
      `/reports/all/trail/${trailWithReports._id}`,
    );

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("message");
  });

  it("401 - token non valido", async () => {
    const res = await request(app)
      .get(`/reports/all/trail/${trailWithReports._id}`)
      .set("Authorization", "Bearer invalid.token");

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("message");
  });

  it("400 - idTrail malformato", async () => {
    const res = await request(app)
      .get("/reports/all/trail/invalid-id")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message", "Invalid trail id");
  });

  it("404 - trail inesistente", async () => {
    const nonExistingTrailId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .get(`/reports/all/trail/${nonExistingTrailId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty("message", "Trail not found");
  });

  it("200 - trail esistente senza report", async () => {
    const res = await request(app)
      .get(`/reports/all/trail/${trailWithoutReports._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(0);
    expect(normalize(res.body)).toMatchSnapshot();
  });

  it("200 - trail esistente con report", async () => {
    const res = await request(app)
      .get(`/reports/all/trail/${trailWithReports._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(2);

    const texts = res.body.map((r) => r.testo);
    expect(texts).toEqual(expect.arrayContaining(["Report 1", "Report 2"]));
    const sorted = normalize(res.body).sort((a, b) =>
      a.state.localeCompare(b.state)
    );
    expect(sorted).toMatchSnapshot();
  });

  it("200 - più report sullo stesso trail", async () => {
    await Report.create({
      idUser: user._id,
      idTrail: trailWithReports._id,
      testo: "Report 3",
      state: "In progresso",
    });

    const res = await request(app)
      .get(`/reports/all/trail/${trailWithReports._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(3);
    const sorted = normalize(res.body).sort((a, b) =>
      a.state.localeCompare(b.state)
    );
    expect(sorted).toMatchSnapshot();
  });
});

describe("GET /reports/all/user/:idUser", () => {
  let user;
  let otherUser;
  let tokenUser;
  let tokenOtherUser;
  let tokenAdmin;

  beforeEach(async () => {
    user = await User.create({
      username: "user",
      email: "user@test.com",
      password: "password",
      role: "base",
    });

    otherUser = await User.create({
      username: "other",
      email: "other@test.com",
      password: "password",
      role: "base",
    });

    tokenUser = getToken({ id: user.id, role: user.role });
    tokenOtherUser = getToken({ id: otherUser.id, role: otherUser.role });
    tokenAdmin = getToken({ id: admin.id, role: admin.role });

    const trail = await createTrail({ title: "Trail Test per report" });

    await Report.create([
      { idUser: user._id, idTrail: trail._id, testo: "Report 1", state: "Nuovo" },
      {
        idUser: user._id,
        idTrail: trail._id,
        testo: "Report 2",
        state: "Risolto",
      },
    ]);
  });

  it("401 - token mancante", async () => {
    const res = await request(app).get(`/reports/all/user/${user._id}`);
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("message");
  });

  it("401 - token non valido", async () => {
    const res = await request(app)
      .get(`/reports/all/user/${user._id}`)
      .set("Authorization", "Bearer invalid.token");
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("message");
  });

  it("400 - idUser malformato", async () => {
    const res = await request(app)
      .get("/reports/all/user/invalid-id")
      .set("Authorization", `Bearer ${tokenUser}`);
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message", "Invalid user id");
  });

  it("404 - user inesistente", async () => {
    const nonExistingId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .get(`/reports/all/user/${nonExistingId}`)
      .set("Authorization", `Bearer ${tokenAdmin}`);
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty("message", "User not found");
  });

  it("403 - user prova a leggere report di un altro user", async () => {
    const res = await request(app)
      .get(`/reports/all/user/${user._id}`)
      .set("Authorization", `Bearer ${tokenOtherUser}`);
    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty("message");
  });

  it("200 - user legge i propri report", async () => {
    const res = await request(app)
      .get(`/reports/all/user/${user._id}`)
      .set("Authorization", `Bearer ${tokenUser}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(2);
    const texts = res.body.map((r) => r.testo);
    expect(texts).toEqual(expect.arrayContaining(["Report 1", "Report 2"]));
    const sorted = normalize(res.body).sort((a, b) =>
      a.state.localeCompare(b.state)
    );
    expect(sorted).toMatchSnapshot();
  });

  it("200 - admin legge i report di un user", async () => {
    const res = await request(app)
      .get(`/reports/all/user/${user._id}`)
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(2);
    const sorted = normalize(res.body).sort((a, b) =>
      a.state.localeCompare(b.state)
    );
    expect(sorted).toMatchSnapshot();
  });

  it("200 - user esistente senza report", async () => {
    const res = await request(app)
      .get(`/reports/all/user/${otherUser._id}`)
      .set("Authorization", `Bearer ${tokenOtherUser}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(0);
    expect(normalize(res.body)).toMatchSnapshot();
  });
});
