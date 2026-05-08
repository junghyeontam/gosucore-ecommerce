// src/routes/categoryRoutes.js
const express = require('express');
const router  = express.Router();
const {
  getAllCategories, createCategory,
  updateCategory, deleteCategory,
} = require('../controllers/categoryController');
const { verifyToken }    = require('../middlewares/authMiddleware');
const { requireAdmin, requireManager } = require('../middlewares/roleMiddleware');

// Public
router.get('/', getAllCategories);

// Admin
router.post('/',      verifyToken, requireAdmin,   createCategory);
router.put('/:id',    verifyToken, requireAdmin,   updateCategory);
router.delete('/:id', verifyToken, requireManager, deleteCategory);

module.exports = router;