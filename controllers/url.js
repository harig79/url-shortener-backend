const { nanoid } = require("nanoid");
const URL = require("../models/url");

async function handleGenerateNewShortUrl(req, res) {
  const { redirectUrl } = req.body;

  if (!redirectUrl) {
    return res.status(400).json({ error: "redirectUrl is required" });
  }

  const shortId = nanoid(8);

  await URL.create({
    shortId,
    redirectUrl,
    visitHistory: [],
  });

  return res.json({ shortId });
}


module.exports = { handleGenerateNewShortUrl };
