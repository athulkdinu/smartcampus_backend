const express = require("express");
const { verifyToken, roleCheck } = require("../middleware/authMiddleware");
const {
  sendMessage,
  getInbox,
  getSent,
} = require("../controllers/communicationController");

const router = express.Router();

// POST /api/communication/send - Send a message
// Accessible by: admin, faculty, hr (NOT student)
router.post(
  "/send",
  verifyToken,
  roleCheck("admin", "faculty", "hr"),
  sendMessage
);

// GET /api/communication/inbox - Get inbox messages
// Accessible by: all roles
router.get("/inbox", verifyToken, getInbox);

// GET /api/communication/sent - Get sent messages
// Accessible by: all roles
router.get("/sent", verifyToken, getSent);

module.exports = router;

