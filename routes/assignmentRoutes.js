const express = require("express");
const {
  createAssignment,
  getFacultyAssignments,
  getStudentAssignments,
  getAssignmentDetails,
  submitAssignment,
  getAssignmentSubmissions,
  updateSubmissionStatus,
} = require("../controllers/assignmentController");
const { verifyToken, roleCheck } = require("../middleware/authMiddleware");
const assignmentUpload = require("../middleware/assignmentUploadMiddleware");

const router = express.Router();

// POST /api/assignments - Create assignment (Faculty only)
router.post(
  "/",
  verifyToken,
  roleCheck("faculty"),
  createAssignment
);

// GET /api/assignments/faculty - Get faculty's assignments
router.get(
  "/faculty",
  verifyToken,
  roleCheck("faculty"),
  getFacultyAssignments
);

// GET /api/assignments/student - Get assignments for student's class
router.get(
  "/student",
  verifyToken,
  roleCheck("student"),
  getStudentAssignments
);

// POST /api/assignments/:assignmentId/submit - Submit assignment (Student only)
router.post(
  "/:assignmentId/submit",
  verifyToken,
  roleCheck("student"),
  assignmentUpload, // Multer middleware for file upload
  submitAssignment
);

// GET /api/assignments/:assignmentId/submissions - Get submissions for assignment (Faculty only)
router.get(
  "/:assignmentId/submissions",
  verifyToken,
  roleCheck("faculty"),
  getAssignmentSubmissions
);

// PATCH /api/assignments/submissions/:submissionId/status - Update submission status (Faculty only)
router.patch(
  "/submissions/:submissionId/status",
  verifyToken,
  roleCheck("faculty"),
  updateSubmissionStatus
);

// GET /api/assignments/:assignmentId - Get assignment details (Student or Faculty)
// This must come last to avoid conflicts with /faculty, /student, and /submissions routes
router.get(
  "/:assignmentId",
  verifyToken,
  getAssignmentDetails
);

module.exports = router;

