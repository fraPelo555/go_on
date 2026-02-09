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
const { Feedback } = require("../src/models/Feedback");

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

const normalize = (feedbacks) =>
  feedbacks.map(
    ({ _id, id, idUser, idTrail, createdAt, updatedAt, __v, ...rest }) => rest,
  );

describe("POST /feedbacks/:idTrail", () => {
  let user;
  let trail;
  let token;

  beforeEach(async () => {
    user = await User.create({
      username: "user",
      email: "user@test.com",
      password: "password",
      role: "base",
    });
    trail = await createTrail();
    token = getToken(user);
  });

  it("201 - crea un feedback valido", async () => {
    const res = await request(app)
      .post(`/feedbacks/${trail.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        idUser: user.id,
        idTrail: trail.id,
        testo: "Bellissimo percorso",
        valutazione: 5,
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      idUser: user.id,
      idTrail: trail.id,
      testo: "Bellissimo percorso",
      valutazione: 5,
    });

    const saved = await Feedback.findOne({
      idUser: user.id,
      idTrail: trail.id,
    });
    expect(saved).not.toBeNull();
    expect(normalize([res.body])).toMatchSnapshot();
  });

  it("409 - stesso user non può creare due feedback per lo stesso trail", async () => {
    await Feedback.create({
      idUser: user.id,
      idTrail: trail.id,
      valutazione: 4,
    });

    const res = await request(app)
      .post(`/feedbacks/${trail.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        idUser: user.id,
        idTrail: trail.id,
        valutazione: 5,
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe("Feedback already exists for this trail");
  });

  it("400 - idTrail inesistente", async () => {
    const fakeTrailId = "000000000000000000000000";

    const res = await request(app)
      .post(`/feedbacks/${fakeTrailId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        idUser: user.id,
        idTrail: fakeTrailId,
        valutazione: 4,
      });

    expect(res.status).toBe(400);
  });

  it("400 - idUser inesistente", async () => {
    const fakeUserId = "000000000000000000000000";

    const res = await request(app)
      .post(`/feedbacks/${trail.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        idUser: fakeUserId,
        idTrail: trail.id,
        valutazione: 4,
      });

    expect(res.status).toBe(400);
  });

  it("400 - valutazione < 1", async () => {
    const res = await request(app)
      .post(`/feedbacks/${trail.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        idUser: user.id,
        idTrail: trail.id,
        valutazione: 0,
      });

    expect(res.status).toBe(400);
  });

  it("400 - valutazione > 5", async () => {
    const res = await request(app)
      .post(`/feedbacks/${trail.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        idUser: user.id,
        idTrail: trail.id,
        valutazione: 6,
      });

    expect(res.status).toBe(400);
  });

  it("401 - richiesta senza token", async () => {
    const res = await request(app).post(`/feedbacks/${trail.id}`).send({
      idUser: user.id,
      idTrail: trail.id,
      valutazione: 4,
    });

    expect(res.status).toBe(401);
  });
});

describe("GET /feedbacks/all", () => {
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

    await Feedback.create([
      {
        idUser: user.id,
        idTrail: trail.id,
        valutazione: 5,
        testo: "Ottimo",
      },
      {
        idUser: admin.id,
        idTrail: trail.id,
        valutazione: 3,
        testo: "Discreto",
      },
    ]);
  });

  it("200 - admin ottiene tutti i feedback", async () => {
    const res = await request(app)
      .get("/feedbacks/all")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);

    const normalized = normalize(res.body);
    expect(normalized).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ valutazione: 5, testo: "Ottimo" }),
        expect.objectContaining({ valutazione: 3, testo: "Discreto" }),
      ]),
    );
    expect(normalize(res.body)).toMatchSnapshot();
  });

  it("200 - filtro per valutazione", async () => {
    const res = await request(app)
      .get("/feedbacks/all?valutazione=5")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].valutazione).toBe(5);
    expect(normalize([res.body])).toMatchSnapshot();
  });

  it("400 - filtro valutazione non valido", async () => {
    const res = await request(app)
      .get("/feedbacks/all?valutazione=10")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid valutazione filter");
  });

  it("403 - utente non admin", async () => {
    const res = await request(app)
      .get("/feedbacks/all")
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });

  it("401 - richiesta senza token", async () => {
    const res = await request(app).get("/feedbacks/all");

    expect(res.status).toBe(401);
  });
});

describe("GET /feedbacks/:id", () => {
  let user;
  let token;
  let trail;
  let feedback;

  beforeEach(async () => {
    user = await User.create({
      username: "user",
      email: "user@test.com",
      password: "password",
      role: "base",
    });

    trail = await createTrail();
    token = getToken(user);

    feedback = await Feedback.create({
      idUser: user.id,
      idTrail: trail.id,
      testo: "Percorso molto bello",
      valutazione: 4,
    });
  });

  it("200 - restituisce un feedback esistente", async () => {
    const res = await request(app)
      .get(`/feedbacks/${feedback.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      idUser: user.id,
      idTrail: trail.id,
      testo: "Percorso molto bello",
      valutazione: 4,
    });
    expect(normalize([res.body])).toMatchSnapshot();
  });

  it("404 - feedback non trovato (ObjectId valido)", async () => {
    const fakeId = "000000000000000000000000";

    const res = await request(app)
      .get(`/feedbacks/${fakeId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Feedback not found");
  });

  test("400 - id non valido", async () => {
    const res = await request(app)
      .get("/feedbacks/abcd")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  it("401 - richiesta senza token", async () => {
    const res = await request(app).get(`/feedbacks/${feedback.id}`);

    expect(res.status).toBe(401);
  });
});

describe("PUT /feedbacks/:id", () => {
  let user;
  let otherUser;
  let userToken;
  let otherUserToken;
  let adminToken;
  let trail;
  let feedback;

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

    trail = await createTrail();

    feedback = await Feedback.create({
      idUser: user.id,
      idTrail: trail.id,
      testo: "Testo originale",
      valutazione: 3,
    });

    userToken = getToken(user);
    otherUserToken = getToken(otherUser);
    adminToken = getToken(admin);
  });

  it("200 - self può aggiornare il proprio feedback", async () => {
    const res = await request(app)
      .put(`/feedbacks/${feedback.id}`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        testo: "Testo aggiornato",
        valutazione: 5,
      });

    expect(res.status).toBe(200);
    expect(res.body.testo).toBe("Testo aggiornato");
    expect(res.body.valutazione).toBe(5);
    expect(normalize([res.body])).toMatchSnapshot();
  });

  it("200 - admin può aggiornare qualsiasi feedback", async () => {
    const res = await request(app)
      .put(`/feedbacks/${feedback.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        testo: "Aggiornato da admin",
      });

    expect(res.status).toBe(200);
    expect(res.body.testo).toBe("Aggiornato da admin");
    expect(normalize([res.body])).toMatchSnapshot();
  });

  it("403 - utente non proprietario non può aggiornare", async () => {
    const res = await request(app)
      .put(`/feedbacks/${feedback.id}`)
      .set("Authorization", `Bearer ${otherUserToken}`)
      .send({
        testo: "Tentativo illecito",
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toBe("Forbidden");
  });

  it("401 - richiesta senza token", async () => {
    const res = await request(app).put(`/feedbacks/${feedback.id}`).send({
      testo: "No token",
    });

    expect(res.status).toBe(401);
  });

  it("404 - feedback non trovato", async () => {
    const fakeId = "000000000000000000000000";

    const res = await request(app)
      .put(`/feedbacks/${fakeId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        testo: "Non esiste",
      });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Feedback not found");
  });

  it("400 - id non valido", async () => {
    const res = await request(app)
      .put("/feedbacks/abcd")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        testo: "Errore id",
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid feedback id");
  });

  it("200 - campi non consentiti vengono ignorati", async () => {
    const res = await request(app)
      .put(`/feedbacks/${feedback.id}`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        idUser: otherUser.id,
        idTrail: "000000000000000000000000",
        testo: "Campo valido",
      });

    expect(res.status).toBe(200);
    expect(res.body.testo).toBe("Campo valido");
    expect(res.body.idUser).toBe(user.id);
    expect(normalize([res.body])).toMatchSnapshot();
  });
});

describe("DELETE /feedbacks/:id", () => {
  let user;
  let otherUser;
  let userToken;
  let otherUserToken;
  let adminToken;
  let trail;
  let feedback;

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

    trail = await createTrail();

    feedback = await Feedback.create({
      idUser: user.id,
      idTrail: trail.id,
      testo: "Testo da cancellare",
      valutazione: 4,
    });

    userToken = getToken(user);
    otherUserToken = getToken(otherUser);
    adminToken = getToken(admin);
  });

  it("204 - self può cancellare il proprio feedback", async () => {
    const res = await request(app)
      .delete(`/feedbacks/${feedback.id}`)
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(204);

    const exists = await Feedback.findById(feedback.id);
    expect(exists).toBeNull();
  });

  it("204 - admin può cancellare qualsiasi feedback", async () => {
    const res = await request(app)
      .delete(`/feedbacks/${feedback.id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(204);

    const exists = await Feedback.findById(feedback.id);
    expect(exists).toBeNull();
  });

  it("403 - utente non proprietario non può cancellare", async () => {
    const res = await request(app)
      .delete(`/feedbacks/${feedback.id}`)
      .set("Authorization", `Bearer ${otherUserToken}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toBe("Forbidden");

    const exists = await Feedback.findById(feedback.id);
    expect(exists).not.toBeNull();
  });

  it("401 - richiesta senza token", async () => {
    const res = await request(app).delete(`/feedbacks/${feedback.id}`);

    expect(res.status).toBe(401);
  });

  it("404 - feedback non trovato", async () => {
    const fakeId = "000000000000000000000000";

    const res = await request(app)
      .delete(`/feedbacks/${fakeId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Feedback not found");
  });

  it("400 - id non valido", async () => {
    const res = await request(app)
      .delete("/feedbacks/abcd")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid feedback id");
  });
});

describe("GET /feedbacks/all/trail/:idTrail", () => {
  let user;
  let trail;
  let feedback;
  let token;

  beforeEach(async () => {
    user = await User.create({
      username: "user",
      email: "user@test.com",
      password: "password",
      role: "base",
    });

    token = getToken(user);
    trail = await createTrail();

    feedback = await Feedback.create({
      idUser: user.id,
      idTrail: trail.id,
      testo: "Feedback sul trail",
      valutazione: 4,
    });
  });

  it("200 - restituisce i feedback di un trail esistente", async () => {
    const res = await request(app)
      .get(`/feedbacks/all/trail/${trail.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0]).toMatchObject({
      idUser: user.id,
      idTrail: trail.id,
      testo: "Feedback sul trail",
      valutazione: 4,
    });
    expect(normalize(res.body)).toMatchSnapshot();
  });

  it("200 - restituisce array vuoto se il trail esiste ma non ha feedback", async () => {
    const newTrail = await createTrail({ title: "Nuovo trail" });

    const res = await request(app)
      .get(`/feedbacks/all/trail/${newTrail.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
    expect(normalize(res.body)).toMatchSnapshot();
  });

  it("404 - trail non esistente", async () => {
    const fakeId = "000000000000000000000000";

    const res = await request(app)
      .get(`/feedbacks/all/trail/${fakeId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Trail not found");
  });

  it("400 - id non valido", async () => {
    const res = await request(app)
      .get("/feedbacks/all/trail/abcd")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid trail id");
  });

  it("401 - richiesta senza token", async () => {
    const res = await request(app).get(`/feedbacks/all/trail/${trail.id}`);

    expect(res.status).toBe(401);
  });
});

describe("GET /feedbacks/all/user/:idUser", () => {
  let user;
  let otherUser;
  let userToken;
  let otherUserToken;
  let adminToken;
  let trail;
  let feedback;

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

    userToken = getToken(user);
    otherUserToken = getToken(otherUser);
    adminToken = getToken(admin);

    trail = await createTrail();

    feedback = await Feedback.create({
      idUser: user.id,
      idTrail: trail.id,
      testo: "Feedback personale",
      valutazione: 4,
    });
  });

  it("200 - self può ottenere i propri feedback", async () => {
    const res = await request(app)
      .get(`/feedbacks/all/user/${user.id}`)
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0]).toMatchObject({
      idUser: user.id,
      idTrail: trail.id,
      testo: "Feedback personale",
      valutazione: 4,
    });
    expect(normalize(res.body)).toMatchSnapshot();
  });

  it("200 - admin può ottenere i feedback di qualsiasi utente", async () => {
    const res = await request(app)
      .get(`/feedbacks/all/user/${user.id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].idUser).toBe(user.id);
    expect(normalize(res.body)).toMatchSnapshot();
  });

  it("403 - utente non proprietario non può ottenere feedback di altri", async () => {
    const res = await request(app)
      .get(`/feedbacks/all/user/${user.id}`)
      .set("Authorization", `Bearer ${otherUserToken}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toBe("Forbidden");
  });

  it("400 - id non valido", async () => {
    const res = await request(app)
      .get("/feedbacks/all/user/abcd")
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid user id");
  });

  it("404 - utente inesistente", async () => {
    const fakeId = "000000000000000000000000";

    const res = await request(app)
      .get(`/feedbacks/all/user/${fakeId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("User not found");
  });

  it("200 - utente esistente ma senza feedback", async () => {
    const newUser = await User.create({
      username: "nuovo",
      email: "nuovo@test.com",
      password: "password",
      role: "base",
    });

    const newToken = getToken(newUser);

    const res = await request(app)
      .get(`/feedbacks/all/user/${newUser.id}`)
      .set("Authorization", `Bearer ${newToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
    expect(normalize(res.body)).toMatchSnapshot();
  });

  it("401 - richiesta senza token", async () => {
    const res = await request(app).get(`/feedbacks/all/user/${user.id}`);

    expect(res.status).toBe(401);
  });
});
