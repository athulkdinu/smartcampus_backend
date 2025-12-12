const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
    jobType: { type: String, default: "Full-time" },
    mode: { type: String, default: "On-site" }, // On-site / Remote / Hybrid
    location: { type: String, default: "" },
    salary: { type: String, default: "" }, // CTC or stipend text
    openings: { type: Number },
    status: {
      type: String,
      enum: ["Active", "Draft", "Screening", "Closed"],
      default: "Draft",
    },
    eligibility: {
      departments: [{ type: String }],
      cgpa: { type: String },
      skills: [{ type: String }],
    },
    description: { type: String, default: "" },
    responsibilities: [{ type: String }],
    deadline: { type: Date },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Job", jobSchema);

