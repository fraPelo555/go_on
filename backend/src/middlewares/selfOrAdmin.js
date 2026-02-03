const selfOrAdmin = (id) => (req, res, next) => {
  const { user } = req;

  if (user?.role === "admin" || user?.id === id) {
    return next();
  }

  return res.status(403).json({ message: "Forbidden" });
};

module.exports = { selfOrAdmin };