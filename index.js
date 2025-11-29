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

// Create server instance
const smartCampusServer = express();

// Enable CORS
smartCampusServer.use(cors());

// Middleware to parse JSON body
smartCampusServer.use(express.json());

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
// class routes (admin + faculty + shared)
smartCampusServer.use("/api/admin/classes", classRoutes);
// student routes
smartCampusServer.use("/api/student", studentRoutes);

// Fixed server port = 3000
const PORT = 3000;

// Start server
smartCampusServer.listen(PORT, () => {
  console.log(`Smart Campus Server running at http://localhost:${PORT}`);
});
