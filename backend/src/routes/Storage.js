const dotenv = require("dotenv");
dotenv.config();

const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadBaseDir = path.resolve(
  process.cwd(),
  process.env.UPLOAD_BASE_DIR,
);

if (!fs.existsSync(uploadBaseDir)) {
  fs.mkdirSync(uploadBaseDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!req.trailId) {
      return cb(new Error("trailId non disponibile per l'upload"));
    }

    const trailDir = path.join(uploadBaseDir, req.trailId);

    if (!fs.existsSync(trailDir)) {
      fs.mkdirSync(trailDir, { recursive: true });
    }

    cb(null, trailDir);
  },

  filename: (req, file, cb) => {
    cb(null, "track.gpx");
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if (ext !== ".gpx") {
      return cb(new Error("Sono consentiti solo file .gpx"));
    }

    cb(null, true);
  }
});

module.exports = { upload, uploadBaseDir };
