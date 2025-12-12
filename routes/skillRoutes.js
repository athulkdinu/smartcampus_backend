const express = require("express");
const {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  enrollInCourse,
  unenrollFromCourse,
  getProgress,
} = require("../controllers/skillCourseController");
const {
  createOrUpdateRound,
  submitQuiz,
  completeRound1,
} = require("../controllers/skillRoundController");
const {
  submitProject,
  getProjectSubmissions,
  reviewProject,
  getCourseEnrollments,
} = require("../controllers/skillProjectController");
const {
  submitSkill,
  getMySkills,
  getSkillsForFaculty,
  approveSkill,
  rejectSkill,
} = require("../controllers/skillController");
const { verifyToken, roleCheck } = require("../middleware/authMiddleware");
const { projectUpload } = require("../middleware/skillUploadMiddleware");

const router = express.Router();

// Skill Validation Routes (Student submissions for faculty approval)
router.post("/", verifyToken, roleCheck(["student"]), submitSkill);
router.get("/mine", verifyToken, roleCheck(["student"]), getMySkills);
router.get("/", verifyToken, roleCheck(["faculty", "admin"]), getSkillsForFaculty);
router.patch("/:id/approve", verifyToken, roleCheck(["faculty", "admin"]), approveSkill);
router.patch("/:id/reject", verifyToken, roleCheck(["faculty", "admin"]), rejectSkill);

// Courses
router.get("/courses", verifyToken, getCourses);
router.get("/courses/:id", verifyToken, getCourse);
router.post("/courses", verifyToken, roleCheck(["faculty", "admin"]), createCourse);
router.put("/courses/:id", verifyToken, roleCheck(["faculty", "admin"]), updateCourse);
router.delete("/courses/:id", verifyToken, roleCheck(["faculty", "admin"]), deleteCourse);

// Enrollment
router.post("/courses/:id/enroll", verifyToken, roleCheck(["student"]), enrollInCourse);
router.delete("/courses/:id/enroll", verifyToken, roleCheck(["student"]), unenrollFromCourse);
router.get("/courses/:id/progress", verifyToken, roleCheck(["student"]), getProgress);

// Rounds
router.post("/courses/:courseId/rounds", verifyToken, roleCheck(["faculty", "admin"]), createOrUpdateRound);
router.post("/courses/:courseId/rounds/1/complete", verifyToken, roleCheck(["student"]), completeRound1);
router.post("/courses/:courseId/rounds/:roundNumber/quiz", verifyToken, roleCheck(["student"]), submitQuiz);

// Projects
router.post("/courses/:courseId/project", verifyToken, roleCheck(["student"]), projectUpload, submitProject);
router.get("/courses/:courseId/projects", verifyToken, roleCheck(["faculty", "admin"]), getProjectSubmissions);
router.put("/projects/:id/review", verifyToken, roleCheck(["faculty", "admin"]), reviewProject);

// Enrollments (Faculty view)
router.get("/courses/:courseId/enrollments", verifyToken, roleCheck(["faculty", "admin"]), getCourseEnrollments);

module.exports = router;
