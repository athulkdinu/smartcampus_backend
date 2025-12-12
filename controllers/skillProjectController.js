const SkillProjectSubmission = require("../models/SkillProjectSubmission");
const SkillEnrollment = require("../models/SkillEnrollment");
const SkillCourse = require("../models/SkillCourse");

// Submit project (Round 3)
const submitProject = async (req, res) => {
  try {
    const enrollment = await SkillEnrollment.findOne({
      course: req.params.courseId,
      student: req.user.id,
    });

    if (!enrollment) {
      return res.status(404).json({ message: "Not enrolled" });
    }

    if (!enrollment.progress.round2Completed) {
      return res.status(400).json({ message: "Complete Round 2 first" });
    }

    const { description } = req.body;
    let projectFileUrl = "";
    let projectFileName = "";

    if (req.file) {
      projectFileUrl = `/uploads/skill-projects/${req.file.filename}`;
      projectFileName = req.file.originalname;
    }

    const course = await SkillCourse.findById(req.params.courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Delete old submission if exists
    await SkillProjectSubmission.deleteMany({
      course: course._id,
      student: req.user.id,
    });

    const submission = await SkillProjectSubmission.create({
      course: course._id,
      enrollment: enrollment._id,
      student: req.user.id,
      projectFileUrl,
      projectFileName,
      description: description || "",
      status: "Pending",
    });

    return res.status(201).json({ message: "Project submitted", submission });
  } catch (error) {
    console.error("Error in submitProject:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get project submissions for a course (Faculty)
const getProjectSubmissions = async (req, res) => {
  try {
    const course = await SkillCourse.findById(req.params.courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (course.createdBy.toString() !== req.user.id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const submissions = await SkillProjectSubmission.find({
      course: course._id,
    })
      .populate("student", "name email")
      .populate("enrollment")
      .sort({ createdAt: -1 });

    return res.status(200).json({ submissions });
  } catch (error) {
    console.error("Error in getProjectSubmissions:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Review project (Approve/Reject/Rework)
const reviewProject = async (req, res) => {
  try {
    const { status, feedback } = req.body;

    if (!["Approved", "Rejected", "Rework"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const submission = await SkillProjectSubmission.findById(req.params.id)
      .populate("course")
      .populate("enrollment");

    if (!submission) {
      return res.status(404).json({ message: "Submission not found" });
    }

    const course = await SkillCourse.findById(submission.course._id);
    if (course.createdBy.toString() !== req.user.id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    submission.status = status;
    submission.feedback = feedback || "";
    submission.reviewedBy = req.user.id;
    await submission.save();

    // If approved, unlock Round 4
    if (status === "Approved") {
      submission.enrollment.progress.round3Approved = true;
      await submission.enrollment.save();
    }

    return res.status(200).json({ message: `Project ${status.toLowerCase()}`, submission });
  } catch (error) {
    console.error("Error in reviewProject:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get enrollments for a course (Faculty)
const getCourseEnrollments = async (req, res) => {
  try {
    const course = await SkillCourse.findById(req.params.courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (course.createdBy.toString() !== req.user.id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const enrollments = await SkillEnrollment.find({ course: course._id })
      .populate("student", "name email")
      .sort({ createdAt: -1 });

    const submissions = await SkillProjectSubmission.find({
      course: course._id,
    })
      .populate("student", "name");

    return res.status(200).json({ enrollments, submissions });
  } catch (error) {
    console.error("Error in getCourseEnrollments:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  submitProject,
  getProjectSubmissions,
  reviewProject,
  getCourseEnrollments,
};



