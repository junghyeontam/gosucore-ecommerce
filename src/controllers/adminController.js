// src/controllers/adminController.js
const { getPool, sql } = require('../config/db');

// ============================================================
// GET /api/admin/dashboard — Tổng quan hệ thống
// ============================================================
const getDashboard = async (req, res) => {
  try {
    const pool = getPool();

    // Tổng quan số liệu
    const overview = await pool.request().query(`
      SELECT
        (SELECT COUNT(*) FROM Users WHERE role = 'customer') AS total_customers,
        (SELECT COUNT(*) FROM Products WHERE is_active = 1)  AS total_products,
        (SELECT COUNT(*) FROM Orders)                         AS total_orders,
        (SELECT ISNULL(SUM(final_price), 0) FROM Orders WHERE status = 'done') AS total_revenue,
        (SELECT COUNT(*) FROM Orders WHERE status = 'pending')   AS pending_orders,
        (SELECT COUNT(*) FROM Orders WHERE status = 'confirmed') AS confirmed_orders,
        (SELECT COUNT(*) FROM Orders WHERE status = 'shipping')  AS shipping_orders,
        (SELECT COUNT(*) FROM Orders WHERE status = 'done')      AS done_orders,
        (SELECT COUNT(*) FROM Orders WHERE status = 'cancelled') AS cancelled_orders
    `);

    // Doanh thu theo tháng (12 tháng gần nhất)
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

    // Top 5 sản phẩm bán chạy nhất
    const topProducts = await pool.request().query(`
      SELECT TOP 5
        p.id, p.name, p.brand, p.image_url, p.price,
        SUM(oi.quantity)              AS total_sold,
        SUM(oi.quantity * oi.unit_price) AS total_revenue
      FROM OrderItems oi
      JOIN Products p ON p.id = oi.product_id
      JOIN Orders o   ON o.id = oi.order_id
      WHERE o.status = 'done'
      GROUP BY p.id, p.name, p.brand, p.image_url, p.price
      ORDER BY total_sold DESC
    `);

    // Top 5 khách hàng mua nhiều nhất
    const topCustomers = await pool.request().query(`
      SELECT TOP 5
        u.id, u.username, u.full_name, u.email,
        COUNT(o.id)          AS order_count,
        SUM(o.final_price)   AS total_spent
      FROM Orders o
      JOIN Users u ON u.id = o.user_id
      WHERE o.status = 'done'
      GROUP BY u.id, u.username, u.full_name, u.email
      ORDER BY total_spent DESC
    `);

    // Doanh thu theo danh mục
    const revenueByCategory = await pool.request().query(`
      SELECT
        c.name AS category_name,
        SUM(oi.quantity)                 AS total_sold,
        SUM(oi.quantity * oi.unit_price) AS total_revenue
      FROM OrderItems oi
      JOIN Products p  ON p.id  = oi.product_id
      JOIN Categories c ON c.id = p.category_id
      JOIN Orders o    ON o.id  = oi.order_id
      WHERE o.status = 'done'
      GROUP BY c.name
      ORDER BY total_revenue DESC
    `);

    // Đơn hàng mới nhất (10 đơn)
    const recentOrders = await pool.request().query(`
      SELECT TOP 10
        o.id, o.status, o.final_price, o.created_at,
        o.shipping_name, o.shipping_phone,
        u.username, u.email
      FROM Orders o
      JOIN Users u ON u.id = o.user_id
      ORDER BY o.created_at DESC
    `);

    // Sản phẩm sắp hết hàng (stock <= 5)
    const lowStockProducts = await pool.request().query(`
      SELECT TOP 10
        p.id, p.name, p.brand, p.stock, p.price,
        c.name AS category_name
      FROM Products p
      JOIN Categories c ON c.id = p.category_id
      WHERE p.is_active = 1 AND p.stock <= 5
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
// GET /api/admin/users — Danh sách tất cả user
// ============================================================
const getAllUsers = async (req, res) => {
  try {
    const { search, role, page = 1, limit = 20 } = req.query;
    const pool = getPool();

    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, parseInt(limit));
    const offset   = (pageNum - 1) * limitNum;

    const request = pool.request();
    let conditions = ['1=1'];

    if (search) {
      conditions.push('(username LIKE @search OR email LIKE @search OR full_name LIKE @search)');
      request.input('search', sql.NVarChar, `%${search}%`);
    }
    if (role) {
      conditions.push('role = @role');
      request.input('role', sql.NVarChar, role);
    }

    request.input('offset', sql.Int, offset);
    request.input('limit',  sql.Int, limitNum);

    const whereClause = 'WHERE ' + conditions.join(' AND ');

    const countResult = await pool.request()
      .query(`SELECT COUNT(*) AS total FROM Users ${whereClause.replace('@search', "'%%'").replace('@role', "''")}`);

    const result = await request.query(`
      SELECT
        id, username, email, full_name, phone,
        role, is_active, created_at
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
      },
    });

  } catch (error) {
    console.error('Lỗi getAllUsers:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

// ============================================================
// PUT /api/admin/users/:id — Cập nhật user (role, is_active)
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
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản.',
      });
    }

    await pool.request()
      .input('id',        sql.Int,      parseInt(id))
      .input('role',      sql.NVarChar, role || null)
      .input('is_active', sql.Bit,      is_active !== undefined ? is_active : null)
      .input('full_name', sql.NVarChar, full_name || null)
      .input('phone',     sql.NVarChar, phone || null)
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
// DELETE /api/admin/users/:id — Xoá user (chỉ manager)
// ============================================================
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    // Không cho xoá chính mình
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
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản.',
      });
    }

    // Soft delete
    await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query(`
        UPDATE Users 
        SET is_active = 0, updated_at = GETDATE() 
        WHERE id = @id
      `);

    res.json({ success: true, message: 'Đã xoá tài khoản thành công.' });

  } catch (error) {
    console.error('Lỗi deleteUser:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

// ============================================================
// GET /api/admin/stats/revenue — Thống kê doanh thu linh hoạt
// ?from=2024-01-01&to=2024-12-31
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
  getDashboard, getAllUsers, updateUser,
  deleteUser, getRevenueStats,
};