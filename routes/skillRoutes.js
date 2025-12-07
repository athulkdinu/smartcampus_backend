const express = require("express");
const { verifyToken, roleCheck } = require("../middleware/authMiddleware");
const {
  submitSkill,
  getMySkills,
  getSkillsForFaculty,
  approveSkill,
  rejectSkill,
} = require("../controllers/skillController");

const router = express.Router();

// POST /api/skills - Submit a skill (Student only)
router.post("/", verifyToken, roleCheck("student"), submitSkill);

// GET /api/skills/mine - Get my skills (Student only)
router.get("/mine", verifyToken, roleCheck("student"), getMySkills);

// GET /api/skills - Get skills for faculty (Faculty only)
router.get("/", verifyToken, roleCheck("faculty"), getSkillsForFaculty);

// PATCH /api/skills/:id/approve - Approve a skill (Faculty only)
router.patch("/:id/approve", verifyToken, roleCheck("faculty"), approveSkill);

// PATCH /api/skills/:id/reject - Reject a skill (Faculty only)
router.patch("/:id/reject", verifyToken, roleCheck("faculty"), rejectSkill);

module.exports = router;

