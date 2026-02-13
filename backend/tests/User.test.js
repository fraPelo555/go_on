jest.mock("google-auth-library", () => {
  return {
    OAuth2Client: jest.fn().mockImplementation(() => ({
      verifyIdToken: jest.fn(),
    })),
  };
});

const path = require("path");

const uploadDir = path.join(__dirname, "uploads");
process.env.UPLOAD_BASE_DIR = uploadDir;

const request = require("supertest");
const app = require("../src/app.js");
const db = require("./setup.js");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
const { OAuth2Client } = require("google-auth-library");

const { User } = require("../src/models/User");
const { Trail } = require("../src/models/Trail");
const { Feedback } = require("../src/models/Feedback.js");
const { Report } = require("../src/models/Report.js");

dotenv.config();

process.env.GOOGLE_CLIENT_ID = "test-google-client-id";

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

const normalizeUsers = (users) =>
  users.map(({ _id, id, token, createdAt, updatedAt, __v, ...rest }) => rest);

const normalizeTrails = (trails) =>
  trails.map(
    ({ _id, id, idAdmin, createdAt, updatedAt, __v, ...rest }) => rest,
  );

describe("POST /users - autenticazione locale", () => {
  it("200 - autentica un utente esistente con password corretta", async () => {
    const password = "password123";
    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      email: "test@example.com",
      username: "testuser",
      password: hashed,
    });

    const res = await request(app).post("/users").send({
      email: "test@example.com",
      password,
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body.email).toBe(user.email);
    expect(res.body.username).toBe(user.username);

    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(decoded.email).toBe(user.email);

    expect(normalizeUsers([res.body])).toMatchSnapshot();
  });

  it("201 - crea un nuovo utente se non esiste", async () => {
    const res = await request(app).post("/users").send({
      email: "nuovo@example.com",
      password: "password123",
      username: "nuovoutente",
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("token");
    expect(res.body.email).toBe("nuovo@example.com");
    expect(res.body.username).toBe("nuovoutente");

    const userInDb = await User.findOne({ email: "nuovo@example.com" });
    expect(userInDb).not.toBeNull();
    expect(userInDb.username).toBe("nuovoutente");

    expect(normalizeUsers([res.body])).toMatchSnapshot();
  });

  it("401 - rifiuta autenticazione con password errata", async () => {
    const hashed = await bcrypt.hash("password123", 10);

    await User.create({
      email: "test@example.com",
      username: "testuser",
      password: hashed,
    });

    const res = await request(app).post("/users").send({
      email: "test@example.com",
      password: "password-sbagliata",
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("400 - rifiuta richiesta senza email e password", async () => {
    const res = await request(app).post("/users").send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe("POST /users - autenticazione Google", () => {
  it("201 - crea un nuovo utente al primo login Google", async () => {
    OAuth2Client.mockImplementation(() => ({
      verifyIdToken: jest.fn().mockResolvedValue({
        getPayload: () => ({
          email: "googleuser@example.com",
          name: "Google User",
        }),
      }),
    }));

    const res = await request(app).post("/users").send({
      googleToken: "token-valido",
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("token");
    expect(res.body.email).toBe("googleuser@example.com");
    expect(res.body.username).toBe("Google User");

    const userInDb = await User.findOne({ email: "googleuser@example.com" });
    expect(userInDb).not.toBeNull();

    expect(normalizeUsers([res.body])).toMatchSnapshot();
  });

  it("200 - autentica un utente Google già esistente", async () => {
    await User.create({
      email: "googleuser@example.com",
      username: "Google User",
      password: "placeholder",
    });

    OAuth2Client.mockImplementation(() => ({
      verifyIdToken: jest.fn().mockResolvedValue({
        getPayload: () => ({
          email: "googleuser@example.com",
          name: "Google User",
        }),
      }),
    }));

    const res = await request(app).post("/users").send({
      googleToken: "token-valido",
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body.email).toBe("googleuser@example.com");
    expect(res.body.username).toBe("Google User");
    expect(normalizeUsers([res.body])).toMatchSnapshot();
  });

  it("500 - fallisce autenticazione con Google token non valido", async () => {
    OAuth2Client.mockImplementation(() => ({
      verifyIdToken: jest.fn().mockRejectedValue(new Error("Invalid token")),
    }));

    const res = await request(app).post("/users").send({
      googleToken: "token-non-valido",
    });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

describe("GET /users/all", () => {
  it("200 - restituisce tutti gli utenti se il richiedente è admin", async () => {
    const admin = await User.create({
      username: "admin",
      email: "admin@test.com",
      password: "password",
      role: "admin",
    });

    await User.create({
      username: "user1",
      email: "user1@test.com",
      password: "password",
      role: "base",
    });

    await User.create({
      username: "user2",
      email: "user2@test.com",
      password: "password",
      role: "base",
    });

    const token = getToken(admin);

    const res = await request(app)
      .get("/users/all")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(3);
    expect(Array.isArray(res.body.users)).toBe(true);

    res.body.users.forEach((u) => {
      expect(u).not.toHaveProperty("password");
    });
    expect(normalizeUsers(res.body.users)).toMatchSnapshot();
  });

  it("403 - rifiuta l'accesso se l'utente non è admin", async () => {
    const user = await User.create({
      username: "user",
      email: "user@test.com",
      password: "password",
      role: "base",
    });

    const token = getToken(user);

    const res = await request(app)
      .get("/users/all")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("401 - rifiuta l'accesso se il token non è presente", async () => {
    const res = await request(app).get("/users/all");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("401 - rifiuta l'accesso se il token non è valido", async () => {
    const res = await request(app)
      .get("/users/all")
      .set("Authorization", "Bearer token-non-valido");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe("GET /users/:id", () => {
  let user, admin, tokenUser, tokenAdmin;

  beforeEach(async () => {
    user = await User.create({
      username: "user",
      email: "user@test.com",
      password: "password",
      role: "base",
    });
    admin = await User.create({
      username: "admin",
      email: "admin@test.com",
      password: "password",
      role: "admin",
    });

    tokenUser = getToken(user);
    tokenAdmin = getToken(admin);
  });

  it("400 - ritorna errore per id non valido", async () => {
    const res = await request(app)
      .get("/users/invalid-id")
      .set("Authorization", `Bearer ${tokenUser}`);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: "Invalid user id",
    });
  });

  it("404 - ritorna errore se l'utente non esiste", async () => {
    const fakeId = "000000000000000000000000";
    const res = await request(app)
      .get(`/users/${fakeId}`)
      .set("Authorization", `Bearer ${tokenUser}`);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: "User not found",
    });
  });

  it("200 - autentica un utente esistente che richiede i propri dati", async () => {
    const res = await request(app)
      .get(`/users/${user.id}`)
      .set("Authorization", `Bearer ${tokenUser}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe(user.email);
    expect(res.body.user.username).toBe(user.username);
    expect(res.body.user).not.toHaveProperty("password");
    expect(normalizeUsers([res.body.user])).toMatchSnapshot();
  });

  it("200 - un admin può leggere i dati di qualsiasi utente", async () => {
    const res = await request(app)
      .get(`/users/${user.id}`)
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe(user.email);

    expect(normalizeUsers([res.body.user])).toMatchSnapshot();
  });

  it("403 - un utente non admin non può leggere i dati di altri utenti", async () => {
    const otherUser = await User.create({
      username: "other",
      email: "user2@test.com",
      password: "password",
      role: "base",
    });
    const tokenOther = getToken(otherUser);

    const res = await request(app)
      .get(`/users/${user.id}`)
      .set("Authorization", `Bearer ${tokenOther}`);

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      message: "Forbidden",
    });
  });
});

describe("PUT /users/:id", () => {
  it("200 - aggiorna i dati dell'utente se è self", async () => {
    const user = await User.create({
      username: "user",
      email: "user@test.com",
      password: "password",
      role: "base",
    });

    const token = getToken(user);

    const res = await request(app)
      .put(`/users/${user.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ username: "updatedUser" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.username).toBe("updatedUser");
    expect(res.body.user).not.toHaveProperty("password");
    expect(normalizeUsers([res.body.user])).toMatchSnapshot();
  });

  it("200 - aggiorna i dati dell'utente se il richiedente è admin", async () => {
    const admin = await User.create({
      username: "admin",
      email: "admin@test.com",
      password: "password",
      role: "admin",
    });

    const user = await User.create({
      username: "user",
      email: "user@test.com",
      password: "password",
      role: "base",
    });

    const token = getToken(admin);

    const res = await request(app)
      .put(`/users/${user.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ username: "updatedByAdmin" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.username).toBe("updatedByAdmin");
    expect(normalizeUsers([res.body.user])).toMatchSnapshot();
  });

  it("403 - rifiuta l'aggiornamento se non è self né admin", async () => {
    const user1 = await User.create({
      username: "user1",
      email: "user1@test.com",
      password: "password",
      role: "base",
    });

    const user2 = await User.create({
      username: "user2",
      email: "user2@test.com",
      password: "password",
      role: "base",
    });

    const token = getToken(user1);

    const res = await request(app)
      .put(`/users/${user2.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ username: "forbiddenUpdate" });

    expect(res.status).toBe(403);
    expect(res.body.message).toBe("Forbidden");
  });

  it("400 - rifiuta la modifica di email", async () => {
    const user = await User.create({
      username: "user",
      email: "user@test.com",
      password: "password",
      role: "base",
    });

    const token = getToken(user);

    const res = await request(app)
      .put(`/users/${user.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "new@test.com" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Cannot modify email or role");
  });

  it("400 - rifiuta la modifica del ruolo", async () => {
    const user = await User.create({
      username: "user",
      email: "user@test.com",
      password: "password",
      role: "base",
    });

    const token = getToken(user);

    const res = await request(app)
      .put(`/users/${user.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "admin" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Cannot modify email or role");
  });

  it("200 - aggiorna correttamente la password", async () => {
    const user = await User.create({
      username: "user",
      email: "user@test.com",
      password: "password",
      role: "base",
    });

    const token = getToken(user);

    const res = await request(app)
      .put(`/users/${user.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ password: "newPassword" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updatedUser = await User.findById(user.id);
    const passwordMatches = await bcrypt.compare(
      "newPassword",
      updatedUser.password,
    );

    expect(passwordMatches).toBe(true);
    expect(normalizeUsers([res.body.user])).toMatchSnapshot();
  });

  it("404 - restituisce errore se l'utente non esiste", async () => {
    const admin = await User.create({
      username: "admin",
      email: "admin@test.com",
      password: "password",
      role: "admin",
    });

    const token = getToken(admin);
    const fakeId = "507f1f77bcf86cd799439011";

    const res = await request(app)
      .put(`/users/${fakeId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ username: "notFound" });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("User not found");
  });

  it("401 - rifiuta la richiesta se il token non è presente", async () => {
    const user = await User.create({
      username: "user",
      email: "user@test.com",
      password: "password",
      role: "base",
    });

    const res = await request(app)
      .put(`/users/${user.id}`)
      .send({ username: "noAuth" });

    expect(res.status).toBe(401);
  });
});

describe("DELETE /users/:id", () => {
  let user, admin, tokenUser, tokenAdmin;
  beforeEach(async () => {
    user = await User.create({
      username: "user",
      email: "user@test.com",
      password: "password",
      role: "base",
    });

    admin = await User.create({
      username: "admin",
      email: "admin@test.com",
      password: "password",
      role: "admin",
    });

    tokenUser = getToken(user);
    tokenAdmin = getToken(admin);
  });

  it("403 - ritorna forbidden se id non valido ma utente non admin", async () => {
    const res = await request(app)
      .delete("/users/invalid-id")
      .set("Authorization", `Bearer ${tokenUser}`);

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      message: "Forbidden",
    });
  });

  it("404 - ritorna errore se l'utente non esiste", async () => {
    const fakeId = "000000000000000000000000";

    const res = await request(app)
      .delete(`/users/${fakeId}`)
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: "User not found",
    });
  });

  it("200 - un utente può eliminare sé stesso", async () => {
    const res = await request(app)
      .delete(`/users/${user.id}`)
      .set("Authorization", `Bearer ${tokenUser}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: "User deleted successfully",
    });

    const deletedUser = await User.findById(user.id);
    expect(deletedUser).toBeNull();
  });

  it("200 - un admin può eliminare qualsiasi utente", async () => {
    const res = await request(app)
      .delete(`/users/${user.id}`)
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const deletedUser = await User.findById(user.id);
    expect(deletedUser).toBeNull();
  });

  it("403 - un utente non admin non può eliminare un altro utente", async () => {
    const otherUser = await User.create({
      username: "other",
      email: "other@test.com",
      password: "password",
      role: "base",
    });

    const tokenOther = getToken(otherUser);

    const res = await request(app)
      .delete(`/users/${user.id}`)
      .set("Authorization", `Bearer ${tokenOther}`);

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      message: "Forbidden",
    });

    const stillExists = await User.findById(user.id);
    expect(stillExists).not.toBeNull();
  });

  it("200 - elimina anche feedback e report collegati", async () => {
    const trail = await Trail.create({
      title: "Trail test",
      lengthKm: 10,
      coordinates: { DD: { lat: 46.5, lon: 11.7 } },
      idAdmin: admin.id,
    });

    await Feedback.create({
      idUser: user.id,
      idTrail: trail.id,
      valutazione: 4,
      testo: "ok",
    });

    await Report.create({
      idUser: user.id,
      idTrail: trail.id,
      testo: "problema",
    });

    const res = await request(app)
      .delete(`/users/${user.id}`)
      .set("Authorization", `Bearer ${tokenUser}`);

    expect(res.status).toBe(200);

    const feedbacks = await Feedback.find({ idUser: user.id });
    const reports = await Report.find({ idUser: user.id });

    expect(feedbacks.length).toBe(0);
    expect(reports.length).toBe(0);
  });

  it("401 - ritorna errore se il token è mancante", async () => {
    const res = await request(app).delete(`/users/${user.id}`);

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      success: false,
      message: "Authorization header missing",
    });
  });
});

describe("POST /users/:idUser/favourites/:idTrail", () => {
  let user, admin, trail, tokenUser, tokenAdmin;

  beforeEach(async () => {
    user = await User.create({
      username: "user",
      email: "user@test.com",
      password: "password",
      role: "base",
      favourites: [],
    });

    admin = await User.create({
      username: "admin",
      email: "admin@test.com",
      password: "password",
      role: "admin",
    });

    trail = await Trail.create({
      title: "Trail test",
      lengthKm: 10,
      coordinates: { DD: { lat: 46.5, lon: 11.7 } },
      idAdmin: admin.id,
    });

    tokenUser = getToken(user);
    tokenAdmin = getToken(admin);
  });

  it("403 - idUser non valido per utente non admin", async () => {
  const res = await request(app)
    .post(`/users/invalid-id/favourites/${trail.id}`)
    .set("Authorization", `Bearer ${tokenUser}`);

  expect(res.status).toBe(403);
  expect(res.body).toEqual({
    message: "Forbidden",
  });
});


  it("401 - token mancante", async () => {
    const res = await request(app)
      .post(`/users/${user.id}/favourites/${trail.id}`);

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      success: false,
      message: "Authorization header missing",
    });
  });

  it("403 - utente non admin e non se stesso", async () => {
    const otherUser = await User.create({
      username: "other",
      email: "other@test.com",
      password: "password",
      role: "base",
    });
    const tokenOther = getToken(otherUser);

    const res = await request(app)
      .post(`/users/${user.id}/favourites/${trail.id}`)
      .set("Authorization", `Bearer ${tokenOther}`);

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      message: "Forbidden",
    });
  });

  it("404 - user non trovato", async () => {
    const fakeId = "000000000000000000000000";
    const res = await request(app)
      .post(`/users/${fakeId}/favourites/${trail.id}`)
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: "User not found",
    });
  });

  it("404 - trail non trovato", async () => {
    const fakeTrailId = "000000000000000000000000";
    const res = await request(app)
      .post(`/users/${user.id}/favourites/${fakeTrailId}`)
      .set("Authorization", `Bearer ${tokenUser}`);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: "Trail not found",
    });
  });

  it("409 - trail già nei favourites", async () => {
    user.favourites.push(trail.id);
    await user.save();

    const res = await request(app)
      .post(`/users/${user.id}/favourites/${trail.id}`)
      .set("Authorization", `Bearer ${tokenUser}`);

    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      success: false,
      message: "Trail already in favourites",
    });
  });

  it("200 - aggiunta con successo", async () => {
    const res = await request(app)
      .post(`/users/${user.id}/favourites/${trail.id}`)
      .set("Authorization", `Bearer ${tokenUser}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Trail added to favourites");
    expect(res.body.favourites).toContain(trail.id);

    const updatedUser = await User.findById(user.id);
    expect(updatedUser.favourites.map(String)).toContain(trail.id);
  });
});

describe("DELETE /users/:idUser/favourites/:idTrail", () => {
  let user, admin, trail, tokenUser, tokenAdmin;

  beforeEach(async () => {
    user = await User.create({
      username: "user",
      email: "user@test.com",
      password: "password",
      role: "base",
      favourites: [],
    });

    admin = await User.create({
      username: "admin",
      email: "admin@test.com",
      password: "password",
      role: "admin",
      favourites: [],
    });

    trail = await Trail.create({
      title: "Trail test",
      lengthKm: 10,
      coordinates: { DD: { lat: 46.5, lon: 11.7 } },
      idAdmin: admin.id,
    });

    tokenUser = getToken(user);
    tokenAdmin = getToken(admin);
  });

  it("400 - idUser o idTrail non valido (admin)", async () => {
    const res = await request(app)
      .delete(`/users/invalid-id/favourites/${trail.id}`)
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: "Invalid user or trail id",
    });
  });

  it("401 - token mancante", async () => {
    const res = await request(app)
      .delete(`/users/${user.id}/favourites/${trail.id}`);

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      success: false,
      message: "Authorization header missing",
    });
  });

  it("403 - utente non admin e non se stesso", async () => {
    const otherUser = await User.create({
      username: "other",
      email: "other@test.com",
      password: "password",
      role: "base",
    });
    const tokenOther = getToken(otherUser);

    const res = await request(app)
      .delete(`/users/${user.id}/favourites/${trail.id}`)
      .set("Authorization", `Bearer ${tokenOther}`);

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      message: "Forbidden",
    });
  });

  it("404 - user non trovato", async () => {
    const fakeId = "000000000000000000000000";

    const res = await request(app)
      .delete(`/users/${fakeId}/favourites/${trail.id}`)
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: "User not found",
    });
  });

  it("404 - trail non in favourites", async () => {
    const res = await request(app)
      .delete(`/users/${user.id}/favourites/${trail.id}`)
      .set("Authorization", `Bearer ${tokenUser}`);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: "Favourite trail not found",
    });
  });

  it("204 - rimozione con successo", async () => {
    user.favourites.push(trail.id);
    await user.save();

    const res = await request(app)
      .delete(`/users/${user.id}/favourites/${trail.id}`)
      .set("Authorization", `Bearer ${tokenUser}`);

    expect(res.status).toBe(204);
    expect(res.body).toEqual({});

    const updatedUser = await User.findById(user.id);
    expect(updatedUser.favourites).not.toContain(trail.id);
    expect(normalizeUsers([res.body])).toMatchSnapshot();
  });
});

describe("GET /users/favourites/:idUser", () => {
  let user, admin, otherUser, trail1, trail2, tokenUser, tokenAdmin, tokenOther;

  beforeEach(async () => {
    user = await User.create({
      username: "user",
      email: "user@test.com",
      password: "password",
      role: "base",
      favourites: [],
    });

    admin = await User.create({
      username: "admin",
      email: "admin@test.com",
      password: "password",
      role: "admin",
      favourites: [],
    });

    otherUser = await User.create({
      username: "other",
      email: "other@test.com",
      password: "password",
      role: "base",
      favourites: [],
    });

    tokenUser = getToken(user);
    tokenAdmin = getToken(admin);
    tokenOther = getToken(otherUser);

    trail1 = await Trail.create({
      title: "Trail test 1",
      lengthKm: 5,
      coordinates: { DD: { lat: 46.5, lon: 11.7 } },
      idAdmin: admin.id,
    });
    trail2 = await Trail.create({
      title: "Trail test 2",
      lengthKm: 10,
      coordinates: { DD: { lat: 46.5, lon: 11.7 } },
      idAdmin: admin.id,
    });

    user.favourites.push(trail1.id, trail2.id);
    await user.save();
  });

  it("400 - idUser non valido per admin", async () => {
    const res = await request(app)
      .get("/users/favourites/invalid-id")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: "Invalid user id",
    });
  });

  it("401 - token mancante", async () => {
    const res = await request(app)
      .get(`/users/favourites/${user.id}`);

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      success: false,
      message: "Authorization header missing",
    });
  });

  it("403 - utente non admin e non se stesso", async () => {
    const res = await request(app)
      .get(`/users/favourites/${user.id}`)
      .set("Authorization", `Bearer ${tokenOther}`);

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      message: "Forbidden",
    });
  });

  it("404 - user non trovato", async () => {
    const fakeId = "000000000000000000000000";
    const res = await request(app)
      .get(`/users/favourites/${fakeId}`)
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: "User not found",
    });
  });

  it("200 - utente base ottiene i propri favourites", async () => {
    const res = await request(app)
      .get(`/users/favourites/${user.id}`)
      .set("Authorization", `Bearer ${tokenUser}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(2);
    expect(res.body.favourites.map(f => f.id)).toEqual(
      expect.arrayContaining([trail1.id, trail2.id])
    );
    expect(normalizeTrails(res.body.favourites)).toMatchSnapshot();
  });

  it("200 - admin ottiene favourites di qualsiasi utente", async () => {
    const res = await request(app)
      .get(`/users/favourites/${user.id}`)
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(2);
    expect(res.body.favourites.map(f => f.id)).toEqual(
      expect.arrayContaining([trail1.id, trail2.id])
    );
    expect(normalizeTrails(res.body.favourites)).toMatchSnapshot();
  });
});
