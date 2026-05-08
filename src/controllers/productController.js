// src/controllers/productController.js
const { getPool, sql } = require('../config/db');

// GET /api/products
const getAllProducts = async (req, res) => {
  try {
    const {
      category, brand, min_price, max_price,
      search, page = 1, limit = 12, sort = 'newest'
    } = req.query;

    const pool = getPool();

    let conditions = ['p.is_active = 1'];
    const request = pool.request();

    if (category) {
      conditions.push('p.category_id = @category');
      request.input('category', sql.Int, parseInt(category));
    }
    if (brand) {
      conditions.push('p.brand = @brand');
      request.input('brand', sql.NVarChar, brand);
    }
    if (min_price) {
      conditions.push('p.price >= @min_price');
      request.input('min_price', sql.Decimal, parseFloat(min_price));
    }
    if (max_price) {
      conditions.push('p.price <= @max_price');
      request.input('max_price', sql.Decimal, parseFloat(max_price));
    }
    if (search) {
      conditions.push('(p.name LIKE @search OR p.brand LIKE @search)');
      request.input('search', sql.NVarChar, `%${search}%`);
    }

    const whereClause = 'WHERE ' + conditions.join(' AND ');

    const orderMap = {
      price_asc:    'p.price ASC',
      price_desc:   'p.price DESC',
      newest:       'p.created_at DESC',
      name_asc:     'p.name ASC',
      best_selling: 'total_sold DESC',
    };
    const orderBy = orderMap[sort] || 'p.created_at DESC';

    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const offset   = (pageNum - 1) * limitNum;

    request.input('offset', sql.Int, offset);
    request.input('limit',  sql.Int, limitNum);

    const countResult = await request.query(`
      SELECT COUNT(*) AS total
      FROM Products p
      JOIN Categories c ON p.category_id = c.id
      ${whereClause}
    `);
    const total = countResult.recordset[0].total;

    const request2 = pool.request();
    if (category)  request2.input('category',  sql.Int,      parseInt(category));
    if (brand)     request2.input('brand',      sql.NVarChar, brand);
    if (min_price) request2.input('min_price',  sql.Decimal,  parseFloat(min_price));
    if (max_price) request2.input('max_price',  sql.Decimal,  parseFloat(max_price));
    if (search)    request2.input('search',     sql.NVarChar, `%${search}%`);
    request2.input('offset', sql.Int, offset);
    request2.input('limit',  sql.Int, limitNum);

    const finalResult = await request2.query(`
      SELECT
        p.id, p.name, p.slug, p.price, p.stock,
        p.brand, p.image_url, p.specs,
        p.created_at,
        c.id   AS category_id,
        c.name AS category_name,
        ISNULL(AVG(CAST(r.rating AS FLOAT)), 0) AS avg_rating,
        COUNT(DISTINCT r.id) AS review_count,
        ISNULL((
          SELECT SUM(oi.quantity)
          FROM OrderItems oi
          JOIN Orders o ON o.id = oi.order_id
          WHERE oi.product_id = p.id AND o.status = 'done'
        ), 0) AS total_sold
      FROM Products p
      JOIN Categories c ON p.category_id = c.id
      LEFT JOIN Reviews r ON r.product_id = p.id
      ${whereClause}
      GROUP BY p.id, p.name, p.slug, p.price, p.stock,
               p.brand, p.image_url, p.specs,
               p.created_at,
               c.id, c.name
      ORDER BY ${orderBy}
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);

    res.json({
      success: true,
      data: finalResult.recordset,
      pagination: {
        total,
        page:        pageNum,
        limit:       limitNum,
        total_pages: Math.ceil(total / limitNum),
      },
    });

  } catch (error) {
    console.error('Lỗi getAllProducts:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

// GET /api/products/flash-sale
const getFlashSale = async (req, res) => {
  try {
    const pool = getPool();

    const result = await pool.request().query(`
      SELECT TOP 12
        p.id, p.name, p.slug, p.price, p.stock,
        p.brand, p.image_url,
        c.name AS category_name,
        ISNULL(AVG(CAST(r.rating AS FLOAT)), 0) AS avg_rating,
        COUNT(DISTINCT r.id) AS review_count,
        ISNULL((
          SELECT SUM(oi.quantity)
          FROM OrderItems oi
          JOIN Orders o ON o.id = oi.order_id
          WHERE oi.product_id = p.id AND o.status = 'done'
        ), 0) AS total_sold
      FROM Products p
      LEFT JOIN Categories c ON c.id = p.category_id
      LEFT JOIN Reviews r ON r.product_id = p.id
      WHERE p.is_active = 1 AND p.stock > 0
      GROUP BY p.id, p.name, p.slug, p.price, p.stock,
               p.brand, p.image_url, c.name
      ORDER BY p.price DESC
    `);

    // Tính discount nhất quán theo id — không random
    const RATES = [10, 15, 20, 25, 30];
    const data = result.recordset.map((p, i) => {
      const discPct   = RATES[i % RATES.length];
      const salePrice = Math.round(p.price * (1 - discPct / 100));
      const flashLimit = Math.max(p.total_sold + p.stock + 10, 20);
      return {
        ...p,
        sale_price:       salePrice,
        discount_percent: discPct,
        flash_limit:      flashLimit,
      };
    });

    res.json({ success: true, data });

  } catch (error) {
    console.error('Lỗi getFlashSale:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

// GET /api/products/:id
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    const result = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query(`
        SELECT
          p.*,
          c.name AS category_name,
          c.slug AS category_slug,
          ISNULL(AVG(CAST(r.rating AS FLOAT)), 0) AS avg_rating,
          COUNT(DISTINCT r.id) AS review_count
        FROM Products p
        JOIN Categories c ON p.category_id = c.id
        LEFT JOIN Reviews r ON r.product_id = p.id
        WHERE p.id = @id AND p.is_active = 1
        GROUP BY p.id, p.name, p.slug, p.description, p.price,
                 p.stock, p.category_id, p.brand, p.specs,
                 p.image_url, p.is_active, p.created_at, p.updated_at,
                 c.name, c.slug
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm.',
      });
    }

    const product = result.recordset[0];

    const combos = await pool.request()
      .input('product_id', sql.Int, parseInt(id))
      .query(`
        SELECT
          p.id, p.name, p.price, p.image_url, p.brand,
          pc.discount_percent
        FROM ProductCombos pc
        JOIN Products p ON p.id = pc.suggested_product_id
        WHERE pc.product_id = @product_id AND p.is_active = 1
      `);

    const reviews = await pool.request()
      .input('product_id', sql.Int, parseInt(id))
      .query(`
        SELECT TOP 5
          r.id, r.rating, r.comment, r.created_at,
          u.username, u.full_name
        FROM Reviews r
        JOIN Users u ON u.id = r.user_id
        WHERE r.product_id = @product_id
        ORDER BY r.created_at DESC
      `);

    res.json({
      success: true,
      data: {
        ...product,
        combos:  combos.recordset,
        reviews: reviews.recordset,
      },
    });

  } catch (error) {
    console.error('Lỗi getProductById:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

// POST /api/products
const createProduct = async (req, res) => {
  try {
    const { name, slug, description, price, stock,
            category_id, brand, specs, image_url } = req.body;

    if (!name || !price || !category_id) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đủ: name, price, category_id.',
      });
    }

    const finalSlug = slug || name
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const pool = getPool();

    const existing = await pool.request()
      .input('slug', sql.NVarChar, finalSlug)
      .query('SELECT id FROM Products WHERE slug = @slug');

    if (existing.recordset.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Slug đã tồn tại. Vui lòng dùng tên khác.',
      });
    }

    const result = await pool.request()
      .input('name',        sql.NVarChar, name)
      .input('slug',        sql.NVarChar, finalSlug)
      .input('description', sql.NVarChar, description || null)
      .input('price',       sql.Decimal,  parseFloat(price))
      .input('stock',       sql.Int,      parseInt(stock) || 0)
      .input('category_id', sql.Int,      parseInt(category_id))
      .input('brand',       sql.NVarChar, brand || null)
      .input('specs',       sql.NVarChar, specs || null)
      .input('image_url',   sql.NVarChar, image_url || null)
      .query(`
        INSERT INTO Products (name, slug, description, price, stock,
                              category_id, brand, specs, image_url)
        OUTPUT INSERTED.id, INSERTED.name, INSERTED.price, INSERTED.created_at
        VALUES (@name, @slug, @description, @price, @stock,
                @category_id, @brand, @specs, @image_url)
      `);

    res.status(201).json({
      success: true,
      message: 'Thêm sản phẩm thành công!',
      data: result.recordset[0],
    });

  } catch (error) {
    console.error('Lỗi createProduct:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

// PUT /api/products/:id
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, stock,
            category_id, brand, specs, image_url, is_active } = req.body;

    const pool = getPool();

    const existing = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query('SELECT id FROM Products WHERE id = @id');

    if (existing.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm.',
      });
    }

    await pool.request()
      .input('id',          sql.Int,      parseInt(id))
      .input('name',        sql.NVarChar, name || null)
      .input('description', sql.NVarChar, description || null)
      .input('price',       sql.Decimal,  price ? parseFloat(price) : null)
      .input('stock',       sql.Int,      stock !== undefined ? parseInt(stock) : null)
      .input('category_id', sql.Int,      category_id ? parseInt(category_id) : null)
      .input('brand',       sql.NVarChar, brand || null)
      .input('specs',       sql.NVarChar, specs || null)
      .input('image_url',   sql.NVarChar, image_url || null)
      .input('is_active',   sql.Bit,      is_active !== undefined ? is_active : null)
      .query(`
        UPDATE Products SET
          name        = ISNULL(@name,        name),
          description = ISNULL(@description, description),
          price       = ISNULL(@price,       price),
          stock       = ISNULL(@stock,       stock),
          category_id = ISNULL(@category_id, category_id),
          brand       = ISNULL(@brand,       brand),
          specs       = ISNULL(@specs,       specs),
          image_url   = ISNULL(@image_url,   image_url),
          is_active   = ISNULL(@is_active,   is_active),
          updated_at  = GETDATE()
        WHERE id = @id
      `);

    res.json({ success: true, message: 'Cập nhật sản phẩm thành công!' });

  } catch (error) {
    console.error('Lỗi updateProduct:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

// DELETE /api/products/:id
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    const existing = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query('SELECT id FROM Products WHERE id = @id AND is_active = 1');

    if (existing.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm.',
      });
    }

    await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query(`
        UPDATE Products
        SET is_active = 0, updated_at = GETDATE()
        WHERE id = @id
      `);

    res.json({ success: true, message: 'Đã xoá sản phẩm thành công.' });

  } catch (error) {
    console.error('Lỗi deleteProduct:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

// GET /api/products/categories
const getCategories = async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.request().query(`
      SELECT c.*, COUNT(p.id) AS product_count
      FROM Categories c
      LEFT JOIN Products p ON p.category_id = c.id AND p.is_active = 1
      GROUP BY c.id, c.name, c.slug, c.description, c.created_at
      ORDER BY c.name
    `);
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error('Lỗi getCategories:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

// GET /api/products/brands
const getBrands = async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.request().query(`
      SELECT brand, COUNT(*) AS product_count
      FROM Products
      WHERE is_active = 1 AND brand IS NOT NULL
      GROUP BY brand
      ORDER BY brand
    `);
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error('Lỗi getBrands:', error);
    res.status(500).json({ success: false, message: 'Lỗi server.' });
  }
};

module.exports = {
  getAllProducts, getProductById, createProduct,
  updateProduct, deleteProduct, getCategories, getBrands,
  getFlashSale,
};