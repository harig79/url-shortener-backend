console.log("🚀 index.js file loaded");

const express  = require("express");
const connectDB = require("./connection");

const URL = require("./models/url");

const port = 8001;
const app = express();

const urlRoute = require("./routes/url");
const { timeStamp } = require("node:console");
connectDB("mongodb://localhost:27017/url-shortener").then(()=>{
    console.log("Database connected successfully");
})
// app.post("/url", (req, res) => {
//   res.send("HIT URL ROUTE");
// });

app.use(express.json());

app.use("/url",urlRoute);

app.get("/:shortId",async(req,res)=>{
    const shortId = req.params.shortId;
    const entry =   await URL.findOneAndUpdate({
        shortId,
     },
     {
        $push:{
            visitHistory: {timeStamp:Date.now()},
        } 
     });
     return res.redirect(entry.redirectUrl);
})


app.listen(port, () => {
  console.log("🔥 SERVER LISTENING ON PORT:", port);
});

