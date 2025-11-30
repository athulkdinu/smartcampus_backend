const Leave = require("../models/leaveModel");
const User = require("../models/userModel");
const ClassModel = require("../models/classModel");

// student: create leave request
const createLeaveRequest = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const user = await User.findById(userId);
    if (!user || user.role !== "student") {
      return res
        .status(403)
        .json({ message: "Only students can create leave requests" });
    }

    const { reason, startDate, endDate } = req.body;

    if (!reason || !startDate || !endDate) {
      return res
        .status(400)
        .json({ message: "Reason, start date, and end date are required" });
    }

    const fileUrl = req.file
      ? `/uploads/leaves/${req.file.filename}`
      : null;
    const fileName = req.file ? req.file.originalname : null;

    const leaveRequest = await Leave.create({
      student: userId,
      reason,
      startDate,
      endDate,
      fileUrl,
      fileName,
    });

    const populated = await Leave.findById(leaveRequest._id)
      .populate({
        path: "student",
        select: "name email studentID className",
      })
      .populate({
        path: "reviewedBy",
        select: "name email",
      });

    return res.status(201).json({
      message: "Leave request created successfully",
      leaveRequest: populated,
    });
  } catch (error) {
    console.error("Error in createLeaveRequest:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// student: get own leave requests
const getStudentLeaveRequests = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const leaves = await Leave.find({ student: userId })
      .populate({
        path: "student",
        select: "name email studentID className",
      })
      .populate({
        path: "reviewedBy",
        select: "name email",
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({ leaveRequests: leaves });
  } catch (error) {
    console.error("Error in getStudentLeaveRequests:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// faculty: get leave requests only from students in their assigned classes
const getFacultyLeaveRequests = async (req, res) => {
  try {
    const facultyId = req.user?.id;
    if (!facultyId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const faculty = await User.findById(facultyId);
    if (!faculty || faculty.role !== "faculty") {
      return res
        .status(403)
        .json({ message: "Only faculty can view leave requests" });
    }

    // Find all classes where this faculty is the class teacher
    const classes = await ClassModel.find({
      classTeacher: facultyId,
    }).select("className");

    if (classes.length === 0) {
      // If faculty is not a class teacher of any class, return empty array
      return res.status(200).json({ leaveRequests: [] });
    }

    // Get class names
    const classNames = classes.map((cls) => cls.className);

    // Find all students who belong to these classes
    const students = await User.find({
      role: "student",
      className: { $in: classNames },
    }).select("_id");

    const studentIds = students.map((s) => s._id);

    // Get leave requests only from these students
    const leaves = await Leave.find({
      student: { $in: studentIds },
    })
      .populate({
        path: "student",
        select: "name email studentID className",
      })
      .populate({
        path: "reviewedBy",
        select: "name email",
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({ leaveRequests: leaves });
  } catch (error) {
    console.error("Error in getFacultyLeaveRequests:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// faculty: update leave request status (approve/reject)
const updateLeaveStatus = async (req, res) => {
  try {
    const facultyId = req.user?.id;
    if (!facultyId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const faculty = await User.findById(facultyId);
    if (!faculty || faculty.role !== "faculty") {
      return res
        .status(403)
        .json({ message: "Only faculty can update leave request status" });
    }

    const { id } = req.params;
    const { status, remarks } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res
        .status(400)
        .json({ message: "Status must be 'approved' or 'rejected'" });
    }

    const leaveRequest = await Leave.findById(id).populate(
      "student",
      "name email studentID className"
    );
    if (!leaveRequest) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    // Verify that this faculty is the class teacher of the student's class
    if (leaveRequest.student && leaveRequest.student.className) {
      const studentClass = await ClassModel.findOne({
        className: leaveRequest.student.className,
      });

      if (!studentClass || studentClass.classTeacher?.toString() !== facultyId.toString()) {
        return res.status(403).json({
          message: "You can only approve/reject leave requests from students in your assigned classes",
        });
      }
    }

    leaveRequest.status = status;
    leaveRequest.reviewedBy = facultyId;
    leaveRequest.reviewedAt = new Date();
    if (remarks) {
      leaveRequest.remarks = remarks;
    }

    await leaveRequest.save();

    const populated = await Leave.findById(leaveRequest._id)
      .populate({
        path: "student",
        select: "name email studentID className",
      })
      .populate({
        path: "reviewedBy",
        select: "name email",
      });

    return res.status(200).json({
      message: `Leave request ${status} successfully`,
      leaveRequest: populated,
    });
  } catch (error) {
    console.error("Error in updateLeaveStatus:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createLeaveRequest,
  getStudentLeaveRequests,
  getFacultyLeaveRequests,
  updateLeaveStatus,
};

