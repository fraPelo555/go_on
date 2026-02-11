const express = require("express");
const { Trail } = require("../models/Trail");
const { Feedback } = require("../models/Feedback");
const { Report } = require("../models/Report");
const { User } = require("../models/User");
const { upload, uploadBaseDir } = require("./Storage");

const { tokenChecker } = require("../middlewares/TokenChecker");
const { requireRole } = require("../middlewares/RequireRole");

const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
const rm = promisify(fs.rm);
const mongoose = require("mongoose");

const dotenv = require("dotenv");
dotenv.config();

const router = express.Router();

// -------- GET /trails?filters --------
router.get("/", async (req, res) => {
  try {
    const {
      region,
      valley,
      difficulty,
      minLength,
      maxLength,
      minDuration,
      maxDuration,
      tags,
    } = req.query;

    const filter = {};

    if (region) {
      filter.region = region;
    }
    if (valley) {
      filter.valley = valley;
    }
    if (difficulty) {
      filter.difficulty = difficulty;
    }
    if (minLength) {
      filter.lengthKm = { ...filter.lengthKm, $gte: Number(minLength) };
    }
    if (maxLength) {
      filter.lengthKm = { ...filter.lengthKm, $lte: Number(maxLength) };
    }

    const exprConditions = [];
    if (minDuration) {
      exprConditions.push({
        $gte: [
          {
            $add: [
              {
                $multiply: ["$duration.hours", 60],
              },
              "$duration.minutes",
            ],
          },
          Number(minDuration),
        ],
      });
    }
    if (maxDuration) {
      exprConditions.push({
        $lte: [
          {
            $add: [
              {
                $multiply: ["$duration.hours", 60],
              },
              "$duration.minutes",
            ],
          },
          Number(maxDuration),
        ],
      });
    }
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : tags.split(",");
      filter.tags = {
        $all: tagArray,
      };
    }
    if (exprConditions.length > 0) {
      filter.$expr = { $and: exprConditions };
    }
    const trails = await Trail.find(filter);
    res.json(trails);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// -------- POST /trails --------
router.post("/", tokenChecker, requireRole("admin"), async (req, res) => {
  try {
    if (req.body.duration) {
      req.body.duration = JSON.parse(req.body.duration);
    }
    if (req.body.coordinates) {
      req.body.coordinates = JSON.parse(req.body.coordinates);
    }
    if (req.body.tags) {
      req.body.tags = JSON.parse(req.body.tags);
    }

    const trail = new Trail(req.body);
    await trail.save();

    res.status(201).json(trail);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// -------- PUT /trails/:id --------
router.put("/:id", tokenChecker, requireRole("admin"), async (req, res) => {
  try {
    const parseIfString = (value) => {
      if (typeof value === "string") {
        return JSON.parse(value);
      }
      return value;
    };

    if (req.body.duration !== undefined) {
      req.body.duration = parseIfString(req.body.duration);
    }
    if (req.body.coordinates !== undefined) {
      req.body.coordinates = parseIfString(req.body.coordinates);
    }
    if (req.body.tags !== undefined) {
      req.body.tags = parseIfString(req.body.tags);
    }

    const trail = await Trail.findById(req.params.id);
    if (!trail) {
      return res.status(404).json({ error: "Trail not found" });
    }

    const allowedFields = [
      "title",
      "description",
      "region",
      "valley",
      "difficulty",
      "lengthKm",
      "duration",
      "roadbook",
      "directions",
      "parking",
      "ascentM",
      "descentM",
      "highestPointM",
      "lowestPointM",
      "tags",
      "coordinates",
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        trail[field] = req.body[field];
      }
    }

    const forbiddenFields = [
      "_id",
      "id",
      "idAdmin",
      "location",
      "createdAt",
      "updatedAt",
    ];

    for (const field of forbiddenFields) {
      if (field in req.body) {
        return res.status(400).json({
          error: `Il campo '${field}' non è modificabile`,
        });
      }
    }

    await trail.save();

    res.json(trail);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// -------- PUT /trails/:id/gpx --------
router.put(
  "/:id/gpx",
  tokenChecker,
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const trail = await Trail.findById(req.params.id);

      if (!trail) {
        return res.status(404).json({ error: "Trail not found" });
      }

      req.trailId = trail.id;
      req.trail = trail;
      next();
    } catch (err) {
      next(err);
    }
  },
  (req, res) => {
    upload.single("gpx")(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      if (!req.file) {
        return res.status(400).json({ error: "GPX file is required" });
      }
      return res.status(200).json({
        message: "GPX caricato correttamente",
        filePath: `/uploads/${req.trailId}/track.gpx`,
      });
    });
  },
);

// -------- DELETE /trails/:id --------
router.delete("/:id", tokenChecker, requireRole("admin"), async (req, res) => {
  const { id } = req.params;
  try {
    const trail = await Trail.findById(id);
    if (!trail) {
      return res.status(404).json({ error: "Trail not found" });
    }

    await Feedback.deleteMany({ idTrail: id });
    await Report.deleteMany({ idTrail: id });
    await User.updateMany({ favourites: id }, { $pull: { favourites: id } });
    await Trail.findByIdAndDelete(id);

    const trailDir = path.join(uploadBaseDir, id.toString());
    if (fs.existsSync(trailDir)) {
      await rm(trailDir, { recursive: true, force: true });
    }

    return res.status(204).end();
  } catch (err) {
    console.error("Errore nella DELETE /trails/:id:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// -------- GET /trails/near?lat=&lon=&radius= --------
router.get("/near", async (req, res) => {
  try {
    const { lat, lon, radius } = req.query;
    if (!lat || !lon || !radius) {
      return res
        .status(400)
        .json({ error: "lat, lon and radius are required" });
    }
    const trails = await Trail.find({
      location: {
        $geoWithin: {
          $centerSphere: [[Number(lon), Number(lat)], Number(radius) / 6371], // raggio in km/raggio_terrestre
        },
      },
    });
    res.json(trails);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// -------- GET /trails/:id --------
router.get("/:id", async (req, res) => {
  try {
    const trail = await Trail.findById(req.params.id);
    if (!trail) {
      return res.status(404).json({ error: "Trail not found" });
    }
    res.json(trail);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Invalid ID" });
  }
});

// -------- GET /trails/:id/download/gpx --------
router.get("/:id/download/gpx", async (req, res) => {
  const { id } = req.params;

  try {
    const trail = await Trail.findById(id);
    if (!trail) {
      return res.status(404).json({ error: "Trail not found" });
    }

    const gpxPath = path.join(uploadBaseDir, id.toString(), "track.gpx");

    if (!fs.existsSync(gpxPath)) {
      return res.status(404).json({ error: "GPX file not found" });
    }

    return res.download(gpxPath, "track.gpx");
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// -------- GET /trails/:id/gpx --------
router.get(
  "/:id/gpx",
  async (req, res, next) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: "Invalid trail id" });
      }

      const trail = await Trail.findById(req.params.id);

      if (!trail) {
        return res.status(404).json({ error: "Trail not found" });
      }

      req.trailId = trail.id;
      req.trail = trail;
      next();
    } catch (err) {
      next(err);
    }
  },
  async (req, res, next) => {
    try {
      const gpxPath = path.join(
        process.env.UPLOAD_BASE_DIR,
        req.trailId.toString(),
        "track.gpx",
      );

      if (!fs.existsSync(gpxPath)) {
        return res.status(404).json({ error: "GPX file not found" });
      }

      res.setHeader("Content-Type", "application/gpx+xml");
      res.setHeader("Content-Disposition", 'inline; filename="track.gpx"');

      const stream = fs.createReadStream(gpxPath);

      stream.on("error", (err) => {
        next(err);
      });

      stream.pipe(res);
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;