const mongoose = require("mongoose");

const gradeSheetSchema = new mongoose.Schema(
  {
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    examType: {
      type: String,
      required: true,
    },
    grades: [
      {
        studentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        maxScore: {
          type: Number,
          default: null,
        },
        obtainedScore: {
          type: Number,
          default: null,
        },
        grade: {
          type: String,
          default: null,
        },
        updatedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("GradeSheet", gradeSheetSchema);














