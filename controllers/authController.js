const User = require("../models/userModel");
const ClassModel = require("../models/classModel");
const jwt = require("jsonwebtoken");

// register user (plain text password for demo)
const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, phone, department } = req.body;

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
      phone,
      department,
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

    const user = await User.findById(userId).select(
      "_id name email role className studentID phone address department"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        className: user.className || "",
        studentID: user.studentID || "",
        phone: user.phone || "",
        address: user.address || "",
        department: user.department || "",
      },
    });
  } catch (error) {
    console.error("Error in getMe:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// update profile (student only)
const updateProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role !== "student") {
      return res.status(403).json({ message: "Only students can update this profile" });
    }

    const { name, className, studentID, phone, address, department } = req.body;

    // validation
    if (!studentID) {
      return res.status(400).json({ message: "Student ID is required" });
    }

    if (!className) {
      return res.status(400).json({ message: "Class name is required" });
    }

    // unique studentID check (sparse allowed)
    const existingWithStudentID = await User.findOne({
      studentID,
      _id: { $ne: userId },
    });
    if (existingWithStudentID) {
      return res.status(400).json({ message: "Student ID already in use" });
    }

    const oldClassName = user.className;
    
    if (name) user.name = name;
    user.className = className;
    user.studentID = studentID;
    user.phone = phone;
    user.address = address;
    user.department = department;

    await user.save();

    // update class students array if className changed
    if (className && className !== oldClassName) {
      // remove from old class if exists
      if (oldClassName) {
        const oldClass = await ClassModel.findOne({ className: oldClassName });
        if (oldClass) {
          oldClass.students = oldClass.students.filter(
            (id) => id.toString() !== userId.toString()
          );
          await oldClass.save();
        }
      }

      // add to new class
      const newClass = await ClassModel.findOne({ className });
      if (newClass) {
        const studentIdStr = userId.toString();
        const exists = newClass.students.some(
          (id) => id.toString() === studentIdStr
        );
        if (!exists) {
          newClass.students.push(userId);
          await newClass.save();
        }
      }
    } else if (className && className === oldClassName) {
      // ensure student is in the class's students array even if className didn't change
      const classDoc = await ClassModel.findOne({ className });
      if (classDoc) {
        const studentIdStr = userId.toString();
        const exists = classDoc.students.some(
          (id) => id.toString() === studentIdStr
        );
        if (!exists) {
          classDoc.students.push(userId);
          await classDoc.save();
        }
      }
    }

    return res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        className: user.className || "",
        studentID: user.studentID || "",
        phone: user.phone || "",
        address: user.address || "",
        department: user.department || "",
      },
    });
  } catch (error) {
    console.error("Error in updateProfile:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = { registerUser, loginUser, getMe, updateProfile };
