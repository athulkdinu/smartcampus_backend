const LectureMaterial = require("../models/LectureMaterial");
const User = require("../models/userModel");
const ClassModel = require("../models/classModel");

// POST /api/lectures - Create lecture material (Faculty only)
const createLectureMaterial = async (req, res) => {
  try {
    const facultyId = req.user?.id;
    if (!facultyId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const { title, classId, description, module, videoUrl } = req.body;

    // Validation
    if (!title || !classId) {
      return res.status(400).json({
        message: "Title and classId are required",
      });
    }

    // Verify faculty
    const faculty = await User.findById(facultyId);
    if (!faculty || faculty.role !== "faculty") {
      return res.status(403).json({ message: "Only faculty can create lecture materials" });
    }

    // Verify class exists
    const classDoc = await ClassModel.findById(classId);
    if (!classDoc) {
      return res.status(404).json({ message: "Class not found" });
    }

    // Verify faculty is assigned to this class
    const facultyIdStr = facultyId.toString();
    const isClassTeacher = classDoc.classTeacher?.toString() === facultyIdStr;
    const isSubjectTeacher = classDoc.subjects?.some(
      (s) => s.teacher?.toString() === facultyIdStr
    );

    if (!isClassTeacher && !isSubjectTeacher) {
      return res.status(403).json({
        message: "You are not assigned to this class",
      });
    }

    // Handle file upload
    let fileUrl = null;
    if (req.file) {
      fileUrl = `/uploads/lectures/${req.file.filename}`;
    }

    // Create lecture material
    const lectureMaterial = new LectureMaterial({
      title,
      classId,
      facultyId,
      description: description || "",
      module: module || "",
      fileUrl: fileUrl || null,
      videoUrl: videoUrl || null,
    });

    await lectureMaterial.save();

    // Populate for response
    await lectureMaterial.populate("classId", "className department");
    await lectureMaterial.populate("facultyId", "name email");

    return res.status(201).json({
      message: "Lecture material created successfully",
      lectureMaterial,
    });
  } catch (error) {
    console.error("Error in createLectureMaterial:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/lectures/faculty - Get lecture materials for faculty
const getFacultyLectures = async (req, res) => {
  try {
    const facultyId = req.user?.id;
    if (!facultyId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const { classId } = req.query;

    // Build query
    const query = { facultyId };
    if (classId) {
      query.classId = classId;
    }

    const lectureMaterials = await LectureMaterial.find(query)
      .populate("classId", "className department")
      .populate("facultyId", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      lectureMaterials,
      count: lectureMaterials.length,
    });
  } catch (error) {
    console.error("Error in getFacultyLectures:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/lectures/student - Get lecture materials for student
const getStudentLectures = async (req, res) => {
  try {
    const studentId = req.user?.id;
    if (!studentId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    // Get student's class
    const student = await User.findById(studentId).select("className role");
    if (!student || student.role !== "student") {
      return res.status(403).json({ message: "Only students can view lecture materials" });
    }

    if (!student.className) {
      return res.status(400).json({
        message: "Student is not enrolled in any class",
      });
    }

    // Find class by className
    const classDoc = await ClassModel.findOne({ className: student.className });
    if (!classDoc) {
      return res.status(404).json({
        message: "Class not found for student",
      });
    }

    // Get all lecture materials for this class
    const lectureMaterials = await LectureMaterial.find({
      classId: classDoc._id,
    })
      .populate("classId", "className department")
      .populate("facultyId", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      lectureMaterials,
      count: lectureMaterials.length,
    });
  } catch (error) {
    console.error("Error in getStudentLectures:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// DELETE /api/lectures/:id - Delete lecture material (Faculty only)
const deleteLectureMaterial = async (req, res) => {
  try {
    const facultyId = req.user?.id;
    if (!facultyId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const { id } = req.params;

    // Find lecture material
    const lectureMaterial = await LectureMaterial.findById(id);
    if (!lectureMaterial) {
      return res.status(404).json({ message: "Lecture material not found" });
    }

    // Verify faculty owns this material
    if (lectureMaterial.facultyId.toString() !== facultyId.toString()) {
      return res.status(403).json({
        message: "You are not authorized to delete this lecture material",
      });
    }

    // Delete file if exists
    if (lectureMaterial.fileUrl) {
      const fs = require("fs");
      const path = require("path");
      // fileUrl is like /uploads/lectures/filename, so we need to join with project root
      const filePath = path.join(__dirname, "..", lectureMaterial.fileUrl);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (fileError) {
        console.error("Error deleting file:", fileError);
        // Continue with database deletion even if file deletion fails
      }
    }

    // Delete from database
    await LectureMaterial.findByIdAndDelete(id);

    return res.status(200).json({
      message: "Lecture material deleted",
    });
  } catch (error) {
    console.error("Error in deleteLectureMaterial:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createLectureMaterial,
  getFacultyLectures,
  getStudentLectures,
  deleteLectureMaterial,
};

