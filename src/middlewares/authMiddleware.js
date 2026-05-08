// src/middlewares/authMiddleware.js
// ============================================================
// Kiểm tra JWT token trong mỗi request cần đăng nhập
// ============================================================

const jwt = require('jsonwebtoken');
require('dotenv').config();

// Middleware xác thực - bảo vệ các route cần đăng nhập
const verifyToken = (req, res, next) => {
  // Lấy token từ header: "Authorization: Bearer <token>"
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Bạn chưa đăng nhập. Vui lòng đăng nhập để tiếp tục.',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email, role }
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
      });
    }
    return res.status(403).json({
      success: false,
      message: 'Token không hợp lệ.',
    });
  }
};

module.exports = { verifyToken };
