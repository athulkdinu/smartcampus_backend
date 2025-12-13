const ClassModel = require("../models/classModel");
const Assignment = require("../models/assignmentModel");
const Submission = require("../models/submissionModel");
const Attendance = require("../models/attendanceModel");
const Leave = require("../models/leaveModel");
const Timetable = require("../models/Timetable");
const User = require("../models/userModel");

// GET /api/faculty/dashboard-summary - Get faculty dashboard summary statistics
const getFacultyDashboardSummary = async (req, res) => {
  try {
    const facultyId = req.user?.id;
    if (!facultyId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    // Verify user is faculty
    const faculty = await User.findById(facultyId).select("role");
    if (!faculty || faculty.role !== "faculty") {
      return res.status(403).json({ message: "Only faculty can access this endpoint" });
    }

    // 1. Count assigned classes (where faculty is classTeacher or teaches a subject)
    const classesAsClassTeacher = await ClassModel.countDocuments({
      classTeacher: facultyId,
    });

    const classesAsSubjectTeacher = await ClassModel.countDocuments({
      "subjects.teacher": facultyId,
    });

    // Get unique class IDs to avoid double counting
    const classTeacherClasses = await ClassModel.find({
      classTeacher: facultyId,
    }).select("_id");

    const subjectTeacherClasses = await ClassModel.find({
      "subjects.teacher": facultyId,
    }).select("_id");

    const allClassIds = new Set();
    classTeacherClasses.forEach((c) => allClassIds.add(c._id.toString()));
    subjectTeacherClasses.forEach((c) => allClassIds.add(c._id.toString()));

    const assignedClasses = allClassIds.size;

    // 2. Count unique subjects handled by faculty
    const classesWithSubjects = await ClassModel.find({
      $or: [{ classTeacher: facultyId }, { "subjects.teacher": facultyId }],
    }).select("subjects");

    const subjectsSet = new Set();
    classesWithSubjects.forEach((classDoc) => {
      classDoc.subjects.forEach((subject) => {
        if (subject.teacher && subject.teacher.toString() === facultyId.toString()) {
          subjectsSet.add(subject.name);
        }
      });
    });

    const subjectsHandled = subjectsSet.size;

    // 3. Count total assignments created by faculty
    const totalAssignments = await Assignment.countDocuments({
      facultyId: facultyId,
    });

    // 4. Count pending grading (submissions with status "Pending" for faculty's assignments)
    const facultyAssignments = await Assignment.find({
      facultyId: facultyId,
    }).select("_id");

    const assignmentIds = facultyAssignments.map((a) => a._id);

    const pendingGrading = await Submission.countDocuments({
      assignmentId: { $in: assignmentIds },
      status: "Pending",
    });

    // 5. Count today's classes from timetable
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayTimetables = await Timetable.find({
      "slots.faculty": facultyId,
    }).select("slots");

    let todayClasses = 0;
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const todayDayName = dayNames[today.getDay()];

    todayTimetables.forEach((timetable) => {
      timetable.slots.forEach((slot) => {
        if (
          slot.faculty &&
          slot.faculty.toString() === facultyId.toString() &&
          slot.day === todayDayName
        ) {
          todayClasses++;
        }
      });
    });

    // 6. Get recent activities (max 5)
    const recentActivities = [];

    // Recent assignments created (last 5)
    const recentAssignments = await Assignment.find({
      facultyId: facultyId,
    })
      .sort({ createdAt: -1 })
      .limit(3)
      .select("title createdAt")
      .lean();

    recentAssignments.forEach((assignment) => {
      const timeAgo = getTimeAgo(assignment.createdAt);
      recentActivities.push({
        type: "assignment",
        text: `Assignment "${assignment.title}" created`,
        time: timeAgo,
        path: "/faculty/assignments",
      });
    });

    // Recent attendance marked (last 5)
    const recentAttendance = await Attendance.find({
      "records.studentId": { $exists: true },
    })
      .sort({ createdAt: -1 })
      .limit(2)
      .select("date subject createdAt")
      .lean();

    recentAttendance.forEach((attendance) => {
      const timeAgo = getTimeAgo(attendance.createdAt);
      recentActivities.push({
        type: "attendance",
        text: `Attendance marked for ${attendance.subject || "class"}`,
        time: timeAgo,
        path: "/faculty/attendance",
      });
    });

    // Recent leave reviews (last 5)
    const recentLeaves = await Leave.find({
      reviewedBy: facultyId,
    })
      .sort({ reviewedAt: -1 })
      .limit(2)
      .select("status reviewedAt")
      .lean();

    recentLeaves.forEach((leave) => {
      const timeAgo = getTimeAgo(leave.reviewedAt);
      recentActivities.push({
        type: "leave",
        text: `Leave request ${leave.status}`,
        time: timeAgo,
        path: "/faculty/leave-requests",
      });
    });

    // Sort by time (most recent first) and limit to 5
    // Activities are already sorted by createdAt descending from queries
    const limitedActivities = recentActivities.slice(0, 5);

    return res.status(200).json({
      assignedClasses: assignedClasses || 0,
      subjectsHandled: subjectsHandled || 0,
      totalAssignments: totalAssignments || 0,
      pendingGrading: pendingGrading || 0,
      todayClasses: todayClasses || 0,
      recentActivities: limitedActivities || [],
    });
  } catch (error) {
    console.error("Error in getFacultyDashboardSummary:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Helper function to calculate time ago
const getTimeAgo = (date) => {
  if (!date) return "recently";
  const now = new Date();
  const past = new Date(date);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return `${diffMins} minutes ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hours ago`;
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return new Date(date).toLocaleDateString();
  }
};

module.exports = {
  getFacultyDashboardSummary,
};

