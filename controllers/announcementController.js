const Announcement = require("../models/announcementModel");
const User = require("../models/userModel");
const ClassModel = require("../models/classModel");

// POST /api/announcements/create - Create announcement (Faculty/Admin only)
const createAnnouncement = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const { title, message, priority, targetAudience, expiresAt, classes } = req.body;

    // Validation
    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Message is required" });
    }
    if (!priority || !["high", "medium", "low"].includes(priority)) {
      return res.status(400).json({ message: "Valid priority is required" });
    }

    // Verify user is faculty or admin
    const user = await User.findById(userId);
    if (!user || (user.role !== "faculty" && user.role !== "admin")) {
      return res.status(403).json({
        message: "Only faculty or admin can create announcements",
      });
    }

    // If faculty, restrict targetAudience
    if (user.role === "faculty" && targetAudience === "faculty") {
      return res.status(403).json({
        message: "Faculty cannot create announcements for other faculty",
      });
    }

    // Create announcement
    const announcement = await Announcement.create({
      title: title.trim(),
      message: message.trim(),
      priority,
      createdBy: userId,
      targetAudience: targetAudience || "students",
      expiresAt: expiresAt || null,
      classes: classes || [],
    });

    await announcement.populate("createdBy", "name email role");

    return res.status(201).json({
      message: "Announcement created successfully",
      announcement,
    });
  } catch (error) {
    console.error("Error in createAnnouncement:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/announcements/all - Get all announcements (Admin only)
const getAllAnnouncements = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const user = await User.findById(userId);
    if (!user || user.role !== "admin") {
      return res.status(403).json({
        message: "Only admin can view all announcements",
      });
    }

    const announcements = await Announcement.find()
      .populate("createdBy", "name email role")
      .sort({ priority: 1, createdAt: -1 }); // Sort by priority (high first), then date

    // Filter out expired announcements
    const now = new Date();
    const activeAnnouncements = announcements.filter((ann) => {
      if (!ann.expiresAt) return true;
      return new Date(ann.expiresAt) > now;
    });

    return res.status(200).json({
      announcements: activeAnnouncements,
      count: activeAnnouncements.length,
    });
  } catch (error) {
    console.error("Error in getAllAnnouncements:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/announcements/student - Get announcements for student
const getStudentAnnouncements = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const student = await User.findById(userId);
    if (!student || student.role !== "student") {
      return res.status(403).json({
        message: "Only students can access this endpoint",
      });
    }

    const now = new Date();
    const studentClassName = student.className;

    // Find announcements that are:
    // 1. Target audience is "students" or "all"
    // 2. Not expired
    // 3. Either global (no classes) or class-specific (includes student's class)
    const announcements = await Announcement.find({
      $and: [
        {
          $or: [
            { targetAudience: "students" },
            { targetAudience: "all" },
          ],
        },
        {
          $or: [
            { classes: { $size: 0 } }, // Global announcements
            { classes: { $in: [studentClassName] } }, // Class-specific announcements
          ],
        },
        {
          $or: [
            { expiresAt: null },
            { expiresAt: { $gt: now } },
          ],
        },
      ],
    })
      .populate("createdBy", "name email role")
      .sort({ priority: 1, createdAt: -1 }); // High priority first, then newest

    return res.status(200).json({
      announcements,
      count: announcements.length,
    });
  } catch (error) {
    console.error("Error in getStudentAnnouncements:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/announcements/faculty - Get announcements created by faculty
const getFacultyAnnouncements = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const user = await User.findById(userId);
    if (!user || user.role !== "faculty") {
      return res.status(403).json({
        message: "Only faculty can access this endpoint",
      });
    }

    const announcements = await Announcement.find({ createdBy: userId })
      .populate("createdBy", "name email role")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      announcements,
      count: announcements.length,
    });
  } catch (error) {
    console.error("Error in getFacultyAnnouncements:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// DELETE /api/announcements/:id - Delete announcement
const deleteAnnouncement = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const { id } = req.params;
    const user = await User.findById(userId);

    if (!user || (user.role !== "admin" && user.role !== "faculty")) {
      return res.status(403).json({
        message: "Only admin or faculty can delete announcements",
      });
    }

    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    // Faculty can only delete their own announcements
    if (user.role === "faculty" && announcement.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({
        message: "You can only delete your own announcements",
      });
    }

    await Announcement.findByIdAndDelete(id);

    return res.status(200).json({
      message: "Announcement deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteAnnouncement:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/announcements/:id - Update announcement
const updateAnnouncement = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const { id } = req.params;
    const { title, message, priority, targetAudience, expiresAt, classes } = req.body;

    const user = await User.findById(userId);
    if (!user || (user.role !== "admin" && user.role !== "faculty")) {
      return res.status(403).json({
        message: "Only admin or faculty can update announcements",
      });
    }

    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    // Faculty can only update their own announcements
    if (user.role === "faculty" && announcement.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({
        message: "You can only update your own announcements",
      });
    }

    // Update fields
    if (title) announcement.title = title.trim();
    if (message) announcement.message = message.trim();
    if (priority) announcement.priority = priority;
    if (targetAudience) announcement.targetAudience = targetAudience;
    if (expiresAt !== undefined) announcement.expiresAt = expiresAt;
    if (classes) announcement.classes = classes;

    await announcement.save();
    await announcement.populate("createdBy", "name email role");

    return res.status(200).json({
      message: "Announcement updated successfully",
      announcement,
    });
  } catch (error) {
    console.error("Error in updateAnnouncement:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createAnnouncement,
  getAllAnnouncements,
  getStudentAnnouncements,
  getFacultyAnnouncements,
  deleteAnnouncement,
  updateAnnouncement,
};

