const express = require("express");
const {
  createJob,
  listJobs,
  getJobById,
  updateJob,
  updateJobStatus,
  deleteJob,
  applyToJob,
  getMyApplications,
  getJobApplications,
  getAllApplicationsForHr,
  updateApplicationStatus,
  scheduleInterview,
  getMyInterviews,
  sendOffer,
  getMyOffers,
  getHrOffers,
  uploadResume,
  getMyResume,
  getHrInterviews,
} = require("../controllers/placementController");
const { verifyToken, roleCheck } = require("../middleware/authMiddleware");
const { resumeUpload, offerUpload } = require("../middleware/placementUploadMiddleware");

const router = express.Router();

// Jobs
router.get("/jobs", verifyToken, listJobs);
router.get("/jobs/:id", verifyToken, getJobById);
router.post("/jobs", verifyToken, roleCheck("hr", "admin"), createJob);
router.patch("/jobs/:id", verifyToken, roleCheck("hr", "admin"), updateJob);
router.patch("/jobs/:id/status", verifyToken, roleCheck("hr", "admin"), updateJobStatus);
router.delete("/jobs/:id", verifyToken, roleCheck("hr", "admin"), deleteJob);

// Applications
router.post(
  "/jobs/:jobId/apply",
  verifyToken,
  roleCheck("student"),
  resumeUpload,
  applyToJob
);
router.get(
  "/applications/me",
  verifyToken,
  roleCheck("student"),
  getMyApplications
);
router.get(
  "/applications",
  verifyToken,
  roleCheck("hr", "admin"),
  getAllApplicationsForHr
);
router.get(
  "/jobs/:jobId/applications",
  verifyToken,
  roleCheck("hr", "admin"),
  getJobApplications
);
router.patch(
  "/applications/:id/status",
  verifyToken,
  roleCheck("hr", "admin"),
  updateApplicationStatus
);

// Interviews
router.post(
  "/applications/:id/interviews",
  verifyToken,
  roleCheck("hr", "admin"),
  scheduleInterview
);
router.get(
  "/interviews",
  verifyToken,
  roleCheck("hr", "admin"),
  getHrInterviews
);
router.get(
  "/interviews/me",
  verifyToken,
  roleCheck("student"),
  getMyInterviews
);

// Offers
router.post(
  "/applications/:id/offers",
  verifyToken,
  roleCheck("hr", "admin"),
  offerUpload,
  sendOffer
);
router.get(
  "/offers",
  verifyToken,
  roleCheck("hr", "admin"),
  getHrOffers
);
router.get("/offers/me", verifyToken, roleCheck("student"), getMyOffers);

// Resume
router.post("/resume", verifyToken, roleCheck("student"), resumeUpload, uploadResume);
router.get("/resume/me", verifyToken, roleCheck("student"), getMyResume);

module.exports = router;

