const Event = require("../models/eventModel");
const User = require("../models/userModel");

// create event (student, faculty, admin)
const createEvent = async (req, res) => {
  try {
    const { title, description, date, time, location, section, facultyInCharge, origin } =
      req.body;

    if (!title || !date || !time) {
      return res
        .status(400)
        .json({ message: "Title, date and time are required" });
    }

    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId || !userRole) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const user = await User.findById(userId).select("name role");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // default status based on role
    let status = "pending";
    if (user.role === "admin") {
      status = "approved";
    }

    const event = await Event.create({
      title: title.trim(),
      description: description?.trim(),
      date,
      time,
      location,
      section,
      facultyInCharge,
      status,
      origin,
      submittedByName: user.name,
      submittedByRole: user.role,
      createdBy: user._id,
      forwardedToAdmin: user.role === "faculty" ? true : undefined,
    });

    return res.status(201).json({
      message: "Event created successfully",
      event,
    });
  } catch (error) {
    console.error("Error in createEvent:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// student: approved events only
const getStudentApprovedEvents = async (_req, res) => {
  try {
    const events = await Event.find({ status: "approved" }).sort({
      date: 1,
      time: 1,
    });

    return res.status(200).json({ events });
  } catch (error) {
    console.error("Error in getStudentApprovedEvents:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// student: own pending proposals
const getStudentProposals = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const events = await Event.find({
      createdBy: userId,
      submittedByRole: "student",
      status: "pending",
    }).sort({ createdAt: -1 });

    return res.status(200).json({ events });
  } catch (error) {
    console.error("Error in getStudentProposals:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// faculty: see student-originated events for review
const getFacultyRequests = async (_req, res) => {
  try {
    const events = await Event.find({
      submittedByRole: "student",
    }).sort({ createdAt: -1 });

    return res.status(200).json({ events });
  } catch (error) {
    console.error("Error in getFacultyRequests:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// update status / forward (faculty or admin)
const updateEventStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'approved' | 'rejected' | 'forward'

    if (!action) {
      return res.status(400).json({ message: "Action is required" });
    }

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (action === "forward") {
      event.status = "forwarded";
      event.forwardedToAdmin = true;
    } else if (["approved", "rejected"].includes(action)) {
      event.status = action;
    } else {
      return res.status(400).json({ message: "Invalid action" });
    }

    await event.save();

    return res.status(200).json({
      message: "Event updated successfully",
      event,
    });
  } catch (error) {
    console.error("Error in updateEventStatus:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// admin: see faculty-forwarded + admin-created events
const getAdminEvents = async (_req, res) => {
  try {
    const events = await Event.find({
      $or: [{ forwardedToAdmin: true }, { submittedByRole: "admin" }],
    }).sort({ createdAt: -1 });

    return res.status(200).json({ events });
  } catch (error) {
    console.error("Error in getAdminEvents:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createEvent,
  getStudentApprovedEvents,
  getStudentProposals,
  getFacultyRequests,
  updateEventStatus,
  getAdminEvents,
};


