const User = require("../models/userModel");
const jwt = require("jsonwebtoken");

// register user (plain text password for demo)
const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "Name, email, password and role are required" });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists. Try login" });
    }

    const user = new User({
      name,
      email,
      password, // plain text for academic demo
      role,
    });

    await user.save();

    return res.status(201).json({
      message: "User registered successfully",
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error("Error in registerUser:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// login user (plain text password comparison for demo)
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    // inbuilt admin credentials
    const isBuiltInAdmin =
      email === "admin@gmail.com" && password === "admin123";

    let user = await User.findOne({ email });

    if (!user && isBuiltInAdmin) {
      // create admin user on first login (plain text password for demo)
      user = await User.create({
        name: "Admin",
        email,
        password,
        role: "admin",
      });
    }

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    if (password !== user.password) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      message: "Login successful",
      token,
      role: user.role,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error("Error in loginUser:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// return profile from token
const getMe = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const user = await User.findById(userId).select("_id name email role");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Error in getMe:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = { registerUser, loginUser, getMe };
