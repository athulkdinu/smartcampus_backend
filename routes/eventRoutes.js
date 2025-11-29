const express = require("express");
const { createEvent } = require("../controllers/eventController");
const { verifyToken, roleCheck } = require("../middleware/authMiddleware");

const router = express.Router();

// create event - allowed for student, faculty, admin
router.post(
  "/",
  verifyToken,
  roleCheck("student", "faculty", "admin"),
  createEvent
);

module.exports = router;


