const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String
  },
  email: {
    type: String,
    required: true,
    unique: true,
    match: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ["admin", "base"],
    default: "base"
  },
  favourites: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trail" // riferimento al modello Trail
    }
  ],
  default: []
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

userSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

const User = mongoose.model("User", userSchema);

module.exports = { User };