export const requireRole = (role) => (req, res, next) => {
  const { user } = req;

  if (user?.role !== role) {
    return res.status(403).json({
      success: false,
      message: "Forbidden",
    });
  }

  return next();
};
