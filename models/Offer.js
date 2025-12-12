const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema(
  {
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true,
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    ctc: { type: String, default: "" },
    status: {
      type: String,
      enum: ["Pending", "Accepted", "Rejected", "Expired"],
      default: "Pending",
    },
    offerLetterUrl: { type: String },
    offerLetterName: { type: String },
    issuedOn: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Offer", offerSchema);

