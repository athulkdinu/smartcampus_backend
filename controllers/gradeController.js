const GradeSheet = require("../models/GradeSheet");
const User = require("../models/userModel");
const ClassModel = require("../models/classModel");

// POST /api/grades/generate - Generate grade sheet (Faculty only)
const generateGradeSheet = async (req, res) => {
  try {
    const facultyId = req.user?.id;
    if (!facultyId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const { classId, subject, title, examType } = req.body;

    // Validation
    if (!classId || !subject || !title || !examType) {
      return res.status(400).json({
        message: "classId, subject, title, and examType are required",
      });
    }

    // Verify faculty
    const faculty = await User.findById(facultyId);
    if (!faculty || faculty.role !== "faculty") {
      return res.status(403).json({ message: "Only faculty can generate grade sheets" });
    }

    // Verify class exists
    const classDoc = await ClassModel.findById(classId);
    if (!classDoc) {
      return res.status(404).json({ message: "Class not found" });
    }

    // Verify faculty is assigned to this class and subject
    const facultyIdStr = facultyId.toString();
    const isClassTeacher = classDoc.classTeacher?.toString() === facultyIdStr;
    const isSubjectTeacher = classDoc.subjects?.some(
      (s) => s.teacher?.toString() === facultyIdStr && s.name === subject
    );

    if (!isClassTeacher && !isSubjectTeacher) {
      return res.status(403).json({
        message: "You are not assigned to teach this subject in this class",
      });
    }

    // Get all students in the class
    const students = await User.find({
      role: "student",
      className: classDoc.className,
    }).select("_id name studentID");

    // Create grade sheet with empty grades for all students
    const grades = students.map((student) => ({
      studentId: student._id,
      maxScore: null,
      obtainedScore: null,
      grade: null,
      updatedAt: new Date(),
    }));

    const gradeSheet = new GradeSheet({
      classId,
      subject,
      facultyId,
      title,
      examType,
      grades,
    });

    await gradeSheet.save();

    // Populate for response
    await gradeSheet.populate("classId", "className department");
    await gradeSheet.populate("facultyId", "name email");
    await gradeSheet.populate("grades.studentId", "name email studentID");

    return res.status(201).json({
      message: "Grade sheet generated successfully",
      gradeSheet,
    });
  } catch (error) {
    console.error("Error in generateGradeSheet:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/grades/faculty - Get grade sheets for faculty
const getFacultyGradeSheets = async (req, res) => {
  try {
    const facultyId = req.user?.id;
    if (!facultyId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const { classId, subject } = req.query;

    // Build query
    const query = { facultyId };
    if (classId) {
      query.classId = classId;
    }
    if (subject) {
      query.subject = subject;
    }

    const gradeSheets = await GradeSheet.find(query)
      .populate("classId", "className department")
      .populate("facultyId", "name email")
      .populate("grades.studentId", "name email studentID")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      gradeSheets,
      count: gradeSheets.length,
    });
  } catch (error) {
    console.error("Error in getFacultyGradeSheets:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/grades/:gradeSheetId - Get single grade sheet
const getGradeSheet = async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    if (!userId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const { gradeSheetId } = req.params;

    const gradeSheet = await GradeSheet.findById(gradeSheetId)
      .populate("classId", "className department")
      .populate("facultyId", "name email")
      .populate("grades.studentId", "name email studentID className");

    if (!gradeSheet) {
      return res.status(404).json({ message: "Grade sheet not found" });
    }

    // Verify access
    if (userRole === "faculty") {
      // Faculty can only see their own grade sheets
      if (gradeSheet.facultyId._id.toString() !== userId.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }
    } else if (userRole === "student") {
      // Student can only see grade sheets where they have a grade entry
      const hasGrade = gradeSheet.grades.some(
        (g) => g.studentId._id.toString() === userId.toString()
      );
      if (!hasGrade) {
        return res.status(403).json({ message: "Access denied" });
      }
    } else {
      return res.status(403).json({ message: "Access denied" });
    }

    return res.status(200).json({
      gradeSheet,
    });
  } catch (error) {
    console.error("Error in getGradeSheet:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/grades/:gradeSheetId/grade/:studentId - Update grade for student
const updateStudentGrade = async (req, res) => {
  try {
    const facultyId = req.user?.id;
    if (!facultyId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const { gradeSheetId, studentId } = req.params;
    const { maxScore, obtainedScore, grade } = req.body;

    // Validation
    if (maxScore === undefined || obtainedScore === undefined || !grade) {
      return res.status(400).json({
        message: "maxScore, obtainedScore, and grade are required",
      });
    }

    // Find grade sheet
    const gradeSheet = await GradeSheet.findById(gradeSheetId);
    if (!gradeSheet) {
      return res.status(404).json({ message: "Grade sheet not found" });
    }

    // Verify faculty owns this grade sheet
    if (gradeSheet.facultyId.toString() !== facultyId.toString()) {
      return res.status(403).json({
        message: "You are not authorized to update this grade sheet",
      });
    }

    // Find and update the grade entry
    const gradeEntry = gradeSheet.grades.find(
      (g) => g.studentId.toString() === studentId
    );

    if (!gradeEntry) {
      return res.status(404).json({ message: "Student not found in grade sheet" });
    }

    // Update grade entry
    gradeEntry.maxScore = maxScore;
    gradeEntry.obtainedScore = obtainedScore;
    gradeEntry.grade = grade;
    gradeEntry.updatedAt = new Date();

    await gradeSheet.save();

    // Populate for response
    await gradeSheet.populate("classId", "className department");
    await gradeSheet.populate("facultyId", "name email");
    await gradeSheet.populate("grades.studentId", "name email studentID");

    return res.status(200).json({
      message: "Grade updated successfully",
      gradeSheet,
    });
  } catch (error) {
    console.error("Error in updateStudentGrade:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/grades/student - Get grades for student
const getStudentGrades = async (req, res) => {
  try {
    const studentId = req.user?.id;
    if (!studentId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    // Get student info
    const student = await User.findById(studentId);
    if (!student || student.role !== "student") {
      return res.status(403).json({ message: "Only students can view their grades" });
    }

    // Find all grade sheets where this student has an entry
    const gradeSheets = await GradeSheet.find({
      "grades.studentId": studentId,
    })
      .populate("classId", "className department")
      .populate("facultyId", "name email")
      .populate("grades.studentId", "name email studentID")
      .sort({ createdAt: -1 });

    // Filter to only include this student's grade from each sheet
    const studentGrades = gradeSheets.map((sheet) => {
      const studentGrade = sheet.grades.find(
        (g) => g.studentId._id.toString() === studentId.toString()
      );

      return {
        _id: sheet._id,
        title: sheet.title,
        subject: sheet.subject,
        examType: sheet.examType,
        classId: sheet.classId,
        facultyId: sheet.facultyId,
        createdAt: sheet.createdAt,
        grade: studentGrade
          ? {
              maxScore: studentGrade.maxScore,
              obtainedScore: studentGrade.obtainedScore,
              grade: studentGrade.grade,
              updatedAt: studentGrade.updatedAt,
            }
          : null,
      };
    });

    return res.status(200).json({
      grades: studentGrades,
      count: studentGrades.length,
    });
  } catch (error) {
    console.error("Error in getStudentGrades:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  generateGradeSheet,
  getFacultyGradeSheets,
  getGradeSheet,
  updateStudentGrade,
  getStudentGrades,
};














