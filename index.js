// Load environment variables from .env
require("dotenv").config();

// Import express
const express = require("express");

// Import cors for frontend connection
const cors = require("cors");

// Import database connection file
require("./db/connection.js");

// Import routes
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const eventRoutes = require("./routes/eventRoutes");
const classRoutes = require("./routes/classRoutes");
const studentRoutes = require("./routes/studentRoutes");
const leaveRoutes = require("./routes/leaveRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const facultyRoutes = require("./routes/facultyRoutes");
const assignmentRoutes = require("./routes/assignmentRoutes");
const complaintRoutes = require("./routes/complaintRoutes");
const lectureRoutes = require("./routes/lectureRoutes");
const gradeRoutes = require("./routes/gradeRoutes");
const examRoutes = require("./routes/examRoutes");
const communicationRoutes = require("./routes/communicationRoutes");
const skillRoutes = require("./routes/skillRoutes");

// Create server instance
const smartCampusServer = express();

// Enable CORS
smartCampusServer.use(cors());

// Middleware to parse JSON body
smartCampusServer.use(express.json());

// Serve static files (uploaded files)
const path = require("path");
smartCampusServer.use("/uploads", express.static(path.join(__dirname, "uploads")));

// TEST ROUTE - root
smartCampusServer.get("/", (req, res) => {
  res.status(200).send("Smart Campus Backend Running Successfully 🚀");
});

// auth routes
smartCampusServer.use("/api/auth", authRoutes);
// admin routes
smartCampusServer.use("/api/admin", adminRoutes);
// event routes
smartCampusServer.use("/api/events", eventRoutes);
// class routes - NEW REST API
smartCampusServer.use("/api/classes", classRoutes);
// student routes
smartCampusServer.use("/api/student", studentRoutes);
// leave routes
smartCampusServer.use("/api/leaves", leaveRoutes);
// attendance routes
smartCampusServer.use("/api/attendance", attendanceRoutes);
// faculty routes
smartCampusServer.use("/api/faculty", facultyRoutes);
// assignment routes
smartCampusServer.use("/api/assignments", assignmentRoutes);
// complaint routes
smartCampusServer.use("/api/complaints", complaintRoutes);
// lecture routes
smartCampusServer.use("/api/lectures", lectureRoutes);
// grade routes
smartCampusServer.use("/api/grades", gradeRoutes);
// exam routes
smartCampusServer.use("/api/exams", examRoutes);
// communication routes
smartCampusServer.use("/api/communication", communicationRoutes);
// skill routes
smartCampusServer.use("/api/skills", skillRoutes);

// Fixed server port = 3000
const PORT = 3000;

// Start server
smartCampusServer.listen(PORT, () => {
  console.log(`Smart Campus Server running at http://localhost:${PORT}`);
});
