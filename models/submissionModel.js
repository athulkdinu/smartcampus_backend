const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema(
  {
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fileUrl: {
      type: String,
      default: null,
    },
    textAnswer: {
      type: String,
      default: "",
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Rework"],
      default: "Pending",
    },
    facultyRemark: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// Ensure one submission per student per assignment (unless status is Rework)
submissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: false });

module.exports = mongoose.model("Submission", submissionSchema);

