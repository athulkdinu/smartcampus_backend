const Job = require("../models/Job");
const Application = require("../models/Application");
const Interview = require("../models/Interview");
const Offer = require("../models/Offer");
const User = require("../models/userModel");

// GET /api/hr/dashboard - Get HR dashboard statistics
const getHRDashboard = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    // Verify user is HR
    const user = await User.findById(userId).select("role");
    if (!user || user.role !== "hr") {
      return res.status(403).json({ message: "Only HR users can access this endpoint" });
    }

    // Count active jobs (status = "Active")
    const activeJobs = await Job.countDocuments({ status: "Active" });

    // Count total applications
    const totalApplications = await Application.countDocuments();

    // Count scheduled interviews (status = "Scheduled")
    const interviewsScheduled = await Interview.countDocuments({ status: "Scheduled" });

    // Count all offers released
    const offersReleased = await Offer.countDocuments();

    return res.status(200).json({
      activeJobs,
      totalApplications,
      interviewsScheduled,
      offersReleased,
    });
  } catch (error) {
    console.error("Error in getHRDashboard:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getHRDashboard,
};

