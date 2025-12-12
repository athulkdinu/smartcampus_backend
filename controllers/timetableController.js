const Timetable = require("../models/Timetable");
const User = require("../models/userModel");
const ClassModel = require("../models/classModel");

// Helper: Get current day name in Asia/Kolkata timezone
const getCurrentDay = () => {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const now = new Date();
  // Convert to Asia/Kolkata timezone
  const istTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  return days[istTime.getDay()];
};

// POST /api/timetable - Create or update timetable (Faculty/Admin only)
const createOrUpdateTimetable = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const { classId, academicTerm, slots } = req.body;

    // Validation
    if (!classId || !slots || !Array.isArray(slots) || slots.length === 0) {
      return res.status(400).json({
        message: "classId and slots array are required",
      });
    }

    // Verify user is faculty or admin
    const user = await User.findById(userId);
    if (!user || (user.role !== "faculty" && user.role !== "admin")) {
      return res.status(403).json({
        message: "Only faculty or admin can create timetables",
      });
    }

    // Verify faculty can manage this class (class teacher or assigned faculty)
    if (user.role === "faculty") {
      const classDoc = await ClassModel.findOne({ className: classId });
      if (!classDoc) {
        return res.status(404).json({ message: "Class not found" });
      }

      const isClassTeacher = classDoc.classTeacher?.toString() === userId.toString();
      const isSubjectTeacher = classDoc.subjects?.some(
        (s) => s.teacher?.toString() === userId.toString()
      );

      if (!isClassTeacher && !isSubjectTeacher && user.role !== "admin") {
        return res.status(403).json({
          message: "You are not assigned to this class",
        });
      }
    }

    // Validate slots
    for (const slot of slots) {
      if (!slot.day || !slot.startTime || !slot.endTime || !slot.subject) {
        return res.status(400).json({
          message: "Each slot must have day, startTime, endTime, and subject",
        });
      }
    }

    // Find existing timetable or create new
    let timetable = await Timetable.findOne({ classId });
    if (timetable) {
      timetable.academicTerm = academicTerm || timetable.academicTerm;
      timetable.slots = slots;
      timetable.createdBy = userId;
      await timetable.save();
    } else {
      timetable = await Timetable.create({
        classId,
        academicTerm: academicTerm || null,
        createdBy: userId,
        slots,
      });
    }

    await timetable.populate("createdBy", "name email");
    await timetable.populate("slots.faculty", "name email");

    return res.status(201).json({
      message: "Timetable saved successfully",
      timetable,
    });
  } catch (error) {
    console.error("Error in createOrUpdateTimetable:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/timetable/:classId - Get timetable for a class
const getTimetable = async (req, res) => {
  try {
    const { classId } = req.params;

    const timetable = await Timetable.findOne({ classId })
      .populate("createdBy", "name email")
      .populate("slots.faculty", "name email")
      .sort({ createdAt: -1 });

    if (!timetable) {
      return res.status(404).json({ message: "Timetable not found for this class" });
    }

    return res.status(200).json({
      timetable,
    });
  } catch (error) {
    console.error("Error in getTimetable:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/timetable/today - Get today's classes for student
const getTodayClasses = async (req, res) => {
  try {
    const studentId = req.user?.id;
    if (!studentId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    // Verify user is student
    const student = await User.findById(studentId);
    if (!student || student.role !== "student") {
      return res.status(403).json({ message: "Only students can view today's classes" });
    }

    if (!student.className) {
      return res.status(400).json({
        message: "Student is not enrolled in any class",
      });
    }

    // Get current day
    const currentDay = getCurrentDay();

    // Find timetable for student's class
    const timetable = await Timetable.findOne({ classId: student.className })
      .populate("slots.faculty", "name email");

    if (!timetable) {
      return res.status(200).json({
        classes: [],
        day: currentDay,
        message: "No timetable found for your class",
      });
    }

    // Filter slots for today
    const todaySlots = timetable.slots.filter((slot) => slot.day === currentDay);

    // Sort by start time
    todaySlots.sort((a, b) => {
      const timeA = a.startTime.split(":").map(Number);
      const timeB = b.startTime.split(":").map(Number);
      return timeA[0] * 60 + timeA[1] - (timeB[0] * 60 + timeB[1]);
    });

    // Format for frontend
    const classes = todaySlots.map((slot) => ({
      time: `${slot.startTime} - ${slot.endTime}`,
      subject: slot.subject,
      subjectCode: slot.subjectCode || "",
      room: slot.room || "",
      instructor: slot.faculty?.name || "TBD",
      sessionType: slot.sessionType || "Theory",
    }));

    return res.status(200).json({
      classes,
      day: currentDay,
      className: student.className,
      count: classes.length,
    });
  } catch (error) {
    console.error("Error in getTodayClasses:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/timetable/faculty/my-classes - Get classes faculty can manage
const getFacultyClasses = async (req, res) => {
  try {
    const facultyId = req.user?.id;
    if (!facultyId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    // Verify user is faculty
    const faculty = await User.findById(facultyId);
    if (!faculty || faculty.role !== "faculty") {
      return res.status(403).json({ message: "Only faculty can view their classes" });
    }

    // Find classes where faculty is assigned
    const classes = await ClassModel.find({
      $or: [{ classTeacher: facultyId }, { "subjects.teacher": facultyId }],
    }).select("className department classTeacher subjects");

    const classList = classes.map((cls) => ({
      className: cls.className,
      department: cls.department,
      isClassTeacher: cls.classTeacher?.toString() === facultyId.toString(),
      subjects: cls.subjects || [],
    }));

    return res.status(200).json({
      classes: classList,
      count: classList.length,
    });
  } catch (error) {
    console.error("Error in getFacultyClasses:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createOrUpdateTimetable,
  getTimetable,
  getTodayClasses,
  getFacultyClasses,
};

