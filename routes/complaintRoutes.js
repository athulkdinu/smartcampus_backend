const express = require("express");
const {
  // Student
  createStudentComplaint,
  getStudentComplaints,
  // Faculty
  getFacultyInbox,
  createFacultyComplaint,
  getFacultyComplaints,
  getAdminResolvedComplaints,
  facultyAction,
  // Admin
  getAdminInbox,
  adminAction,
  // Common
  getComplaintDetails,
} = require("../controllers/complaintController");
const { verifyToken, roleCheck } = require("../middleware/authMiddleware");

const router = express.Router();

// ============================================
// STUDENT ROUTES
// ============================================

// POST /api/complaints/student - Create complaint (Student only)
router.post(
  "/student",
  verifyToken,
  roleCheck("student"),
  createStudentComplaint
);

// GET /api/complaints/student - Get student's complaints
router.get(
  "/student",
  verifyToken,
  roleCheck("student"),
  getStudentComplaints
);

// ============================================
// FACULTY ROUTES
// ============================================

// GET /api/complaints/faculty/inbox - Get complaints from students (Faculty inbox)
router.get(
  "/faculty/inbox",
  verifyToken,
  roleCheck("faculty"),
  getFacultyInbox
);

// POST /api/complaints/faculty - Create complaint (Faculty to Admin)
router.post(
  "/faculty",
  verifyToken,
  roleCheck("faculty"),
  createFacultyComplaint
);

// GET /api/complaints/faculty/my-complaints - Get faculty's own complaints
router.get(
  "/faculty/my-complaints",
  verifyToken,
  roleCheck("faculty"),
  getFacultyComplaints
);

// GET /api/complaints/faculty/admin-resolved - Get admin-resolved complaints needing faculty action
router.get(
  "/faculty/admin-resolved",
  verifyToken,
  roleCheck("faculty"),
  getAdminResolvedComplaints
);

// PATCH /api/complaints/faculty/:id/action - Faculty action (resolve, reject, escalate, ack-admin-resolution)
router.patch(
  "/faculty/:id/action",
  verifyToken,
  roleCheck("faculty"),
  facultyAction
);

// ============================================
// ADMIN ROUTES
// ============================================

// GET /api/complaints/admin/inbox - Get admin's inbox
router.get(
  "/admin/inbox",
  verifyToken,
  roleCheck("admin"),
  getAdminInbox
);

// PATCH /api/complaints/admin/:id/action - Admin action (resolve, reject, comment)
router.patch(
  "/admin/:id/action",
  verifyToken,
  roleCheck("admin"),
  adminAction
);

// ============================================
// COMMON ROUTES
// ============================================

// GET /api/complaints/:id - Get complaint details (Student, Faculty, or Admin)
router.get(
  "/:id",
  verifyToken,
  getComplaintDetails
);

module.exports = router;

