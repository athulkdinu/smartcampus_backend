const express = require("express");
const {
  markSubjectAttendance,
  getClassSubjectAttendance,
  markAttendance, // Old endpoint for backward compatibility
  getClassAttendanceForDate, // Old endpoint for backward compatibility
} = require("../controllers/attendanceController");
const { verifyToken, roleCheck } = require("../middleware/authMiddleware");

const router = express.Router();

// POST /api/attendance/mark-subject - Mark attendance for a specific subject (faculty only)
router.post("/mark-subject", verifyToken, roleCheck("faculty"), markSubjectAttendance);

// GET /api/attendance/class-subject - Get attendance for class + subject + date (faculty only)
router.get("/class-subject", verifyToken, roleCheck("faculty"), getClassSubjectAttendance);

// Old endpoints (for backward compatibility - will be removed later)
router.post("/mark", verifyToken, roleCheck("faculty"), markAttendance);
router.get(
  "/class/:classId",
  verifyToken,
  roleCheck("faculty"),
  getClassAttendanceForDate
);

module.exports = router;

