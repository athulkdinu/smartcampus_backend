const SkillCourse = require("../models/SkillCourse");
const SkillEnrollment = require("../models/SkillEnrollment");
const SkillRound = require("../models/SkillRound");
const SkillProjectSubmission = require("../models/SkillProjectSubmission");

// Get all courses (for students) or courses created by faculty
const getCourses = async (req, res) => {
  try {
    const { mine, category, search } = req.query;
    let query = { status: "Published" };

    if (mine === "true" && (req.user.role === "faculty" || req.user.role === "admin")) {
      query = { createdBy: req.user.id };
    }

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { shortDesc: { $regex: search, $options: "i" } },
      ];
    }

    const courses = await SkillCourse.find(query)
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({ courses });
  } catch (error) {
    console.error("Error in getCourses:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get single course with rounds
const getCourse = async (req, res) => {
  try {
    const course = await SkillCourse.findById(req.params.id).populate("createdBy", "name");
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const rounds = await SkillRound.find({ course: course._id }).sort({ roundNumber: 1 });

    let enrollment = null;
    if (req.user.role === "student") {
      enrollment = await SkillEnrollment.findOne({
        course: course._id,
        student: req.user.id,
      });
    }

    return res.status(200).json({ course, rounds, enrollment });
  } catch (error) {
    console.error("Error in getCourse:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Create course (Faculty/Admin only)
const createCourse = async (req, res) => {
  try {
    const { title, shortDesc, longDesc, category, passThreshold } = req.body;

    if (!title || !shortDesc) {
      return res.status(400).json({ message: "Title and short description are required" });
    }

    const course = await SkillCourse.create({
      title,
      shortDesc,
      longDesc: longDesc || "",
      category: category || "General",
      passThreshold: passThreshold || 60,
      createdBy: req.user.id,
      status: "Draft",
    });

    await course.populate("createdBy", "name");
    return res.status(201).json({ message: "Course created", course });
  } catch (error) {
    console.error("Error in createCourse:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Update course
const updateCourse = async (req, res) => {
  try {
    const course = await SkillCourse.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (course.createdBy.toString() !== req.user.id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const { title, shortDesc, longDesc, category, passThreshold, status } = req.body;
    if (title) course.title = title;
    if (shortDesc) course.shortDesc = shortDesc;
    if (longDesc !== undefined) course.longDesc = longDesc;
    if (category) course.category = category;
    if (passThreshold) course.passThreshold = passThreshold;
    if (status) course.status = status;

    await course.save();
    await course.populate("createdBy", "name");
    return res.status(200).json({ message: "Course updated", course });
  } catch (error) {
    console.error("Error in updateCourse:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Delete course
const deleteCourse = async (req, res) => {
  try {
    const course = await SkillCourse.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (course.createdBy.toString() !== req.user.id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    await SkillRound.deleteMany({ course: course._id });
    await SkillEnrollment.deleteMany({ course: course._id });
    await SkillProjectSubmission.deleteMany({ course: course._id });
    await course.deleteOne();

    return res.status(200).json({ message: "Course deleted" });
  } catch (error) {
    console.error("Error in deleteCourse:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Enroll in course (Student only)
const enrollInCourse = async (req, res) => {
  try {
    const course = await SkillCourse.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (course.status !== "Published") {
      return res.status(400).json({ message: "Course is not published" });
    }

    const existing = await SkillEnrollment.findOne({
      course: course._id,
      student: req.user.id,
    });

    if (existing) {
      return res.status(400).json({ message: "Already enrolled" });
    }

    const enrollment = await SkillEnrollment.create({
      course: course._id,
      student: req.user.id,
    });

    return res.status(201).json({ message: "Enrolled successfully", enrollment });
  } catch (error) {
    console.error("Error in enrollInCourse:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Unenroll from course
const unenrollFromCourse = async (req, res) => {
  try {
    const enrollment = await SkillEnrollment.findOne({
      course: req.params.id,
      student: req.user.id,
    });

    if (!enrollment) {
      return res.status(404).json({ message: "Not enrolled" });
    }

    await SkillProjectSubmission.deleteMany({ enrollment: enrollment._id });
    await enrollment.deleteOne();

    return res.status(200).json({ message: "Unenrolled successfully" });
  } catch (error) {
    console.error("Error in unenrollFromCourse:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get enrollment progress
const getProgress = async (req, res) => {
  try {
    const enrollment = await SkillEnrollment.findOne({
      course: req.params.id,
      student: req.user.id,
    })
      .populate("course", "title passThreshold")
      .populate("student", "name");

    if (!enrollment) {
      return res.status(404).json({ message: "Not enrolled" });
    }

    const projectSubmission = await SkillProjectSubmission.findOne({
      course: req.params.id,
      student: req.user.id,
    });

    return res.status(200).json({ enrollment, projectSubmission });
  } catch (error) {
    console.error("Error in getProgress:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  enrollInCourse,
  unenrollFromCourse,
  getProgress,
};



