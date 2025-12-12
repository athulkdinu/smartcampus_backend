const Assignment = require("../models/assignmentModel");
const Submission = require("../models/submissionModel");
const ClassModel = require("../models/classModel");
const User = require("../models/userModel");

// POST /api/assignments - Create a new assignment (Faculty only)
const createAssignment = async (req, res) => {
  try {
    const facultyId = req.user?.id;
    if (!facultyId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const { title, description, dueDate, subject, classId, status } = req.body;

    // Validation
    if (!title || !dueDate || !subject || !classId) {
      return res.status(400).json({
        message: "Title, dueDate, subject, and classId are required",
      });
    }

    // Handle status: Frontend may send "Draft" but we only support "Published" or "Closed"
    // If status is "Draft", treat it as "Published" (since Draft was removed from requirements)
    let assignmentStatus = "Published";
    if (status === "Closed") {
      assignmentStatus = "Closed";
    }

    // Verify class exists
    const classDoc = await ClassModel.findById(classId);
    if (!classDoc) {
      return res.status(404).json({ message: "Class not found" });
    }

    // Verify faculty is assigned to this class (class teacher or subject teacher)
    const facultyIdStr = facultyId.toString();
    const isClassTeacher = classDoc.classTeacher?.toString() === facultyIdStr;
    const isSubjectTeacher = classDoc.subjects.some(
      (s) => s.teacher?.toString() === facultyIdStr && s.name === subject
    );

    if (!isClassTeacher && !isSubjectTeacher) {
      return res.status(403).json({
        message: "You are not assigned to teach this subject in this class",
      });
    }

    // Create assignment
    const assignment = new Assignment({
      facultyId,
      classId,
      title,
      description: description || "",
      subject,
      dueDate: new Date(dueDate),
      status: assignmentStatus,
    });

    await assignment.save();

    // Populate references for response
    await assignment.populate("facultyId", "name email");
    await assignment.populate("classId", "className department");

    return res.status(201).json({
      message: "Assignment created",
      assignment,
    });
  } catch (error) {
    console.error("Error in createAssignment:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/assignments/faculty - Get assignments created by faculty
const getFacultyAssignments = async (req, res) => {
  try {
    const facultyId = req.user?.id;
    if (!facultyId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const assignments = await Assignment.find({ facultyId })
      .populate("classId", "className department")
      .populate("facultyId", "name email")
      .sort({ createdAt: -1 });

    // Get submission counts for each assignment
    const assignmentsWithCounts = await Promise.all(
      assignments.map(async (assignment) => {
        const submissions = await Submission.find({
          assignmentId: assignment._id,
        });
        const pendingCount = submissions.filter((s) => s.status === "Pending").length;
        const totalCount = submissions.length;

        return {
          ...assignment.toObject(),
          submissionsPending: pendingCount,
          submissionsTotal: totalCount,
        };
      })
    );

    return res.status(200).json({
      assignments: assignmentsWithCounts,
      count: assignmentsWithCounts.length,
    });
  } catch (error) {
    console.error("Error in getFacultyAssignments:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/assignments/:assignmentId - Get assignment details (Student or Faculty)
const getAssignmentDetails = async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    if (!userId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const { assignmentId } = req.params;

    // Find assignment
    const assignment = await Assignment.findById(assignmentId)
      .populate("facultyId", "name email")
      .populate("classId", "className department");

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    // Verify access based on role
    if (userRole === "student") {
      // Verify student belongs to the assignment's class
      const student = await User.findById(userId).select("className role");
      if (!student || student.role !== "student") {
        return res.status(403).json({ message: "Access denied" });
      }

      const classDoc = await ClassModel.findById(assignment.classId);
      if (!classDoc || classDoc.className !== student.className) {
        return res.status(403).json({
          message: "You are not enrolled in the class for this assignment",
        });
      }
    } else if (userRole === "faculty") {
      // Verify faculty owns this assignment
      if (assignment.facultyId._id.toString() !== userId.toString()) {
        return res.status(403).json({
          message: "You are not authorized to view this assignment",
        });
      }
    } else {
      return res.status(403).json({ message: "Access denied" });
    }

    return res.status(200).json({ assignment });
  } catch (error) {
    console.error("Error in getAssignmentDetails:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/assignments/:assignmentId/submissions - Get submissions for an assignment (Faculty only)
const getAssignmentSubmissions = async (req, res) => {
  try {
    const facultyId = req.user?.id;
    if (!facultyId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const { assignmentId } = req.params;

    // Verify assignment exists and belongs to this faculty
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    if (assignment.facultyId.toString() !== facultyId.toString()) {
      return res.status(403).json({
        message: "You are not authorized to view submissions for this assignment",
      });
    }

    // Get all submissions for this assignment
    const submissions = await Submission.find({ assignmentId })
      .populate("studentId", "name email studentID className")
      .sort({ submittedAt: -1 });

    return res.status(200).json({
      assignment: {
        _id: assignment._id,
        title: assignment.title,
        subject: assignment.subject,
        dueDate: assignment.dueDate,
        classId: assignment.classId,
      },
      submissions,
      count: submissions.length,
    });
  } catch (error) {
    console.error("Error in getAssignmentSubmissions:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// PATCH /api/assignments/submissions/:submissionId/status - Update submission status (Faculty only)
const updateSubmissionStatus = async (req, res) => {
  try {
    const facultyId = req.user?.id;
    if (!facultyId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const { submissionId } = req.params;
    const { status, facultyRemark } = req.body;

    // Validation
    if (!status || !["Approved", "Rejected", "Rework"].includes(status)) {
      return res.status(400).json({
        message: "Valid status (Approved, Rejected, or Rework) is required",
      });
    }

    // Find submission
    const submission = await Submission.findById(submissionId).populate(
      "assignmentId"
    );
    if (!submission) {
      return res.status(404).json({ message: "Submission not found" });
    }

    // Verify assignment belongs to this faculty
    if (submission.assignmentId.facultyId.toString() !== facultyId.toString()) {
      return res.status(403).json({
        message: "You are not authorized to update this submission",
      });
    }

    // Update submission
    submission.status = status;
    submission.facultyRemark = facultyRemark || "";
    submission.updatedAt = new Date();

    await submission.save();

    // Populate for response
    await submission.populate("studentId", "name email studentID");

    return res.status(200).json({
      message: "Status updated",
      submission,
    });
  } catch (error) {
    console.error("Error in updateSubmissionStatus:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/assignments/student - Get assignments for student's class
const getStudentAssignments = async (req, res) => {
  try {
    const studentId = req.user?.id;
    if (!studentId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    // Get student's class
    const student = await User.findById(studentId).select("className role");
    if (!student || student.role !== "student") {
      return res.status(403).json({ message: "Only students can view assignments" });
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

    // Get all published assignments for this class
    const assignments = await Assignment.find({
      classId: classDoc._id,
      status: "Published",
    })
      .populate("facultyId", "name email")
      .populate("classId", "className department")
      .sort({ dueDate: 1 });

    // Get student's submissions for these assignments
    const assignmentsWithSubmission = await Promise.all(
      assignments.map(async (assignment) => {
        const submission = await Submission.findOne({
          assignmentId: assignment._id,
          studentId: studentId,
        }).sort({ submittedAt: -1 }); // Get latest submission if multiple (for Rework)

        return {
          ...assignment.toObject(),
          submission: submission
            ? {
                _id: submission._id,
                status: submission.status,
                submittedAt: submission.submittedAt,
                fileUrl: submission.fileUrl,
                textAnswer: submission.textAnswer,
                facultyRemark: submission.facultyRemark,
              }
            : null,
        };
      })
    );

    return res.status(200).json({
      assignments: assignmentsWithSubmission,
      count: assignmentsWithSubmission.length,
    });
  } catch (error) {
    console.error("Error in getStudentAssignments:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// POST /api/assignments/:assignmentId/submit - Submit assignment (Student only)
const submitAssignment = async (req, res) => {
  try {
    const studentId = req.user?.id;
    if (!studentId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const { assignmentId } = req.params;
    const { textAnswer } = req.body;

    // Verify assignment exists
    const assignment = await Assignment.findById(assignmentId).populate("classId");
    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    // Verify student is in the same class
    const student = await User.findById(studentId).select("className role");
    if (!student || student.role !== "student") {
      return res.status(403).json({ message: "Only students can submit assignments" });
    }

    if (student.className !== assignment.classId.className) {
      return res.status(403).json({
        message: "You are not enrolled in the class for this assignment",
      });
    }

    // Check if submission already exists
    const existingSubmission = await Submission.findOne({
      assignmentId,
      studentId,
    }).sort({ submittedAt: -1 });

    // If submission exists and status is Approved, prevent overwrite
    if (existingSubmission && existingSubmission.status === "Approved") {
      return res.status(400).json({
        message: "This assignment has already been approved and cannot be modified",
      });
    }

    // Handle file upload
    let fileUrl = null;
    if (req.file) {
      fileUrl = `/uploads/assignments/${req.file.filename}`;
    } else if (existingSubmission) {
      // For resubmission, keep existing file if no new file uploaded
      fileUrl = existingSubmission.fileUrl;
    }

    // Create or update submission
    let submission;
    if (existingSubmission && (existingSubmission.status === "Rejected" || existingSubmission.status === "Pending" || existingSubmission.status === "Rework")) {
      // Update existing submission
      existingSubmission.fileUrl = fileUrl || existingSubmission.fileUrl;
      existingSubmission.textAnswer = textAnswer || existingSubmission.textAnswer;
      existingSubmission.status = "Pending"; // Reset to Pending when resubmitting
      existingSubmission.submittedAt = new Date();
      existingSubmission.facultyRemark = ""; // Clear previous remark
      existingSubmission.updatedAt = new Date();
      await existingSubmission.save();
      submission = existingSubmission;
    } else {
      // Create new submission
      submission = new Submission({
        assignmentId,
        studentId,
        fileUrl: fileUrl || null,
        textAnswer: textAnswer || "",
        status: "Pending",
      });
      await submission.save();
    }

    // Populate for response
    await submission.populate("studentId", "name email studentID");
    await submission.populate("assignmentId", "title subject dueDate");

    return res.status(201).json({
      message: "Submission saved",
      submission,
    });
  } catch (error) {
    console.error("Error in submitAssignment:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/assignments/upcoming - Get upcoming deadlines for student
const getUpcomingDeadlines = async (req, res) => {
  try {
    const studentId = req.user?.id;
    if (!studentId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const student = await User.findById(studentId).select("className role");
    if (!student || student.role !== "student") {
      return res.status(403).json({ message: "Only students can view upcoming deadlines" });
    }

    if (!student.className) {
      return res.status(200).json({
        deadlines: [],
        count: 0,
      });
    }

    // Find class by className
    const classDoc = await ClassModel.findOne({ className: student.className });
    if (!classDoc) {
      return res.status(200).json({
        deadlines: [],
        count: 0,
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get assignments with dueDate >= today, status = Published, limit 3
    const assignments = await Assignment.find({
      classId: classDoc._id,
      status: "Published",
      dueDate: { $gte: today },
    })
      .populate("facultyId", "name email")
      .populate("classId", "className")
      .sort({ dueDate: 1 }) // Sort by due date ascending
      .limit(3);

    // Format for frontend
    const deadlines = assignments.map((assignment) => ({
      id: assignment._id,
      title: assignment.title,
      dueDate: assignment.dueDate,
      subject: assignment.subject,
      classId: assignment.classId?.className || student.className,
      faculty: assignment.facultyId?.name || "Faculty",
    }));

    return res.status(200).json({
      deadlines,
      count: deadlines.length,
    });
  } catch (error) {
    console.error("Error in getUpcomingDeadlines:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createAssignment,
  getFacultyAssignments,
  getStudentAssignments,
  getAssignmentDetails,
  submitAssignment,
  getAssignmentSubmissions,
  updateSubmissionStatus,
  getUpcomingDeadlines,
};

