const ClassModel = require("../models/classModel");
const User = require("../models/userModel");

// POST /api/classes - Create new class
const createClass = async (req, res) => {
  try {
    const { className, department } = req.body;

    if (!className || !department) {
      return res.status(400).json({ 
        message: "Class name and department are required" 
      });
    }

    const exists = await ClassModel.findOne({ className });
    if (exists) {
      return res.status(400).json({ 
        message: "Class with this name already exists" 
      });
    }

    const newClass = await ClassModel.create({
      className: className.trim(),
      department: department.trim(),
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

// GET /api/classes - Get all classes
const getAllClasses = async (req, res) => {
  try {
    const classes = await ClassModel.find({})
      .populate("classTeacher", "name email")
      .populate("subjects.teacher", "name email")
      .populate("students", "name email studentID className")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      classes,
      count: classes.length,
    });
  } catch (error) {
    console.error("Error in getAllClasses:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/classes/faculty-list - Get all faculty (for dropdowns)
const getFacultyList = async (req, res) => {
  try {
    const faculty = await User.find({ role: "faculty" })
      .select("_id name email department")
      .sort({ name: 1 })
      .lean();

    console.log(`[getFacultyList] Found ${faculty.length} faculty`);

    const mappedFaculty = faculty.map((user) => ({
      _id: user._id.toString(),
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      department: user.department || null,
    }));

    return res.status(200).json(mappedFaculty);
  } catch (error) {
    console.error("Error in getFacultyList:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/classes/:classId/assign-teacher - Assign class teacher
const assignTeacher = async (req, res) => {
  try {
    const { classId } = req.params;
    const { teacherId } = req.body;

    if (!teacherId) {
      return res.status(400).json({ 
        message: "teacherId is required" 
      });
    }

    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== "faculty") {
      return res.status(400).json({ 
        message: "Selected user is not a faculty member" 
      });
    }

    const classDoc = await ClassModel.findByIdAndUpdate(
      classId,
      { classTeacher: teacherId },
      { new: true }
    )
      .populate("classTeacher", "name email")
      .populate("subjects.teacher", "name email")
      .populate("students", "name email studentID className");

    if (!classDoc) {
      return res.status(404).json({ message: "Class not found" });
    }

    return res.status(200).json({
      message: "Class teacher assigned successfully",
      class: classDoc,
    });
  } catch (error) {
    console.error("Error in assignTeacher:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/classes/:classId/assign-faculty - Assign faculty to subject
const assignFaculty = async (req, res) => {
  try {
    const { classId } = req.params;
    const { subjectName, teacherId } = req.body;

    if (!subjectName || !teacherId) {
      return res.status(400).json({ 
        message: "subjectName and teacherId are required" 
      });
    }

    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== "faculty") {
      return res.status(400).json({ 
        message: "Selected user is not a faculty member" 
      });
    }

    const classDoc = await ClassModel.findById(classId);
    if (!classDoc) {
      return res.status(404).json({ message: "Class not found" });
    }

    // Check if subject already exists
    const subjectIndex = classDoc.subjects.findIndex(
      (s) => s.name?.toLowerCase() === subjectName.toLowerCase()
    );

    if (subjectIndex >= 0) {
      // Update existing subject
      classDoc.subjects[subjectIndex].teacher = teacherId;
    } else {
      // Add new subject
      classDoc.subjects.push({ name: subjectName, teacher: teacherId });
    }

    await classDoc.save();

    const populated = await ClassModel.findById(classId)
      .populate("classTeacher", "name email")
      .populate("subjects.teacher", "name email")
      .populate("students", "name email studentID className");

    return res.status(200).json({
      message: "Faculty assigned to subject successfully",
      class: populated,
    });
  } catch (error) {
    console.error("Error in assignFaculty:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/classes/:classId/assign-student - Assign student to class
const assignStudent = async (req, res) => {
  try {
    const { classId } = req.params;
    const { studentId } = req.body;

    if (!studentId) {
      return res.status(400).json({ 
        message: "studentId is required" 
      });
    }

    const student = await User.findById(studentId);
    if (!student || student.role !== "student") {
      return res.status(400).json({ 
        message: "Selected user is not a student" 
      });
    }

    const classDoc = await ClassModel.findById(classId);
    if (!classDoc) {
      return res.status(404).json({ message: "Class not found" });
    }

    // Check if student already in class
    const studentExists = classDoc.students.some(
      (id) => id.toString() === studentId
    );

    if (!studentExists) {
      classDoc.students.push(studentId);
      await classDoc.save();
    }

    // Update student's className field
    student.className = classDoc.className;
    await student.save();

    const populated = await ClassModel.findById(classId)
      .populate("classTeacher", "name email")
      .populate("subjects.teacher", "name email")
      .populate("students", "name email studentID className");

    return res.status(200).json({
      message: "Student assigned to class successfully",
      class: populated,
    });
  } catch (error) {
    console.error("Error in assignStudent:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/classes/:classId - Get class details with all populated fields
const getClassDetails = async (req, res) => {
  try {
    const { classId } = req.params;

    const classDoc = await ClassModel.findById(classId)
      .populate("classTeacher", "name email department")
      .populate("subjects.teacher", "name email department")
      .populate("students", "name email studentID className phone address department");

    if (!classDoc) {
      return res.status(404).json({ message: "Class not found" });
    }

    // Also get students who have this className in their profile
    const studentsByClassName = await User.find({
      role: "student",
      className: classDoc.className,
    }).select("name email studentID className phone address department");

    // Merge both sources
    const studentIdsInClass = new Set(
      classDoc.students.map((s) => s._id.toString())
    );
    const additionalStudents = studentsByClassName.filter(
      (s) => !studentIdsInClass.has(s._id.toString())
    );

    const allStudents = [
      ...classDoc.students.map((s) => ({
        _id: s._id,
        id: s._id,
        name: s.name,
        email: s.email,
        studentID: s.studentID || "",
        className: s.className || "",
        phone: s.phone || "",
        address: s.address || "",
        department: s.department || "",
      })),
      ...additionalStudents.map((s) => ({
        _id: s._id,
        id: s._id,
        name: s.name,
        email: s.email,
        studentID: s.studentID || "",
        className: s.className || "",
        phone: s.phone || "",
        address: s.address || "",
        department: s.department || "",
      })),
    ];

    return res.status(200).json({
      class: {
        _id: classDoc._id,
        className: classDoc.className,
        department: classDoc.department,
        classTeacher: classDoc.classTeacher,
        subjects: classDoc.subjects,
        students: allStudents,
        studentCount: allStudents.length,
        createdAt: classDoc.createdAt,
        updatedAt: classDoc.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error in getClassDetails:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/classes/:classId/students - Get all students in a class (admin + faculty)
const getClassStudents = async (req, res) => {
  try {
    const { classId } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    const classDoc = await ClassModel.findById(classId)
      .select("className department students classTeacher subjects");

    if (!classDoc) {
      return res.status(404).json({ message: "Class not found" });
    }

    // If faculty, verify they are assigned to this class (check ObjectIds before population)
    if (userRole === "faculty") {
      const userIdStr = userId.toString();
      
      // Check if faculty is class teacher
      let isClassTeacher = false;
      if (classDoc.classTeacher) {
        const classTeacherId = classDoc.classTeacher.toString();
        isClassTeacher = classTeacherId === userIdStr;
      }
      
      // Check if faculty is assigned to any subject
      let isSubjectTeacher = false;
      if (classDoc.subjects && classDoc.subjects.length > 0) {
        isSubjectTeacher = classDoc.subjects.some((s) => {
          if (!s.teacher) return false;
          const teacherId = s.teacher.toString();
          return teacherId === userIdStr;
        });
      }
      
      if (!isClassTeacher && !isSubjectTeacher) {
        console.log("Faculty authorization failed for class:", classDoc.className, {
          userId: userIdStr,
          classTeacherId: classDoc.classTeacher ? classDoc.classTeacher.toString() : null,
          subjects: classDoc.subjects.map(s => ({
            name: s.name,
            teacherId: s.teacher ? s.teacher.toString() : null
          }))
        });
        return res.status(403).json({
          message: "You are not assigned to this class",
        });
      }
    }

    // Now populate after authorization check
    await classDoc.populate("students", "name email studentID className phone address department");
    await classDoc.populate("classTeacher", "name email");
    await classDoc.populate("subjects.teacher", "name email");

    // Also get students who have this className in their profile
    const studentsByClassName = await User.find({
      role: "student",
      className: classDoc.className,
    }).select("name email studentID className phone address department");

    // Merge both sources
    const studentIdsInClass = new Set(
      classDoc.students.map((s) => s._id.toString())
    );
    const additionalStudents = studentsByClassName.filter(
      (s) => !studentIdsInClass.has(s._id.toString())
    );

    const allStudents = [
      ...classDoc.students.map((s) => ({
        _id: s._id,
        id: s._id,
        name: s.name,
        email: s.email,
        studentID: s.studentID || "",
        className: s.className || "",
        phone: s.phone || "",
        address: s.address || "",
        department: s.department || "",
      })),
      ...additionalStudents.map((s) => ({
        _id: s._id,
        id: s._id,
        name: s.name,
        email: s.email,
        studentID: s.studentID || "",
        className: s.className || "",
        phone: s.phone || "",
        address: s.address || "",
        department: s.department || "",
      })),
    ];

    return res.status(200).json({
      students: allStudents,
      count: allStudents.length,
      className: classDoc.className,
      department: classDoc.department,
    });
  } catch (error) {
    console.error("Error in getClassStudents:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/faculty/classes - Get classes assigned to faculty
const getFacultyClasses = async (req, res) => {
  try {
    const facultyId = req.user?.id;
    if (!facultyId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    // Find classes where faculty is class teacher or subject teacher
    const classes = await ClassModel.find({
      $or: [
        { classTeacher: facultyId },
        { "subjects.teacher": facultyId },
      ],
    })
      .select("_id className department classTeacher subjects")
      .populate("classTeacher", "name email")
      .sort({ className: 1 });

    const mappedClasses = classes.map((cls) => ({
      _id: cls._id,
      id: cls._id,
      className: cls.className,
      department: cls.department,
      classTeacher: cls.classTeacher,
      isClassTeacher: cls.classTeacher?._id.toString() === facultyId,
    }));

    return res.status(200).json({
      classes: mappedClasses,
      count: mappedClasses.length,
    });
  } catch (error) {
    console.error("Error in getFacultyClasses:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/faculty/classes-with-subjects - Get classes with only subjects faculty teaches
const getFacultyClassesWithSubjects = async (req, res) => {
  try {
    const facultyId = req.user?.id;
    if (!facultyId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    // Find classes where faculty is class teacher or subject teacher
    const classes = await ClassModel.find({
      $or: [
        { classTeacher: facultyId },
        { "subjects.teacher": facultyId },
      ],
    })
      .select("_id className department classTeacher subjects")
      .populate("classTeacher", "name email")
      .sort({ className: 1 });

    // Filter to only include subjects this faculty teaches
    const mappedClasses = classes.map((cls) => {
      const facultyIdStr = facultyId.toString();
      const isClassTeacher = cls.classTeacher?._id?.toString() === facultyIdStr;

      // If class teacher, can teach all subjects
      // Otherwise, only subjects where they are assigned as teacher
      let allowedSubjects = [];
      if (isClassTeacher) {
        allowedSubjects = cls.subjects.map((sub, idx) => ({
          index: idx,
          name: sub.name,
          teacherId: sub.teacher?.toString() || null,
        }));
      } else {
        allowedSubjects = cls.subjects
          .map((sub, idx) => ({
            index: idx,
            name: sub.name,
            teacherId: sub.teacher?.toString() || null,
          }))
          .filter((sub) => sub.teacherId === facultyIdStr);
      }

      return {
        _id: cls._id,
        id: cls._id,
        name: cls.className,
        className: cls.className,
        department: cls.department,
        isClassTeacher,
        subjects: allowedSubjects,
      };
    }).filter((cls) => cls.subjects.length > 0); // Only return classes with at least one subject

    return res.status(200).json({
      classes: mappedClasses,
      count: mappedClasses.length,
    });
  } catch (error) {
    console.error("Error in getFacultyClassesWithSubjects:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createClass,
  getAllClasses,
  getFacultyList,
  assignTeacher,
  assignFaculty,
  assignStudent,
  getClassDetails,
  getClassStudents,
  getFacultyClasses,
  getFacultyClassesWithSubjects,
};
