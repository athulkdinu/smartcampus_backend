const mongoose = require("mongoose");

const connectionURL = process.env.MONGO_URI;

mongoose.connect(connectionURL)
  .then(() => {
    console.log("MongoDB connected successfully ");
  })
  .catch((err) => {
    console.log(`MongoDB connection failed  : ${err}`);
  });
