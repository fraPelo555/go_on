const selfOrAdmin = (getOwnerId) => async (req, res, next) => {
  try {
    if (req.user.role === "admin") {
      return next();
    }

    const ownerId = await getOwnerId(req);

    if (ownerId && ownerId.toString() === req.user.id) {
      return next();
    }

    return res.status(403).json({ message: "Forbidden" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { selfOrAdmin };