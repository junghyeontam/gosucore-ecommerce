const { getPool, sql } = require('../config/db');

const VALID_STATUSES = ['pending', 'confirmed', 'shipping', 'done', 'cancelled'];
const VALID_PAYMENT_METHODS = ['cod', 'momo', 'bank', 'zalopay'];

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const toPositiveInt = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const normalizeOrderItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new HttpError(400, 'Gio hang trong.');
  }

  const byProduct = new Map();
  for (const item of items) {
    const productId = toPositiveInt(item.product_id);
    const quantity = toPositiveInt(item.quantity);

    if (!productId || !quantity) {
      throw new HttpError(400, 'San pham hoac so luong khong hop le.');
    }

    byProduct.set(productId, (byProduct.get(productId) || 0) + quantity);
  }

  return [...byProduct.entries()].map(([product_id, quantity]) => ({ product_id, quantity }));
};

const rollbackQuietly = async (transaction) => {
  try {
    if (transaction) await transaction.rollback();
  } catch (_) {}
};

const applyCancellationEffects = async (transaction, orderId) => {
  const restoreStock = new sql.Request(transaction);
  await restoreStock
    .input('order_id', sql.Int, orderId)
    .query(`
      UPDATE p
      SET p.stock = p.stock + oi.quantity,
          p.updated_at = GETDATE()
      FROM Products p
      JOIN OrderItems oi ON oi.product_id = p.id
      WHERE oi.order_id = @order_id
    `);

  const restoreVoucher = new sql.Request(transaction);
  await restoreVoucher
    .input('order_id', sql.Int, orderId)
    .query(`
      UPDATE v
      SET v.used_count = CASE WHEN v.used_count > 0 THEN v.used_count - 1 ELSE 0 END
      FROM Vouchers v
      JOIN Orders o ON o.voucher_id = v.id
      WHERE o.id = @order_id
    `);
};

// POST /api/orders
const createOrder = async (req, res) => {
  let transaction;

  try {
    const {
      items,
      voucher_code,
      shipping_name,
      shipping_phone,
      shipping_address,
      note,
      payment_method = 'cod',
    } = req.body;

    if (!shipping_name || !shipping_phone || !shipping_address) {
      throw new HttpError(400, 'Vui long dien day du thong tin nhan hang.');
    }

    if (!VALID_PAYMENT_METHODS.includes(payment_method)) {
      throw new HttpError(400, 'Phuong thuc thanh toan khong hop le.');
    }

    const normalizedItems = normalizeOrderItems(items);
    const pool = getPool();
    transaction = new sql.Transaction(pool);
    await transaction.begin(sql.ISOLATION_LEVEL.READ_COMMITTED);

    let total_price = 0;
    const orderItems = [];

    for (const item of normalizedItems) {
      const productResult = await new sql.Request(transaction)
        .input('id', sql.Int, item.product_id)
        .query(`
          SELECT id, name, price, stock
          FROM Products WITH (UPDLOCK, ROWLOCK)
          WHERE id = @id AND is_active = 1
        `);

      if (!productResult.recordset.length) {
        throw new HttpError(404, `San pham ID ${item.product_id} khong ton tai.`);
      }

      const product = productResult.recordset[0];
      if (product.stock < item.quantity) {
        throw new HttpError(400, `"${product.name}" chi con ${product.stock} trong kho.`);
      }

      total_price += Number(product.price) * item.quantity;
      orderItems.push({
        product_id: product.id,
        quantity: item.quantity,
        unit_price: Number(product.price),
      });
    }

    let discount_amount = 0;
    let voucher_id = null;

    if (voucher_code) {
      const voucherResult = await new sql.Request(transaction)
        .input('code', sql.NVarChar(50), String(voucher_code).trim().toUpperCase())
        .query(`
          SELECT id, discount_percent, max_uses, used_count, expires_at
          FROM Vouchers WITH (UPDLOCK, ROWLOCK)
          WHERE code = @code AND is_active = 1
        `);

      if (!voucherResult.recordset.length) {
        throw new HttpError(400, 'Ma giam gia khong hop le.');
      }

      const voucher = voucherResult.recordset[0];
      if (voucher.used_count >= voucher.max_uses) {
        throw new HttpError(400, 'Ma giam gia da het luot.');
      }
      if (voucher.expires_at && new Date(voucher.expires_at) < new Date()) {
        throw new HttpError(400, 'Ma giam gia da het han.');
      }

      discount_amount = Math.round((total_price * voucher.discount_percent) / 100);
      voucher_id = voucher.id;
    }

    const final_price = total_price - discount_amount;

    const orderResult = await new sql.Request(transaction)
      .input('user_id', sql.Int, req.user.id)
      .input('total_price', sql.Decimal(12, 2), total_price)
      .input('discount_amount', sql.Decimal(12, 2), discount_amount)
      .input('final_price', sql.Decimal(12, 2), final_price)
      .input('voucher_id', sql.Int, voucher_id)
      .input('shipping_name', sql.NVarChar(100), shipping_name)
      .input('shipping_phone', sql.NVarChar(20), shipping_phone)
      .input('shipping_address', sql.NVarChar(255), shipping_address)
      .input('note', sql.NVarChar(500), note || null)
      .input('payment_method', sql.NVarChar(30), payment_method)
      .query(`
        INSERT INTO Orders (
          user_id, total_price, discount_amount, final_price,
          voucher_id, shipping_name, shipping_phone, shipping_address,
          note, payment_method
        )
        OUTPUT INSERTED.id, INSERTED.status, INSERTED.created_at, INSERTED.payment_method
        VALUES (
          @user_id, @total_price, @discount_amount, @final_price,
          @voucher_id, @shipping_name, @shipping_phone, @shipping_address,
          @note, @payment_method
        )
      `);

    const newOrder = orderResult.recordset[0];

    for (const item of orderItems) {
      await new sql.Request(transaction)
        .input('order_id', sql.Int, newOrder.id)
        .input('product_id', sql.Int, item.product_id)
        .input('quantity', sql.Int, item.quantity)
        .input('unit_price', sql.Decimal(12, 2), item.unit_price)
        .query(`
          INSERT INTO OrderItems (order_id, product_id, quantity, unit_price)
          VALUES (@order_id, @product_id, @quantity, @unit_price)
        `);

      const stockUpdate = await new sql.Request(transaction)
        .input('product_id', sql.Int, item.product_id)
        .input('quantity', sql.Int, item.quantity)
        .query(`
          UPDATE Products
          SET stock = stock - @quantity, updated_at = GETDATE()
          WHERE id = @product_id AND stock >= @quantity
        `);

      if (!stockUpdate.rowsAffected[0]) {
        throw new HttpError(400, 'Ton kho khong du de tao don hang.');
      }
    }

    if (voucher_id) {
      const voucherUpdate = await new sql.Request(transaction)
        .input('voucher_id', sql.Int, voucher_id)
        .query(`
          UPDATE Vouchers
          SET used_count = used_count + 1
          WHERE id = @voucher_id AND used_count < max_uses
        `);

      if (!voucherUpdate.rowsAffected[0]) {
        throw new HttpError(400, 'Ma giam gia da het luot.');
      }
    }

    await transaction.commit();
    transaction = null;

    res.status(201).json({
      success: true,
      message: 'Dat hang thanh cong!',
      data: {
        order_id: newOrder.id,
        status: newOrder.status,
        payment_method: newOrder.payment_method,
        total_price,
        discount_amount,
        final_price,
        created_at: newOrder.created_at,
      },
    });
  } catch (error) {
    await rollbackQuietly(transaction);
    console.error('Loi createOrder:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.status ? error.message : 'Loi server.',
    });
  }
};

// GET /api/orders/my
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
          o.payment_method,
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
    console.error('Loi getMyOrders:', error);
    res.status(500).json({ success: false, message: 'Loi server.' });
  }
};

// GET /api/orders/:id
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    const result = await pool.request()
      .input('id', sql.Int, parseInt(id, 10))
      .query(`
        SELECT o.*, v.code AS voucher_code, u.username, u.email
        FROM Orders o
        LEFT JOIN Vouchers v ON v.id = o.voucher_id
        LEFT JOIN Users u ON u.id = o.user_id
        WHERE o.id = @id
      `);

    if (!result.recordset.length) {
      return res.status(404).json({ success: false, message: 'Khong tim thay don hang.' });
    }

    const order = result.recordset[0];
    if (order.user_id !== req.user.id && req.user.role !== 'manager' && req.user.role !== 'staff') {
      return res.status(403).json({ success: false, message: 'Ban khong co quyen xem don hang nay.' });
    }

    const items = await pool.request()
      .input('order_id', sql.Int, parseInt(id, 10))
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
    console.error('Loi getOrderById:', error);
    res.status(500).json({ success: false, message: 'Loi server.' });
  }
};

// PATCH /api/orders/:id/cancel
const cancelMyOrder = async (req, res) => {
  let transaction;

  try {
    const id = parseInt(req.params.id, 10);
    const pool = getPool();
    transaction = new sql.Transaction(pool);
    await transaction.begin(sql.ISOLATION_LEVEL.READ_COMMITTED);

    const result = await new sql.Request(transaction)
      .input('id', sql.Int, id)
      .query(`
        SELECT id, status, user_id
        FROM Orders WITH (UPDLOCK, ROWLOCK)
        WHERE id = @id
      `);

    if (!result.recordset.length) {
      throw new HttpError(404, 'Khong tim thay don hang.');
    }

    const order = result.recordset[0];
    if (order.user_id !== req.user.id) {
      throw new HttpError(403, 'Ban khong co quyen huy don hang nay.');
    }
    if (order.status !== 'pending') {
      throw new HttpError(400, 'Chi co the huy don hang khi don chua duoc xac nhan.');
    }

    await applyCancellationEffects(transaction, id);
    await new sql.Request(transaction)
      .input('id', sql.Int, id)
      .query(`UPDATE Orders SET status = 'cancelled', updated_at = GETDATE() WHERE id = @id`);

    await transaction.commit();
    transaction = null;

    res.json({ success: true, message: 'Da huy don hang thanh cong!' });
  } catch (error) {
    await rollbackQuietly(transaction);
    console.error('Loi cancelMyOrder:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.status ? error.message : 'Loi server.',
    });
  }
};

// PATCH /api/orders/:id/status
const updateOrderStatus = async (req, res) => {
  let transaction;

  try {
    const id = parseInt(req.params.id, 10);
    const { status } = req.body;

    if (!VALID_STATUSES.includes(status)) {
      throw new HttpError(400, 'Trang thai khong hop le.');
    }

    const pool = getPool();
    transaction = new sql.Transaction(pool);
    await transaction.begin(sql.ISOLATION_LEVEL.READ_COMMITTED);

    const existing = await new sql.Request(transaction)
      .input('id', sql.Int, id)
      .query(`
        SELECT id, status
        FROM Orders WITH (UPDLOCK, ROWLOCK)
        WHERE id = @id
      `);

    if (!existing.recordset.length) {
      throw new HttpError(404, 'Khong tim thay don hang.');
    }

    const currentStatus = existing.recordset[0].status;

    if (currentStatus === status) {
      await transaction.commit();
      transaction = null;
      return res.json({ success: true, message: 'Trang thai don hang khong thay doi.' });
    }

    if (currentStatus === 'cancelled' && status !== 'cancelled') {
      throw new HttpError(400, 'Khong the khoi phuc don hang da huy.');
    }

    if (status === 'cancelled') {
      await applyCancellationEffects(transaction, id);
    }

    await new sql.Request(transaction)
      .input('id', sql.Int, id)
      .input('status', sql.NVarChar(20), status)
      .query('UPDATE Orders SET status = @status, updated_at = GETDATE() WHERE id = @id');

    await transaction.commit();
    transaction = null;

    res.json({ success: true, message: `Cap nhat trang thai thanh "${status}" thanh cong!` });
  } catch (error) {
    await rollbackQuietly(transaction);
    console.error('Loi updateOrderStatus:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.status ? error.message : 'Loi server.',
    });
  }
};

// GET /api/admin/orders
const getAllOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const pool = getPool();

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const countRequest = pool.request();
    const dataRequest = pool.request();
    let whereClause = '';

    if (status) {
      whereClause = 'WHERE o.status = @status';
      countRequest.input('status', sql.NVarChar(20), status);
      dataRequest.input('status', sql.NVarChar(20), status);
    }

    const countResult = await countRequest.query(`
      SELECT COUNT(*) AS total
      FROM Orders o
      ${whereClause}
    `);

    dataRequest.input('offset', sql.Int, offset);
    dataRequest.input('limit', sql.Int, limitNum);

    const result = await dataRequest.query(`
      SELECT
        o.id, o.status, o.final_price, o.payment_method, o.created_at,
        o.shipping_name, o.shipping_phone,
        u.username, u.email
      FROM Orders o
      JOIN Users u ON u.id = o.user_id
      ${whereClause}
      ORDER BY o.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);

    const total = countResult.recordset[0].total;
    res.json({
      success: true,
      data: result.recordset,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        total_pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Loi getAllOrders:', error);
    res.status(500).json({ success: false, message: 'Loi server.' });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelMyOrder,
  updateOrderStatus,
  getAllOrders,
};
