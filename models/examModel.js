const mongoose = require("mongoose");

// Subject schema (embedded in Exam)
const subjectSchema = new mongoose.Schema(
  {
    subjectName: {
      type: String,
      required: true,
      trim: true,
    },
    examDate: {
      type: Date,
      required: true,
    },
    examTime: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Exam schema
const examSchema = new mongoose.Schema(
  {
    examTitle: {
      type: String,
      required: true,
      trim: true,
    },
    subjects: [subjectSchema],
  },
  {
    timestamps: true,
  }
);

const Exam = mongoose.model("Exam", examSchema);

module.exports = Exam;

