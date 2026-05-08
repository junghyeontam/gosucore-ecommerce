// src/middlewares/roleMiddleware.js
// ============================================================
// Phân quyền theo vai trò: customer / staff / manager
// ============================================================

// Dùng sau verifyToken để kiểm tra quyền truy cập
// Ví dụ: router.delete('/:id', verifyToken, requireRole('manager'), deleteUser)

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Chưa xác thực người dùng.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Bạn không có quyền thực hiện hành động này. Yêu cầu: [${allowedRoles.join(', ')}]`,
      });
    }

    next();
  };
};

// Shortcut helpers
const requireAdmin = requireRole('manager', 'staff');
const requireManager = requireRole('manager');
const requireCustomer = requireRole('customer');

module.exports = { requireRole, requireAdmin, requireManager, requireCustomer };
