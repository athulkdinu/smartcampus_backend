const mongoose = require("mongoose");

const skillEnrollmentSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SkillCourse",
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    progress: {
      round1Completed: { type: Boolean, default: false },
      round2Completed: { type: Boolean, default: false },
      round3Approved: { type: Boolean, default: false },
      round4Completed: { type: Boolean, default: false },
      completed: { type: Boolean, default: false },
    },
    round2Score: { type: Number, default: null },
    round4Score: { type: Number, default: null },
    certificateIssued: { type: Boolean, default: false },
    certificateUrl: { type: String, default: null },
  },
  { timestamps: true }
);

skillEnrollmentSchema.index({ course: 1, student: 1 }, { unique: true });

module.exports = mongoose.model("SkillEnrollment", skillEnrollmentSchema);



