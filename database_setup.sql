-- ============================================================
-- GOSUCORE DATABASE SETUP SCRIPT
-- Chạy file này trong SQL Server Management Studio (SSMS)
-- hoặc Azure Data Studio
-- ============================================================

-- Bước 1: Tạo database
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'GosuCoreDB')
BEGIN
    CREATE DATABASE GosuCoreDB;
    PRINT '✅ Đã tạo database GosuCoreDB';
END
GO

USE GosuCoreDB;
GO

-- ============================================================
-- BẢNG: Users (Tài khoản người dùng)
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
BEGIN
    CREATE TABLE Users (
        id          INT IDENTITY(1,1) PRIMARY KEY,
        username    NVARCHAR(50)  NOT NULL UNIQUE,
        email       NVARCHAR(100) NOT NULL UNIQUE,
        password    NVARCHAR(255) NOT NULL,    -- bcrypt hash
        full_name   NVARCHAR(100),
        phone       NVARCHAR(20),
        address     NVARCHAR(255),
        -- role: 'customer' | 'staff' | 'manager'
        role        NVARCHAR(20)  NOT NULL DEFAULT 'customer',
        is_active   BIT           NOT NULL DEFAULT 1,
        created_at  DATETIME      NOT NULL DEFAULT GETDATE(),
        updated_at  DATETIME      NOT NULL DEFAULT GETDATE()
    );
    PRINT '✅ Đã tạo bảng Users';
END
GO

-- ============================================================
-- BẢNG: Categories (Danh mục sản phẩm)
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Categories')
BEGIN
    CREATE TABLE Categories (
        id          INT IDENTITY(1,1) PRIMARY KEY,
        name        NVARCHAR(100) NOT NULL,
        slug        NVARCHAR(100) NOT NULL UNIQUE,
        description NVARCHAR(500),
        created_at  DATETIME NOT NULL DEFAULT GETDATE()
    );
    PRINT '✅ Đã tạo bảng Categories';
END
GO

-- ============================================================
-- BẢNG: Products (Sản phẩm gaming gear)
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Products')
BEGIN
    CREATE TABLE Products (
        id          INT IDENTITY(1,1) PRIMARY KEY,
        name        NVARCHAR(200) NOT NULL,
        slug        NVARCHAR(200) NOT NULL UNIQUE,
        description NVARCHAR(MAX),
        price       DECIMAL(12,2) NOT NULL,
        stock       INT           NOT NULL DEFAULT 0,
        category_id INT           NOT NULL,
        brand       NVARCHAR(100),
        -- Thông số kỹ thuật lưu dạng JSON
        -- VD: {"switch":"Red","dpi":25600,"wireless":true,"weight":"95g"}
        specs       NVARCHAR(MAX),
        image_url   NVARCHAR(500),
        is_active   BIT           NOT NULL DEFAULT 1,
        created_at  DATETIME      NOT NULL DEFAULT GETDATE(),
        updated_at  DATETIME      NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (category_id) REFERENCES Categories(id)
    );
    PRINT '✅ Đã tạo bảng Products';
END
GO

-- ============================================================
-- BẢNG: Vouchers (Mã giảm giá)
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Vouchers')
BEGIN
    CREATE TABLE Vouchers (
        id               INT IDENTITY(1,1) PRIMARY KEY,
        code             NVARCHAR(50)  NOT NULL UNIQUE,
        discount_percent INT           NOT NULL,   -- % giảm (1-100)
        max_uses         INT           NOT NULL DEFAULT 100,
        used_count       INT           NOT NULL DEFAULT 0,
        expires_at       DATETIME,
        is_active        BIT           NOT NULL DEFAULT 1,
        created_at       DATETIME      NOT NULL DEFAULT GETDATE()
    );
    PRINT '✅ Đã tạo bảng Vouchers';
END
GO

-- ============================================================
-- BẢNG: Orders (Đơn hàng)
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Orders')
BEGIN
    CREATE TABLE Orders (
        id               INT IDENTITY(1,1) PRIMARY KEY,
        user_id          INT           NOT NULL,
        -- status: 'pending'|'confirmed'|'shipping'|'done'|'cancelled'
        status           NVARCHAR(20)  NOT NULL DEFAULT 'pending',
        total_price      DECIMAL(12,2) NOT NULL,
        discount_amount  DECIMAL(12,2) NOT NULL DEFAULT 0,
        final_price      DECIMAL(12,2) NOT NULL,
        voucher_id       INT,
        shipping_name    NVARCHAR(100) NOT NULL,
        shipping_phone   NVARCHAR(20)  NOT NULL,
        shipping_address NVARCHAR(255) NOT NULL,
        note             NVARCHAR(500),
        created_at       DATETIME      NOT NULL DEFAULT GETDATE(),
        updated_at       DATETIME      NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (user_id)    REFERENCES Users(id),
        FOREIGN KEY (voucher_id) REFERENCES Vouchers(id)
    );
    PRINT '✅ Đã tạo bảng Orders';
END
GO

-- ============================================================
-- BẢNG: OrderItems (Chi tiết đơn hàng)
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'OrderItems')
BEGIN
    CREATE TABLE OrderItems (
        id          INT IDENTITY(1,1) PRIMARY KEY,
        order_id    INT           NOT NULL,
        product_id  INT           NOT NULL,
        quantity    INT           NOT NULL,
        unit_price  DECIMAL(12,2) NOT NULL,   -- Giá tại thời điểm mua
        FOREIGN KEY (order_id)   REFERENCES Orders(id),
        FOREIGN KEY (product_id) REFERENCES Products(id)
    );
    PRINT '✅ Đã tạo bảng OrderItems';
END
GO

-- ============================================================
-- BẢNG: Reviews (Đánh giá sản phẩm)
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Reviews')
BEGIN
    CREATE TABLE Reviews (
        id          INT IDENTITY(1,1) PRIMARY KEY,
        user_id     INT           NOT NULL,
        product_id  INT           NOT NULL,
        rating      INT           NOT NULL CHECK (rating BETWEEN 1 AND 5),
        comment     NVARCHAR(MAX),
        created_at  DATETIME      NOT NULL DEFAULT GETDATE(),
        FOREIGN KEY (user_id)    REFERENCES Users(id),
        FOREIGN KEY (product_id) REFERENCES Products(id),
        -- Mỗi user chỉ review 1 lần / sản phẩm
        UNIQUE (user_id, product_id)
    );
    PRINT '✅ Đã tạo bảng Reviews';
END
GO

-- ============================================================
-- BẢNG: ProductCombos (Gợi ý mua kèm)
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ProductCombos')
BEGIN
    CREATE TABLE ProductCombos (
        id                  INT IDENTITY(1,1) PRIMARY KEY,
        product_id          INT NOT NULL,
        suggested_product_id INT NOT NULL,
        discount_percent    INT NOT NULL DEFAULT 0,
        FOREIGN KEY (product_id)           REFERENCES Products(id),
        FOREIGN KEY (suggested_product_id) REFERENCES Products(id)
    );
    PRINT '✅ Đã tạo bảng ProductCombos';
END
GO

-- ============================================================
-- SEED DATA: Tài khoản mặc định
-- Password: Admin@123 (đã hash bằng bcrypt, rounds=10)
-- Khi chạy Bước 3, bạn sẽ dùng bcrypt thật, đây chỉ là placeholder
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM Users WHERE email = 'manager@gosucore.com')
BEGIN
    INSERT INTO Users (username, email, password, full_name, role)
    VALUES 
    ('manager', 'manager@gosucore.com', 
     '$2a$10$placeholder_will_replace_in_step3', 
     N'Quản lý hệ thống', 'manager'),
    ('staff01', 'staff@gosucore.com', 
     '$2a$10$placeholder_will_replace_in_step3', 
     N'Nhân viên bán hàng', 'staff');
    PRINT '✅ Đã tạo tài khoản Admin mặc định';
END
GO

-- ============================================================
-- SEED DATA: Danh mục sản phẩm
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM Categories WHERE slug = 'chuot-gaming')
BEGIN
    INSERT INTO Categories (name, slug, description) VALUES
    (N'Chuột Gaming',    'chuot-gaming',    N'Chuột chơi game chính hãng'),
    (N'Bàn phím Gaming', 'ban-phim-gaming', N'Bàn phím cơ, membrane cho game thủ'),
    (N'Tai nghe Gaming', 'tai-nghe-gaming', N'Tai nghe 7.1, surround sound'),
    (N'Màn hình Gaming', 'man-hinh-gaming', N'Màn hình 144Hz, 240Hz, 4K'),
    (N'Lót chuột',       'lot-chuot',       N'Mousepad tốc độ và kiểm soát'),
    (N'Ghế Gaming',      'ghe-gaming',      N'Ghế gaming ergonomic');
    PRINT '✅ Đã tạo danh mục sản phẩm';
END
GO

-- ============================================================
-- SEED DATA: Voucher mẫu
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM Vouchers WHERE code = 'GOSU10')
BEGIN
    INSERT INTO Vouchers (code, discount_percent, max_uses, expires_at) VALUES
    ('GOSU10',   10, 100, DATEADD(MONTH, 3, GETDATE())),
    ('GOSU20',   20, 50,  DATEADD(MONTH, 1, GETDATE())),
    ('WELCOME5', 5,  200, DATEADD(YEAR,  1, GETDATE()));
    PRINT '✅ Đã tạo voucher mẫu';
END
GO

-- ============================================================
-- KIỂM TRA KẾT QUẢ
-- ============================================================
PRINT '';
PRINT '🎮 ================================';
PRINT '🎮 GOSUCORE DATABASE READY!';
PRINT '🎮 ================================';
SELECT 'Users'         AS [Bảng], COUNT(*) AS [Số bản ghi] FROM Users
UNION ALL
SELECT 'Categories',    COUNT(*) FROM Categories
UNION ALL
SELECT 'Vouchers',      COUNT(*) FROM Vouchers
UNION ALL
SELECT 'Products',      COUNT(*) FROM Products;
GO
