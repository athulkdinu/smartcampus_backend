const express = require("express");
const { updateProfile } = require("../controllers/authController");
const { getStudentAttendanceSummary } = require("../controllers/attendanceController");
const { getStudentDashboardSummary } = require("../controllers/studentDashboardController");
const { verifyToken, roleCheck } = require("../middleware/authMiddleware");

const router = express.Router();

// update class / profile for student
router.put("/update-class", verifyToken, roleCheck("student"), updateProfile);

// GET /api/student/attendance/summary - Get student attendance summary
router.get("/attendance/summary", verifyToken, roleCheck("student"), getStudentAttendanceSummary);

// GET /api/student/dashboard-summary - Get student dashboard summary statistics
router.get("/dashboard-summary", verifyToken, roleCheck("student"), getStudentDashboardSummary);

module.exports = router;


