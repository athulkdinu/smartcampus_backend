const express = require("express");
const {
  registerUser,
  loginUser,
  getMe,
  updateProfile,
} = require("../controllers/authController");
const { verifyToken, roleCheck } = require("../middleware/authMiddleware");

const router = express.Router();

// auth routes
router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", verifyToken, getMe);
router.put(
  "/update-profile",
  verifyToken,
  roleCheck("student"),
  updateProfile
);

module.exports = router;
