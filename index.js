require("dotenv").config();

const express = require("express");
const cookieParser = require("cookie-parser");
const path = require("path");
const { rateLimit } = require("express-rate-limit");

const connectDB = require("./connection");
const URL = require("./models/url");
const staticRoute = require("./routes/staticRouter");
const urlRoute = require("./routes/url");
const userRoute = require("./routes/user");

const port = process.env.PORT || 8001;
const app = express();

// Global rate limiter — 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests. Please slow down." },
});

connectDB(process.env.MONGO_URI).then(() => {
  console.log("Database connected successfully");
});

app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));

app.use(globalLimiter);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use("/", staticRoute);
app.use("/url", urlRoute);
app.use("/user", userRoute);

// Public redirect route — no auth required, anyone with the short link can use it
app.get("/:shortId", async (req, res) => {
  const { shortId } = req.params;

  const entry = await URL.findOneAndUpdate(
    { shortId },
    { $push: { visitHistory: { timeStamp: Date.now() } } },
    { new: true }
  );

  if (!entry) {
    return res.status(404).send("Short URL not found or has expired.");
  }

  return res.redirect(entry.redirectUrl);
});

app.listen(port, () => {
  console.log("SERVER LISTENING ON PORT:", port);
});
