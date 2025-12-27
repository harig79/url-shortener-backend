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
//   const allUrls = await URL.find({});

// return res.render("home", {
//   id: shortId,
//   urls: allUrls,
// });
return res.redirect("/");

 
  
  // return res.json({ shortId });
}
async function handleGetAnalytics(req, res) {
    const shortId = req.params.shortId;
    const result = await URL.findOne({shortId});
    if(!result) return res.status(404).json({error:"shortId not found Eroor 404 agaya"});
    return res.json({
        totalClickssss: result.visitHistory.length,
        analytics: result.visitHistory,
    })

}

module.exports = { handleGenerateNewShortUrl ,handleGetAnalytics};
