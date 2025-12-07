const Message = require("../models/messageModel");
const User = require("../models/userModel");
const ClassModel = require("../models/classModel");

// POST /api/communication/send - Send a message
const sendMessage = async (req, res) => {
  try {
    const { subject, body, mode, targetRole, targetClassId, targetUserId } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Validate required fields
    if (!subject || !body || !mode) {
      return res.status(400).json({ message: "Subject, body, and mode are required" });
    }

    // Students cannot send messages
    if (userRole === "student") {
      return res.status(403).json({ message: "Students cannot send messages" });
    }

    let targetType = null;
    let targetUser = null;
    let targetRoleValue = null;
    let targetClass = null;

    // ADMIN permissions
    if (userRole === "admin") {
      if (mode === "role") {
        if (!targetRole || !["student", "faculty", "hr"].includes(targetRole)) {
          return res.status(400).json({ message: "Invalid targetRole for role broadcast" });
        }
        targetType = "role";
        targetRoleValue = targetRole;
      } else if (mode === "class") {
        if (!targetClassId) {
          return res.status(400).json({ message: "targetClassId is required for class broadcast" });
        }
        const classExists = await ClassModel.findById(targetClassId);
        if (!classExists) {
          return res.status(404).json({ message: "Class not found" });
        }
        targetType = "class";
        targetClass = targetClassId;
      } else if (mode === "user") {
        if (!targetUserId) {
          return res.status(400).json({ message: "targetUserId is required for direct message" });
        }
        const userExists = await User.findById(targetUserId);
        if (!userExists) {
          return res.status(404).json({ message: "User not found" });
        }
        targetType = "user";
        targetUser = targetUserId;
      } else {
        return res.status(400).json({ message: "Invalid mode. Use 'role', 'class', or 'user'" });
      }
    }
    // FACULTY permissions
    else if (userRole === "faculty") {
      if (mode === "class") {
        if (!targetClassId) {
          return res.status(400).json({ message: "targetClassId is required" });
        }
        // Check if faculty is assigned to this class (as class teacher or subject teacher)
        const classData = await ClassModel.findById(targetClassId);
        if (!classData) {
          return res.status(404).json({ message: "Class not found" });
        }
        const isClassTeacher = classData.classTeacher?.toString() === userId;
        const isSubjectTeacher = classData.subjects.some(
          (sub) => sub.teacher?.toString() === userId
        );
        if (!isClassTeacher && !isSubjectTeacher) {
          return res.status(403).json({ message: "You are not assigned to this class" });
        }
        targetType = "class";
        targetClass = targetClassId;
      } else if (mode === "user") {
        if (!targetUserId) {
          return res.status(400).json({ message: "targetUserId is required" });
        }
        const targetUserData = await User.findById(targetUserId);
        if (!targetUserData) {
          return res.status(404).json({ message: "User not found" });
        }
        // Faculty can message: students in their classes OR admin
        if (targetUserData.role === "admin") {
          targetType = "user";
          targetUser = targetUserId;
        } else if (targetUserData.role === "student") {
          // Check if student is in any of faculty's classes
          const facultyClasses = await ClassModel.find({
            $or: [
              { classTeacher: userId },
              { "subjects.teacher": userId },
            ],
          });
          const studentInClass = facultyClasses.some((cls) =>
            cls.students.some((sid) => sid.toString() === targetUserId)
          );
          if (!studentInClass) {
            return res.status(403).json({ message: "Student is not in your classes" });
          }
          targetType = "user";
          targetUser = targetUserId;
        } else {
          return res.status(403).json({ message: "You can only message students in your classes or admin" });
        }
      } else {
        return res.status(403).json({ message: "Faculty can only send class or user messages" });
      }
    }
    // HR permissions
    else if (userRole === "hr") {
      if (mode === "user") {
        if (!targetUserId) {
          return res.status(400).json({ message: "targetUserId is required" });
        }
        const targetUserData = await User.findById(targetUserId);
        if (!targetUserData) {
          return res.status(404).json({ message: "User not found" });
        }
        // HR can only message admin
        if (targetUserData.role !== "admin") {
          return res.status(403).json({ message: "HR can only send messages to admin" });
        }
        targetType = "user";
        targetUser = targetUserId;
      } else {
        return res.status(403).json({ message: "HR can only send user messages to admin" });
      }
    }

    // Create message
    const newMessage = await Message.create({
      sender: userId,
      senderRole: userRole,
      targetType,
      targetUser,
      targetRole: targetRoleValue,
      targetClass,
      subject: subject.trim(),
      body: body.trim(),
    });

    return res.status(201).json({
      message: "Message sent successfully",
      messageId: newMessage._id,
    });
  } catch (error) {
    console.error("Error in sendMessage:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/communication/inbox - Get inbox messages
const getInbox = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get user's classes if student or faculty
    let userClassIds = [];
    if (userRole === "student" || userRole === "faculty") {
      const userData = await User.findById(userId);
      
      // Check by className
      if (userData && userData.className) {
        const classData = await ClassModel.findOne({ className: userData.className });
        if (classData) {
          userClassIds.push(classData._id);
        }
      }
      
      // For students, also check if they're in any class's students array
      if (userRole === "student") {
        const classesWithStudent = await ClassModel.find({ students: userId }).select("_id");
        classesWithStudent.forEach((cls) => {
          if (!userClassIds.includes(cls._id)) {
            userClassIds.push(cls._id);
          }
        });
      }
      
      // For faculty, also check classes where they are assigned
      if (userRole === "faculty") {
        const facultyClasses = await ClassModel.find({
          $or: [
            { classTeacher: userId },
            { "subjects.teacher": userId },
          ],
        }).select("_id");
        facultyClasses.forEach((cls) => {
          if (!userClassIds.includes(cls._id)) {
            userClassIds.push(cls._id);
          }
        });
      }
    }

    // Build query: messages where user should see them
    const query = {
      $or: [
        // Direct messages to this user
        { targetType: "user", targetUser: userId },
        // Role broadcasts matching user's role
        { targetType: "role", targetRole: userRole },
      ],
    };

    // For students and faculty, also include class messages
    if (userClassIds.length > 0) {
      query.$or.push({ targetType: "class", targetClass: { $in: userClassIds } });
    }

    const messages = await Message.find(query)
      .populate("sender", "name role")
      .sort({ createdAt: -1 });

    // Format response
    const formattedMessages = messages.map((msg) => ({
      id: msg._id,
      subject: msg.subject,
      body: msg.body,
      preview: msg.body.length > 100 ? msg.body.substring(0, 100) + "..." : msg.body,
      from: msg.sender?.name || "Unknown",
      role: msg.senderRole,
      timestamp: msg.createdAt.toISOString(),
      createdAt: msg.createdAt,
    }));

    return res.status(200).json({
      messages: formattedMessages,
      count: formattedMessages.length,
    });
  } catch (error) {
    console.error("Error in getInbox:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/communication/sent - Get sent messages
const getSent = async (req, res) => {
  try {
    const userId = req.user.id;

    const messages = await Message.find({ sender: userId })
      .populate("targetUser", "name email")
      .populate("targetClass", "className")
      .sort({ createdAt: -1 });

    // Format response
    const formattedMessages = messages.map((msg) => {
      let to = "";
      if (msg.targetType === "user" && msg.targetUser) {
        to = msg.targetUser.name || "Unknown";
      } else if (msg.targetType === "role") {
        to = `All ${msg.targetRole}`;
      } else if (msg.targetType === "class" && msg.targetClass) {
        to = msg.targetClass.className || "Unknown Class";
      }

      return {
        id: msg._id,
        subject: msg.subject,
        body: msg.body,
        preview: msg.body.length > 100 ? msg.body.substring(0, 100) + "..." : msg.body,
        to,
        audience: msg.targetType === "role" ? `All ${msg.targetRole}` : msg.targetType === "class" ? msg.targetClass?.className : null,
        targetType: msg.targetType,
        timestamp: msg.createdAt.toISOString(),
        createdAt: msg.createdAt,
      };
    });

    return res.status(200).json({
      messages: formattedMessages,
      count: formattedMessages.length,
    });
  } catch (error) {
    console.error("Error in getSent:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  sendMessage,
  getInbox,
  getSent,
};

