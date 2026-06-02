// src/config/db.js
// ============================================================
// Kết nối SQL Server bằng thư viện mssql
// ============================================================

const sql = require('mssql');
require('dotenv').config();

// Kiểm tra có dùng Windows Authentication không
const useWindowsAuth = process.env.DB_TRUSTED_CONNECTION === 'true'
  || (!process.env.DB_USER && !process.env.DB_PASSWORD);

// Cấu hình kết nối lấy từ file .env
const dbConfig = {
  server: process.env.DB_SERVER || 'localhost',
  port: parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME || 'GosuCoreDB',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_CERT
      ? process.env.DB_TRUST_CERT === 'true'
      : true,
    enableArithAbort: true,
    // Bật Windows Authentication nếu không có user/password
    trustedConnection: useWindowsAuth,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  connectionTimeout: 15000,
  requestTimeout: 30000,
};

// Chỉ thêm user/password nếu dùng SQL Server Authentication
if (!useWindowsAuth) {
  dbConfig.user     = process.env.DB_USER || 'sa';
  dbConfig.password = process.env.DB_PASSWORD;
}

// Biến lưu pool kết nối (dùng chung toàn app)
let pool = null;

const ensureDatabaseSchema = async () => {
  await pool.request().query(`
    IF OBJECT_ID('dbo.Orders', 'U') IS NOT NULL
       AND COL_LENGTH('dbo.Orders', 'payment_method') IS NULL
    BEGIN
      ALTER TABLE dbo.Orders
      ADD payment_method NVARCHAR(30) NOT NULL
          CONSTRAINT DF_Orders_payment_method DEFAULT 'cod';
    END

    IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL
       AND COL_LENGTH('dbo.Users', 'is_deleted') IS NULL
    BEGIN
      ALTER TABLE dbo.Users
      ADD is_deleted BIT NOT NULL
          CONSTRAINT DF_Users_is_deleted DEFAULT 0;
    END
  `);
};

// Hàm kết nối - gọi 1 lần khi khởi động server
const connectDB = async () => {
  try {
    pool = await sql.connect(dbConfig);
    await ensureDatabaseSchema();

    const authMode = useWindowsAuth ? 'Windows Authentication' : 'SQL Server Authentication';
    console.log(`Ket noi SQL Server thanh cong! (${authMode})`);
    console.log(`   Database: ${process.env.DB_NAME}`);
    console.log(`   Server:   ${process.env.DB_SERVER}:${process.env.DB_PORT}`);
    return pool;
  } catch (error) {
    console.error('Loi ket noi SQL Server:', error.message);
    console.error('   Kiểm tra lại thông tin trong file .env');
    process.exit(1);
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
