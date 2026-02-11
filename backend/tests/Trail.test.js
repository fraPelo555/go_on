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
    description: "Percorso di test per verificare il modello Trail",
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

const normalize = (trails) =>
  trails.map(
    ({ _id, id, idAdmin, createdAt, updatedAt, __v, ...rest }) => rest,
  );

describe("GET /trails", () => {
  it("ritorna tutti i trail senza filtri", async () => {
    await createTrail();
    await createTrail({ title: "Altro trail" });

    const res = await request(app).get("/trails");

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
    expect(normalize(res.body)).toMatchSnapshot();
  });

  it("filtra per region", async () => {
    await createTrail({ region: "Trentino" });
    await createTrail({ region: "Lombardia" });

    const res = await request(app).get("/trails").query({ region: "Trentino" });

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].region).toBe("Trentino");
    expect(normalize(res.body)).toMatchSnapshot();
  });

  it("filtra per difficulty", async () => {
    await createTrail({ difficulty: "Easy" });
    await createTrail({ difficulty: "Difficult" });

    const res = await request(app)
      .get("/trails")
      .query({ difficulty: "Difficult" });

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].difficulty).toBe("Difficult");
    expect(normalize(res.body)).toMatchSnapshot();
  });

  it("filtra per minLength e maxLength", async () => {
    await createTrail({ lengthKm: 5 });
    await createTrail({ lengthKm: 15 });

    const res = await request(app)
      .get("/trails")
      .query({ minLength: 10, maxLength: 20 });

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].lengthKm).toBe(15);
    expect(normalize(res.body)).toMatchSnapshot();
  });

  it("filtra per durata minima e massima (in minuti)", async () => {
    await createTrail({ duration: { hours: 1, minutes: 0 } });
    await createTrail({ duration: { hours: 3, minutes: 0 } });

    const res = await request(app)
      .get("/trails")
      .query({ minDuration: 120, maxDuration: 200 });

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);

    const trail = res.body[0];
    expect(trail.duration.hours * 60 + trail.duration.minutes).toBe(180);
    expect(normalize(res.body)).toMatchSnapshot();
  });

  it("filtra per tags (AND logico)", async () => {
    await createTrail({ tags: ["scenic", "family_friendly"] });
    await createTrail({ tags: ["scenic"] });

    const res = await request(app)
      .get("/trails")
      .query({ tags: "scenic,family_friendly" });

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].tags).toEqual(
      expect.arrayContaining(["scenic", "family_friendly"]),
    );
    expect(normalize(res.body)).toMatchSnapshot();
  });
});

describe("POST /trails", () => {
  let token;

  beforeEach(() => {
    token = getToken(admin);
  });

  it("crea un trail correttamente con tutti i campi", async () => {
    const trailData = {
      title: "Nuovo Trail",
      description: "Percorso test",
      region: "Trentino",
      valley: "Val di Fassa",
      difficulty: "Medium",
      lengthKm: 12,
      duration: JSON.stringify({ hours: 3, minutes: 15 }),
      ascentM: 500,
      descentM: 500,
      highestPointM: 2200,
      lowestPointM: 1500,
      roadbook: "Segui le indicazioni",
      directions: "Partenza dal parcheggio",
      parking: "Parcheggio gratuito",
      tags: JSON.stringify(["scenic", "family_friendly"]),
      coordinates: JSON.stringify({ DD: { lat: 46.5, lon: 11.7 } }),
      idAdmin: admin.id,
    };

    const res = await request(app)
      .post("/trails")
      .set("Authorization", `Bearer ${token}`)
      .send(trailData);

    expect(res.status).toBe(201);
    expect(res.body.title).toBe(trailData.title);
    expect(res.body.duration.hours).toBe(3);
    expect(res.body.duration.minutes).toBe(15);
    expect(res.body.coordinates.DD.lat).toBe(46.5);
    expect(res.body.coordinates.DD.lon).toBe(11.7);
    expect(res.body.tags).toEqual(
      expect.arrayContaining(["scenic", "family_friendly"]),
    );
    expect(res.body.location).toEqual({
      type: "Point",
      coordinates: [11.7, 46.5],
    });
    expect(normalize([res.body])).toMatchSnapshot();
  });

  it("ritorna 400 se manca un campo obbligatorio", async () => {
    const trailData = {
      description: "Percorso senza titolo",
      idAdmin: admin.id,
      coordinates: JSON.stringify({ DD: { lat: 46.5, lon: 11.7 } }),
    };

    const res = await request(app)
      .post("/trails")
      .set("Authorization", `Bearer ${token}`)
      .send(trailData);

    expect(res.status).toBe(400);
  });

  it("ritorna 400 se idAdmin non esiste", async () => {
    const trailData = {
      title: "Trail con admin non valido",
      coordinates: JSON.stringify({ DD: { lat: 46.5, lon: 11.7 } }),
      idAdmin: "000000000000000000000000",
    };

    const res = await request(app)
      .post("/trails")
      .set("Authorization", `Bearer ${token}`)
      .send(trailData);

    expect(res.status).toBe(400);
  });

  it("ritorna 401 se non è autenticato", async () => {
    const trailData = {
      title: "Trail senza token",
      coordinates: JSON.stringify({ DD: { lat: 46.5, lon: 11.7 } }),
      idAdmin: admin.id,
    };

    const res = await request(app).post("/trails").send(trailData);

    expect(res.status).toBe(401);
  });

  it("ritorna 403 se l'utente non è admin", async () => {
    const user = await User.create({
      username: "normalUser",
      email: "user@test.com",
      password: "test",
      role: "base",
    });
    const userToken = getToken(user);

    const trailData = {
      title: "Trail non admin",
      coordinates: JSON.stringify({ DD: { lat: 46.5, lon: 11.7 } }),
      idAdmin: user.id,
    };

    const res = await request(app)
      .post("/trails")
      .set("Authorization", `Bearer ${userToken}`)
      .send(trailData);

    expect(res.status).toBe(403);
  });
});

describe("PUT /trails/:id", () => {
  let token;
  let existingTrail;

  beforeEach(async () => {
    token = getToken(admin);
    existingTrail = await createTrail({
      title: "Trail originale",
      ascentM: 500,
      coordinates: {
        DD: { lat: 46.4, lon: 11.7 }
      }
    });
  });

  it("aggiorna correttamente i campi consentiti", async () => {
    const updateData = {
      title: "Trail aggiornato",
      ascentM: 800,
      duration: JSON.stringify({ hours: 4, minutes: 0 }),
      tags: JSON.stringify(["scenic", "ridge"]),
      coordinates: JSON.stringify({
        DD: { lat: 46.5, lon: 11.8 }
      })
    };

    const res = await request(app)
      .put(`/trails/${existingTrail.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send(updateData);

    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Trail aggiornato");
    expect(res.body.ascentM).toBe(800);
    expect(res.body.duration).toEqual({ hours: 4, minutes: 0 });
    expect(res.body.tags).toEqual(
      expect.arrayContaining(["scenic", "ridge"])
    );

    expect(res.body.location).toEqual({
      type: "Point",
      coordinates: [11.8, 46.5]
    });

    expect(normalize([res.body])).toMatchSnapshot();
  });

  it("non permette di modificare idAdmin", async () => {
    const res = await request(app)
      .put(`/trails/${existingTrail.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        idAdmin: "000000000000000000000000"
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/idAdmin.*non è modificabile/i);

    const trailAfter = await Trail.findById(existingTrail.id);
    expect(trailAfter.idAdmin.toString()).toBe(admin.id);
  });

  it("non permette di modificare location direttamente", async () => {
    const res = await request(app)
      .put(`/trails/${existingTrail.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        location: {
          type: "Point",
          coordinates: [0, 0]
        }
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/location.*non è modificabile/i);
  });

  it("ritorna 404 se il trail non esiste", async () => {
    const res = await request(app)
      .put(`/trails/000000000000000000000000`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Nuovo titolo" });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Trail not found");
  });

  it("ritorna 401 se non è autenticato", async () => {
    const res = await request(app)
      .put(`/trails/${existingTrail.id}`)
      .send({ title: "Tentativo non auth" });

    expect(res.status).toBe(401);
  });

  it("ritorna 403 se l'utente non è admin", async () => {
    const user = await User.create({
      username: "userBase",
      email: "userbase@test.com",
      password: "test",
      role: "base"
    });

    const userToken = getToken(user);

    const res = await request(app)
      .put(`/trails/${existingTrail.id}`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ title: "Tentativo non admin" });

    expect(res.status).toBe(403);
  });
});

describe("PUT /trails/:id/gpx", () => {
  let token;
  let existingTrail;

  const gpx1Path = path.join(__dirname, "fixtures", "test1.gpx");
  const gpx2Path = path.join(__dirname, "fixtures", "test2.gpx");

  beforeEach(async () => {
    token = getToken(admin);
    existingTrail = await createTrail({ title: "Trail GPX" });
  });

  it("carica correttamente un file GPX quando non è presente", async () => {
    const res = await request(app)
      .put(`/trails/${existingTrail.id}/gpx`)
      .set("Authorization", `Bearer ${token}`)
      .attach("gpx", gpx1Path);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("GPX caricato correttamente");
    expect(res.body.filePath).toBe(`/uploads/${existingTrail.id}/track.gpx`);

    const savedPath = path.join(uploadDir, existingTrail.id, "track.gpx");

    expect(fs.existsSync(savedPath)).toBe(true);

    const content = fs.readFileSync(savedPath, "utf8");
    expect(content).toContain("Test Track 1");
  });

  it("sostituisce correttamente il file GPX esistente con uno nuovo", async () => {
    await request(app)
      .put(`/trails/${existingTrail.id}/gpx`)
      .set("Authorization", `Bearer ${token}`)
      .attach("gpx", gpx1Path);

    const savedPath = path.join(uploadDir, existingTrail.id, "track.gpx");

    const firstContent = fs.readFileSync(savedPath, "utf8");

    const res = await request(app)
      .put(`/trails/${existingTrail.id}/gpx`)
      .set("Authorization", `Bearer ${token}`)
      .attach("gpx", gpx2Path);

    expect(res.status).toBe(200);

    const trailDir = path.join(uploadDir, existingTrail.id);
    const files = fs.readdirSync(trailDir);

    expect(files).toEqual(["track.gpx"]);

    const secondContent = fs.readFileSync(savedPath, "utf8");

    expect(secondContent).not.toBe(firstContent);
    expect(secondContent).toContain("Test Track 2");
  });

  it("ritorna 404 se il trail non esiste", async () => {
    const res = await request(app)
      .put(`/trails/000000000000000000000000/gpx`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Trail not found");
  });

  it("ritorna 400 se il file non è inviato", async () => {
    const res = await request(app)
      .put(`/trails/${existingTrail.id}/gpx`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it("ritorna 401 se non è autenticato", async () => {
    const res = await request(app).put(`/trails/${existingTrail.id}/gpx`);

    expect(res.status).toBe(401);
  });

  it("ritorna 403 se l'utente non è admin", async () => {
    const user = await User.create({
      username: "normalUser",
      email: "user@test.com",
      password: "test",
      role: "base",
    });

    const userToken = getToken(user);

    const res = await request(app)
      .put(`/trails/${existingTrail.id}/gpx`)
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });
});

describe("DELETE /trails/:id", () => {
  let token;
  let existingTrail;

  beforeEach(async () => {
    token = getToken(admin);

    existingTrail = await createTrail({ title: "Trail da eliminare" });

    const gpxPath = path.join(__dirname, "fixtures", "test1.gpx");
    await request(app)
      .put(`/trails/${existingTrail.id}/gpx`)
      .set("Authorization", `Bearer ${token}`)
      .attach("gpx", gpxPath);

    await Feedback.create({
      idTrail: existingTrail.id,
      idUser: admin.id,
      valutazione: 5,
      testo: "Feedback di test",
    });

    await Report.create({
      idTrail: existingTrail.id,
      idUser: admin.id,
      testo: "Report di test",
      state: "New",
    });

    await User.findByIdAndUpdate(admin.id, {
      $push: { favourites: existingTrail.id },
    });
  });

  it("elimina correttamente un trail e tutti i riferimenti associati", async () => {
    const res = await request(app)
      .delete(`/trails/${existingTrail.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(204);
  
    const deletedTrail = await Trail.findById(existingTrail.id);
    expect(deletedTrail).toBeNull();
  
    const trailDir = path.join(uploadDir, existingTrail.id);
    expect(fs.existsSync(trailDir)).toBe(false);

    const feedbacks = await Feedback.find({ idTrail: existingTrail.id });
    expect(feedbacks.length).toBe(0);

    const reports = await Report.find({ idTrail: existingTrail.id }); 
    expect(reports.length).toBe(0);

    const updatedAdmin = await User.findById(admin.id);
    expect(updatedAdmin.favourites).not.toContain(existingTrail.id);
  });

  it("ritorna 404 se il trail non esiste", async () => {
    const res = await request(app)
      .delete(`/trails/000000000000000000000000`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Trail not found");
  });

  it("ritorna 401 se non è autenticato", async () => {
    const res = await request(app).delete(`/trails/${existingTrail.id}`);

    expect(res.status).toBe(401);
  });

  it("ritorna 403 se l'utente non è admin", async () => {
    const user = await User.create({
      username: "normalUser",
      email: "user4@test.com",
      password: "test",
      role: "base",
    });

    const userToken = getToken(user);

    const res = await request(app)
      .delete(`/trails/${existingTrail.id}`)
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });
});

describe("GET /trails/near", () => {
  it("ritorna 400 se lat, lon o radius mancano", async () => {
    const res = await request(app).get("/trails/near");

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "lat, lon and radius are required",
    });
  });

  it("ritorna i trails compresi nel radius", async () => {
    await createTrail({
      title: "Trail Vicino",
      coordinates: {
        DD: {
          lat: 46.4,
          lon: 11.7,
        },
      },
    });

    await createTrail({
      title: "Trail Lontano",
      coordinates: {
        DD: {
          lat: 45.0,
          lon: 10.0,
        },
      },
    });

    const res = await request(app)
      .get("/trails/near")
      .query({
        lat: 46.4,
        lon: 11.7,
        radius: 5,
      });

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].title).toBe("Trail Vicino");
    expect(normalize(res.body)).toMatchSnapshot();
  });

  it("ritorna una lista vuota se non ci sono trail compresi nel radius", async () => {
    await createTrail({
      coordinates: {
        DD: {
          lat: 46.4,
          lon: 11.7,
        },
      },
    });

    const res = await request(app)
      .get("/trails/near")
      .query({
        lat: 40.0,
        lon: 10.0,
        radius: 1,
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
    expect(normalize(res.body)).toMatchSnapshot();
  });

  it("crea una query in cui bisogna fare il parsing di lat, lon e radius", async () => {
    await createTrail();

    const res = await request(app)
      .get("/trails/near")
      .query({
        lat: "46.4",
        lon: "11.7",
        radius: "10",
      });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(normalize(res.body)).toMatchSnapshot();
  });

  it("ritorna 500 se Trail.find trova un errore", async () => {
    jest.spyOn(Trail, "find").mockImplementationOnce(() => {
      throw new Error("DB error");
    });

    const res = await request(app)
      .get("/trails/near")
      .query({
        lat: 46.4,
        lon: 11.7,
        radius: 10,
      });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Server error" });
  });
});

describe("GET /trails/:id", () => {
  it("ritorna 200 con il trail se il trail esiste", async () => {
    const trail = await createTrail();

    const res = await request(app).get(`/trails/${trail._id}`);

    expect(res.status).toBe(200);

    expect(res.body).toHaveProperty("id", trail._id.toString());
    expect(res.body).toHaveProperty("title", "Trail Test");
    expect(res.body).toHaveProperty("difficulty", "Medium");
    expect(res.body).toHaveProperty("coordinates");
    expect(res.body.coordinates).toHaveProperty("DD");
    expect(res.body.coordinates.DD).toEqual({
      lat: 46.4,
      lon: 11.7,
    });
    expect(normalize([res.body])).toMatchSnapshot();
  });

  it("ritorna 404 se il trail non esiste", async () => {
    const nonExistingId = "000000000000000000000000"; 

    const res = await request(app).get(`/trails/${nonExistingId}`);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: "Trail not found",
    });
  });

  it("ritorna 400 se l'id non è un ObjectId valido", async () => {
    const invalidId = "abcd";

    const res = await request(app).get(`/trails/${invalidId}`);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "Invalid ID",
    });
  });
});

describe("GET /trails/:id/download/gpx", () => {
  let existingTrail;
  let token;
  const gpxFixturePath = path.join(__dirname, "fixtures", "test1.gpx");

  beforeEach(async () => {
    token = getToken(admin);
    existingTrail = await createTrail({ title: "Trail GPX GET" });

    const res = await request(app)
      .put(`/trails/${existingTrail.id}/gpx`)
      .set("Authorization", `Bearer ${token}`)
      .attach("gpx", gpxFixturePath);

    expect(res.status).toBe(200);
  });

  it("scarica correttamente il file GPX", async () => {
    const res = await request(app)
      .get(`/trails/${existingTrail.id}/download/gpx`)
      .buffer() 
      .parse((res, callback) => {
        let data = [];
        res.on("data", (chunk) => data.push(chunk));
        res.on("end", () => callback(null, Buffer.concat(data)));
      });

    expect(res.status).toBe(200);
    expect(res.header["content-disposition"]).toMatch(/track\.gpx/);
    expect(res.header["content-type"]).toMatch(/gpx/);

    const savedPath = path.join(uploadDir, existingTrail.id, "track.gpx");
    const savedContent = fs.readFileSync(savedPath, "utf8");
    const fixtureContent = fs.readFileSync(gpxFixturePath, "utf8");

    expect(res.body.length).toBeGreaterThan(0);

    expect(savedContent).toBe(fixtureContent);
  });

  it("ritorna 404 se il trail non esiste", async () => {
    const res = await request(app).get(`/trails/000000000000000000000000/download/gpx`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Trail not found");
  });

  it("ritorna 404 se il file GPX non esiste", async () => {
    const trailWithoutGpx = await createTrail({ title: "Trail senza GPX" });

    const res = await request(app).get(`/trails/${trailWithoutGpx.id}/download/gpx`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("GPX file not found");
  });
});

describe("GET /trails/:id/gpx", () => {
  let existingTrail;
  const gpxFixturePath = path.join(__dirname, "fixtures", "test1.gpx");

  beforeEach(async () => {
    existingTrail = await createTrail({ title: "Trail GPX STREAM" });

    const token = getToken(admin);

    const res = await request(app)
      .put(`/trails/${existingTrail.id}/gpx`)
      .set("Authorization", `Bearer ${token}`)
      .attach("gpx", gpxFixturePath);

    expect(res.status).toBe(200);
  });

  it("ritorna 200 e streamma correttamente il file GPX", async () => {
    const res = await request(app)
      .get(`/trails/${existingTrail.id}/gpx`)
      .buffer()
      .parse((res, callback) => {
        let data = [];
        res.on("data", (chunk) => data.push(chunk));
        res.on("end", () => callback(null, Buffer.concat(data)));
      });

    expect(res.status).toBe(200);
    expect(res.header["content-type"]).toMatch(/application\/gpx\+xml/);
    expect(res.header["content-disposition"]).toMatch(/inline/);
    expect(res.header["content-disposition"]).toMatch(/track\.gpx/);

    expect(res.body.length).toBeGreaterThan(0);

    const fixtureContent = fs.readFileSync(gpxFixturePath, "utf8");
    expect(res.body.toString()).toBe(fixtureContent);
  });

  it("ritorna 400 se l'id non è un ObjectId valido", async () => {
    const res = await request(app).get("/trails/invalid-id/gpx");

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "Invalid trail id",
    });
  });

  it("ritorna 404 se il trail non esiste", async () => {
    const res = await request(app).get(
      "/trails/000000000000000000000000/gpx"
    );

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: "Trail not found",
    });
  });

  it("ritorna 404 se il file GPX non esiste", async () => {
    const trailWithoutGpx = await createTrail({
      title: "Trail senza file",
    });

    const res = await request(app).get(
      `/trails/${trailWithoutGpx.id}/gpx`
    );

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: "GPX file not found",
    });
  });

  it("propaga errore se lo stream genera un errore", async () => {
    const savedPath = path.join(
      uploadDir,
      existingTrail.id,
      "track.gpx"
    );

    const originalCreateReadStream = fs.createReadStream;

    jest.spyOn(fs, "createReadStream").mockImplementationOnce(() => {
      const stream = originalCreateReadStream(savedPath);
      process.nextTick(() => {
        stream.emit("error", new Error("Stream error"));
      });
      return stream;
    });

    const res = await request(app).get(
      `/trails/${existingTrail.id}/gpx`
    );

    expect(res.status).toBe(500);

    fs.createReadStream.mockRestore();
  });
});
