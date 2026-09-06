const restrictGuestWrites = (req, res, next) => {
  // Allow all GET (read-only) requests to pass through
  if (req.method === 'GET') {
    return next();
  }

  // Check if the authenticated user is the guest
  if (req.user && req.user.email === 'guest@agriflow.com') {
    return res.status(403).json({
      success: false,
      message: "Guest accounts can explore, but cannot modify data."
    });
  }

  // Allow normal, authenticated users to proceed with POST/PUT/DELETE
  next();
};

module.exports = restrictGuestWrites;
