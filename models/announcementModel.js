const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    priority: {
      type: String,
      enum: ["high", "medium", "low"],
      required: true,
      default: "medium",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    targetAudience: {
      type: String,
      enum: ["students", "faculty", "all"],
      default: "students",
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    classes: [
      {
        type: String, // className like "CSE-2A"
      },
    ],
  },
  { timestamps: true }
);

// Index for fast filtering by priority
announcementSchema.index({ priority: 1 });
announcementSchema.index({ createdAt: -1 });
announcementSchema.index({ expiresAt: 1 });

module.exports = mongoose.model("Announcement", announcementSchema);

