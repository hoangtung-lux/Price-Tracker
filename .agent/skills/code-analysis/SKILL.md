---
name: code-analysis
description: Specialized skill for analyzing, deobfuscating, and extracting data from complex or minified codebases.
---

# Code Analysis & Deobfuscation (Phân tích & Giải mã mã nguồn)

## 📌 Context
Sử dụng skill này khi cần "mổ" (dissect) các mã nguồn bị làm rối (obfuscated), rút gọn (minified), hoặc để trích xuất các logic ẩn từ các ứng dụng web phức tạp (như Extension, Crawlers).

## 🎯 Core Principles

### 1. Pattern Recognition (Nhận diện khuôn mẫu)
Mọi đoạn code dù bị làm rối vẫn giữ lại các cấu trúc logic cơ bản.
- **Data Containers:** Tìm các biến mang giá trị mảng `[]` hoặc Object `{}` lớn. Đây thường là nơi chứa dữ liệu lịch sử giá hoặc cấu hình.
- **Entry Points:** Tìm các hàm liên quan đến Event (onClick, onLoad) hoặc Network (`fetch`, `xhr`, `ajax`) để xác định luồng dữ liệu.

### 2. Regex-First Extraction
Khi đối mặt với một file JS hoặc HTML khổng lồ (như trường hợp 22KB của Gouwudang), không nên đọc từng dòng. Hãy dùng Regex:
- **Variable Capture:** `var\s+(\w+)\s*=\s*(\[.*?\]);` -> Bắt các mảng dữ liệu.
- **JSON in String:** `JSON\.parse\(['"](.*?)['"]\)` -> Tìm các chuỗi JSON bị mã hóa.

### 3. Deobfuscation Strategies
- **Variable Mapping:** Luôn tạo một bảng ánh xạ (Mapping Table) khi phát hiện các biến bị đổi tên (ví dụ: `_0xabc123` -> `priceData`).
- **Simplify Control Flow:** Bỏ qua các đoạn code "rác" (Dead code/Junk code) dùng để làm rối mắt. Tập trung vào các câu lệnh `return` và `assignment`.

### 4. Network Traffic Analysis
Nếu code quá khó đọc, hãy chuyển sang phân tích Network:
- Tìm các Request có đuôi `.aspx`, `.php`, `.json`.
- So khớp tham số URL với code để tìm ra hàm sinh Token/Sign.

## 🛠️ Typical Workflow
1. **Beautify:** Luôn dùng `prettier` hoặc `js-beautify` trước khi đọc code minified.
2. **Search:** Tìm từ khóa "price", "history", "trend", "data".
3. **Extract:** Sử dụng Python hoặc Javascript script để tự động bóc tách các khối dữ liệu lặp lại.
