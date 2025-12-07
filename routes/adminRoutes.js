const express = require("express");
const {
  createUserByAdmin,
  getAllUsers,
  getAllFaculty,
  getAdminUsers,
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

// admin get all faculty only - dedicated endpoint
router.get("/faculty", verifyToken, roleCheck("admin"), getAllFaculty);
router.get("/faculty-list", verifyToken, roleCheck("admin"), getAllFaculty); // Alias for consistency

// GET /api/admin/admins - Get admin users (accessible by faculty for messaging)
router.get("/admins", verifyToken, roleCheck("admin", "faculty", "hr"), getAdminUsers);

module.exports = router;


