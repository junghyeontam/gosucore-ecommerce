# 🎮 GosuCore Backend — Hướng dẫn cài đặt

## Bước 1: Cài đặt môi trường

### Yêu cầu
- Node.js 18+ (tải tại https://nodejs.org)
- SQL Server 2019+ hoặc SQL Server Express (miễn phí)
- SQL Server Management Studio - SSMS (để chạy file .sql)

---

## 1. Cài Node.js dependencies

Mở terminal trong thư mục `gosucore-backend/` và chạy:

```bash
npm install
```

Lệnh này cài các thư viện:
- **express** — web framework
- **mssql** — kết nối SQL Server
- **jsonwebtoken** — tạo và xác thực JWT
- **bcryptjs** — mã hoá mật khẩu
- **dotenv** — đọc biến môi trường từ `.env`
- **cors** — cho phép frontend gọi API
- **nodemon** — tự restart server khi sửa code (dev only)

---

## 2. Cấu hình file .env

Mở file `.env` và điền thông tin SQL Server của bạn:

```env
DB_SERVER=localhost          # hoặc tên instance, VD: DESKTOP-ABC\SQLEXPRESS
DB_PORT=1433
DB_USER=sa                   # username SQL Server của bạn
DB_PASSWORD=YourPassword123! # mật khẩu của bạn
DB_NAME=GosuCoreDB

JWT_SECRET=your_secret_key_here
```

> ⚠️ **Lưu ý SQL Server Express:** Tên server thường là `localhost\SQLEXPRESS`
> Thay `DB_SERVER=localhost` thành `DB_SERVER=localhost\\SQLEXPRESS`

---

## 3. Tạo Database

Mở **SSMS** → kết nối SQL Server → mở file `database_setup.sql` → nhấn **Execute (F5)**

Kết quả: database `GosuCoreDB` được tạo với đầy đủ bảng + dữ liệu mẫu.

---

## 4. Chạy server

```bash
# Chế độ phát triển (tự restart khi sửa file)
npm run dev

# Chế độ production
npm start
```

---

## 5. Kiểm tra server hoạt động

Mở trình duyệt hoặc Postman, truy cập:

| URL | Mô tả |
|-----|-------|
| `http://localhost:3000/api/health` | Kiểm tra server sống |
| `http://localhost:3000/api/auth/ping` | Kiểm tra auth route |
| `http://localhost:3000/api/products/ping` | Kiểm tra product route |
| `http://localhost:3000/api/orders/ping` | Kiểm tra order route |

**Kết quả mong đợi:**
```json
{
  "success": true,
  "message": "🎮 GosuCore API đang chạy!",
  "version": "1.0.0"
}
```

---

## Cấu trúc thư mục

```
gosucore-backend/
├── .env                    ← Cấu hình môi trường (KHÔNG commit lên git)
├── .gitignore
├── package.json
├── server.js               ← Điểm khởi động
├── database_setup.sql      ← Chạy một lần để tạo DB
└── src/
    ├── config/
    │   └── db.js           ← Kết nối SQL Server
    ├── routes/             ← Định nghĩa các endpoint
    ├── controllers/        ← Xử lý logic + SQL queries
    └── middlewares/
        ├── authMiddleware.js   ← Xác thực JWT
        └── roleMiddleware.js   ← Phân quyền
```

---

## Bước tiếp theo

- **Bước 2:** Seed data sản phẩm gaming gear (20 sản phẩm mẫu)
- **Bước 3:** Xây dựng API Auth (đăng ký / đăng nhập)
- **Bước 4:** API sản phẩm + filter nâng cao
