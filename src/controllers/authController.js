// src/controllers/authController.js
// ============================================================
// Xử lý đăng ký, đăng nhập, lấy thông tin user
// ============================================================

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool, sql } = require('../config/db');
require('dotenv').config();

// Hàm tạo JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// ============================================================
// POST /api/auth/register — Đăng ký tài khoản mới
// ============================================================
const register = async (req, res) => {
  try {
    const { username, email, password, full_name, phone } = req.body;

    // Validate đầu vào
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ: username, email, password.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu phải có ít nhất 6 ký tự.',
      });
    }

    const pool = getPool();

    // Kiểm tra email hoặc username đã tồn tại chưa
    const existing = await pool.request()
      .input('email', sql.NVarChar, email)
      .input('username', sql.NVarChar, username)
      .query(`
        SELECT id FROM Users 
        WHERE email = @email OR username = @username
      `);

    if (existing.recordset.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Email hoặc username đã được sử dụng.',
      });
    }

    // Mã hoá mật khẩu
    const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
    const hashedPassword = await bcrypt.hash(password, rounds);

    // Thêm user mới vào database
    const result = await pool.request()
      .input('username',  sql.NVarChar, username)
      .input('email',     sql.NVarChar, email)
      .input('password',  sql.NVarChar, hashedPassword)
      .input('full_name', sql.NVarChar, full_name || null)
      .input('phone',     sql.NVarChar, phone || null)
      .query(`
        INSERT INTO Users (username, email, password, full_name, phone, role)
        OUTPUT INSERTED.id, INSERTED.username, INSERTED.email, 
               INSERTED.full_name, INSERTED.role, INSERTED.created_at
        VALUES (@username, @email, @password, @full_name, @phone, 'customer')
      `);

    const newUser = result.recordset[0];
    const token = generateToken(newUser);

    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công! Chào mừng đến với GosuCore.',
      token,
      user: {
        id:         newUser.id,
        username:   newUser.username,
        email:      newUser.email,
        full_name:  newUser.full_name,
        role:       newUser.role,
        created_at: newUser.created_at,
      },
    });

  } catch (error) {
    console.error('Lỗi register:', error);
    res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi server khi đăng ký.',
    });
  }
};

// ============================================================
// POST /api/auth/login — Đăng nhập
// ============================================================
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập email và mật khẩu.',
      });
    }

    const pool = getPool();

    // Tìm user theo email
    const result = await pool.request()
      .input('email', sql.NVarChar, email)
      .query(`
        SELECT id, username, email, password, full_name, phone, role, is_active
        FROM Users 
        WHERE email = @email
      `);

    if (result.recordset.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không đúng.',
      });
    }

    const user = result.recordset[0];

    // Kiểm tra tài khoản có bị khoá không
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản của bạn đã bị khoá. Vui lòng liên hệ admin.',
      });
    }

    // So sánh mật khẩu
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không đúng.',
      });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      message: `Đăng nhập thành công! Chào mừng trở lại, ${user.full_name || user.username}.`,
      token,
      user: {
        id:        user.id,
        username:  user.username,
        email:     user.email,
        full_name: user.full_name,
        phone:     user.phone,
        role:      user.role,
      },
    });

  } catch (error) {
    console.error('Lỗi login:', error);
    res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi server khi đăng nhập.',
    });
  }
};

// ============================================================
// GET /api/auth/me — Lấy thông tin user đang đăng nhập
// (Cần token — dùng sau verifyToken middleware)
// ============================================================
const getMe = async (req, res) => {
  try {
    const pool = getPool();

    const result = await pool.request()
      .input('id', sql.Int, req.user.id)
      .query(`
        SELECT id, username, email, full_name, phone, address, role, created_at
        FROM Users 
        WHERE id = @id AND is_active = 1
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản.',
      });
    }

    res.json({
      success: true,
      user: result.recordset[0],
    });

  } catch (error) {
    console.error('Lỗi getMe:', error);
    res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi server.',
    });
  }
};

// ============================================================
// PUT /api/auth/me — Cập nhật thông tin cá nhân
// ============================================================
const updateMe = async (req, res) => {
  try {
    const { full_name, phone, address } = req.body;
    const pool = getPool();

    await pool.request()
      .input('id',        sql.Int,      req.user.id)
      .input('full_name', sql.NVarChar, full_name || null)
      .input('phone',     sql.NVarChar, phone || null)
      .input('address',   sql.NVarChar, address || null)
      .query(`
        UPDATE Users 
        SET full_name  = @full_name,
            phone      = @phone,
            address    = @address,
            updated_at = GETDATE()
        WHERE id = @id
      `);

    res.json({
      success: true,
      message: 'Cập nhật thông tin thành công.',
    });

  } catch (error) {
    console.error('Lỗi updateMe:', error);
    res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi server.',
    });
  }
};

// ============================================================
// PUT /api/auth/change-password — Đổi mật khẩu
// ============================================================
const changePassword = async (req, res) => {
  try {
    const { old_password, new_password } = req.body;

    if (!old_password || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập mật khẩu cũ và mật khẩu mới.',
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới phải có ít nhất 6 ký tự.',
      });
    }

    const pool = getPool();

    // Lấy mật khẩu hiện tại
    const result = await pool.request()
      .input('id', sql.Int, req.user.id)
      .query('SELECT password FROM Users WHERE id = @id');

    const user = result.recordset[0];
    const isMatch = await bcrypt.compare(old_password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Mật khẩu cũ không đúng.',
      });
    }

    const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
    const hashedNew = await bcrypt.hash(new_password, rounds);

    await pool.request()
      .input('id',       sql.Int,      req.user.id)
      .input('password', sql.NVarChar, hashedNew)
      .query(`
        UPDATE Users SET password = @password, updated_at = GETDATE()
        WHERE id = @id
      `);

    res.json({
      success: true,
      message: 'Đổi mật khẩu thành công.',
    });

  } catch (error) {
    console.error('Lỗi changePassword:', error);
    res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi server.',
    });
  }
};

module.exports = { register, login, getMe, updateMe, changePassword };
