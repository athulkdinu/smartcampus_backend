const express = require("express");
const { registerUser, loginUser, getMe } = require("../controllers/authController");
const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

// auth routes
router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", verifyToken, getMe);

module.exports = router;
