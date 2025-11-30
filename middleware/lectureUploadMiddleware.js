const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Create uploads/lectures directory if it doesn't exist
const uploadsDir = path.join(__dirname, "../uploads/lectures");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage for lecture files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `lecture-${uniqueSuffix}${ext}`);
  },
});

// File filter - allow common document types
const fileFilter = (req, file, cb) => {
  // Allow all file types for lecture materials
  cb(null, true);
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for lecture materials
  },
  fileFilter: fileFilter,
});

module.exports = upload.single("file");

