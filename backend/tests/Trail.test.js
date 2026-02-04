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

dotenv.config();

beforeAll(async () => {
  await db.connect();
});

afterEach(async () => {
  await db.clearDatabase();
});

afterAll(async () => {
  if (fs.existsSync(uploadDir)) {
    fs.rmSync(uploadDir, { recursive: true, force: true });
  }
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

  it("crea un trail con file GPX valido", async () => {
    const res = await request(app)
      .post("/trails")
      .set("Authorization", `Bearer ${token}`)
      .field("title", "Trail test")
      .field("region", "Trentino")
      .field("valley", "Val di Fassa")
      .field("difficulty", "Medium")
      .field("lengthKm", 12)
      .field("duration", JSON.stringify({ hours: 2, minutes: 15 }))
      .field(
        "coordinates",
        JSON.stringify({
          DD: { lat: 46.4, lon: 11.7 },
        }),
      )
      .field("tags", JSON.stringify(["scenic", "family_friendly"]))
      .field("idAdmin", admin.id.toString())
      .attach("gpx", path.join(__dirname, "fixtures/test.gpx"));

    expect(res.status).toBe(201);
    expect(res.body.trail).toBeDefined();
    expect(res.body.trail.title).toBe("Trail test");
    expect(res.body.trail.location).toEqual({
      type: "Point",
      coordinates: [11.7, 46.4],
    });
    expect(res.body.filePath).toMatch(
      new RegExp(`/uploads/${res.body.trail.id}/track\\.gpx`),
    );

    const trailInDb = await Trail.findById(res.body.trail.id);
    expect(trailInDb).not.toBeNull();

    const uploadDir = path.resolve(
      process.cwd(),
      process.env.UPLOAD_BASE_DIR,
      res.body.trail.id,
    );
    expect(fs.existsSync(uploadDir)).toBe(true);
    expect(normalize([res.body.trail])).toMatchSnapshot();
  });

  it("fallisce se manca il file GPX", async () => {
    const res = await request(app)
      .post("/trails")
      .set("Authorization", `Bearer ${token}`)
      .field("title", "Trail senza GPX")
      .field(
        "coordinates",
        JSON.stringify({
          DD: { lat: 46.4, lon: 11.7 },
        }),
      )
      .field("idAdmin", admin.id.toString());

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Devi caricare un file .gpx");

    const trails = await Trail.find();
    expect(trails.length).toBe(0);
    expect(res.body).toMatchSnapshot();
  });

  it("fallisce se l'utente non è admin", async () => {
    const user = await User.create({
      username: "user",
      email: "user@test.com",
      password: "test",
      role: "base",
    });

    const userToken = getToken(user);

    const res = await request(app)
      .post("/trails")
      .set("Authorization", `Bearer ${userToken}`)
      .attach("gpx", path.join(__dirname, "fixtures/test.gpx"));

    expect(res.status).toBe(403);
    expect(res.body).toMatchSnapshot();
  });

  it("fallisce se coordinates non sono valide (rollback DB + FS)", async () => {
    const res = await request(app)
      .post("/trails")
      .set("Authorization", `Bearer ${token}`)
      .field("title", "Trail Coordinate Errate")
      .field(
        "coordinates",
        JSON.stringify({
          DD: { lat: 999, lon: 11.7 },
        }),
      )
      .field("idAdmin", admin.id.toString())
      .attach("gpx", path.join(__dirname, "fixtures/test.gpx"));

    expect(res.status).toBe(500);

    const trails = await Trail.find();
    expect(trails.length).toBe(0);
    expect(res.body).toMatchSnapshot();
  });
});





describe("GET /trails/near", () => {
  test("returns 400 if lat, lon or radius are missing", async () => {
    const res = await request(app).get("/trails/near");

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "lat, lon and radius are required",
    });
    expect(res.body).toMatchSnapshot();
  });

  test("returns trails within the given radius", async () => {
    // Trail vicino (stesse coordinate)
    await createTrail({
      title: "Trail Vicino",
      coordinates: {
        DD: {
          lat: 46.4,
          lon: 11.7,
        },
      },
    });

    // Trail lontano (~100km)
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
        radius: 5, // km
      });

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].title).toBe("Trail Vicino");
    expect(normalize(res.body)).toMatchSnapshot();
  });

  test("returns empty array if no trails are within radius", async () => {
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
        radius: 1, // km
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
    expect(normalize(res.body)).toMatchSnapshot();
  });

  test("handles numeric query parameters correctly", async () => {
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

  test("returns 500 if Trail.find throws an error", async () => {
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
    expect(res.body).toMatchSnapshot();
  });
});





describe("GET /trails/:id", () => {
  it("should return 200 and the trail when the trail exists", async () => {
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

  it("should return 404 if the trail does not exist", async () => {
    const nonExistingId = "507f1f77bcf86cd799439011"; // ObjectId valido

    const res = await request(app).get(`/trails/${nonExistingId}`);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: "Trail not found",
    });
    expect(res.body).toMatchSnapshot();
  });

  it("should return 400 if the id is not a valid ObjectId", async () => {
    const invalidId = "not-a-valid-id";

    const res = await request(app).get(`/trails/${invalidId}`);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "Invalid ID",
    });
    expect(res.body).toMatchSnapshot();
  });
});
