const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { OAuth2Client } = require("google-auth-library");

const { User } = require("../models/User");
const { Trail } = require("../models/Trail");
const { Feedback } = require("../models/Feedback");
const { Report } = require("../models/Report");

const { tokenChecker } = require("../middlewares/TokenChecker");
const { requireRole } = require("../middlewares/RequireRole");
const { selfOrAdmin } = require("../middlewares/SelfOrAdmin");

const router = express.Router();

const dotenv = require("dotenv");
dotenv.config();

// Versione senza autenticazione google, ma con jwt token
// -------- POST /users --------
/*
router.post("/", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    let user = await User.findOne({ email });

    if (user) {
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ success: false, message: "Authentication failed. Wrong password." });
      }
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);

      user = new User({
        username,
        email,
        password: hashedPassword,
      });

      await user.save();
    }

    const payload = {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "24h" });

    res.status(user.isNew ? 201 : 200).json({
      success: true,
      message: user.isNew ? "User created and authenticated" : "User authenticated",
      token,
      id: user._id,
      email: user.email,
      username: user.username,
    });

  } catch (error) {
    console.error(error);
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message, errors: error.errors });
    }
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});
*/
// Versione completa
function getGoogleClient() {
  return new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
}

// -------- POST /users --------
router.post("/", async (req, res) => {
  try {
    let user;
    let isNewUser = false;
    const { username, email, password, googleToken } = req.body;
    
    if (googleToken) {
      const client = getGoogleClient();

      const ticket = await client.verifyIdToken({
        idToken: googleToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      const googleEmail = payload.email;
      const googleName = payload.name;

      user = await User.findOne({ email: googleEmail });

      if (!user) {
        const placeholderPassword = await bcrypt.hash(
          "default-google-password-to-be-changed",
          10
        );

        user = new User({
          username: googleName || googleEmail.split("@")[0],
          email: googleEmail,
          password: placeholderPassword,
        });

        await user.save();
        isNewUser = true;
      }
    } else {
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required",
        });
      }

      user = await User.findOne({ email });

      if (!user) {
        const hashedPassword = await bcrypt.hash(password, 10);

        user = new User({
          username: username || email.split("@")[0],
          email,
          password: hashedPassword,
        });

        await user.save();
        isNewUser = true;
      } else {
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
          return res.status(401).json({
            success: false,
            message: "Authentication failed. Wrong password.",
          });
        }
      }
    }

    const jwtPayload = {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      self: `api/v1/users/${user._id}`,
    };

    const token = jwt.sign(jwtPayload, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });

    return res.status(isNewUser ? 201 : 200).json({
      success: true,
      message: isNewUser
        ? "User created and authenticated"
        : "User authenticated",
      token,
      id: user._id,
      email: user.email,
      username: user.username,
      role: user.role,
    });

  } catch (error) {
    console.error(error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
        errors: error.errors,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// -------- GET /users/all --------
router.get("/all", tokenChecker, requireRole("admin"), async (req, res) => {
  try {
    const users = await User.find().select("-password");

    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// -------- GET /users/:id --------
router.get(
  "/:id",
  tokenChecker,
  async (req, res, next) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid user id" });
    }

    try {
      const user = await User.findById(id).select("-password");
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      req.targetUser = user;
      next();
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({
          success: false,
          message: "Internal server error",
          error: error.message,
        });
    }
  },
  selfOrAdmin((req) => req.targetUser._id),
  (req, res) => {
    res.status(200).json({
      success: true,
      user: req.targetUser,
    });
  },
);

// -------- PUT /users/:id --------
router.put(
  "/:id",
  tokenChecker,
  selfOrAdmin((req) => req.params.id),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { email, role, password, ...allowedUpdates } = req.body;

      if (email || role) {
        return res
          .status(400)
          .json({ success: false, message: "Cannot modify email or role" });
      }

      if (password) {
        allowedUpdates.password = await bcrypt.hash(password, 10);
      }

      const updatedUser = await User.findByIdAndUpdate(id, allowedUpdates, {
        new: true,
        runValidators: true,
      }).select("-password");

      if (!updatedUser) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      res.status(200).json({
        success: true,
        message: "User updated successfully",
        user: updatedUser,
      });
    } catch (error) {
      console.error(error);
      if (error.name === "ValidationError") {
        return res
          .status(400)
          .json({
            success: false,
            message: error.message,
            errors: error.errors,
          });
      }
      res
        .status(500)
        .json({
          success: false,
          message: "Internal server error",
          error: error.message,
        });
    }
  },
);

// -------- DELETE /users/:id --------
router.delete(
  "/:id",
  tokenChecker,
  selfOrAdmin((req) => req.params.id),
  async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid user id" });
    }

    try {
      const user = await User.findById(id);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      await Feedback.deleteMany({ idUser: id });
      await Report.deleteMany({ idUser: id });
      await User.findByIdAndDelete(id);

      return res.status(204).send();
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({
          success: false,
          message: "Internal server error",
          error: error.message,
        });
    }
  },
);

// -------- POST /users/:idUser/favourites/:idTrail --------
router.post(
  "/:idUser/favourites/:idTrail",
  tokenChecker,
  selfOrAdmin((req) => req.params.idUser),
  async (req, res) => {
    const { idUser, idTrail } = req.params;
    if (
      !mongoose.Types.ObjectId.isValid(idUser) ||
      !mongoose.Types.ObjectId.isValid(idTrail)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid user or trail id" });
    }

    try {
      const user = await User.findById(idUser);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      const trailExists = await Trail.exists({ _id: idTrail });
      if (!trailExists) {
        return res
          .status(404)
          .json({ success: false, message: "Trail not found" });
      }

      if (user.favourites.includes(idTrail)) {
        return res
          .status(409)
          .json({ success: false, message: "Trail already in favourites" });
      }

      user.favourites.push(idTrail);
      await user.save();

      return res.status(200).json({
        success: true,
        message: "Trail added to favourites",
        favourites: user.favourites,
      });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({
          success: false,
          message: "Internal server error",
          error: error.message,
        });
    }
  },
);

// -------- DELETE /users/:idUser/favourites/:idTrail --------
router.delete(
  "/:idUser/favourites/:idTrail",
  tokenChecker,
  selfOrAdmin((req) => req.params.idUser),
  async (req, res) => {
    const { idUser, idTrail } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(idUser) ||
      !mongoose.Types.ObjectId.isValid(idTrail)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid user or trail id" });
    }

    try {
      const user = await User.findById(idUser);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      const index = user.favourites.indexOf(idTrail);
      if (index === -1) {
        return res
          .status(404)
          .json({ success: false, message: "Favourite trail not found" });
      }

      user.favourites.splice(index, 1);
      await user.save();

      return res.status(204).send();
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({
          success: false,
          message: "Internal server error",
          error: error.message,
        });
    }
  },
);

// -------- GET /users/favourites/:idUser --------
router.get(
  "/favourites/:idUser",
  tokenChecker,
  selfOrAdmin((req) => req.params.idUser),
  async (req, res) => {
    const { idUser } = req.params;

    if (!mongoose.Types.ObjectId.isValid(idUser)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid user id" });
    }

    try {
      const user = await User.findById(idUser).populate("favourites");
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      return res.status(200).json({
        success: true,
        count: user.favourites.length,
        favourites: user.favourites,
      });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({
          success: false,
          message: "Internal server error",
          error: error.message,
        });
    }
  },
);

module.exports = router;
