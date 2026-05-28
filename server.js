// server.js
// ============================================================
// GOSUCORE BACKEND - File khởi động chính
// ============================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./src/config/db');

// --- Import Routes ---
const authRoutes     = require('./src/routes/authRoutes');
const productRoutes  = require('./src/routes/productRoutes');
const orderRoutes    = require('./src/routes/orderRoutes');
const adminRoutes    = require('./src/routes/adminRoutes');
const voucherRoutes  = require('./src/routes/voucherRoutes');
const reviewRoutes   = require('./src/routes/reviewRoutes');
const categoryRoutes = require('./src/routes/categoryRoutes');

const app  = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// MIDDLEWARE TOÀN CỤC
// ============================================================

app.use(cors({
  origin: ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Phục vụ file tĩnh (HTML, CSS, JS, ảnh frontend)
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================
// ROUTES API
// ============================================================

app.use('/api/auth',       authRoutes);
app.use('/api/products',   productRoutes);
app.use('/api/orders',     orderRoutes);
app.use('/api/admin',      adminRoutes);
app.use('/api/vouchers',   voucherRoutes);
app.use('/api/reviews',    reviewRoutes);
app.use('/api/categories', categoryRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'GosuCore API dang chay!',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// ============================================================
// XỬ LÝ LỖI
// ============================================================

// 404 — Nếu là trang HTML thì serve file, không trả JSON
app.use((req, res) => {
  const ext = path.extname(req.path);

  // Request đến file HTML hoặc path không có extension (URL thân thiện)
  if (ext === '.html' || ext === '') {
    const filePath = path.join(
      __dirname,
      'public',
      req.path.endsWith('.html') ? req.path : req.path + '.html'
    );

    return res.sendFile(filePath, (err) => {
      if (err) {
        // File không tồn tại → trả về trang index
        res.sendFile(path.join(__dirname, 'public', 'client', 'index.html'), (err2) => {
          if (err2) {
            res.status(404).json({
              success: false,
              message: `Không tìm thấy trang: ${req.originalUrl}`,
            });
          }
        });
      }
    });
  }

  // Route API không tồn tại → trả JSON
  res.status(404).json({
    success: false,
    message: `Route không tồn tại: ${req.method} ${req.originalUrl}`,
  });
});

// 500 - Lỗi server
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Đã xảy ra lỗi server. Vui lòng thử lại sau.',
    ...(process.env.NODE_ENV === 'development' && { error: err.message }),
  });
});

// ============================================================
// KHỞI ĐỘNG SERVER
// ============================================================

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log('');
    console.log('================================');
    console.log('GOSUCORE BACKEND STARTED!');
    console.log('================================');
    console.log(`Server:   http://localhost:${PORT}`);
    console.log(`Health:   http://localhost:${PORT}/api/health`);
    console.log(`Auth:     http://localhost:${PORT}/api/auth/ping`);
    console.log(`Products: http://localhost:${PORT}/api/products/ping`);
    console.log(`Orders:   http://localhost:${PORT}/api/orders/ping`);
    console.log('================================');
    console.log('');
  });
};

startServer();
