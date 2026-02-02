export const selfOrAdmin = (req, res, next) => {
  const { id } = req.params;
  const { user } = req;

  if (user?.role === "admin" || user?.id === id) {
    return next();
  }

  return res.status(403).json({ message: "Forbidden" });
};