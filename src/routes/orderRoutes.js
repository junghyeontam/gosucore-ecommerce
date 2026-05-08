// src/routes/orderRoutes.js
const express = require('express');
const router  = express.Router();
const {
  createOrder, getMyOrders, getOrderById,
  updateOrderStatus,
} = require('../controllers/orderController');
const { verifyToken }  = require('../middlewares/authMiddleware');
const { requireAdmin } = require('../middlewares/roleMiddleware');

// Customer - cần đăng nhập
router.post('/',    verifyToken, createOrder);

// QUAN TRỌNG: /my phải đứng TRƯỚC /:id
router.get('/my',   verifyToken, getMyOrders);
router.get('/:id',  verifyToken, getOrderById);

// Admin
router.patch('/:id/status', verifyToken, requireAdmin, updateOrderStatus);

module.exports = router;