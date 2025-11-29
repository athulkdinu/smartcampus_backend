const express = require("express");
const { updateProfile } = require("../controllers/authController");
const { verifyToken, roleCheck } = require("../middleware/authMiddleware");

const router = express.Router();

// update class / profile for student
router.put("/update-class", verifyToken, roleCheck("student"), updateProfile);

module.exports = router;


