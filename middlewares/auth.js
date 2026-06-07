const jwt = require("jsonwebtoken");

// For page routes — redirects to /login on failure
function checkAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.redirect("/login");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.clearCookie("token").redirect("/login");
  }
}

// For API routes — returns JSON 401 on failure
function checkAuthAPI(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: "Authentication required" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = { checkAuth, checkAuthAPI };
