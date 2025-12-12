const mongoose = require("mongoose");

const slotSchema = new mongoose.Schema({
  day: {
    type: String,
    enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    required: true,
  },
  startTime: { type: String, required: true }, // '09:00'
  endTime: { type: String, required: true }, // '10:00'
  subject: { type: String, required: true },
  subjectCode: { type: String }, // optional
  faculty: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // teacher for slot
  room: { type: String },
  sessionType: {
    type: String,
    enum: ["Theory", "Lab", "Tutorial"],
    default: "Theory",
  },
});

const timetableSchema = new mongoose.Schema(
  {
    classId: { type: String, required: true }, // e.g., "CSE-2A" (or reference to Class collection if exists)
    academicTerm: { type: String }, // optional: "2025-26 Sem 4"
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // class teacher / admin
    slots: [slotSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Timetable", timetableSchema);
