const Complaint = require("../models/Complaint");
const User = require("../models/userModel");
const ClassModel = require("../models/classModel");

// ============================================
// STUDENT CONTROLLERS
// ============================================

// POST /api/complaints/student - Create complaint (Student only)
const createStudentComplaint = async (req, res) => {
  try {
    const studentId = req.user?.id;
    if (!studentId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const { title, description, category } = req.body;

    // Validation
    if (!title || !description) {
      return res.status(400).json({
        message: "Title and description are required",
      });
    }

    // Get student info
    const student = await User.findById(studentId);
    if (!student || student.role !== "student") {
      return res.status(403).json({ message: "Only students can create complaints" });
    }

    if (!student.className) {
      return res.status(400).json({
        message: "Student is not enrolled in any class",
      });
    }

    // Find student's class
    const classDoc = await ClassModel.findOne({ className: student.className });
    if (!classDoc) {
      return res.status(404).json({
        message: "Class not found for student",
      });
    }

    // Determine target faculty (class teacher or first available)
    let targetFacultyId = classDoc.classTeacher;
    if (!targetFacultyId && classDoc.subjects && classDoc.subjects.length > 0) {
      // Use first subject teacher if no class teacher
      targetFacultyId = classDoc.subjects[0].teacher;
    }

    if (!targetFacultyId) {
      return res.status(400).json({
        message: "No faculty assigned to this class",
      });
    }

    // Create complaint
    const complaint = new Complaint({
      title,
      description,
      category: category || "General",
      raisedBy: {
        userId: studentId,
        role: "student",
      },
      currentOwner: "faculty",
      status: "pending_faculty",
      targetClassId: classDoc._id,
      targetFacultyId: targetFacultyId,
      history: [
        {
          actorId: studentId,
          actorRole: "student",
          action: "Created",
          comment: "",
          createdAt: new Date(),
        },
      ],
    });

    await complaint.save();

    // Populate for response
    await complaint.populate("raisedBy.userId", "name email studentID");
    await complaint.populate("targetClassId", "className department");
    await complaint.populate("targetFacultyId", "name email");

    return res.status(201).json({
      message: "Complaint created successfully",
      complaint,
    });
  } catch (error) {
    console.error("Error in createStudentComplaint:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/complaints/student - Get student's complaints
const getStudentComplaints = async (req, res) => {
  try {
    const studentId = req.user?.id;
    if (!studentId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const complaints = await Complaint.find({
      "raisedBy.userId": studentId,
      "raisedBy.role": "student",
    })
      .populate("raisedBy.userId", "name email studentID")
      .populate("targetClassId", "className department")
      .populate("targetFacultyId", "name email")
      .populate("history.actorId", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      complaints,
      count: complaints.length,
    });
  } catch (error) {
    console.error("Error in getStudentComplaints:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// ============================================
// FACULTY CONTROLLERS
// ============================================

// GET /api/complaints/faculty/inbox - Get complaints from students (Faculty inbox)
const getFacultyInbox = async (req, res) => {
  try {
    const facultyId = req.user?.id;
    if (!facultyId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    // Get complaints where currentOwner is faculty and targetFacultyId matches
    const complaints = await Complaint.find({
      currentOwner: "faculty",
      targetFacultyId: facultyId,
      status: { $in: ["pending_faculty", "pending_admin"] },
    })
      .populate("raisedBy.userId", "name email studentID")
      .populate("targetClassId", "className department")
      .populate("targetFacultyId", "name email")
      .populate("history.actorId", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      complaints,
      count: complaints.length,
    });
  } catch (error) {
    console.error("Error in getFacultyInbox:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// POST /api/complaints/faculty - Create complaint (Faculty to Admin)
const createFacultyComplaint = async (req, res) => {
  try {
    const facultyId = req.user?.id;
    if (!facultyId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const { title, description, category } = req.body;

    // Validation
    if (!title || !description) {
      return res.status(400).json({
        message: "Title and description are required",
      });
    }

    // Get faculty info
    const faculty = await User.findById(facultyId);
    if (!faculty || faculty.role !== "faculty") {
      return res.status(403).json({ message: "Only faculty can create complaints" });
    }

    // Create complaint - goes directly to admin
    const complaint = new Complaint({
      title,
      description,
      category: category || "General",
      raisedBy: {
        userId: facultyId,
        role: "faculty",
      },
      currentOwner: "admin",
      status: "pending_admin",
      history: [
        {
          actorId: facultyId,
          actorRole: "faculty",
          action: "Created",
          comment: "",
          createdAt: new Date(),
        },
      ],
    });

    await complaint.save();

    // Populate for response
    await complaint.populate("raisedBy.userId", "name email");
    await complaint.populate("history.actorId", "name email");

    return res.status(201).json({
      message: "Complaint created successfully",
      complaint,
    });
  } catch (error) {
    console.error("Error in createFacultyComplaint:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/complaints/faculty/my-complaints - Get faculty's own complaints
const getFacultyComplaints = async (req, res) => {
  try {
    const facultyId = req.user?.id;
    if (!facultyId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const complaints = await Complaint.find({
      "raisedBy.userId": facultyId,
      "raisedBy.role": "faculty",
    })
      .populate("raisedBy.userId", "name email")
      .populate("history.actorId", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      complaints,
      count: complaints.length,
    });
  } catch (error) {
    console.error("Error in getFacultyComplaints:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/complaints/faculty/admin-resolved - Get admin-resolved complaints needing faculty action
const getAdminResolvedComplaints = async (req, res) => {
  try {
    const facultyId = req.user?.id;
    if (!facultyId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    // Get complaints that:
    // 1. Were originally from a student (raisedBy.role = "student")
    // 2. Were resolved by admin (status = "resolved")
    // 3. Are now back with faculty (currentOwner = "faculty")
    // 4. Target faculty matches
    const complaints = await Complaint.find({
      "raisedBy.role": "student",
      status: "resolved",
      currentOwner: "faculty",
      targetFacultyId: facultyId,
    })
      .populate("raisedBy.userId", "name email studentID")
      .populate("targetClassId", "className department")
      .populate("targetFacultyId", "name email")
      .populate("history.actorId", "name email")
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      complaints,
      count: complaints.length,
    });
  } catch (error) {
    console.error("Error in getAdminResolvedComplaints:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// PATCH /api/complaints/faculty/:id/action - Faculty action (resolve, reject, escalate)
const facultyAction = async (req, res) => {
  try {
    const facultyId = req.user?.id;
    if (!facultyId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const { id } = req.params;
    const { actionType, comment } = req.body;

    // Validation
    if (!actionType || !["resolve", "reject", "escalate", "ack-admin-resolution"].includes(actionType)) {
      return res.status(400).json({
        message: "Valid actionType (resolve, reject, escalate, ack-admin-resolution) is required",
      });
    }

    // Find complaint
    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    // Verify faculty has access
    if (complaint.targetFacultyId?.toString() !== facultyId.toString()) {
      return res.status(403).json({
        message: "You are not authorized to act on this complaint",
      });
    }

    // Handle different actions
    if (actionType === "resolve") {
      // Faculty resolves - goes back to student as resolved
      complaint.status = "resolved";
      complaint.currentOwner = "student";
      complaint.history.push({
        actorId: facultyId,
        actorRole: "faculty",
        action: "Resolved",
        comment: comment || "",
        createdAt: new Date(),
      });
    } else if (actionType === "reject") {
      // Faculty rejects - goes back to student as rejected
      complaint.status = "rejected";
      complaint.currentOwner = "student";
      complaint.history.push({
        actorId: facultyId,
        actorRole: "faculty",
        action: "Rejected",
        comment: comment || "",
        createdAt: new Date(),
      });
    } else if (actionType === "escalate") {
      // Faculty escalates to admin
      complaint.status = "pending_admin";
      complaint.currentOwner = "admin";
      complaint.history.push({
        actorId: facultyId,
        actorRole: "faculty",
        action: "EscalatedToAdmin",
        comment: comment || "",
        createdAt: new Date(),
      });
    } else if (actionType === "ack-admin-resolution") {
      // Faculty acknowledges admin resolution and finalizes to student
      complaint.currentOwner = "student";
      complaint.history.push({
        actorId: facultyId,
        actorRole: "faculty",
        action: "MarkedResolvedForStudent",
        comment: comment || "Resolved as per admin decision",
        createdAt: new Date(),
      });
    }

    await complaint.save();

    // Populate for response
    await complaint.populate("raisedBy.userId", "name email studentID");
    await complaint.populate("targetClassId", "className department");
    await complaint.populate("targetFacultyId", "name email");
    await complaint.populate("history.actorId", "name email");

    return res.status(200).json({
      message: "Action performed successfully",
      complaint,
    });
  } catch (error) {
    console.error("Error in facultyAction:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// ============================================
// ADMIN CONTROLLERS
// ============================================

// GET /api/complaints/admin/inbox - Get admin's inbox
const getAdminInbox = async (req, res) => {
  try {
    // Get complaints where currentOwner is admin
    const complaints = await Complaint.find({
      currentOwner: "admin",
    })
      .populate("raisedBy.userId", "name email studentID")
      .populate("targetClassId", "className department")
      .populate("targetFacultyId", "name email")
      .populate("history.actorId", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      complaints,
      count: complaints.length,
    });
  } catch (error) {
    console.error("Error in getAdminInbox:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// PATCH /api/complaints/admin/:id/action - Admin action (resolve, reject, comment)
const adminAction = async (req, res) => {
  try {
    const adminId = req.user?.id;
    if (!adminId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const { id } = req.params;
    const { actionType, comment } = req.body;

    // Validation
    if (!actionType || !["resolve", "reject", "comment"].includes(actionType)) {
      return res.status(400).json({
        message: "Valid actionType (resolve, reject, comment) is required",
      });
    }

    // Find complaint
    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    // Verify admin has access
    if (complaint.currentOwner !== "admin") {
      return res.status(403).json({
        message: "This complaint is not currently assigned to admin",
      });
    }

    // Handle different actions
    if (actionType === "resolve") {
      // Admin resolves
      complaint.status = "resolved";
      
      // If complaint originated from student, send back to faculty first
      if (complaint.raisedBy.role === "student") {
        complaint.currentOwner = "faculty";
        complaint.history.push({
          actorId: adminId,
          actorRole: "admin",
          action: "AdminResolved",
          comment: comment || "",
          createdAt: new Date(),
        });
      } else {
        // If from faculty, resolve directly to faculty
        complaint.currentOwner = "faculty";
        complaint.history.push({
          actorId: adminId,
          actorRole: "admin",
          action: "Resolved",
          comment: comment || "",
          createdAt: new Date(),
        });
      }
    } else if (actionType === "reject") {
      // Admin rejects - goes back to source
      complaint.status = "rejected";
      complaint.currentOwner = complaint.raisedBy.role; // student or faculty
      complaint.history.push({
        actorId: adminId,
        actorRole: "admin",
        action: "Rejected",
        comment: comment || "",
        createdAt: new Date(),
      });
    } else if (actionType === "comment") {
      // Admin adds comment without changing ownership
      if (!comment) {
        return res.status(400).json({ message: "Comment is required" });
      }
      complaint.history.push({
        actorId: adminId,
        actorRole: "admin",
        action: "Comment",
        comment: comment,
        createdAt: new Date(),
      });
    }

    await complaint.save();

    // Populate for response
    await complaint.populate("raisedBy.userId", "name email studentID");
    await complaint.populate("targetClassId", "className department");
    await complaint.populate("targetFacultyId", "name email");
    await complaint.populate("history.actorId", "name email");

    return res.status(200).json({
      message: "Action performed successfully",
      complaint,
    });
  } catch (error) {
    console.error("Error in adminAction:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// ============================================
// COMMON CONTROLLERS
// ============================================

// GET /api/complaints/:id - Get complaint details
const getComplaintDetails = async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    if (!userId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const { id } = req.params;

    const complaint = await Complaint.findById(id)
      .populate("raisedBy.userId", "name email studentID")
      .populate("targetClassId", "className department")
      .populate("targetFacultyId", "name email")
      .populate("history.actorId", "name email");

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    // Verify access based on role
    if (userRole === "student") {
      // Student can only see their own complaints
      if (complaint.raisedBy.userId._id.toString() !== userId.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }
    } else if (userRole === "faculty") {
      // Faculty can see complaints assigned to them or their own complaints
      const isAssigned = complaint.targetFacultyId?._id?.toString() === userId.toString();
      const isOwnComplaint = complaint.raisedBy.userId._id.toString() === userId.toString() && 
                            complaint.raisedBy.role === "faculty";
      if (!isAssigned && !isOwnComplaint) {
        return res.status(403).json({ message: "Access denied" });
      }
    } else if (userRole !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    return res.status(200).json({
      complaint,
    });
  } catch (error) {
    console.error("Error in getComplaintDetails:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  // Student
  createStudentComplaint,
  getStudentComplaints,
  // Faculty
  getFacultyInbox,
  createFacultyComplaint,
  getFacultyComplaints,
  getAdminResolvedComplaints,
  facultyAction,
  // Admin
  getAdminInbox,
  adminAction,
  // Common
  getComplaintDetails,
};

