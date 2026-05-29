# GosuCore Backend

GosuCore là project bán thiết bị gaming gồm frontend tĩnh trong `public/` và backend Node.js/Express kết nối SQL Server.

README này hướng dẫn cách cài project trên máy khác, kết nối SQL Server, tạo database và import dữ liệu mẫu từ `seed_products.sql` để trang web hiển thị đầy đủ sản phẩm.

## Yêu Cầu

Máy cần có:

| Phần mềm | Gợi ý |
| --- | --- |
| Node.js | 18 trở lên |
| SQL Server | SQL Server Developer, Express hoặc bản đầy đủ |
| SQL Server Management Studio | Dùng để chạy file `.sql` |

Kiểm tra Node.js:

```bash
node -v
npm -v
```

## Cài Project

Mở terminal tại thư mục project rồi chạy:

```bash
npm install
```

Các lệnh chạy server:

```bash
npm run dev
```

Hoặc:

```bash
npm start
```

Mặc định web chạy ở:

```text
http://localhost:3000
```

## Cấu Hình Kết Nối SQL Server

Tạo file `.env` ở thư mục gốc project, cùng cấp với `server.js`.

Ví dụ cấu hình dùng SQL Server Authentication:

```env
PORT=3000
NODE_ENV=development

DB_SERVER=localhost
DB_PORT=1433
DB_NAME=GosuCoreDB
DB_USER=sa
DB_PASSWORD=YourPasswordHere
DB_ENCRYPT=false
DB_TRUST_CERT=true
DB_TRUSTED_CONNECTION=false

JWT_SECRET=gosucore_secret_change_this
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=10
```

Nếu dùng Windows Authentication:

```env
PORT=3000
NODE_ENV=development

DB_SERVER=localhost
DB_PORT=1433
DB_NAME=GosuCoreDB
DB_USER=
DB_PASSWORD=
DB_ENCRYPT=false
DB_TRUST_CERT=true
DB_TRUSTED_CONNECTION=true

JWT_SECRET=gosucore_secret_change_this
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=10
```

Lưu ý quan trọng:

- Project đang kết nối SQL Server bằng `DB_SERVER` và `DB_PORT`.
- Cách dễ nhất là cho SQL Server nghe ở port `1433`, rồi dùng `DB_SERVER=localhost`.
- Nếu máy bạn dùng SQL Express hoặc named instance, vẫn nên bật TCP/IP và cấu hình port tĩnh `1433`.

## Bật TCP/IP Và Port 1433

Nếu bạn bè chạy project mà không kết nối được SQL Server, thường là do SQL Server chưa bật TCP/IP.

Làm như sau:

1. Mở **SQL Server Configuration Manager**.
2. Vào **SQL Server Network Configuration**.
3. Chọn **Protocols for MSSQLSERVER** hoặc **Protocols for SQLEXPRESS**.
4. Chuột phải **TCP/IP** rồi chọn **Enable**.
5. Mở **TCP/IP Properties**.
6. Qua tab **IP Addresses**.
7. Kéo xuống phần **IPAll**.
8. Đặt **TCP Port** là `1433`.
9. Xóa trống **TCP Dynamic Ports** nếu đang có giá trị.
10. Restart SQL Server service.

Sau đó giữ `.env` như sau:

```env
DB_SERVER=localhost
DB_PORT=1433
```

## Tạo Database

Database được tạo bằng file:

```text
database_setup.sql
```

Cách chạy bằng SSMS:

1. Mở **SQL Server Management Studio**.
2. Kết nối vào SQL Server của máy bạn.
3. Chọn **File > Open > File...**.
4. Mở file `database_setup.sql`.
5. Nhấn **Execute** hoặc phím `F5`.

File này sẽ tạo database:

```text
GosuCoreDB
```

Và tạo các bảng chính:

- `Users`
- `Categories`
- `Products`
- `Orders`
- `OrderItems`
- `Reviews`
- `Vouchers`

Sau khi chạy xong, có thể kiểm tra:

```sql
USE GosuCoreDB;

SELECT name
FROM sys.tables
ORDER BY name;
```

## Import Dữ Liệu Mẫu

Dữ liệu sản phẩm, danh mục, user mẫu, voucher và một số dữ liệu liên quan nằm trong file:

```text
seed_products.sql
```

Đây là file quan trọng. Nếu không import file này, trang web có thể chạy nhưng danh sách sản phẩm sẽ trống.

Cách import bằng SSMS:

1. Mở **SQL Server Management Studio**.
2. Kết nối SQL Server.
3. Đảm bảo database `GosuCoreDB` đã được tạo trước bằng `database_setup.sql`.
4. Chọn **File > Open > File...**.
5. Mở file `seed_products.sql`.
6. Kiểm tra dòng đầu file có:

```sql
USE [GosuCoreDB]
GO
```

7. Nhấn **Execute** hoặc `F5`.

Sau khi import, kiểm tra dữ liệu:

```sql
USE GosuCoreDB;

SELECT COUNT(*) AS total_categories FROM Categories;
SELECT COUNT(*) AS total_products FROM Products;
SELECT COUNT(*) AS total_users FROM Users;
```

Nếu `total_products` lớn hơn `0`, dữ liệu sản phẩm đã vào database.

Bạn cũng có thể xem thử vài sản phẩm:

```sql
USE GosuCoreDB;

SELECT TOP 10 id, name, brand, price, stock, image_url
FROM Products
ORDER BY id;
```

## Chạy Server Sau Khi Import Database

Sau khi đã có `.env`, đã chạy `database_setup.sql` và `seed_products.sql`, chạy:

```bash
npm run dev
```

Terminal sẽ hiển thị dạng:

```text
Ket noi SQL Server thanh cong! (SQL Server Authentication)
Database: GosuCoreDB
Server:   localhost:1433

================================
GOSUCORE BACKEND STARTED!
================================
Server:   http://localhost:3000
Health:   http://localhost:3000/api/health
Auth:     http://localhost:3000/api/auth/ping
Products: http://localhost:3000/api/products/ping
Orders:   http://localhost:3000/api/orders/ping
================================
```

## Kiểm Tra Trên Trình Duyệt

Mở các URL sau:

| Trang | URL |
| --- | --- |
| API health | `http://localhost:3000/api/health` |
| API sản phẩm | `http://localhost:3000/api/products` |
| Trang cửa hàng | `http://localhost:3000/client/index.html` |
| Trang admin | `http://localhost:3000/admin/index.html` |

Nếu trang cửa hàng đã hiện sản phẩm, phần import `seed_products.sql` đã thành công.

## Tài Khoản Mẫu

File `seed_products.sql` có sẵn một số tài khoản mẫu.

Tài khoản quản lý thường dùng:

| Vai trò | Email | Mật khẩu |
| --- | --- | --- |
| Manager | `manager@gosucore.com` | `Admin@123` |

Tài khoản khách hàng mẫu:

| Vai trò | Email | Mật khẩu |
| --- | --- | --- |
| Customer | `test@gmail.com` | `123456` |

Sau khi dùng trên máy khác, nên đổi mật khẩu các tài khoản mẫu nếu project được đưa lên môi trường thật.

## Lỗi Thường Gặp

### Không kết nối được SQL Server

Kiểm tra:

- SQL Server service đã chạy chưa.
- TCP/IP đã bật chưa.
- Port `1433` đã cấu hình chưa.
- `.env` có đúng `DB_SERVER`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` không.

Kiểm tra service:

1. Bấm `Windows + R`.
2. Gõ `services.msc`.
3. Tìm **SQL Server (MSSQLSERVER)** hoặc **SQL Server (SQLEXPRESS)**.
4. Đảm bảo service đang ở trạng thái **Running**.

### Login failed for user 'sa'

Nguyên nhân thường gặp:

- Sai mật khẩu `sa`.
- SQL Server chưa bật SQL Server Authentication.
- User `sa` đang bị disable.

Cách xử lý:

1. Mở SSMS.
2. Chuột phải server, chọn **Properties**.
3. Vào **Security**.
4. Chọn **SQL Server and Windows Authentication mode**.
5. Restart SQL Server.
6. Kiểm tra lại mật khẩu trong `.env`.

### Trang web chạy nhưng không có sản phẩm

Nguyên nhân thường là chưa chạy `seed_products.sql`.

Kiểm tra:

```sql
USE GosuCoreDB;
SELECT COUNT(*) FROM Products;
```

Nếu kết quả là `0`, hãy chạy lại file `seed_products.sql`.

### Chạy seed bị lỗi trùng khóa chính

`seed_products.sql` có dùng `IDENTITY_INSERT` và dữ liệu có id cố định. Nếu database đã có dữ liệu cũ, chạy lại seed có thể bị lỗi trùng `id`.

Cách đơn giản nhất cho máy mới:

1. Xóa database `GosuCoreDB`.
2. Chạy lại `database_setup.sql`.
3. Chạy lại `seed_products.sql`.

Lệnh xóa database nếu cần:

```sql
USE master;
ALTER DATABASE GosuCoreDB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
DROP DATABASE GosuCoreDB;
```

Sau đó tạo lại từ đầu bằng `database_setup.sql`.

## Thứ Tự Chạy Chuẩn Cho Máy Bạn Bè

```text
1. Cài Node.js
2. Cài SQL Server và SSMS
3. Clone hoặc copy project
4. Chạy npm install
5. Tạo file .env
6. Bật TCP/IP và port 1433 cho SQL Server
7. Mở SSMS và chạy database_setup.sql
8. Mở SSMS và chạy seed_products.sql
9. Chạy npm run dev
10. Mở http://localhost:3000/client/index.html
```

## Cấu Trúc Chính

```text
gosucore_be/
  server.js
  package.json
  database_setup.sql
  seed_products.sql
  public/
    client/
    admin/
    css/
    js/
  src/
    config/
      db.js
    controllers/
    routes/
    middlewares/
```

Trong đó:

- `database_setup.sql`: tạo database và bảng.
- `seed_products.sql`: import dữ liệu mẫu để có sản phẩm hiển thị.
- `src/config/db.js`: cấu hình kết nối SQL Server từ `.env`.
- `public/client`: giao diện người mua.
- `public/admin`: giao diện quản trị.
