const express = require("express");
const {
  createUserByAdmin,
  getAllUsers,
} = require("../controllers/adminController");
const { verifyToken, roleCheck } = require("../middleware/authMiddleware");

const router = express.Router();

// admin create user
router.post(
  "/create-user",
  verifyToken,
  roleCheck("admin"),
  createUserByAdmin
);

// admin get all users
router.get("/users", verifyToken, roleCheck("admin"), getAllUsers);

module.exports = router;


