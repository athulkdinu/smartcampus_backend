const express = require("express");
const {
  createLectureMaterial,
  getFacultyLectures,
  getStudentLectures,
  deleteLectureMaterial,
} = require("../controllers/lectureController");
const { verifyToken, roleCheck } = require("../middleware/authMiddleware");
const lectureUpload = require("../middleware/lectureUploadMiddleware");

const router = express.Router();

// POST /api/lectures - Create lecture material (Faculty only)
router.post(
  "/",
  verifyToken,
  roleCheck("faculty"),
  lectureUpload, // Multer middleware for file upload
  createLectureMaterial
);

// GET /api/lectures/faculty - Get lecture materials for faculty
router.get(
  "/faculty",
  verifyToken,
  roleCheck("faculty"),
  getFacultyLectures
);

// GET /api/lectures/student - Get lecture materials for student
router.get(
  "/student",
  verifyToken,
  roleCheck("student"),
  getStudentLectures
);

// DELETE /api/lectures/:id - Delete lecture material (Faculty only)
router.delete(
  "/:id",
  verifyToken,
  roleCheck("faculty"),
  deleteLectureMaterial
);

module.exports = router;

