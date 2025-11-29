const ClassModel = require("../models/classModel");
const User = require("../models/userModel");

// create new class
const createClass = async (req, res) => {
  try {
    const { className, department } = req.body;

    if (!className || !department) {
      return res
        .status(400)
        .json({ message: "Class name and department are required" });
    }

    const exists = await ClassModel.findOne({ className });
    if (exists) {
      return res
        .status(400)
        .json({ message: "Class with this name already exists" });
    }

    const newClass = await ClassModel.create({
      className,
      department,
    });

    return res.status(201).json({
      message: "Class created successfully",
      class: newClass,
    });
  } catch (error) {
    console.error("Error in createClass:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// assign / change class teacher
const assignClassTeacher = async (req, res) => {
  try {
    const { classId, teacherId } = req.body;

    if (!classId || !teacherId) {
      return res
        .status(400)
        .json({ message: "classId and teacherId are required" });
    }

    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== "faculty") {
      return res
        .status(400)
        .json({ message: "Selected user is not a faculty member" });
    }

    const classDoc = await ClassModel.findByIdAndUpdate(
      classId,
      { classTeacher: teacherId },
      { new: true }
    ).populate("classTeacher", "name email");

    if (!classDoc) {
      return res.status(404).json({ message: "Class not found" });
    }

    return res.status(200).json({
      message: "Class teacher assigned successfully",
      class: classDoc,
    });
  } catch (error) {
    console.error("Error in assignClassTeacher:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// assign students to class
const assignStudentsToClass = async (req, res) => {
  try {
    const { classId, studentIds } = req.body;

    if (!classId || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res
        .status(400)
        .json({ message: "classId and studentIds are required" });
    }

    const classDoc = await ClassModel.findById(classId);
    if (!classDoc) {
      return res.status(404).json({ message: "Class not found" });
    }

    // update students' className field
    await User.updateMany(
      { _id: { $in: studentIds }, role: "student" },
      { className: classDoc.className }
    );

    // add to class.students (avoid duplicates)
    const existing = new Set(classDoc.students.map((id) => id.toString()));
    studentIds.forEach((id) => {
      if (!existing.has(id)) {
        classDoc.students.push(id);
      }
    });

    await classDoc.save();

    return res.status(200).json({
      message: "Students assigned to class successfully",
      class: classDoc,
    });
  } catch (error) {
    console.error("Error in assignStudentsToClass:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// assign or update subject teacher
const assignSubjectTeacher = async (req, res) => {
  try {
    const { classId, subjectName, teacherId } = req.body;

    if (!classId || !subjectName || !teacherId) {
      return res
        .status(400)
        .json({ message: "classId, subjectName and teacherId are required" });
    }

    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== "faculty") {
      return res
        .status(400)
        .json({ message: "Selected user is not a faculty member" });
    }

    const classDoc = await ClassModel.findById(classId);
    if (!classDoc) {
      return res.status(404).json({ message: "Class not found" });
    }

    const subjectIndex = classDoc.subjects.findIndex(
      (s) => s.name?.toLowerCase() === subjectName.toLowerCase()
    );

    if (subjectIndex >= 0) {
      classDoc.subjects[subjectIndex].teacher = teacherId;
    } else {
      classDoc.subjects.push({ name: subjectName, teacher: teacherId });
    }

    await classDoc.save();

    return res.status(200).json({
      message: "Subject teacher assigned successfully",
      class: classDoc,
    });
  } catch (error) {
    console.error("Error in assignSubjectTeacher:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// get all classes (for admin / dropdowns)
const getAllClasses = async (_req, res) => {
  try {
    const classes = await ClassModel.find({})
      .select("className department")
      .sort({ className: 1 });

    return res.status(200).json({ classes });
  } catch (error) {
    console.error("Error in getAllClasses:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// get class details with population
const getClassDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const classDoc = await ClassModel.findById(id)
      .populate("classTeacher", "name email")
      .populate("subjects.teacher", "name email")
      .populate("students", "name email studentID className");

    if (!classDoc) {
      return res.status(404).json({ message: "Class not found" });
    }

    // also get students who have this className in their profile but aren't in the students array yet
    const studentsByClassName = await User.find({
      role: "student",
      className: classDoc.className,
    }).select("name email studentID className");

    // merge: students from class.students array + students with matching className
    const studentIdsInClass = new Set(
      classDoc.students.map((s) => s._id.toString())
    );
    const additionalStudents = studentsByClassName.filter(
      (s) => !studentIdsInClass.has(s._id.toString())
    );

    // combine both sources
    const allStudents = [
      ...classDoc.students.map((s) => ({
        _id: s._id,
        name: s.name,
        email: s.email,
        studentID: s.studentID || "",
        className: s.className || "",
      })),
      ...additionalStudents.map((s) => ({
        _id: s._id,
        name: s.name,
        email: s.email,
        studentID: s.studentID || "",
        className: s.className || "",
      })),
    ];

    // return class with merged students
    return res.status(200).json({
      class: {
        ...classDoc.toObject(),
        students: allStudents,
      },
    });
  } catch (error) {
    console.error("Error in getClassDetails:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// faculty: classes where this faculty teaches or is class teacher
const getFacultyClasses = async (req, res) => {
  try {
    const facultyId = req.user?.id;
    if (!facultyId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const classes = await ClassModel.find({
      $or: [
        { classTeacher: facultyId },
        { "subjects.teacher": facultyId },
      ],
    })
      .populate("classTeacher", "name email")
      .populate("subjects.teacher", "name email");

    return res.status(200).json({ classes });
  } catch (error) {
    console.error("Error in getFacultyClasses:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createClass,
  assignClassTeacher,
  assignStudentsToClass,
  assignSubjectTeacher,
  getAllClasses,
  getClassDetails,
  getFacultyClasses,
};


