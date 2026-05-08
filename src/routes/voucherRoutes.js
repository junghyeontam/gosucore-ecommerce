// src/routes/voucherRoutes.js
const express = require('express');
const router = express.Router();
const {
  applyVoucher, getAllVouchers, createVoucher,
  updateVoucher, deleteVoucher,
} = require('../controllers/voucherController');
const { verifyToken } = require('../middlewares/authMiddleware');
const { requireAdmin } = require('../middlewares/roleMiddleware');

// Customer - kiểm tra mã giảm giá
router.post('/apply', verifyToken, applyVoucher);

// Admin - quản lý voucher
router.get('/',       verifyToken, requireAdmin, getAllVouchers);
router.post('/',      verifyToken, requireAdmin, createVoucher);
router.put('/:id',    verifyToken, requireAdmin, updateVoucher);
router.delete('/:id', verifyToken, requireAdmin, deleteVoucher);

module.exports = router;