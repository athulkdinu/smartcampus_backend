const express = require("express");
const {
  generateGradeSheet,
  getFacultyGradeSheets,
  getGradeSheet,
  updateStudentGrade,
  getStudentGrades,
} = require("../controllers/gradeController");
const { verifyToken, roleCheck } = require("../middleware/authMiddleware");

const router = express.Router();

// POST /api/grades/generate - Generate grade sheet (Faculty only)
router.post(
  "/generate",
  verifyToken,
  roleCheck("faculty"),
  generateGradeSheet
);

// GET /api/grades/faculty - Get grade sheets for faculty
router.get(
  "/faculty",
  verifyToken,
  roleCheck("faculty"),
  getFacultyGradeSheets
);

// GET /api/grades/student - Get grades for student
router.get(
  "/student",
  verifyToken,
  roleCheck("student"),
  getStudentGrades
);

// GET /api/grades/:gradeSheetId - Get single grade sheet
router.get(
  "/:gradeSheetId",
  verifyToken,
  getGradeSheet
);

// PUT /api/grades/:gradeSheetId/grade/:studentId - Update grade for student
router.put(
  "/:gradeSheetId/grade/:studentId",
  verifyToken,
  roleCheck("faculty"),
  updateStudentGrade
);

module.exports = router;













