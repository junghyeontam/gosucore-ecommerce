// src/routes/orderRoutes.js
const express = require('express');
const router  = express.Router();
const {
  createOrder, getMyOrders, getOrderById,
  updateOrderStatus, cancelMyOrder,
} = require('../controllers/orderController');
const { verifyToken }  = require('../middlewares/authMiddleware');
const { requireAdmin } = require('../middlewares/roleMiddleware');

// Customer
router.post('/',                verifyToken, createOrder);
router.get('/my',               verifyToken, getMyOrders);
router.get('/:id',              verifyToken, getOrderById);

// Customer tự hủy đơn của mình (chỉ khi pending)
router.patch('/:id/cancel',     verifyToken, cancelMyOrder);

// Admin cập nhật bất kỳ trạng thái nào
router.patch('/:id/status',     verifyToken, requireAdmin, updateOrderStatus);

module.exports = router;