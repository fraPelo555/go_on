import request from "supertest";
import mongoose from "mongoose";
import app from "../src/app.js"; // importa la tua express app
import fs from "fs";
import path from "path";

describe("POST /trails", () => {

  beforeAll(async () => {
    await mongoose.connect("mongodb://127.0.0.1:27017/test-db");
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  it("should create a trail with gpx upload", async () => {
    const gpxPath = path.join(__dirname, "resources", "track.gpx");

    const res = await request(app)
      .post("/trails")
      .field("title", "The chromatic contrast of Corno Nero and Corno Bianco")
      .field("description", "test upload description")
      .field("region", "Trentino Alto-Adige")
      .field("valley", "Val di Fiemme")
      .field("difficulty", "Difficult")
      .field("lengthKm", "12.6")
      .field("duration", JSON.stringify({ hours: 6, minutes: 0 }))
      .field("coordinates", JSON.stringify({
        DD:{lat:46.347447, lon:11.453642},
        DMS:{lat:"46°20'50.8\"N", lon:"11°27'13.1\"E"},
        UTM:{zone:"32T", easting:688795, northing:5135578}
      }))
      .field("tags", JSON.stringify(["scenic", "round_trip"]))
      .field("idAdmin", "691856153d4d10beecc227b0")
      .attach("gpx", gpxPath);

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("trail");
    expect(res.body.trail.title).toBe("The chromatic contrast of Corno Nero and Corno Bianco");
  });

});
