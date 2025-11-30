const express = require("express");
const {
  createLeaveRequest,
  getStudentLeaveRequests,
  getFacultyLeaveRequests,
  updateLeaveStatus,
} = require("../controllers/leaveController");
const { verifyToken, roleCheck } = require("../middleware/authMiddleware");
const uploadFile = require("../middleware/uploadMiddleware");

const router = express.Router();

// student: create leave request (with file upload)
router.post(
  "/",
  verifyToken,
  roleCheck("student"),
  uploadFile,
  createLeaveRequest
);

// student: get own leave requests
router.get(
  "/student",
  verifyToken,
  roleCheck("student"),
  getStudentLeaveRequests
);

// faculty: get all leave requests
router.get(
  "/faculty",
  verifyToken,
  roleCheck("faculty"),
  getFacultyLeaveRequests
);

// faculty: update leave request status
router.patch(
  "/:id/status",
  verifyToken,
  roleCheck("faculty"),
  updateLeaveStatus
);

module.exports = router;

