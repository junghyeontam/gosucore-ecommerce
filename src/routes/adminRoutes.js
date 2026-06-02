// src/routes/adminRoutes.js
const express = require('express');
const router  = express.Router();
const {
  getDashboard, getAllUsers, createUser,
  updateUser, deleteUser, getRevenueStats,
} = require('../controllers/adminController');
const {
  createAdminOrder, getAllOrders, updateOrderStatus, getOrderById,
} = require('../controllers/orderController');
const { verifyToken }                       = require('../middlewares/authMiddleware');
const { requireAdmin, requireManager }      = require('../middlewares/roleMiddleware');

// Tất cả route admin cần đăng nhập + quyền admin (staff hoặc manager)
router.use(verifyToken, requireAdmin);

// Dashboard — staff + manager đều xem được
router.get('/dashboard',     getDashboard);
router.get('/stats/revenue', getRevenueStats);

// Quản lý users
router.get('/users',        getAllUsers);          // staff + manager: xem danh sách
router.post('/users',       requireManager, createUser);   // chỉ manager: tạo user
router.put('/users/:id',    requireManager, updateUser);   // chỉ manager: sửa user
router.delete('/users/:id', requireManager, deleteUser);   // chỉ manager: xóa user

// Quản lý orders
router.get('/orders',               getAllOrders);
router.post('/orders',              createAdminOrder);
router.get('/orders/:id',           getOrderById);
router.patch('/orders/:id/status',  updateOrderStatus);

module.exports = router;
