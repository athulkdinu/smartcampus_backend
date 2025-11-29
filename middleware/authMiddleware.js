const jwt = require("jsonwebtoken");

// verify jwt token
const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error("Error in verifyToken middleware:", error);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// role based access check
const roleCheck = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
};

module.exports = {
  verifyToken,
  roleCheck,
};


