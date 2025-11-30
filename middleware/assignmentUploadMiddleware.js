const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Create uploads/assignments directory if it doesn't exist
const uploadsDir = path.join(__dirname, "../uploads/assignments");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage for assignment files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `assignment-${uniqueSuffix}${ext}`);
  },
});

// File filter - allow only PDF, DOC, DOCX, ZIP
const fileFilter = (req, file, cb) => {
  const allowedTypes = /pdf|doc|docx|zip/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype) || 
                   file.mimetype === "application/zip" ||
                   file.mimetype === "application/x-zip-compressed";

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only PDF, DOC, DOCX, and ZIP files are allowed"));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for assignments
  },
  fileFilter: fileFilter,
});

module.exports = upload.single("file");

