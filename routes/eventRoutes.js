const express = require("express");
const {
  createEvent,
  getStudentApprovedEvents,
  getStudentProposals,
  getStudentEvents,
  getFacultyRequests,
  updateEventStatus,
  getAdminEvents,
} = require("../controllers/eventController");
const { verifyToken, roleCheck } = require("../middleware/authMiddleware");

const router = express.Router();

// create event - allowed for student, faculty, admin
router.post(
  "/",
  verifyToken,
  roleCheck("student", "faculty", "admin"),
  createEvent
);

// student: approved events and own proposals
router.get(
  "/student/approved",
  verifyToken,
  roleCheck("student"),
  getStudentApprovedEvents
);
router.get(
  "/student/proposals",
  verifyToken,
  roleCheck("student"),
  getStudentProposals
);
// student: get all own events (all statuses)
router.get(
  "/my-events",
  verifyToken,
  roleCheck("student"),
  getStudentEvents
);
// student: get approved events (alternative route)
router.get(
  "/approved",
  verifyToken,
  roleCheck("student"),
  getStudentApprovedEvents
);

// faculty: student-originated requests
router.get(
  "/faculty/requests",
  verifyToken,
  roleCheck("faculty"),
  getFacultyRequests
);

// faculty/admin: update status or forward
router.patch(
  "/:id/status",
  verifyToken,
  roleCheck("faculty", "admin"),
  updateEventStatus
);

// admin: forwarded from faculty + admin created
router.get(
  "/admin",
  verifyToken,
  roleCheck("admin"),
  getAdminEvents
);

module.exports = router;


