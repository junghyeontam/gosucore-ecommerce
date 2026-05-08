// src/routes/reviewRoutes.js
const express = require('express');
const router = express.Router();
const {
  createReview, getProductReviews, deleteReview,
} = require('../controllers/reviewController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Public - xem reviews
router.get('/:productId', getProductReviews);

// Customer - tạo review (cần đăng nhập)
router.post('/', verifyToken, createReview);

// Xoá review (chủ review hoặc admin)
router.delete('/:id', verifyToken, deleteReview);

module.exports = router;