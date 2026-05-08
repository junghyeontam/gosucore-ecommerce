// src/routes/adminRoutes.js
const express = require('express');
const router  = express.Router();
const {
  getDashboard, getAllUsers, updateUser,
  deleteUser, getRevenueStats,
} = require('../controllers/adminController');
const {
  getAllOrders, updateOrderStatus, getOrderById,
} = require('../controllers/orderController');
const { verifyToken }    = require('../middlewares/authMiddleware');
const { requireAdmin, requireManager } = require('../middlewares/roleMiddleware');

// Tất cả route admin cần đăng nhập + quyền admin
router.use(verifyToken, requireAdmin);

// Dashboard
router.get('/dashboard',     getDashboard);
router.get('/stats/revenue', getRevenueStats);

// Quản lý users
router.get('/users',          getAllUsers);
router.put('/users/:id',      updateUser);
router.delete('/users/:id',   requireManager, deleteUser);

// Quản lý orders (admin)
router.get('/orders',         getAllOrders);
router.get('/orders/:id',     getOrderById);
router.patch('/orders/:id/status', updateOrderStatus);

module.exports = router;