// src/routes/productRoutes.js
const express = require('express');
const router = express.Router();
const {
  getAllProducts, getProductById, createProduct,
  updateProduct, deleteProduct, getCategories, getBrands,getFlashSale
} = require('../controllers/productController');

const { verifyToken } = require('../middlewares/authMiddleware');
const { requireAdmin, requireManager } = require('../middlewares/roleMiddleware');

// Public
router.get('/ping',       (req, res) => res.json({ success: true, message: 'Products API OK' }));
router.get('/',            getAllProducts);
router.get('/categories',  getCategories);
router.get('/brands',      getBrands);
router.get('/flash-sale', getFlashSale);
router.get('/:id',         getProductById);

// Admin
router.post('/',    verifyToken, requireAdmin,   createProduct);
router.put('/:id',  verifyToken, requireAdmin,   updateProduct);
router.delete('/:id', verifyToken, requireManager, deleteProduct);

module.exports = router;
