const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },
    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    subjectName: {
      type: String,
      required: true,
    },
    // Optional: if we add Subject model later
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      default: null,
    },
    records: [
      {
        studentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        status: {
          type: String,
          enum: ["present", "absent", "late"],
          default: "present",
        },
      },
    ],
  },
  { timestamps: true }
);

// Compound index to ensure uniqueness per class + subject + date + faculty
// One faculty can mark attendance for one subject in one class on one date
attendanceSchema.index(
  { classId: 1, subjectName: 1, date: 1, facultyId: 1 },
  { unique: true }
);

module.exports = mongoose.model("Attendance", attendanceSchema);

