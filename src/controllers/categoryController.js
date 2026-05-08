// src/controllers/categoryController.js
const { getPool, sql } = require('../config/db');

// GET /api/categories — Lấy tất cả danh mục
const getAllCategories = async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.request().query(`
      SELECT 
        c.*,
        COUNT(p.id) AS product_count
      FROM Categories c
      LEFT JOIN Products p ON p.category_id = c.id AND p.is_active = 1
      GROUP BY c.id, c.name, c.slug, c.description, c.created_at
      ORDER BY c.name
    `);
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error('Lỗi getAllCategories:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

// POST /api/categories — Thêm danh mục mới
const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập tên danh mục.',
      });
    }

    // Tạo slug từ tên
    const slug = name
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + '-' + Date.now();

    const pool = getPool();

    // Kiểm tra tên trùng
    const existing = await pool.request()
      .input('name', sql.NVarChar, name)
      .query('SELECT id FROM Categories WHERE name = @name');

    if (existing.recordset.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Tên danh mục đã tồn tại.',
      });
    }

    const result = await pool.request()
      .input('name',        sql.NVarChar, name)
      .input('slug',        sql.NVarChar, slug)
      .input('description', sql.NVarChar, description || null)
      .query(`
        INSERT INTO Categories (name, slug, description)
        OUTPUT INSERTED.*
        VALUES (@name, @slug, @description)
      `);

    res.status(201).json({
      success: true,
      message: 'Thêm danh mục thành công!',
      data: result.recordset[0],
    });
  } catch (error) {
    console.error('Lỗi createCategory:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

// PUT /api/categories/:id — Cập nhật danh mục
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const pool = getPool();

    const existing = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query('SELECT id FROM Categories WHERE id = @id');

    if (existing.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy danh mục.',
      });
    }

    await pool.request()
      .input('id',          sql.Int,      parseInt(id))
      .input('name',        sql.NVarChar, name || null)
      .input('description', sql.NVarChar, description || null)
      .query(`
        UPDATE Categories SET
          name        = ISNULL(@name,        name),
          description = ISNULL(@description, description)
        WHERE id = @id
      `);

    res.json({ success: true, message: 'Cập nhật danh mục thành công!' });
  } catch (error) {
    console.error('Lỗi updateCategory:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

// DELETE /api/categories/:id — Xóa danh mục
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    // Kiểm tra có sản phẩm trong danh mục không
    const products = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query('SELECT COUNT(*) AS cnt FROM Products WHERE category_id = @id AND is_active = 1');

    if (products.recordset[0].cnt > 0) {
      return res.status(400).json({
        success: false,
        message: `Không thể xóa! Danh mục còn ${products.recordset[0].cnt} sản phẩm. Hãy chuyển sản phẩm sang danh mục khác trước.`,
      });
    }

    await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query('DELETE FROM Categories WHERE id = @id');

    res.json({ success: true, message: 'Đã xóa danh mục thành công.' });
  } catch (error) {
    console.error('Lỗi deleteCategory:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

module.exports = { getAllCategories, createCategory, updateCategory, deleteCategory };