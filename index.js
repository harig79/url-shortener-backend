console.log("🚀 index.js file loaded");

const express  = require("express");
const connectDB = require("./connection");
const path = require("path");
const URL = require("./models/url");
const staticRoute = require("./routes/staticRouter");
const port = 8001;
const app = express();

const urlRoute = require("./routes/url");
const { timeStamp } = require("node:console");
connectDB("mongodb://localhost:27017/url-shortener").then(()=>{
    console.log("Database connected successfully");
})



app.set("view engine","ejs");
app.set("views",path.resolve("./views"));

app.use(express.json());
app.use(express.urlencoded({extended:false}));
app.use("/",staticRoute);




app.use("/url",urlRoute);



app.get("/:shortId", async (req, res) => {
    const { shortId } = req.params;
  
    const entry = await URL.findOneAndUpdate(
      { shortId },
      { $push: { visitHistory: { timeStamp: Date.now() } } },
      { new: true }
    );
  
    if (!entry) {
      return res.status(404).send("Short URL not found");
    }
  
    return res.redirect(entry.redirectUrl);
  });
  


app.listen(port, () => {
  console.log("🔥 SERVER LISTENING ON PORT:", port);
});

