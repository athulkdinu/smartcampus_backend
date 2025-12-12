const mongoose = require("mongoose");

const skillRoundSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SkillCourse",
      required: true,
    },
    roundNumber: {
      type: Number,
      required: true,
      enum: [1, 2, 3, 4],
    },
    // Round 1: Learning content
    lessonTitle: { type: String, default: "" },
    contentType: {
      type: String,
      enum: ["video", "text"],
      default: "text",
    },
    videoUrl: { type: String, default: "" },
    textContent: { type: String, default: "" },
    // Round 2 & 4: Quiz
    quizTitle: { type: String, default: "" },
    questions: [
      {
        question: { type: String, required: true },
        options: [{ type: String, required: true }],
        correctIndex: { type: Number, required: true },
      },
    ],
    // Round 3: Project
    projectTitle: { type: String, default: "" },
    projectBrief: { type: String, default: "" },
    projectRequirements: [{ type: String }],
  },
  { timestamps: true }
);

skillRoundSchema.index({ course: 1, roundNumber: 1 }, { unique: true });

module.exports = mongoose.model("SkillRound", skillRoundSchema);



