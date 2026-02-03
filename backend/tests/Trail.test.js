const request = require("supertest");
const app = require("../src/app.js");
const db = require("./setup.js");

beforeAll(async () => {
  await db.connect();
});

afterEach(async () => {
  await db.clearDatabase();
});

afterAll(async () => {
  await db.closeDatabase(); 
});

describe("GET /", () => {
  it("risponde 200", async () => {
    const res = await request(app).get("/");
    expect(res.statusCode).toBe(200);
  });
});