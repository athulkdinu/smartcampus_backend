const express = require("express");
const { getFacultyClasses, getFacultyClassesWithSubjects } = require("../controllers/classController");
const { getFacultyDashboardSummary } = require("../controllers/facultyDashboardController");
const { verifyToken, roleCheck } = require("../middleware/authMiddleware");

const router = express.Router();

// GET /api/faculty/classes - Get classes assigned to faculty
router.get("/classes", verifyToken, roleCheck("faculty"), getFacultyClasses);

// GET /api/faculty/classes-with-subjects - Get classes with only subjects faculty teaches
router.get("/classes-with-subjects", verifyToken, roleCheck("faculty"), getFacultyClassesWithSubjects);

// GET /api/faculty/dashboard-summary - Get faculty dashboard summary statistics
router.get("/dashboard-summary", verifyToken, roleCheck("faculty"), getFacultyDashboardSummary);

module.exports = router;

