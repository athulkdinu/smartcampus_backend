const mongoose = require("mongoose");

// user schema
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["student", "faculty", "admin", "hr"],
      default: "student",
    },
    className: { type: String },
    studentID: { type: String, unique: true, sparse: true },
    phone: { type: String },
    address: { type: String },
    department: { type: String },
    resumeUrl: { type: String },
    resumeOriginalName: { type: String },
    resumeUpdatedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);
