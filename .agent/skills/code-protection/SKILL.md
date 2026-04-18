---
name: code-protection
description: Instructional guide for implementing code obfuscation and security patterns for Userscripts and web extensions.
---

# Code Protection & Obfuscation (Bảo vệ mã nguồn)

## 📌 Context
Sử dụng skill này khi cần bảo vệ logic quan trọng (như API reverse-engineered) khỏi việc bị sao chép hoặc phân tích ngược bởi người dùng khác hoặc đối thủ.

## 🎯 Core Principles

### 1. Layers of Security (Các lớp bảo mật)
Không có mã hóa nào là tuyệt đối trên môi trường Client-side. Mục tiêu là làm cho chi phí thời gian để "mổ" code vượt quá giá trị của code đó.
- **Obfuscation:** Làm rối luồng thực thi và tên biến.
- **String Encryption:** Mã hóa các chuỗi hằng số (API URLs, Keys).
- **Control Flow Flattening:** Biến cấu trúc code tuyến tính thành một vòng lặp switch-case khổng lồ.

### 2. Tooling
Sử dụng `javascript-obfuscator` - thư viện mạnh mẽ nhất hiện nay cho JavaScript.
- **CLI Usage:** `javascript-obfuscator <input> --output <output> [options]`
- **Key Options:**
  - `--compact true`: Xóa mọi dấu xuống dòng.
  - `--control-flow-flattening true`: Làm rối cấu trúc hàm.
  - `--string-array true`: Đẩy toàn bộ chuỗi vào một mảng riêng và mã hóa.
  - `--rename-globals true`: Đổi tên cả các hàm toàn cục (cần cẩn thận với GM_ functions).

### 3. Userscript Metadata Safety
**CẢNH BÁO:** Phần Metadata (==UserScript==) **KHÔNG ĐƯỢC MÃ HÓA**.
- Metadata phải nằm ở đầu tệp và ở dạng văn bản thuần để trình quản lý script (Violentmonkey/Tampermonkey) có thể đọc được.
- Luôn tách phần Metadata ra trước khi mã hóa phần logic, sau đó ghép lại.

### 4. Continuous Deployment (GitHub)
- **Source of Truth:** Giữ code sạch trên máy cục bộ hoặc một branch riêng.
- **Release Channel:** Chỉ push bản đã mã hóa lên branch `main` hoặc `production` để người dùng cập nhật.

## 🛠️ Typical Workflow
1. **Clean Build:** Đảm bảo code gốc hoạt động hoàn hảo.
2. **Obfuscate:** Chạy lệnh mã hóa qua CLI hoặc build script.
3. **Validate Metadata:** Kiểm tra lại xem header `@name`, `@match`, `@updateURL` còn nguyên vẹn không.
4. **Deploy:** Push bản đã mã hóa lên GitHub.
