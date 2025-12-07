const Skill = require("../models/Skill");
const User = require("../models/userModel");
const ClassModel = require("../models/classModel");

// POST /api/skills - Submit a skill (Student only)
const submitSkill = async (req, res) => {
  try {
    const studentId = req.user?.id;
    if (!studentId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const { title, provider, certificateUrl } = req.body;

    // Validation
    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }

    // Verify user is a student
    const student = await User.findById(studentId);
    if (!student || student.role !== "student") {
      return res.status(403).json({ message: "Only students can submit skills" });
    }

    // Create skill submission
    const newSkill = await Skill.create({
      student: studentId,
      title: title.trim(),
      provider: provider ? provider.trim() : null,
      certificateUrl: certificateUrl ? certificateUrl.trim() : null,
      status: "pending",
    });

    // Populate student info for response
    await newSkill.populate("student", "name email studentID");

    return res.status(201).json({
      message: "Skill submitted successfully",
      skill: newSkill,
    });
  } catch (error) {
    console.error("Error in submitSkill:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/skills/mine - Get my skills (Student only)
const getMySkills = async (req, res) => {
  try {
    const studentId = req.user?.id;
    if (!studentId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const skills = await Skill.find({ student: studentId })
      .populate("approvedBy", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      skills,
      count: skills.length,
    });
  } catch (error) {
    console.error("Error in getMySkills:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/skills - Get skills for faculty (Faculty only)
const getSkillsForFaculty = async (req, res) => {
  try {
    const facultyId = req.user?.id;
    if (!facultyId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    // Verify user is faculty
    const faculty = await User.findById(facultyId);
    if (!faculty || faculty.role !== "faculty") {
      return res.status(403).json({ message: "Only faculty can view student skills" });
    }

    // Find classes where faculty is assigned (class teacher or subject teacher)
    const facultyClasses = await ClassModel.find({
      $or: [
        { classTeacher: facultyId },
        { "subjects.teacher": facultyId },
      ],
    });

    // Get all student IDs from these classes
    const studentIds = [];
    facultyClasses.forEach((cls) => {
      if (cls.students && cls.students.length > 0) {
        cls.students.forEach((studentId) => {
          if (!studentIds.includes(studentId.toString())) {
            studentIds.push(studentId.toString());
          }
        });
      }
    });

    // Also check students by className if available
    if (facultyClasses.length > 0) {
      const classNames = facultyClasses.map((cls) => cls.className);
      const studentsByClass = await User.find({
        role: "student",
        className: { $in: classNames },
      }).select("_id");
      studentsByClass.forEach((student) => {
        if (!studentIds.includes(student._id.toString())) {
          studentIds.push(student._id.toString());
        }
      });
    }

    if (studentIds.length === 0) {
      return res.status(200).json({
        skills: [],
        count: 0,
      });
    }

    // Find skills for these students
    const skills = await Skill.find({ student: { $in: studentIds } })
      .populate("student", "name email studentID className")
      .populate("approvedBy", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      skills,
      count: skills.length,
    });
  } catch (error) {
    console.error("Error in getSkillsForFaculty:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// PATCH /api/skills/:id/approve - Approve a skill (Faculty only)
const approveSkill = async (req, res) => {
  try {
    const facultyId = req.user?.id;
    if (!facultyId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    // Verify user is faculty
    const faculty = await User.findById(facultyId);
    if (!faculty || faculty.role !== "faculty") {
      return res.status(403).json({ message: "Only faculty can approve skills" });
    }

    const { id } = req.params;

    // Find skill
    const skill = await Skill.findById(id).populate("student", "name email studentID className");
    if (!skill) {
      return res.status(404).json({ message: "Skill not found" });
    }

    // Verify faculty can approve this skill (student must be in faculty's classes)
    const facultyClasses = await ClassModel.find({
      $or: [
        { classTeacher: facultyId },
        { "subjects.teacher": facultyId },
      ],
    });

    let canApprove = false;

    // Check if student is in any of faculty's classes
    if (skill.student && skill.student.className) {
      const studentClass = facultyClasses.find(
        (cls) => cls.className === skill.student.className
      );
      if (studentClass) {
        canApprove = true;
      }
    }

    // Also check if student ID is in any class's students array
    if (!canApprove) {
      for (const cls of facultyClasses) {
        if (cls.students && cls.students.some((sid) => sid.toString() === skill.student._id.toString())) {
          canApprove = true;
          break;
        }
      }
    }

    if (!canApprove) {
      return res.status(403).json({
        message: "You can only approve skills from students in your assigned classes",
      });
    }

    // Prevent self-approval (though students can't submit for themselves in this context)
    if (skill.student._id.toString() === facultyId.toString()) {
      return res.status(403).json({ message: "You cannot approve your own skills" });
    }

    // Update skill
    skill.status = "approved";
    skill.approvedBy = facultyId;
    skill.remarks = null; // Clear any previous rejection remarks

    await skill.save();

    // Populate for response
    await skill.populate("approvedBy", "name email");

    return res.status(200).json({
      message: "Skill approved successfully",
      skill,
    });
  } catch (error) {
    console.error("Error in approveSkill:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// PATCH /api/skills/:id/reject - Reject a skill (Faculty only)
const rejectSkill = async (req, res) => {
  try {
    const facultyId = req.user?.id;
    if (!facultyId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    // Verify user is faculty
    const faculty = await User.findById(facultyId);
    if (!faculty || faculty.role !== "faculty") {
      return res.status(403).json({ message: "Only faculty can reject skills" });
    }

    const { id } = req.params;
    const { remarks } = req.body;

    // Remarks are required for rejection
    if (!remarks || !remarks.trim()) {
      return res.status(400).json({ message: "Remarks are required when rejecting a skill" });
    }

    // Find skill
    const skill = await Skill.findById(id).populate("student", "name email studentID className");
    if (!skill) {
      return res.status(404).json({ message: "Skill not found" });
    }

    // Verify faculty can reject this skill (student must be in faculty's classes)
    const facultyClasses = await ClassModel.find({
      $or: [
        { classTeacher: facultyId },
        { "subjects.teacher": facultyId },
      ],
    });

    let canReject = false;

    // Check if student is in any of faculty's classes
    if (skill.student && skill.student.className) {
      const studentClass = facultyClasses.find(
        (cls) => cls.className === skill.student.className
      );
      if (studentClass) {
        canReject = true;
      }
    }

    // Also check if student ID is in any class's students array
    if (!canReject) {
      for (const cls of facultyClasses) {
        if (cls.students && cls.students.some((sid) => sid.toString() === skill.student._id.toString())) {
          canReject = true;
          break;
        }
      }
    }

    if (!canReject) {
      return res.status(403).json({
        message: "You can only reject skills from students in your assigned classes",
      });
    }

    // Update skill
    skill.status = "rejected";
    skill.approvedBy = facultyId;
    skill.remarks = remarks.trim();

    await skill.save();

    // Populate for response
    await skill.populate("approvedBy", "name email");

    return res.status(200).json({
      message: "Skill rejected",
      skill,
    });
  } catch (error) {
    console.error("Error in rejectSkill:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  submitSkill,
  getMySkills,
  getSkillsForFaculty,
  approveSkill,
  rejectSkill,
};

