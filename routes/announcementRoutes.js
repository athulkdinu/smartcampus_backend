const express = require("express");
const {
  createAnnouncement,
  getAllAnnouncements,
  getStudentAnnouncements,
  getFacultyAnnouncements,
  deleteAnnouncement,
  updateAnnouncement,
} = require("../controllers/announcementController");
const { verifyToken, roleCheck } = require("../middleware/authMiddleware");

const router = express.Router();

// POST /api/announcements/create - Create announcement (Faculty/Admin only)
router.post("/create", verifyToken, roleCheck("faculty", "admin"), createAnnouncement);

// GET /api/announcements/all - Get all announcements (Admin only)
router.get("/all", verifyToken, roleCheck("admin"), getAllAnnouncements);

// GET /api/announcements/student - Get announcements for student
router.get("/student", verifyToken, roleCheck("student"), getStudentAnnouncements);

// GET /api/announcements/faculty - Get announcements created by faculty
router.get("/faculty", verifyToken, roleCheck("faculty"), getFacultyAnnouncements);

// DELETE /api/announcements/:id - Delete announcement
router.delete("/:id", verifyToken, roleCheck("faculty", "admin"), deleteAnnouncement);

// PUT /api/announcements/:id - Update announcement
router.put("/:id", verifyToken, roleCheck("faculty", "admin"), updateAnnouncement);

module.exports = router;

