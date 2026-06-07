const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");

async function handleSignup(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.render("signup", { error: "Email and password are required" });
  }

  const existing = await User.findOne({ email });
  if (existing) {
    return res.render("signup", { error: "Email already registered" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({ email, password: hashedPassword });

  const token = jwt.sign(
    { _id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  return res
    .cookie("token", token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 })
    .redirect("/");
}

async function handleLogin(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.render("login", { error: "Email and password are required" });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.render("login", { error: "Invalid credentials" });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.render("login", { error: "Invalid credentials" });
  }

  const token = jwt.sign(
    { _id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  return res
    .cookie("token", token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 })
    .redirect("/");
}

async function handleLogout(req, res) {
  return res.clearCookie("token").redirect("/login");
}

module.exports = { handleSignup, handleLogin, handleLogout };
