const mongoose = require("mongoose");

const ComplaintSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },

    category: { type: String, default: "General" },

    raisedBy: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      role: { type: String, enum: ["student", "faculty"], required: true },
    },

    // Who currently should act on this complaint?
    currentOwner: {
      type: String,
      enum: ["student", "faculty", "admin"],
      required: true,
    },

    // Status of the complaint
    status: {
      type: String,
      enum: ["pending_faculty", "pending_admin", "resolved", "rejected"],
      default: "pending_faculty",
    },

    // For mapping to a class/faculty when student complains
    targetClassId: { type: mongoose.Schema.Types.ObjectId, ref: "Class" },
    targetFacultyId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // optional

    // Action history / comments timeline
    history: [
      {
        actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        actorRole: { type: String, enum: ["student", "faculty", "admin"] },
        action: {
          type: String,
          enum: [
            "Created",
            "Comment",
            "Resolved",
            "Rejected",
            "EscalatedToAdmin",
            "AdminResolved",
            "MarkedResolvedForStudent",
          ],
        },
        comment: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Complaint", ComplaintSchema);

