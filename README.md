# 🎮 GosuCore Backend — Hướng dẫn cài đặt đầy đủ

## Yêu cầu hệ thống

| Phần mềm | Phiên bản | Link tải |
|----------|-----------|----------|
| Node.js | 18+ | https://nodejs.org |
| SQL Server | 2019+ hoặc Express (miễn phí) | https://www.microsoft.com/sql-server |
| SSMS | Mới nhất | https://aka.ms/ssms |

---

## Bước 1 — Cài đặt Node.js dependencies

Mở terminal trong thư mục `gosucore-backend/` và chạy:

```bash
npm install
```

Các thư viện được cài:

| Thư viện | Mục đích |
|----------|----------|
| `express` | Web framework |
| `mssql` | Kết nối SQL Server |
| `jsonwebtoken` | Tạo và xác thực JWT |
| `bcryptjs` | Mã hoá mật khẩu |
| `dotenv` | Đọc biến môi trường từ `.env` |
| `cors` | Cho phép frontend gọi API |
| `nodemon` | Tự restart khi sửa code (dev) |

---

## Bước 2 — Cấu hình file .env

Tạo file `.env` trong thư mục gốc

```env
PORT=3000
NODE_ENV=development

# ── SQL Server ──────────────────────────────────────────────
DB_SERVER=localhost
DB_PORT=1433
DB_USER=sa
DB_PASSWORD=YourPassword123!
DB_NAME=GosuCoreDB
DB_ENCRYPT=false
DB_TRUST_CERT=true

# Dùng Windows Authentication (không cần user/pass)?
# DB_TRUSTED_CONNECTION=true
# DB_USER=
# DB_PASSWORD=

# ── JWT ─────────────────────────────────────────────────────
JWT_SECRET=gosucore_super_secret_key_change_this
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=10
```

### Xác định tên DB_SERVER của bạn

Mở **SSMS** → xem tên ở ô **Server name** khi đăng nhập:

| Trường hợp | Giá trị DB_SERVER |
|------------|-------------------|
| SQL Server mặc định | `localhost` |
| SQL Server Express | `localhost\SQLEXPRESS` → trong `.env` viết: `localhost\\SQLEXPRESS` |
| Tên máy tính | `DESKTOP-ABC123` |
| Tên máy + instance | `DESKTOP-ABC123\\SQLEXPRESS` |

### Chọn kiểu xác thực

**SQL Server Authentication** (có username/password):
```env
DB_USER=sa
DB_PASSWORD=YourPassword123!
DB_TRUSTED_CONNECTION=false
```

**Windows Authentication** (không cần password):
```env
DB_USER=
DB_PASSWORD=
DB_TRUSTED_CONNECTION=true
```

---

## Bước 3 — Tạo Database và import dữ liệu

### 3.1 Chạy file tạo cấu trúc database

1. Mở **SSMS** → kết nối SQL Server
2. Menu **File → Open → File...** → chọn file `database_setup.sql`
3. Nhấn **Execute** (F5)
4. Kiểm tra kết quả: cửa sổ Messages hiện **"Commands completed successfully"**

Kết quả: database `GosuCoreDB` được tạo với đầy đủ các bảng:
- `Users` — tài khoản người dùng
- `Categories` — danh mục sản phẩm
- `Products` — sản phẩm
- `Orders` + `OrderItems` — đơn hàng
- `Reviews` — đánh giá
- `Vouchers` — mã giảm giá

### 3.2 Import dữ liệu mẫu (seed data)

> ⚠️ **Bắt buộc thực hiện** — nếu bỏ qua bước này, trang web sẽ không hiển thị sản phẩm nào.

**Cách 1 — Chạy file SQL trực tiếp trong SSMS:**

1. Mở SSMS, đảm bảo đang kết nối đến `GosuCoreDB`
2. Mở file `seed_products.sql`
3. Kiểm tra dòng đầu có `USE GosuCoreDB;` — nếu chưa có thì thêm vào
4. Nhấn **Execute** (F5)
5. Kiểm tra: chạy câu lệnh sau để xác nhận dữ liệu đã vào:

```sql
USE GosuCoreDB;
SELECT COUNT(*) AS so_san_pham FROM Products;
SELECT COUNT(*) AS so_danh_muc FROM Categories;
SELECT COUNT(*) AS so_user     FROM Users;
```

Kết quả mong đợi: số sản phẩm > 0.

**Cách 2 — Chạy script Node.js seed:**

```bash
# Chạy từ thư mục gốc project
node scripts/seed.js
```

Nếu thành công terminal sẽ hiện:
```
Đã thêm 6 danh mục
Đã thêm 43 sản phẩm
Đã tạo tài khoản admin mặc định
```

### 3.3 Tài khoản mặc định sau khi seed

| Vai trò | Username | Password | Email |
|---------|----------|----------|-------|
| Quản lý | `manager` | `Admin@123` | `manager@gosucore.com` |
| Người dùng | `testuser` | `123456` | `test@gmail.com` |
> ⚠️ **Đổi mật khẩu ngay sau khi chạy lần đầu!**

---

## Bước 4 — Khởi động server

```bash
# Chế độ phát triển (tự restart khi sửa file)
npm run dev

# Chế độ production
npm start
```

Terminal sẽ hiện:
```
🎮 ================================
🎮  GOSUCORE BACKEND STARTED!
🎮 ================================
🚀 Server:   http://localhost:3000
✅ Kết nối SQL Server thành công!
   Database: GosuCoreDB
   Server:   localhost:1433
```

---

## Bước 5 — Kiểm tra hoạt động

Mở trình duyệt và truy cập:

| URL | Kết quả mong đợi |
|-----|-----------------|
| `http://localhost:3000/api/health` | `{"success":true}` |
| `http://localhost:3000/api/products` | Danh sách sản phẩm |
| `http://localhost:3000/client/index.html` | Trang chủ cửa hàng |
| `http://localhost:3000/admin/index.html` | Trang quản trị |

---

## Xử lý lỗi thường gặp

### ❌ Login failed for user 'sa'
**Nguyên nhân:** Sai mật khẩu hoặc SQL Server Authentication chưa bật.

**Cách sửa:**
1. Mở SSMS → chuột phải vào server → **Properties → Security**
2. Chọn **SQL Server and Windows Authentication mode**
3. Restart SQL Server service
4. Kiểm tra lại `DB_USER` và `DB_PASSWORD` trong `.env`

---

### ❌ Cannot connect to localhost
**Nguyên nhân:** SQL Server chưa chạy hoặc sai tên instance.

**Cách sửa:**
1. Mở **Services** (Windows + R → `services.msc`)
2. Tìm **SQL Server (MSSQLSERVER)** hoặc **SQL Server (SQLEXPRESS)**
3. Đảm bảo trạng thái là **Running** — nếu không thì chuột phải → **Start**
4. Kiểm tra lại tên instance trong `DB_SERVER`

---

### ❌ TCP/IP connection error — port 1433
**Nguyên nhân:** TCP/IP chưa được bật trong SQL Server.

**Cách sửa:**
1. Tìm kiếm **SQL Server Configuration Manager**
2. Vào **SQL Server Network Configuration → Protocols for MSSQLSERVER**
3. Chuột phải **TCP/IP → Enable**
4. Restart SQL Server service

---

### ❌ Trang web không hiện sản phẩm
**Nguyên nhân:** Chưa chạy seed data.

**Cách sửa:** Thực hiện lại **Bước 3.2** ở trên.

---

### ❌ Route không tồn tại (404)
**Nguyên nhân:** Truy cập URL file HTML nhưng server trả về JSON.

**Cách sửa:** Kiểm tra file `server.js` có đoạn sau không:
```javascript
app.use(express.static(path.join(__dirname, 'public')));
```
Nếu chưa có thì thêm vào trước phần routes.

---

## Cấu trúc thư mục

```
gosucore-backend/
├── .env                        ← Cấu hình môi trường (KHÔNG commit git)
├── .env.example                ← File mẫu cho người mới clone
├── .gitignore
├── package.json
├── server.js                   ← Điểm khởi động chính
├── database_setup.sql          ← Tạo database + bảng (chạy 1 lần)
├── seed_products.sql           ← Import dữ liệu mẫu
├── README.md
├── public/
│   ├── client/                 ← Giao diện cửa hàng
│   │   ├── index.html
│   │   ├── product.html
│   │   ├── cart.html
│   │   └── ...
│   ├── admin/                  ← Giao diện quản trị
│   │   ├── index.html
│   │   ├── products.html
│   │   ├── orders.html
│   │   └── ...
│   ├── css/
│   └── js/
│       ├── api.js              ← HTTP client + format helpers
│       └── auth.js             ← Xử lý đăng nhập/đăng xuất
└── src/
    ├── config/
    │   └── db.js               ← Kết nối SQL Server
    ├── routes/                 ← Định nghĩa endpoints
    ├── controllers/            ← Logic xử lý + SQL queries
    └── middlewares/
        ├── authMiddleware.js   ← Xác thực JWT + kiểm tra is_active
        └── roleMiddleware.js   ← Phân quyền theo role
```

---

## Thứ tự chạy lần đầu (tóm tắt)

```
1. npm install
2. Tạo file .env và điền thông tin
3. Mở SSMS → chạy database_setup.sql
4. Mở SSMS → chạy seed_products.sql
5. npm run dev
6. Mở http://localhost:3000/client/index.html
```

Nếu mọi thứ đúng, trang chủ sẽ hiển thị danh sách sản phẩm gaming ngay lập tức.