const mongoose = require("mongoose");
mongoose.set('strictQuery', true);
async function connectDB(url){
    await mongoose.connect(url);
    console.log("Connected to MongoDB");
}
module.exports = connectDB;