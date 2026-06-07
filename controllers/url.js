const { nanoid } = require("nanoid");
const URL = require("../models/url");

async function handleGenerateNewShortUrl(req, res) {
  const { redirectUrl, expiryDays } = req.body;

  if (!redirectUrl) {
    return res.status(400).json({ error: "redirectUrl is required" });
  }

  const shortId = nanoid(8);
  const days = parseInt(expiryDays) || 30;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  await URL.create({
    shortId,
    redirectUrl,
    visitHistory: [],
    expiresAt,
    createdBy: req.user._id,
  });

  return res.redirect("/");
}

async function handleGetAnalytics(req, res) {
  const { shortId } = req.params;
  const result = await URL.findOne({ shortId, createdBy: req.user._id });

  if (!result) return res.status(404).json({ error: "URL not found" });

  return res.json({
    totalClicks: result.visitHistory.length,
    analytics: result.visitHistory,
  });
}

module.exports = { handleGenerateNewShortUrl, handleGetAnalytics };
