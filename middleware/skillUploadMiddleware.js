const multer = require("multer");
const path = require("path");
const fs = require("fs");

const ensureDir = (subDir) => {
  const dir = path.join(__dirname, "..", "uploads", subDir);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

const allowedProjectFiles = (req, file, cb) => {
  const allowedTypes = /pdf|zip|rar|doc|docx|txt/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === 'application/zip' || file.mimetype === 'application/x-rar-compressed';
  if (mimetype || extname) {
    return cb(null, true);
  }
  cb(new Error("Only PDF, ZIP, RAR, DOC, DOCX, TXT files are allowed"));
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, ensureDir("skill-projects")),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `project-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const projectUpload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: allowedProjectFiles,
}).single("projectFile");

module.exports = { projectUpload };



