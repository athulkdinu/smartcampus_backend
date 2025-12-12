const mongoose = require("mongoose");

const skillProjectSubmissionSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SkillCourse",
      required: true,
    },
    enrollment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SkillEnrollment",
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    projectFileUrl: { type: String, default: "" },
    projectFileName: { type: String, default: "" },
    description: { type: String, default: "" },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Rework"],
      default: "Pending",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    feedback: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SkillProjectSubmission", skillProjectSubmissionSchema);



