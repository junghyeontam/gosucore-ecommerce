// src/controllers/orderController.js
const { getPool, sql } = require('../config/db');

// ============================================================
// POST /api/orders — Tạo đơn hàng mới
// ============================================================
const createOrder = async (req, res) => {
  try {
    const {
      items, voucher_code,
      shipping_name, shipping_phone, shipping_address, note,
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Giỏ hàng trống.' });
    }
    if (!shipping_name || !shipping_phone || !shipping_address) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin nhận hàng.' });
    }

    const pool = getPool();
    let total_price = 0;
    const orderItems = [];

    for (const item of items) {
      const result = await pool.request()
        .input('id', sql.Int, parseInt(item.product_id))
        .query('SELECT id, name, price, stock FROM Products WHERE id = @id AND is_active = 1');

      if (!result.recordset.length) {
        return res.status(404).json({ success: false, message: `Sản phẩm ID ${item.product_id} không tồn tại.` });
      }

      const product = result.recordset[0];
      if (product.stock < item.quantity) {
        return res.status(400).json({ success: false, message: `"${product.name}" chỉ còn ${product.stock} trong kho.` });
      }

      total_price += product.price * item.quantity;
      orderItems.push({ product_id: product.id, quantity: item.quantity, unit_price: product.price });
    }

    let discount_amount = 0;
    let voucher_id = null;

    if (voucher_code) {
      const vr = await pool.request()
        .input('code', sql.NVarChar, voucher_code)
        .query('SELECT id, discount_percent, max_uses, used_count, expires_at FROM Vouchers WHERE code = @code AND is_active = 1');

      if (!vr.recordset.length) {
        return res.status(400).json({ success: false, message: 'Mã giảm giá không hợp lệ.' });
      }

      const v = vr.recordset[0];
      if (v.used_count >= v.max_uses) {
        return res.status(400).json({ success: false, message: 'Mã giảm giá đã hết lượt.' });
      }
      if (v.expires_at && new Date(v.expires_at) < new Date()) {
        return res.status(400).json({ success: false, message: 'Mã giảm giá đã hết hạn.' });
      }

      discount_amount = (total_price * v.discount_percent) / 100;
      voucher_id = v.id;
    }

    const final_price = total_price - discount_amount;

    const orderResult = await pool.request()
      .input('user_id',          sql.Int,      req.user.id)
      .input('total_price',      sql.Decimal,  total_price)
      .input('discount_amount',  sql.Decimal,  discount_amount)
      .input('final_price',      sql.Decimal,  final_price)
      .input('voucher_id',       sql.Int,      voucher_id)
      .input('shipping_name',    sql.NVarChar, shipping_name)
      .input('shipping_phone',   sql.NVarChar, shipping_phone)
      .input('shipping_address', sql.NVarChar, shipping_address)
      .input('note',             sql.NVarChar, note || null)
      .query(`
        INSERT INTO Orders (
          user_id, total_price, discount_amount, final_price,
          voucher_id, shipping_name, shipping_phone, shipping_address, note
        )
        OUTPUT INSERTED.id, INSERTED.status, INSERTED.created_at
        VALUES (
          @user_id, @total_price, @discount_amount, @final_price,
          @voucher_id, @shipping_name, @shipping_phone, @shipping_address, @note
        )
      `);

    const newOrder = orderResult.recordset[0];

    for (const item of orderItems) {
      await pool.request()
        .input('order_id',   sql.Int,     newOrder.id)
        .input('product_id', sql.Int,     item.product_id)
        .input('quantity',   sql.Int,     item.quantity)
        .input('unit_price', sql.Decimal, item.unit_price)
        .query('INSERT INTO OrderItems (order_id, product_id, quantity, unit_price) VALUES (@order_id, @product_id, @quantity, @unit_price)');

      await pool.request()
        .input('product_id', sql.Int, item.product_id)
        .input('quantity',   sql.Int, item.quantity)
        .query('UPDATE Products SET stock = stock - @quantity WHERE id = @product_id');
    }

    if (voucher_id) {
      await pool.request()
        .input('voucher_id', sql.Int, voucher_id)
        .query('UPDATE Vouchers SET used_count = used_count + 1 WHERE id = @voucher_id');
    }

    res.status(201).json({
      success: true,
      message: 'Đặt hàng thành công!',
      data: {
        order_id:       newOrder.id,
        status:         newOrder.status,
        total_price,
        discount_amount,
        final_price,
        created_at:     newOrder.created_at,
      },
    });

  } catch (error) {
    console.error('Lỗi createOrder:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

// ============================================================
// GET /api/orders/my — Lịch sử đơn hàng của user hiện tại
// Dùng ROW_NUMBER để đánh số thứ tự riêng cho từng user
// ============================================================
const getMyOrders = async (req, res) => {
  try {
    const pool = getPool();

    const result = await pool.request()
      .input('user_id', sql.Int, req.user.id)
      .query(`
        SELECT
          o.id,
          ROW_NUMBER() OVER (
            PARTITION BY o.user_id
            ORDER BY o.created_at ASC
          ) AS order_number,
          o.status,
          o.total_price,
          o.discount_amount,
          o.final_price,
          o.shipping_name,
          o.shipping_phone,
          o.shipping_address,
          o.note,
          o.created_at,
          v.code AS voucher_code
        FROM Orders o
        LEFT JOIN Vouchers v ON v.id = o.voucher_id
        WHERE o.user_id = @user_id
        ORDER BY o.created_at DESC
      `);

    const orders = [];
    for (const order of result.recordset) {
      const items = await pool.request()
        .input('order_id', sql.Int, order.id)
        .query(`
          SELECT
            oi.quantity, oi.unit_price,
            p.id AS product_id, p.name, p.image_url, p.brand
          FROM OrderItems oi
          JOIN Products p ON p.id = oi.product_id
          WHERE oi.order_id = @order_id
        `);
      orders.push({ ...order, items: items.recordset });
    }

    res.json({ success: true, data: orders });

  } catch (error) {
    console.error('Lỗi getMyOrders:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

// ============================================================
// GET /api/orders/:id — Chi tiết đơn hàng
// ============================================================
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const pool   = getPool();

    const result = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query(`
        SELECT o.*, v.code AS voucher_code, u.username, u.email
        FROM Orders o
        LEFT JOIN Vouchers v ON v.id = o.voucher_id
        LEFT JOIN Users u    ON u.id = o.user_id
        WHERE o.id = @id
      `);

    if (!result.recordset.length) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng.' });
    }

    const order = result.recordset[0];

    // Kiểm tra quyền: chỉ chủ đơn hoặc admin/staff mới được xem
    if (order.user_id !== req.user.id &&
        req.user.role !== 'manager' &&
        req.user.role !== 'staff') {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền xem đơn hàng này.' });
    }

    const items = await pool.request()
      .input('order_id', sql.Int, parseInt(id))
      .query(`
        SELECT
          oi.quantity, oi.unit_price,
          p.id AS product_id, p.name, p.image_url, p.brand
        FROM OrderItems oi
        JOIN Products p ON p.id = oi.product_id
        WHERE oi.order_id = @order_id
      `);

    res.json({ success: true, data: { ...order, items: items.recordset } });

  } catch (error) {
    console.error('Lỗi getOrderById:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

// ============================================================
// PATCH /api/orders/:id/cancel — Customer tự hủy đơn của mình
// Chỉ cho phép hủy khi status = 'pending'
// ============================================================
const cancelMyOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const pool   = getPool();

    const result = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query('SELECT id, status, user_id FROM Orders WHERE id = @id');

    if (!result.recordset.length) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng.' });
    }

    const order = result.recordset[0];

    // Chỉ chủ đơn mới được hủy
    if (order.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền hủy đơn hàng này.' });
    }

    // Chỉ hủy được khi đang pending
    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Không thể hủy đơn hàng đang ở trạng thái "${order.status}". Chỉ có thể hủy khi đơn chưa được xác nhận.`,
      });
    }

    await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query(`UPDATE Orders SET status = 'cancelled', updated_at = GETDATE() WHERE id = @id`);

    res.json({ success: true, message: 'Đã hủy đơn hàng thành công!' });

  } catch (error) {
    console.error('Lỗi cancelMyOrder:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

// ============================================================
// PATCH /api/orders/:id/status — Admin cập nhật trạng thái
// ============================================================
const updateOrderStatus = async (req, res) => {
  try {
    const { id }     = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'shipping', 'done', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Trạng thái không hợp lệ.` });
    }

    const pool = getPool();

    const existing = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query('SELECT id FROM Orders WHERE id = @id');

    if (!existing.recordset.length) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng.' });
    }

    await pool.request()
      .input('id',     sql.Int,      parseInt(id))
      .input('status', sql.NVarChar, status)
      .query('UPDATE Orders SET status = @status, updated_at = GETDATE() WHERE id = @id');

    res.json({ success: true, message: `Cập nhật trạng thái thành "${status}" thành công!` });

  } catch (error) {
    console.error('Lỗi updateOrderStatus:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

// ============================================================
// GET /api/admin/orders — Admin xem tất cả đơn hàng
// ============================================================
const getAllOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const pool = getPool();

    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, parseInt(limit));
    const offset   = (pageNum - 1) * limitNum;

    const request = pool.request();
    let whereClause = '';

    if (status) {
      whereClause = 'WHERE o.status = @status';
      request.input('status', sql.NVarChar, status);
    }

    request.input('offset', sql.Int, offset);
    request.input('limit',  sql.Int, limitNum);

    const result = await request.query(`
      SELECT
        o.id, o.status, o.final_price, o.created_at,
        o.shipping_name, o.shipping_phone,
        u.username, u.email
      FROM Orders o
      JOIN Users u ON u.id = o.user_id
      ${whereClause}
      ORDER BY o.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);

    res.json({ success: true, data: result.recordset });

  } catch (error) {
    console.error('Lỗi getAllOrders:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

module.exports = {
  createOrder, getMyOrders, getOrderById,
  cancelMyOrder, updateOrderStatus, getAllOrders,
};