// src/controllers/voucherController.js
const { getPool, sql } = require('../config/db');

// ============================================================
// POST /api/vouchers/apply — Kiểm tra & áp dụng mã giảm giá
// ============================================================
const applyVoucher = async (req, res) => {
  try {
    const { code, total_price } = req.body;

    if (!code || !total_price) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập mã giảm giá và tổng tiền.',
      });
    }

    const pool = getPool();

    const result = await pool.request()
      .input('code', sql.NVarChar, code.toUpperCase())
      .query(`
        SELECT id, code, discount_percent, max_uses, used_count, expires_at
        FROM Vouchers
        WHERE code = @code AND is_active = 1
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Mã giảm giá không tồn tại.',
      });
    }

    const voucher = result.recordset[0];

    if (voucher.used_count >= voucher.max_uses) {
      return res.status(400).json({
        success: false,
        message: 'Mã giảm giá đã hết lượt sử dụng.',
      });
    }

    if (voucher.expires_at && new Date(voucher.expires_at) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Mã giảm giá đã hết hạn.',
      });
    }

    const discount_amount = (total_price * voucher.discount_percent) / 100;
    const final_price     = total_price - discount_amount;

    res.json({
      success: true,
      message: `Áp dụng mã thành công! Giảm ${voucher.discount_percent}%`,
      data: {
        voucher_id:       voucher.id,
        code:             voucher.code,
        discount_percent: voucher.discount_percent,
        discount_amount,
        final_price,
        remaining_uses:   voucher.max_uses - voucher.used_count,
      },
    });

  } catch (error) {
    console.error('Lỗi applyVoucher:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

// ============================================================
// GET /api/vouchers — Danh sách voucher (Admin)
// ============================================================
const getAllVouchers = async (req, res) => {
  try {
    const pool = getPool();

    const result = await pool.request().query(`
      SELECT 
        id, code, discount_percent, max_uses, used_count,
        is_active, expires_at, created_at,
        (max_uses - used_count) AS remaining_uses
      FROM Vouchers
      ORDER BY created_at DESC
    `);

    res.json({ success: true, data: result.recordset });

  } catch (error) {
    console.error('Lỗi getAllVouchers:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

// ============================================================
// POST /api/vouchers — Tạo voucher mới (Admin)
// ============================================================
const createVoucher = async (req, res) => {
  try {
    const { code, discount_percent, max_uses, expires_at } = req.body;

    if (!code || !discount_percent) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập code và discount_percent.',
      });
    }

    if (discount_percent < 1 || discount_percent > 100) {
      return res.status(400).json({
        success: false,
        message: 'Phần trăm giảm giá phải từ 1 đến 100.',
      });
    }

    const pool = getPool();

    // Kiểm tra code trùng
    const existing = await pool.request()
      .input('code', sql.NVarChar, code.toUpperCase())
      .query('SELECT id FROM Vouchers WHERE code = @code');

    if (existing.recordset.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Mã giảm giá đã tồn tại.',
      });
    }

    const result = await pool.request()
      .input('code',             sql.NVarChar, code.toUpperCase())
      .input('discount_percent', sql.Int,      parseInt(discount_percent))
      .input('max_uses',         sql.Int,      parseInt(max_uses) || 100)
      .input('expires_at',       sql.DateTime, expires_at ? new Date(expires_at) : null)
      .query(`
        INSERT INTO Vouchers (code, discount_percent, max_uses, expires_at)
        OUTPUT INSERTED.*
        VALUES (@code, @discount_percent, @max_uses, @expires_at)
      `);

    res.status(201).json({
      success: true,
      message: 'Tạo mã giảm giá thành công!',
      data: result.recordset[0],
    });

  } catch (error) {
    console.error('Lỗi createVoucher:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

// ============================================================
// PUT /api/vouchers/:id — Cập nhật voucher (Admin)
// ============================================================
const updateVoucher = async (req, res) => {
  try {
    const { id } = req.params;
    const { discount_percent, max_uses, expires_at, is_active } = req.body;
    const pool = getPool();

    const existing = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query('SELECT id FROM Vouchers WHERE id = @id');

    if (existing.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy voucher.',
      });
    }

    await pool.request()
      .input('id',               sql.Int,      parseInt(id))
      .input('discount_percent', sql.Int,      discount_percent ? parseInt(discount_percent) : null)
      .input('max_uses',         sql.Int,      max_uses ? parseInt(max_uses) : null)
      .input('expires_at',       sql.DateTime, expires_at ? new Date(expires_at) : null)
      .input('is_active',        sql.Bit,      is_active !== undefined ? is_active : null)
      .query(`
        UPDATE Vouchers SET
          discount_percent = ISNULL(@discount_percent, discount_percent),
          max_uses         = ISNULL(@max_uses,         max_uses),
          expires_at       = ISNULL(@expires_at,       expires_at),
          is_active        = ISNULL(@is_active,        is_active)
        WHERE id = @id
      `);

    res.json({ success: true, message: 'Cập nhật voucher thành công!' });

  } catch (error) {
    console.error('Lỗi updateVoucher:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

// ============================================================
// DELETE /api/vouchers/:id — Xoá voucher (Admin)
// ============================================================
const deleteVoucher = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query('UPDATE Vouchers SET is_active = 0 WHERE id = @id');

    res.json({ success: true, message: 'Đã xoá voucher thành công.' });

  } catch (error) {
    console.error('Lỗi deleteVoucher:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

module.exports = {
  applyVoucher, getAllVouchers, createVoucher,
  updateVoucher, deleteVoucher,
};