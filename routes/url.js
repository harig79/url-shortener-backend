const express = require("express");
const { handleGenerateNewShortUrl, handleGetAnalytics } = require("../controllers/url");
const { checkAuth, checkAuthAPI } = require("../middlewares/auth");
const { rateLimit } = require("express-rate-limit");

const router = express.Router();

const createLinkLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: "Too many links created from this IP. Try again in an hour." },
});

router.post("/", checkAuth, createLinkLimiter, handleGenerateNewShortUrl);
router.get("/analytics/:shortId", checkAuthAPI, handleGetAnalytics);

module.exports = router;
