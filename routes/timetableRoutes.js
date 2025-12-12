const express = require("express");
const {
  createOrUpdateTimetable,
  getTimetable,
  getTodayClasses,
  getFacultyClasses,
} = require("../controllers/timetableController");
const { verifyToken, roleCheck } = require("../middleware/authMiddleware");

const router = express.Router();

// POST /api/timetable - Create or update timetable (Faculty/Admin only)
router.post(
  "/",
  verifyToken,
  roleCheck("faculty", "admin"),
  createOrUpdateTimetable
);

// GET /api/timetable/today - Get today's classes (Student only) - Must come before /:classId
router.get("/today", verifyToken, roleCheck("student"), getTodayClasses);

// GET /api/timetable/faculty/my-classes - Get classes faculty can manage
router.get(
  "/faculty/my-classes",
  verifyToken,
  roleCheck("faculty"),
  getFacultyClasses
);

// GET /api/timetable/:classId - Get timetable for a class
router.get("/:classId", verifyToken, getTimetable);

module.exports = router;

