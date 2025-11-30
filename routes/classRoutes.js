const express = require("express");
const {
  createClass,
  getAllClasses,
  getFacultyList,
  assignTeacher,
  assignFaculty,
  assignStudent,
  getClassDetails,
  getClassStudents,
} = require("../controllers/classController");
const { verifyToken, roleCheck } = require("../middleware/authMiddleware");

const router = express.Router();

// POST /api/classes - Create new class
router.post("/", verifyToken, roleCheck("admin"), createClass);

// GET /api/classes - Get all classes
router.get("/", verifyToken, roleCheck("admin"), getAllClasses);

// GET /api/classes/faculty-list - Get all faculty (must come before /:classId)
router.get("/faculty-list", verifyToken, roleCheck("admin"), getFacultyList);

// GET /api/classes/:classId/students - Get all students in class (admin + faculty)
router.get("/:classId/students", verifyToken, roleCheck("admin", "faculty"), getClassStudents);

// PUT /api/classes/:classId/assign-teacher - Assign class teacher
router.put("/:classId/assign-teacher", verifyToken, roleCheck("admin"), assignTeacher);

// PUT /api/classes/:classId/assign-faculty - Assign faculty to subject
router.put("/:classId/assign-faculty", verifyToken, roleCheck("admin"), assignFaculty);

// PUT /api/classes/:classId/assign-student - Assign student to class
router.put("/:classId/assign-student", verifyToken, roleCheck("admin"), assignStudent);

// GET /api/classes/:classId - Get class details (must come last)
router.get("/:classId", verifyToken, roleCheck("admin"), getClassDetails);

module.exports = router;
