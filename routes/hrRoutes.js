const express = require("express");
const { getHRDashboard } = require("../controllers/hrDashboardController");
const { verifyToken, roleCheck } = require("../middleware/authMiddleware");

const router = express.Router();

// GET /api/hr/dashboard - Get HR dashboard statistics
router.get("/dashboard", verifyToken, roleCheck("hr"), getHRDashboard);

module.exports = router;

