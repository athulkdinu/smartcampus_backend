const express = require("express");
const router = express.Router();

const {
  createExam,
  addSubjectToExam,
  getExams,
  getExamById,
  deleteExam,
  deleteSubjectFromExam,
} = require("../controllers/examController");

// Create a new exam
router.post("/", createExam);

// Get all exams
router.get("/", getExams);

// Get a single exam by ID
router.get("/:examId", getExamById);

// Add a subject to an exam
router.post("/:examId/subjects", addSubjectToExam);

// Delete an exam
router.delete("/:examId", deleteExam);

// Delete a subject from an exam
router.delete("/:examId/subjects/:subjectId", deleteSubjectFromExam);

module.exports = router;

