const express = require("express");
const URL = require("../models/url");
const { checkAuth } = require("../middlewares/auth");
const router = express.Router();

router.get("/", checkAuth, async (req, res) => {
  const urls = await URL.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
  return res.render("home", { urls, user: req.user });
});

router.get("/analytics/:shortId", checkAuth, async (req, res) => {
  const { shortId } = req.params;
  const url = await URL.findOne({ shortId, createdBy: req.user._id });

  if (!url) return res.status(404).send("URL not found or you do not have access.");

  // Group visitHistory timestamps by day for the chart
  const dailyMap = {};
  url.visitHistory.forEach((visit) => {
    const day = new Date(visit.timeStamp).toISOString().split("T")[0];
    dailyMap[day] = (dailyMap[day] || 0) + 1;
  });

  const labels = Object.keys(dailyMap).sort();
  const data = labels.map((d) => dailyMap[d]);

  return res.render("analytics", {
    url,
    shortId,
    totalClicks: url.visitHistory.length,
    labels: JSON.stringify(labels),
    data: JSON.stringify(data),
  });
});

router.get("/login", (req, res) => res.render("login", { error: null }));
router.get("/signup", (req, res) => res.render("signup", { error: null }));

module.exports = router;
