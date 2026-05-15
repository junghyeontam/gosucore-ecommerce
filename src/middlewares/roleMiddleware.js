// src/middlewares/roleMiddleware.js
// ============================================================
// BUG FIX 5: Phân quyền rõ ràng theo từng role
// - customer : chỉ xem/tạo đơn hàng, xem sản phẩm
// - staff    : quản lý đơn hàng, xem sản phẩm/users (không xóa)
// - manager  : toàn quyền admin
// ============================================================

// Chỉ cho phép staff hoặc manager vào admin panel
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Chưa xác thực.' });
  }

  if (!['staff', 'manager'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Bạn không có quyền truy cập trang quản trị.',
    });
  }

  next();
};

// Chỉ manager mới được thực hiện các thao tác nhạy cảm
const requireManager = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Chưa xác thực.' });
  }

  if (req.user.role !== 'manager') {
    return res.status(403).json({
      success: false,
      message: 'Chỉ Quản lý mới có quyền thực hiện thao tác này.',
    });
  }

  next();
};

// Chỉ chính chủ tài khoản hoặc manager
const requireOwnerOrManager = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Chưa xác thực.' });
  }

  const targetId = parseInt(req.params.id);
  if (req.user.id === targetId || req.user.role === 'manager') {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Bạn chỉ có thể chỉnh sửa tài khoản của mình.',
  });
};

module.exports = { requireAdmin, requireManager, requireOwnerOrManager };