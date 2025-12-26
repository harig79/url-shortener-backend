console.log("🚀 index.js file loaded");

const express  = require("express");
const connectDB = require("./connection");

const port = 8001;
const app = express();

const urlRoute = require("./routes/url");
connectDB("mongodb://localhost:27017/url-shortener").then(()=>{
    console.log("Database connected successfully");
})
// app.post("/url", (req, res) => {
//   res.send("HIT URL ROUTE");
// });

app.use(express.json());

app.use("/url",urlRoute);
app.listen(port, () => {
  console.log("🔥 SERVER LISTENING ON PORT:", port);
});

