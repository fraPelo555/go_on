const request = require("supertest");
const app = require("../src/app.js");
const db = require("./setup.js");
const { User } = require("../src/models/User");
const { Trail } = require("../src/models/Trail");

beforeAll(async () => {
  await db.connect();
});

afterEach(async () => {
  await db.clearDatabase();
});

afterAll(async () => {
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
    region: "Trentino",
    valley: "Val di Fassa",
    difficulty: "Medium",
    lengthKm: 10,
    duration: { hours: 2, minutes: 30 }, // 150 min
    tags: ["scenic", "family_friendly"],
    coordinates: {
      DD: { lat: 46.4, lon: 11.7 },
    },
    idAdmin: admin.id,
    ...overrides,
  });
};

describe("GET /trails", () => {
  it("ritorna tutti i trail senza filtri", async () => {
    await createTrail();
    await createTrail({ title: "Altro trail" });

    const res = await request(app).get("/trails");

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
    expect(res.body).toMatchSnapshot();
  });

  it("filtra per region", async () => {
    await createTrail({ region: "Trentino" });
    await createTrail({ region: "Lombardia" });

    const res = await request(app).get("/trails").query({ region: "Trentino" });

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].region).toBe("Trentino");
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
  });

  it("filtra per durata minima e massima (in minuti)", async () => {
    await createTrail({ duration: { hours: 1, minutes: 0 } }); // 60
    await createTrail({ duration: { hours: 3, minutes: 0 } }); // 180

    const res = await request(app)
      .get("/trails")
      .query({ minDuration: 120, maxDuration: 200 });

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);

    const trail = res.body[0];
    expect(trail.duration.hours * 60 + trail.duration.minutes).toBe(180);
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
  });
});
