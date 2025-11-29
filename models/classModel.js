const mongoose = require("mongoose");

const classSchema = new mongoose.Schema(
  {
    className: { type: String, required: true, unique: true },
    department: { type: String, required: true },
    classTeacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    subjects: [
      {
        name: String,
        teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Class", classSchema);


