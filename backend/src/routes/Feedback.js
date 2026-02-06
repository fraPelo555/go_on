const express = require("express");
const mongoose = require("mongoose");

const { Feedback } = require("../models/Feedback");
const { Trail } = require("../models/Trail");
const { User } = require("../models/User");

const { tokenChecker } = require("../middlewares/TokenChecker");
const { requireRole } = require("../middlewares/RequireRole");
const { selfOrAdmin } = require("../middlewares/SelfOrAdmin");

const router = express.Router();

// -------- POST /feedbacks -------- 
router.post("/:idTrail", tokenChecker, async (req, res) => {
  try {
    const { idUser } = req.body;
    const idTrail = req.params.idTrail;

    const existing = await Feedback.findOne({ idUser, idTrail });
    if (existing) {
      return res.status(409).json({ message: "Feedback already exists for this trail" });
    }
    const feedback = new Feedback(req.body);
    await feedback.save();
    return res.status(201).json(feedback);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

// -------- GET /feedbacks/all?filter -------- 
router.get("/all", tokenChecker, requireRole("admin"), async (req, res) => {
  try {
    const { valutazione } = req.query;
    const filter = {};

    if (valutazione !== undefined) {
      const parsed = Number(valutazione);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) {
        return res.status(400).json({ message: "Invalid valutazione filter" });
      }
      filter.valutazione = parsed;
    }

    const feedbacks = await Feedback.find(filter);
    return res.status(200).json(feedbacks);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// -------- GET /feedbacks/:id --------
router.get("/:id", tokenChecker, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid feedback id" });
    }

    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
      return res.status(404).json({ message: "Feedback not found" });
    }

    return res.status(200).json(feedback);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// -------- PUT /feedbacks/:id --------
router.put(
  "/:id",
  tokenChecker,
  async (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid feedback id" });
    }

    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
      return res.status(404).json({ message: "Feedback not found" });
    }

    req.feedback = feedback;
    next();
  },
  selfOrAdmin(async (req) => req.feedback.idUser),
  async (req, res) => {
    try {
      const allowedFields = ["testo", "valutazione"];
      const update = {};

      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          update[field] = req.body[field];
        }
      });

      const updated = await Feedback.findByIdAndUpdate(
        req.feedback.id,
        update,
        { new: true, runValidators: true }
      );

      return res.status(200).json(updated);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }
);

// -------- DELETE /feedbacks/:id --------
router.delete(
  "/:id",
  tokenChecker,
  async (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid feedback id" });
    }

    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
      return res.status(404).json({ message: "Feedback not found" });
    }

    req.feedback = feedback;
    next();
  },
  selfOrAdmin(async (req) => req.feedback.idUser),
  async (req, res) => {
    await Feedback.findByIdAndDelete(req.feedback.id);
    return res.status(204).send();
  }
);

// -------- GET /feedbacks/all/trail/:idTrail --------
router.get("/all/trail/:idTrail", tokenChecker, async (req, res) => {
  try {
    const { idTrail } = req.params;

    if (!mongoose.Types.ObjectId.isValid(idTrail)) {
      return res.status(400).json({ message: "Invalid trail id" });
    }

    const trailExists = await Trail.exists({ _id: idTrail });
    if (!trailExists) {
      return res.status(404).json({ message: "Trail not found" });
    }

    const feedbacks = await Feedback.find({ idTrail });
    return res.status(200).json(feedbacks);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// -------- GET /feedbacks/all/user/:idUser --------
router.get(
  "/all/user/:idUser",
  tokenChecker,
  async (req, res, next) => {
    const { idUser } = req.params;

    if (!mongoose.Types.ObjectId.isValid(idUser)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const userExists = await User.exists({ _id: idUser });
    if (!userExists) {
      return res.status(404).json({ message: "User not found" });
    }

    req.targetUserId = idUser; 
    next();
  },

  selfOrAdmin((req) => req.targetUserId),

  async (req, res) => {
    try {
      const feedbacks = await Feedback.find({ idUser: req.targetUserId });
      return res.status(200).json(feedbacks);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
);

module.exports = router;