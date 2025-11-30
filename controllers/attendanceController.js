const Attendance = require("../models/attendanceModel");
const ClassModel = require("../models/classModel");
const User = require("../models/userModel");

// Helper to normalize date to start of day
const getStartOfDay = (date) => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

// POST /api/attendance/mark-subject - Mark attendance for a specific subject (faculty only)
const markSubjectAttendance = async (req, res) => {
  try {
    const facultyId = req.user?.id;
    if (!facultyId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const { classId, subjectName, date, records } = req.body;

    if (!classId || !subjectName || !date || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        message: "classId, subjectName, date, and records array are required",
      });
    }

    // Verify class exists
    const classDoc = await ClassModel.findById(classId).select("className department classTeacher subjects");
    if (!classDoc) {
      return res.status(404).json({ message: "Class not found" });
    }

    const facultyIdStr = facultyId.toString();
    const isClassTeacher = classDoc.classTeacher?.toString() === facultyIdStr;

    // Verify faculty is assigned to this class and subject
    if (!isClassTeacher) {
      const subjectExists = classDoc.subjects.some(
        (s) => s.name === subjectName && s.teacher?.toString() === facultyIdStr
      );
      if (!subjectExists) {
        return res.status(403).json({
          message: "You are not assigned to teach this subject in this class",
        });
      }
    } else {
      // Class teacher can teach any subject, but verify subject exists in class
      const subjectExists = classDoc.subjects.some((s) => s.name === subjectName);
      if (!subjectExists) {
        return res.status(400).json({
          message: "Subject does not exist in this class",
        });
      }
    }

    // Normalize date to start of day
    const attendanceDate = getStartOfDay(date);

    // Find or create attendance document
    const attendance = await Attendance.findOneAndUpdate(
      {
        classId,
        subjectName,
        date: attendanceDate,
        facultyId,
      },
      {
        classId,
        subjectName,
        date: attendanceDate,
        facultyId,
        records: records.map((r) => ({
          studentId: r.studentId,
          status: r.status || "present",
        })),
      },
      { upsert: true, new: true, runValidators: true }
    )
      .populate("classId", "className department")
      .populate("facultyId", "name email")
      .populate("records.studentId", "name email studentID");

    return res.status(200).json({
      message: "Attendance marked successfully",
      attendance,
    });
  } catch (error) {
    console.error("Error in markSubjectAttendance:", error);
    if (error.code === 11000) {
      return res.status(400).json({
        message: "Attendance for this class, subject, and date already exists",
      });
    }
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/attendance/class-subject - Get attendance for a class + subject + date
const getClassSubjectAttendance = async (req, res) => {
  try {
    const facultyId = req.user?.id;
    if (!facultyId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const { classId, subjectName, date } = req.query;

    if (!classId || !subjectName || !date) {
      return res.status(400).json({
        message: "classId, subjectName, and date query parameters are required",
      });
    }

    // Verify class exists and faculty is assigned
    const classDoc = await ClassModel.findById(classId).select("className department classTeacher subjects");
    if (!classDoc) {
      return res.status(404).json({ message: "Class not found" });
    }

    const facultyIdStr = facultyId.toString();
    const isClassTeacher = classDoc.classTeacher?.toString() === facultyIdStr;

    if (!isClassTeacher) {
      const subjectExists = classDoc.subjects.some(
        (s) => s.name === subjectName && s.teacher?.toString() === facultyIdStr
      );
      if (!subjectExists) {
        return res.status(403).json({
          message: "You are not assigned to teach this subject in this class",
        });
      }
    }

    // Normalize date to start of day
    const attendanceDate = getStartOfDay(date);

    const attendance = await Attendance.findOne({
      classId,
      subjectName,
      date: attendanceDate,
      facultyId,
    })
      .populate("records.studentId", "name email studentID")
      .populate("facultyId", "name email");

    if (!attendance) {
      return res.status(200).json({
        attendance: null,
        records: [],
      });
    }

    return res.status(200).json({
      attendance,
      records: attendance.records || [],
    });
  } catch (error) {
    console.error("Error in getClassSubjectAttendance:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/student/attendance/summary - Get student attendance summary by subject
const getStudentAttendanceSummary = async (req, res) => {
  try {
    const studentId = req.user?.id;
    if (!studentId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    // Verify user is a student
    const student = await User.findById(studentId).select("role");
    if (!student || student.role !== "student") {
      return res.status(403).json({ message: "Only students can view their attendance summary" });
    }

    // Find all attendance records where this student appears
    const attendanceRecords = await Attendance.find({
      "records.studentId": studentId,
    })
      .select("subjectName records date")
      .lean();

    // Group by subject
    const subjectMap = {};

    attendanceRecords.forEach((record) => {
      const studentRecord = record.records.find(
        (r) => r.studentId.toString() === studentId.toString()
      );
      if (studentRecord) {
        const subjectName = record.subjectName || "Unknown";
        if (!subjectMap[subjectName]) {
          subjectMap[subjectName] = {
            subjectName,
            totalClasses: 0,
            presentCount: 0,
            absentCount: 0,
            lateCount: 0,
          };
        }

        subjectMap[subjectName].totalClasses++;
        if (studentRecord.status === "present") {
          subjectMap[subjectName].presentCount++;
        } else if (studentRecord.status === "absent") {
          subjectMap[subjectName].absentCount++;
        } else if (studentRecord.status === "late") {
          subjectMap[subjectName].lateCount++;
        }
      }
    });

    // Convert to array and calculate percentages
    const summary = Object.values(subjectMap).map((subj) => ({
      subjectName: subj.subjectName,
      totalClasses: subj.totalClasses,
      presentCount: subj.presentCount,
      absentCount: subj.absentCount,
      lateCount: subj.lateCount,
      percentage:
        subj.totalClasses > 0
          ? parseFloat(((subj.presentCount / subj.totalClasses) * 100).toFixed(2))
          : 0,
    }));

    // Calculate overall stats
    const overall = summary.reduce(
      (acc, subj) => {
        acc.totalClasses += subj.totalClasses;
        acc.presentCount += subj.presentCount;
        acc.absentCount += subj.absentCount;
        acc.lateCount += subj.lateCount;
        return acc;
      },
      { totalClasses: 0, presentCount: 0, absentCount: 0, lateCount: 0 }
    );

    const overallPercentage =
      overall.totalClasses > 0
        ? parseFloat(((overall.presentCount / overall.totalClasses) * 100).toFixed(2))
        : 0;

    return res.status(200).json({
      summary, // Array of subject-wise attendance
      overall: {
        totalClasses: overall.totalClasses,
        presentCount: overall.presentCount,
        absentCount: overall.absentCount,
        lateCount: overall.lateCount,
        percentage: overallPercentage,
      },
    });
  } catch (error) {
    console.error("Error in getStudentAttendanceSummary:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Keep old endpoint for backward compatibility (will be removed later)
const markAttendance = async (req, res) => {
  // Redirect to new endpoint
  const { subjectName, ...rest } = req.body;
  if (!subjectName) {
    return res.status(400).json({
      message: "subjectName is required. Please use /api/attendance/mark-subject endpoint",
    });
  }
  req.body = { ...rest, subjectName };
  return markSubjectAttendance(req, res);
};

const getClassAttendanceForDate = async (req, res) => {
  // Redirect to new endpoint
  const { subjectName } = req.query;
  if (!subjectName) {
    return res.status(400).json({
      message: "subjectName query parameter is required. Please use /api/attendance/class-subject endpoint",
    });
  }
  return getClassSubjectAttendance(req, res);
};

module.exports = {
  markSubjectAttendance,
  getClassSubjectAttendance,
  getStudentAttendanceSummary,
  // Old endpoints for backward compatibility
  markAttendance,
  getClassAttendanceForDate,
};
