const express = require("express");
const { createUserByAdmin } = require("../controllers/adminController");
const { verifyToken, roleCheck } = require("../middleware/authMiddleware");

const router = express.Router();

// admin create user
router.post(
  "/create-user",
  verifyToken,
  roleCheck("admin"),
  createUserByAdmin
);

module.exports = router;


