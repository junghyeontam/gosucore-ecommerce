// src/routes/authRoutes.js
// ============================================================
// Các endpoint xác thực người dùng
// ============================================================

const express = require('express');
const router = express.Router();
const { register, login, getMe, updateMe, changePassword } = require('../controllers/authController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Public routes (không cần đăng nhập)
router.post('/register', register);
router.post('/login', login);

// Protected routes (cần token)
router.get('/me', verifyToken, getMe);
router.put('/me', verifyToken, updateMe);
router.put('/change-password', verifyToken, changePassword);

module.exports = router;
