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

const allowedPdfOnly = (req, file, cb) => {
  const allowedTypes = /pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error("Only PDF files are allowed"));
};

const makeUploader = (subDir, prefix, fieldName) => {
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, ensureDir(subDir)),
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, `${prefix}-${uniqueSuffix}${path.extname(file.originalname)}`);
    },
  });

  return multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: allowedPdfOnly,
  }).single(fieldName);
};

const resumeUpload = makeUploader("resumes", "resume", "resume");
const offerUpload = makeUploader("offers", "offer", "offerLetter");

module.exports = { resumeUpload, offerUpload };

