// src/controllers/adminController.js
const { getPool, sql } = require('../config/db');
const bcrypt = require('bcryptjs');

// ============================================================
// GET /api/admin/dashboard
// ============================================================
const getDashboard = async (req, res) => {
  try {
    const pool = getPool();

    const overview = await pool.request().query(`
      SELECT
        (SELECT COUNT(*) FROM Users WHERE role = 'customer' AND is_active = 1) AS total_customers,
        (SELECT COUNT(*) FROM Products WHERE is_active = 1)  AS total_products,
        (SELECT COUNT(*) FROM Orders)                         AS total_orders,
        (SELECT ISNULL(SUM(final_price), 0) FROM Orders WHERE status = 'done') AS total_revenue,
        (SELECT COUNT(*) FROM Orders WHERE status = 'pending')   AS pending_orders,
        (SELECT COUNT(*) FROM Orders WHERE status = 'confirmed') AS confirmed_orders,
        (SELECT COUNT(*) FROM Orders WHERE status = 'shipping')  AS shipping_orders,
        (SELECT COUNT(*) FROM Orders WHERE status = 'done')      AS done_orders,
        (SELECT COUNT(*) FROM Orders WHERE status = 'cancelled') AS cancelled_orders
    `);

    const revenueByMonth = await pool.request().query(`
      SELECT
        YEAR(created_at)  AS year,
        MONTH(created_at) AS month,
        COUNT(*)          AS order_count,
        SUM(final_price)  AS revenue
      FROM Orders
      WHERE status = 'done'
        AND created_at >= DATEADD(MONTH, -11, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1))
      GROUP BY YEAR(created_at), MONTH(created_at)
      ORDER BY year ASC, month ASC
    `);

    const topProducts = await pool.request().query(`
      SELECT TOP 5
        p.id, p.name, p.brand, p.image_url, p.price,
        SUM(oi.quantity)                 AS total_sold,
        SUM(oi.quantity * oi.unit_price) AS total_revenue
      FROM OrderItems oi
      JOIN Products p ON p.id = oi.product_id
      JOIN Orders o   ON o.id = oi.order_id
      WHERE o.status = 'done'
      GROUP BY p.id, p.name, p.brand, p.image_url, p.price
      ORDER BY total_sold DESC
    `);

    const topCustomers = await pool.request().query(`
      SELECT TOP 5
        u.id, u.username, u.full_name, u.email,
        COUNT(o.id)        AS order_count,
        SUM(o.final_price) AS total_spent
      FROM Orders o
      JOIN Users u ON u.id = o.user_id
      WHERE o.status = 'done'
      GROUP BY u.id, u.username, u.full_name, u.email
      ORDER BY total_spent DESC
    `);

    const revenueByCategory = await pool.request().query(`
      SELECT
        c.name AS category_name,
        SUM(oi.quantity)                 AS total_sold,
        SUM(oi.quantity * oi.unit_price) AS total_revenue
      FROM OrderItems oi
      JOIN Products p   ON p.id  = oi.product_id
      JOIN Categories c ON c.id  = p.category_id
      JOIN Orders o     ON o.id  = oi.order_id
      WHERE o.status = 'done'
      GROUP BY c.name
      ORDER BY total_revenue DESC
    `);

    const recentOrders = await pool.request().query(`
      SELECT TOP 10
        o.id, o.status, o.final_price, o.created_at,
        o.shipping_name, o.shipping_phone,
        u.username, u.email
      FROM Orders o
      JOIN Users u ON u.id = o.user_id
      ORDER BY o.created_at DESC
    `);

    const lowStockProducts = await pool.request().query(`
      SELECT TOP 10
        p.id, p.name, p.brand, p.stock, p.price,
        c.name AS category_name
      FROM Products p
      JOIN Categories c ON c.id = p.category_id
      WHERE p.is_active = 1 AND p.stock <= 10
      ORDER BY p.stock ASC
    `);

    res.json({
      success: true,
      data: {
        overview:            overview.recordset[0],
        revenue_by_month:    revenueByMonth.recordset,
        top_products:        topProducts.recordset,
        top_customers:       topCustomers.recordset,
        revenue_by_category: revenueByCategory.recordset,
        recent_orders:       recentOrders.recordset,
        low_stock_products:  lowStockProducts.recordset,
      },
    });

  } catch (error) {
    console.error('Lỗi getDashboard:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

// ============================================================
// GET /api/admin/users
// BUG FIX 1: Thêm lọc is_active để ẩn tài khoản đã xóa
// BUG FIX 2: Sửa count query dùng parameterized thay vì string replace
// ============================================================
const getAllUsers = async (req, res) => {
  try {
    const { search, role, page = 1, limit = 50, show_deleted = 'false' } = req.query;
    const pool = getPool();

    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, parseInt(limit));
    const offset   = (pageNum - 1) * limitNum;

    // BUG FIX 2: Dùng parameterized query riêng cho count, không string replace
    const countRequest = pool.request();
    const dataRequest  = pool.request();

    let conditions = [];

    // BUG FIX 1: Mặc định chỉ hiện tài khoản is_active=1 trừ khi admin muốn xem tất cả
    if (show_deleted !== 'true') {
      conditions.push('is_active = 1');
    }

    if (search) {
      conditions.push('(username LIKE @search OR email LIKE @search OR full_name LIKE @search)');
      countRequest.input('search', sql.NVarChar, `%${search}%`);
      dataRequest.input('search',  sql.NVarChar, `%${search}%`);
    }
    if (role) {
      conditions.push('role = @role');
      countRequest.input('role', sql.NVarChar, role);
      dataRequest.input('role',  sql.NVarChar, role);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    dataRequest.input('offset', sql.Int, offset);
    dataRequest.input('limit',  sql.Int, limitNum);

    const countResult = await countRequest.query(
      `SELECT COUNT(*) AS total FROM Users ${whereClause}`
    );

    const result = await dataRequest.query(`
      SELECT
        id, username, email, full_name, phone,
        role, is_active, created_at, updated_at
      FROM Users
      ${whereClause}
      ORDER BY created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);

    res.json({
      success: true,
      data: result.recordset,
      pagination: {
        page:  pageNum,
        limit: limitNum,
        total: countResult.recordset[0].total,
        total_pages: Math.ceil(countResult.recordset[0].total / limitNum),
      },
    });

  } catch (error) {
    console.error('Lỗi getAllUsers:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

// ============================================================
// POST /api/admin/users — Tạo tài khoản trực tiếp từ admin
// BUG FIX 3: Tạo user với role + timestamp chính xác ngay lập tức
// Không cần 2 bước register rồi update role như frontend cũ
// ============================================================
const createUser = async (req, res) => {
  try {
    const { username, full_name, email, phone, password, role = 'customer' } = req.body;
    const pool = getPool();

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username, email và mật khẩu là bắt buộc.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu phải có ít nhất 6 ký tự.',
      });
    }

    // Kiểm tra trùng username/email
    const existing = await pool.request()
      .input('username', sql.NVarChar, username)
      .input('email',    sql.NVarChar, email)
      .query('SELECT id FROM Users WHERE username = @username OR email = @email');

    if (existing.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Username hoặc email đã tồn tại.',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // BUG FIX 3: Insert với role và created_at = GETDATE() chính xác
    const result = await pool.request()
      .input('username',  sql.NVarChar, username)
      .input('full_name', sql.NVarChar, full_name || null)
      .input('email',     sql.NVarChar, email)
      .input('phone',     sql.NVarChar, phone || null)
      .input('password',  sql.NVarChar, hashedPassword)
      .input('role',      sql.NVarChar, role)
      .query(`
        INSERT INTO Users (username, full_name, email, phone, password, role, is_active, created_at, updated_at)
        OUTPUT INSERTED.id, INSERTED.username, INSERTED.email, INSERTED.role, INSERTED.created_at
        VALUES (@username, @full_name, @email, @phone, @password, @role, 1, GETDATE(), GETDATE())
      `);

    res.status(201).json({
      success: true,
      message: 'Tạo tài khoản thành công!',
      data: result.recordset[0],
    });

  } catch (error) {
    console.error('Lỗi createUser:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

// ============================================================
// PUT /api/admin/users/:id
// ============================================================
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, is_active, full_name, phone } = req.body;
    const pool = getPool();

    const existing = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query('SELECT id FROM Users WHERE id = @id');

    if (existing.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản.' });
    }

    await pool.request()
      .input('id',        sql.Int,      parseInt(id))
      .input('role',      sql.NVarChar, role      ?? null)
      .input('is_active', sql.Bit,      is_active !== undefined ? is_active : null)
      .input('full_name', sql.NVarChar, full_name ?? null)
      .input('phone',     sql.NVarChar, phone     ?? null)
      .query(`
        UPDATE Users SET
          role      = ISNULL(@role,      role),
          is_active = ISNULL(@is_active, is_active),
          full_name = ISNULL(@full_name, full_name),
          phone     = ISNULL(@phone,     phone),
          updated_at = GETDATE()
        WHERE id = @id
      `);

    res.json({ success: true, message: 'Cập nhật tài khoản thành công!' });

  } catch (error) {
    console.error('Lỗi updateUser:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

// ============================================================
// DELETE /api/admin/users/:id
// Soft delete: set is_active = 0
// Tài khoản sẽ không hiện trong list vì getAllUsers lọc is_active = 1
// ============================================================
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    if (parseInt(id) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Không thể xoá tài khoản của chính mình.',
      });
    }

    const existing = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query('SELECT id, role FROM Users WHERE id = @id');

    if (existing.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản.' });
    }

    // Không cho xóa account manager khác nếu người xóa không phải manager
    if (existing.recordset[0].role === 'manager' && req.user.role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền xóa tài khoản Quản lý.',
      });
    }

    await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query(`UPDATE Users SET is_active = 0, updated_at = GETDATE() WHERE id = @id`);

    res.json({ success: true, message: 'Đã xoá tài khoản thành công.' });

  } catch (error) {
    console.error('Lỗi deleteUser:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

// ============================================================
// GET /api/admin/stats/revenue
// ============================================================
const getRevenueStats = async (req, res) => {
  try {
    const { from, to } = req.query;
    const pool = getPool();

    const request = pool.request();
    let dateFilter = '';

    if (from && to) {
      dateFilter = 'AND o.created_at BETWEEN @from AND @to';
      request.input('from', sql.DateTime, new Date(from));
      request.input('to',   sql.DateTime, new Date(to));
    }

    const result = await request.query(`
      SELECT
        YEAR(o.created_at)  AS year,
        MONTH(o.created_at) AS month,
        COUNT(o.id)         AS order_count,
        SUM(o.final_price)  AS revenue,
        AVG(o.final_price)  AS avg_order_value
      FROM Orders o
      WHERE o.status = 'done' ${dateFilter}
      GROUP BY YEAR(o.created_at), MONTH(o.created_at)
      ORDER BY year ASC, month ASC
    `);

    res.json({ success: true, data: result.recordset });

  } catch (error) {
    console.error('Lỗi getRevenueStats:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

module.exports = {
  getDashboard, getAllUsers, createUser,
  updateUser, deleteUser, getRevenueStats,
};