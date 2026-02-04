const express = require("express");
const { Trail } = require("../models/Trail");
const { Feedback } = require("../models/Feedback");
const { Report } = require("../models/Report");
const { User } = require("../models/User");

const { tokenChecker } = require("../middlewares/TokenChecker");
const { requireRole } = require("../middlewares/RequireRole");
const { selfOrAdmin } = require("../middlewares/SelfOrAdmin");
const dotenv = require("dotenv");

const multer = require("multer");
const fs = require("fs");
const path = require("path");

dotenv.config();

const router = express.Router();

const uploadBaseDir = path.resolve(process.cwd(), process.env.UPLOAD_BASE_DIR);

if (!fs.existsSync(uploadBaseDir)) {
  fs.mkdirSync(uploadBaseDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadBaseDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage });

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

    const exprConditions = []; // serve creare un array per avere più espressioni
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

router.post(
  "/",
  tokenChecker,
  upload.single("gpx"),
  requireRole("admin"),
  async (req, res) => {
    let trail;
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
      trail = new Trail(req.body);
      await trail.save();
      const trailDir = path.join(uploadBaseDir, trail.id.toString());
      if (!fs.existsSync(trailDir)) {
        fs.mkdirSync(trailDir);
      }
      if (!req.file) {
        await Trail.findByIdAndDelete(trail.id);
        fs.rmdirSync(trailDir, { recursive: true });
        return res.status(400).json({ error: "Devi caricare un file .gpx" });
      }
      const ext = path.extname(req.file.originalname);
      const newPath = path.join(trailDir, `track${ext}`);
      fs.renameSync(req.file.path, newPath);
      res
        .status(201)
        .json({ trail, filePath: `/uploads/${trail.id}/track${ext}` });
    } catch (err) {
      console.error(err);
      if (trail) {
        await Trail.findByIdAndDelete(trail.id);
        const trailDir = path.join(uploadBaseDir, trail.id.toString());
        if (fs.existsSync(trailDir))
          fs.rmdirSync(trailDir, { recursive: true });
      }
      res.status(500).json({ error: err.message });
    }
  },
);

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
          $centerSphere: [[Number(lon), Number(lat)], Number(radius) / 6371], // raggio in km / raggio terrestre
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

/* Vecchio PUT che non aggiornava il file.gpx
// -------- PUT /trails/:id --------
router.put("/:id", tokenChecker, requireRole("admin"), async (req, res) => {
  try {
    const trail = await Trail.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!trail) {
      return res.status(404).json({ error: "Trail not found" });
    }
    res.json(trail);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});
*/

// -------- PUT /trails/:id --------
router.put(
  "/:id",
  tokenChecker,
  requireRole("admin"),
  upload.single("gpx"),
  async (req, res) => {
    try {
      // parsing JSON (come nella POST)
      if (req.body.duration) {
        req.body.duration = JSON.parse(req.body.duration);
      }
      if (req.body.coordinates) {
        req.body.coordinates = JSON.parse(req.body.coordinates);
      }
      if (req.body.tags) {
        req.body.tags = JSON.parse(req.body.tags);
      }

      const trail = await Trail.findById(req.params.id);
      if (!trail) {
        return res.status(404).json({ error: "Trail not found" });
      }

      // aggiorna i campi del documento
      Object.assign(trail, req.body);

      // salva → triggera pre("save")
      await trail.save();

      // gestione GPX (opzionale)
      if (req.file) {
        const trailDir = path.join(uploadBaseDir, trail.id.toString());

        if (!fs.existsSync(trailDir)) {
          fs.mkdirSync(trailDir, { recursive: true });
        }

        const ext = path.extname(req.file.originalname);
        const newPath = path.join(trailDir, `track${ext}`);

        // rimuove eventuali vecchi track.*
        const files = fs.readdirSync(trailDir);
        for (const file of files) {
          if (file.startsWith("track.")) {
            fs.rmSync(path.join(trailDir, file), { force: true });
          }
        }

        fs.renameSync(req.file.path, newPath);
      }

      res.json(trail);
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: err.message });
    }
  },
);

// -------- DELETE /trails/:id --------
router.delete("/:id", tokenChecker, requireRole("admin"), async (req, res) => {
  const { id } = req.params;
  try {
    if (req.loggedUser.role == "Admin") {
      const trail = await Trail.findById(id);
      if (!trail) {
        return res.status(404).json({ error: "Trail not found" });
      }

      // DELETE feedback
      await Feedback.deleteMany({ idTrail: id });

      // DELETE reports
      await Report.deleteMany({ idTrail: id });

      // REMOVE trail from favourites
      await User.updateMany({ favourites: id }, { $pull: { favourites: id } });

      // DELETE trail
      await Trail.findByIdAndDelete(id);

      // DELETE files directory
      const trailDir = path.join(uploadBaseDir, id.toString());
      if (fs.existsSync(trailDir)) {
        fs.rmSync(trailDir, { recursive: true, force: true });
      }

      return res.status(204).end();
    } else {
      return res.status(403).json({ error: "Unauthorized Access" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// -------- GET /trails/:id/upload/gpx --------
router.get("/:id/upload/gpx", async (req, res) => {
  const { id } = req.params;
  try {
    const trail = await Trail.findById(id);
    if (!trail) {
      return res.status(404).json({ error: "Trail not found" });
    }
    // Directory della trail
    const trailDir = path.join(uploadBaseDir, id.toString());
    if (!fs.existsSync(trailDir)) {
      return res.status(404).json({ error: "GPX not found" });
    }
    // Cerca un file che inizia per "track"
    const files = fs.readdirSync(trailDir);
    const gpxFile = files.find((file) => file.startsWith("track"));
    if (!gpxFile) {
      return res.status(404).json({ error: "GPX file not found" });
    }
    const fullPath = path.join(trailDir, gpxFile);
    return res.download(fullPath);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
