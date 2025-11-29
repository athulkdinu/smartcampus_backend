const mongoose = require("mongoose");
const User = require("../models/userModel");

const connectionURL = process.env.MONGO_URI;

// create default admin if not exists (for demo)
const ensureDefaultAdmin = async () => {
  try {
    const email = "admin@gmail.com";
    const existing = await User.findOne({ email });

    if (!existing) {
      await User.create({
        name: "Admin",
        email,
        password: "admin123",
        role: "admin",
      });
      console.log("Default admin user created: admin@gmail.com / admin123");
    }
  } catch (error) {
    console.error("Error ensuring default admin:", error);
  }
};

mongoose
  .connect(connectionURL)
  .then(async () => {
    console.log("MongoDB connected successfully ");
    await ensureDefaultAdmin();
  })
  .catch((err) => {
    console.log(`MongoDB connection failed  : ${err}`);
  });
