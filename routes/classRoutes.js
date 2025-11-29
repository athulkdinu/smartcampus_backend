const express = require("express");
const {
  createClass,
  assignClassTeacher,
  assignStudentsToClass,
  assignSubjectTeacher,
  getAllClasses,
  getClassDetails,
  getFacultyClasses,
} = require("../controllers/classController");
const { verifyToken, roleCheck } = require("../middleware/authMiddleware");

const router = express.Router();

// admin: create class
router.post("/", verifyToken, roleCheck("admin"), createClass);

// admin: list classes (for admin UI & dropdowns)
router.get("/all", verifyToken, getAllClasses);

// admin: class details
router.get("/:id", verifyToken, roleCheck("admin"), getClassDetails);

// admin: assign class teacher
router.put(
  "/assign-class-teacher",
  verifyToken,
  roleCheck("admin"),
  assignClassTeacher
);

// admin: assign students to class
router.put(
  "/assign-students",
  verifyToken,
  roleCheck("admin"),
  assignStudentsToClass
);

// admin: assign subject teacher
router.put(
  "/assign-subject",
  verifyToken,
  roleCheck("admin"),
  assignSubjectTeacher
);

// faculty: classes where this faculty is involved
router.get(
  "/faculty/my-classes",
  verifyToken,
  roleCheck("faculty"),
  getFacultyClasses
);

module.exports = router;


