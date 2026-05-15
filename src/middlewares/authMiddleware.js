// src/middlewares/authMiddleware.js
// ============================================================
// BUG FIX 4: Kiểm tra is_active sau khi verify token
// Tài khoản bị khóa/xóa không thể dùng token cũ để truy cập
// ============================================================

const jwt  = require('jsonwebtoken');
const { getPool, sql } = require('../config/db');
require('dotenv').config();

const verifyToken = async (req, res, next) => {
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

    // BUG FIX 4: Kiểm tra tài khoản còn hoạt động trong DB
    // Token hợp lệ nhưng tài khoản có thể đã bị khóa sau khi cấp token
    const pool = getPool();
    const result = await pool.request()
      .input('id', sql.Int, decoded.id)
      .query('SELECT id, role, is_active FROM Users WHERE id = @id');

    if (result.recordset.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản không tồn tại.',
      });
    }

    const dbUser = result.recordset[0];

    // BUG FIX 4: Tài khoản bị khóa (is_active = 0) không được truy cập
    if (!dbUser.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.',
      });
    }

    // Gán thông tin user từ DB (luôn mới nhất, không từ token cũ)
    req.user = {
      id:   dbUser.id,
      role: dbUser.role,
      // Giữ lại các field khác từ token nếu cần
      email:    decoded.email,
      username: decoded.username,
    };

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