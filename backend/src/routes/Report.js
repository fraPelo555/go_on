const express = require("express");
const mongoose = require("mongoose");

const { Report } = require("../models/Report");
const { Trail } = require("../models/Trail");
const { User } = require("../models/User");

const { tokenChecker } = require("../middlewares/tokenChecker");
const { requireRole } = require("../middlewares/requireRole");
const { selfOrAdmin } = require("../middlewares/selfOrAdmin");

const router = express.Router();

// -------- POST /reports/:idTrail --------
router.post("/:idTrail", tokenChecker, async (req, res) => {
  try {
    const { idTrail } = req.params;
    const { testo } = req.body;

    if (!testo) {
      return res.status(400).json({ message: "'text' is required" });
    }

    const trailExists = await Trail.exists({ _id: idTrail });
    if (!trailExists) {
      return res.status(404).json({ message: "Trail not found" });
    }

    const report = new Report(req.body);
    await report.save();
    return res.status(201).json(report);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message, errors: error.errors });
    }
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// -------- GET /reports/all?filter --------
router.get("/all", tokenChecker, requireRole("admin"), async (req, res) => {
  try {
    const { state } = req.query;

    let query = {};
    if (state) {
      const states = state.split(",").map((s) => s.trim());
      query.state = { $in: states };
    }

    const reports = await Report.find(query);
    return res.status(200).json(reports);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Errore interno del server" });
  }
});

// -------- GET /reports/:id --------
router.get("/:id", tokenChecker, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid report id" });
    } 

    const report = await Report.findById(req.params.id).
      populate({
        path: "idUser",
        select: "-password"
      })
      .populate({
        path: "idTrail"
      });

    if (!report) {
      return res.status(404).json({ message: "Report non trovato" });
    }

    return res.status(200).json(report);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Errore interno del server" });
  }
});

// -------- PUT /reports/:id --------
router.put(
  "/:id",
  tokenChecker,
  async (req, res, next) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid report id" });
    }

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    req.report = report;
    next();
  },
  selfOrAdmin((req) => req.report.idUser),
  async (req, res) => {
    try {
      const allowedFields = req.user.role === "admin" ? ["testo", "state"] : ["testo"];

      const update = {};

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          update[field] = req.body[field];
        }
      }

      if (Object.keys(update).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }

      Object.assign(req.report, update);
      await req.report.save(); 

      return res.status(200).json(req.report);
    } catch (error) {
      if (error.name === "ValidationError") {
        return res.status(400).json({
          message: error.message,
          errors: error.errors,
        });
      }
      console.error(error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

// -------- DELETE /reports/:id --------
router.delete(
  "/:id",
  tokenChecker,
  async (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid report id" });
    }

    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    req.report = report;
    next();
  },
  selfOrAdmin((req) => req.report.idUser),
  (req, res, next) => {
    if (
      req.user.role !== "admin" &&
      req.report.state !== "Nuovo"
    ) {
      return res.status(403).json({
        message: "You can delete a report only if it is in state 'Nuovo'"
      });
    }
    next();
  },
  async (req, res) => {
    await req.report.deleteOne();
    return res.status(204).send();
  }
);

// -------- GET /reports/all/trail/:idTrail --------
router.get("/all/trail/:idTrail", tokenChecker, async (req, res) => {
  try {
    const { idTrail } = req.params;

    if (!mongoose.Types.ObjectId.isValid(idTrail)) {
      return res.status(400).json({ message: "Invalid trail id" });
    }

    const trailExists = await Trail.exists({ _id: idTrail });
    if (!trailExists) return res.status(404).json({ message: "Trail not found" });

    const reports = await Report.find({ idTrail }).
      populate({
        path: "idUser",
        select: "-password" 
      })
      .populate({
        path: "idTrail"
      });
    return res.status(200).json(reports);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Errore interno del server" });
  }
});

// -------- GET /reports/all/user/:idUser --------
router.get(
  "/all/user/:idUser",
  tokenChecker,

  async (req, res, next) => {
    const { idUser } = req.params;

    if (!mongoose.Types.ObjectId.isValid(idUser)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const user = await User.findById(idUser);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    req.targetUser = user;
    next();
  },

  selfOrAdmin((req) => req.targetUser._id),

  async (req, res) => {
    try {
      const reports = await Report.find({ idUser: req.targetUser._id });
      return res.status(200).json(reports);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Errore interno del server" });
    }
  }
);

module.exports = router;