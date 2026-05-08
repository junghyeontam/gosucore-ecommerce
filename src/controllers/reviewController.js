// src/controllers/reviewController.js
const { getPool, sql } = require('../config/db');

// ============================================================
// POST /api/reviews — Tạo đánh giá mới
// ============================================================
const createReview = async (req, res) => {
  try {
    const { product_id, rating, comment } = req.body;

    if (!product_id || !rating) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập product_id và rating.',
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating phải từ 1 đến 5 sao.',
      });
    }

    const pool = getPool();

    // Kiểm tra user đã mua sản phẩm này chưa
    const purchased = await pool.request()
      .input('user_id',    sql.Int, req.user.id)
      .input('product_id', sql.Int, parseInt(product_id))
      .query(`
        SELECT TOP 1 o.id
        FROM Orders o
        JOIN OrderItems oi ON oi.order_id = o.id
        WHERE o.user_id    = @user_id
          AND oi.product_id = @product_id
          AND o.status      = 'done'
      `);

    if (purchased.recordset.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Bạn cần mua và nhận sản phẩm này trước khi đánh giá.',
      });
    }

    // Kiểm tra đã review chưa
    const existing = await pool.request()
      .input('user_id',    sql.Int, req.user.id)
      .input('product_id', sql.Int, parseInt(product_id))
      .query(`
        SELECT id FROM Reviews
        WHERE user_id = @user_id AND product_id = @product_id
      `);

    if (existing.recordset.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Bạn đã đánh giá sản phẩm này rồi.',
      });
    }

    const result = await pool.request()
      .input('user_id',    sql.Int,      req.user.id)
      .input('product_id', sql.Int,      parseInt(product_id))
      .input('rating',     sql.Int,      parseInt(rating))
      .input('comment',    sql.NVarChar, comment || null)
      .query(`
        INSERT INTO Reviews (user_id, product_id, rating, comment)
        OUTPUT INSERTED.id, INSERTED.rating, INSERTED.comment, INSERTED.created_at
        VALUES (@user_id, @product_id, @rating, @comment)
      `);

    res.status(201).json({
      success: true,
      message: 'Cảm ơn bạn đã đánh giá sản phẩm! ⭐',
      data: result.recordset[0],
    });

  } catch (error) {
    console.error('Lỗi createReview:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

// ============================================================
// GET /api/reviews/:productId — Lấy reviews của sản phẩm
// ============================================================
const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, parseInt(limit));
    const offset   = (pageNum - 1) * limitNum;

    const pool = getPool();

    // Thống kê rating
    const stats = await pool.request()
      .input('product_id', sql.Int, parseInt(productId))
      .query(`
        SELECT
          COUNT(*)                              AS total_reviews,
          ISNULL(AVG(CAST(rating AS FLOAT)), 0) AS avg_rating,
          SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) AS star_5,
          SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) AS star_4,
          SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) AS star_3,
          SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) AS star_2,
          SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) AS star_1
        FROM Reviews
        WHERE product_id = @product_id
      `);

    // Danh sách reviews
    const result = await pool.request()
      .input('product_id', sql.Int, parseInt(productId))
      .input('offset',     sql.Int, offset)
      .input('limit',      sql.Int, limitNum)
      .query(`
        SELECT
          r.id, r.rating, r.comment, r.created_at,
          u.username, u.full_name
        FROM Reviews r
        JOIN Users u ON u.id = r.user_id
        WHERE r.product_id = @product_id
        ORDER BY r.created_at DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `);

    res.json({
      success: true,
      stats:   stats.recordset[0],
      data:    result.recordset,
      pagination: {
        page:  pageNum,
        limit: limitNum,
      },
    });

  } catch (error) {
    console.error('Lỗi getProductReviews:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

// ============================================================
// DELETE /api/reviews/:id — Xoá review (Admin hoặc chủ review)
// ============================================================
const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    const existing = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query('SELECT id, user_id FROM Reviews WHERE id = @id');

    if (existing.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đánh giá.',
      });
    }

    const review = existing.recordset[0];

    // Chỉ chủ review hoặc admin mới xoá được
    if (review.user_id !== req.user.id &&
        req.user.role !== 'manager' &&
        req.user.role !== 'staff') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xoá đánh giá này.',
      });
    }

    await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query('DELETE FROM Reviews WHERE id = @id');

    res.json({ success: true, message: 'Đã xoá đánh giá thành công.' });

  } catch (error) {
    console.error('Lỗi deleteReview:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

module.exports = { createReview, getProductReviews, deleteReview };