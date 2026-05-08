// src/config/db.js
// ============================================================
// Kết nối SQL Server bằng thư viện mssql
// ============================================================

const sql = require('mssql');
require('dotenv').config();

// Cấu hình kết nối lấy từ file .env
const dbConfig = {
  server: process.env.DB_SERVER || 'localhost',
  port: parseInt(process.env.DB_PORT) || 1433,
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'GosuCoreDB',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_CERT === 'true',
    enableArithAbort: true,
  },
  pool: {
    max: 10,       // Tối đa 10 kết nối đồng thời
    min: 0,
    idleTimeoutMillis: 30000,
  },
  connectionTimeout: 15000,
  requestTimeout: 30000,
};

// Biến lưu pool kết nối (dùng chung toàn app)
let pool = null;

// Hàm kết nối - gọi 1 lần khi khởi động server
const connectDB = async () => {
  try {
    pool = await sql.connect(dbConfig);
    console.log(`✅ Kết nối SQL Server thành công!`);
    console.log(`   Database: ${process.env.DB_NAME}`);
    console.log(`   Server:   ${process.env.DB_SERVER}:${process.env.DB_PORT}`);
    return pool;
  } catch (error) {
    console.error('❌ Lỗi kết nối SQL Server:', error.message);
    console.error('   Kiểm tra lại thông tin trong file .env');
    process.exit(1); // Dừng server nếu không kết nối được DB
  }
};

// Hàm lấy pool đã kết nối (dùng trong controllers)
const getPool = () => {
  if (!pool) {
    throw new Error('Database chưa được kết nối. Gọi connectDB() trước.');
  }
  return pool;
};

// Export sql để dùng sql.Int, sql.NVarChar, v.v. trong controllers
module.exports = { connectDB, getPool, sql };
