const User = require("../models/userModel");
const Attendance = require("../models/attendanceModel");
const Skill = require("../models/Skill");
const SkillEnrollment = require("../models/SkillEnrollment");
const Application = require("../models/Application");
const Assignment = require("../models/assignmentModel");
const Submission = require("../models/submissionModel");
const Leave = require("../models/leaveModel");
const ClassModel = require("../models/classModel");

// GET /api/student/dashboard-summary - Get student dashboard summary statistics
const getStudentDashboardSummary = async (req, res) => {
  try {
    const studentId = req.user?.id;
    if (!studentId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    // Verify user is a student
    const student = await User.findById(studentId).select("role className");
    if (!student || student.role !== "student") {
      return res.status(403).json({ message: "Only students can access this endpoint" });
    }

    // 1. Calculate Attendance Percentage
    const attendanceRecords = await Attendance.find({
      "records.studentId": studentId,
    }).select("records").lean();

    let totalClasses = 0;
    let presentCount = 0;

    attendanceRecords.forEach((record) => {
      const studentRecord = record.records.find(
        (r) => r.studentId.toString() === studentId.toString()
      );
      if (studentRecord) {
        totalClasses++;
        if (studentRecord.status === "present") {
          presentCount++;
        }
      }
    });

    const attendancePercentage = totalClasses > 0 
      ? Math.round((presentCount / totalClasses) * 100) 
      : 0;

    // 2. Count Skills Completed
    // Count approved skills + completed skill enrollments
    const approvedSkills = await Skill.countDocuments({
      student: studentId,
      status: "approved",
    });

    const completedEnrollments = await SkillEnrollment.countDocuments({
      student: studentId,
      "progress.completed": true,
    });

    const skillsCompleted = approvedSkills + completedEnrollments;

    // 3. Count Placements Applied
    const placementsApplied = await Application.countDocuments({
      student: studentId,
    });

    // 4. Count Pending Assignments
    // Get student's class
    let pendingAssignments = 0;
    if (student.className) {
      const classDoc = await ClassModel.findOne({ className: student.className });
      if (classDoc) {
        // Get all published assignments for this class
        const assignments = await Assignment.find({
          classId: classDoc._id,
          status: "Published",
        }).select("_id");

        // For each assignment, check if student has pending submission
        for (const assignment of assignments) {
          const submission = await Submission.findOne({
            assignmentId: assignment._id,
            studentId: studentId,
          }).sort({ submittedAt: -1 });

          // If no submission OR submission status is Pending/Rework, it's pending
          if (!submission || submission.status === "Pending" || submission.status === "Rework") {
            pendingAssignments++;
          }
        }
      }
    }

    // 5. Count Leave Approved
    const leaveApproved = await Leave.countDocuments({
      student: studentId,
      status: "approved",
    });

    return res.status(200).json({
      attendancePercentage: attendancePercentage || 0,
      skillsCompleted: skillsCompleted || 0,
      placementsApplied: placementsApplied || 0,
      pendingAssignments: pendingAssignments || 0,
      leaveApproved: leaveApproved || 0,
    });
  } catch (error) {
    console.error("Error in getStudentDashboardSummary:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getStudentDashboardSummary,
};

