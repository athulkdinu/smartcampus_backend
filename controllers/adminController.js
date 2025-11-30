const User = require("../models/userModel");

// admin create user (plain text password for demo)
const createUserByAdmin = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res
        .status(400)
        .json({ message: "Name, email, password and role are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User with this email already exists" });
    }

    const user = await User.create({
      name,
      email,
      password, // plain text for academic demo
      role,
    });

    return res.status(201).json({
      message: "User created successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Error in createUserByAdmin:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// admin get all users (without password)
const getAllUsers = async (_req, res) => {
  try {
    const users = await User.find({}).select("-password").sort({ createdAt: -1 });
    
    console.log(`[getAllUsers] Total users found: ${users.length}`);

    const mappedUsers = users.map((user) => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    }));
    
    console.log(`[getAllUsers] Returning ${mappedUsers.length} users to frontend`);

    return res.status(200).json({
      users: mappedUsers,
    });
  } catch (error) {
    console.error("Error in getAllUsers:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// admin get all faculty only - ALWAYS fetch fresh from DB
const getAllFaculty = async (_req, res) => {
  try {
    // Direct query - NO limits, NO caching, NO filtering by Class
    const faculty = await User.find({ role: "faculty" })
      .select("_id name email department")
      .sort({ name: 1 })
      .lean(); // Use lean() for better performance
    
    console.log(`[getAllFaculty] Query returned ${faculty.length} faculty from User collection`);
    
    // Log each faculty for debugging
    faculty.forEach((f, idx) => {
      console.log(`[getAllFaculty] ${idx + 1}. ${f.name} (${f.email}) - ID: ${f._id}`);
    });

    // Map to consistent format
    const mappedFaculty = faculty.map((user) => ({
      _id: user._id.toString(),
      id: user._id.toString(), // Support both _id and id
      name: user.name,
      email: user.email,
      department: user.department || null,
    }));

    console.log(`[getAllFaculty] Returning ${mappedFaculty.length} faculty to frontend`);

    // Return as array directly (not wrapped in object)
    return res.status(200).json(mappedFaculty);
  } catch (error) {
    console.error("Error in getAllFaculty:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  createUserByAdmin,
  getAllUsers,
  getAllFaculty,
};


