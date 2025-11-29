const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    location: { type: String, trim: true },
    section: { type: String, trim: true },
    facultyInCharge: { type: String, trim: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "forwarded"],
      default: "pending",
    },
    origin: { type: String, trim: true },
    submittedByName: { type: String, trim: true },
    submittedByRole: {
      type: String,
      enum: ["student", "faculty", "admin"],
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    forwardedToAdmin: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Event", eventSchema);


