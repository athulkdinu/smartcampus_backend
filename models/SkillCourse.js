const mongoose = require("mongoose");

const skillCourseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    shortDesc: { type: String, required: true, trim: true },
    longDesc: { type: String, default: "" },
    category: { type: String, default: "General" },
    passThreshold: { type: Number, default: 60 }, // Percentage to pass quizzes
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["Draft", "Published"],
      default: "Draft",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SkillCourse", skillCourseSchema);



