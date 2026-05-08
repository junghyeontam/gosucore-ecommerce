// scripts/updateAdminPassword.js
// ============================================================
// Chạy 1 lần để cập nhật mật khẩu admin thật bằng bcrypt
// Lệnh: node scripts/updateAdminPassword.js
// ============================================================

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { connectDB, getPool, sql } = require('../src/config/db');

const updatePasswords = async () => {
  await connectDB();
  const pool = getPool();

  const password = 'Admin@123';
  const hash = await bcrypt.hash(password, 10);

  await pool.request()
    .input('hash', sql.NVarChar, hash)
    .query(`
      UPDATE Users 
      SET password = @hash 
      WHERE role IN ('manager', 'staff')
    `);

  console.log('Đã cập nhật mật khẩu admin!');
  console.log('   Email:    manager@gosucore.com');
  console.log('   Password: Admin@123');
  console.log('   Email:    staff@gosucore.com');
  console.log('   Password: Admin@123');
  process.exit(0);
};

updatePasswords().catch(err => {
  console.error('❌ Lỗi:', err.message);
  process.exit(1);
});
