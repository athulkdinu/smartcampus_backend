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

module.exports = {
  createEvent,
};


