# <img src="https://raw.githubusercontent.com/hoangtung-lux/Price-Tracker/main/assets/logo.png" width="48" height="48" valign="middle"> Price Tracker (Taobao, Tmall, JD, 1688)

B?n theo dõi l?ch s? giá TMÐT cao c?p v?i giao di?n Glassmorphism và bi?u d? ECharts mu?t mà.

## ?? Tính nang n?i b?t
- **Theo dõi da sàn**: H? tr? Taobao, Tmall, JD (Jingdong), và 1688.
- **Bi?u d? chuyên nghi?p**: S? d?ng Apache ECharts d? hi?n th? bi?n d?ng giá tr?c quan.
- **Giao di?n Premium**: Thi?t k? t?i gi?n, h? tr? Dark Mode và hi?u ?ng kính m? (Glassmorphism).
- **C?p nh?t t? d?ng**: H? th?ng t? d?ng nh?n di?n b?n m?i t? GitHub.
- **Siêu nh?**: Ki?n trúc Dependency giúp t?i uu hóa hi?u nang trình duy?t.

## ?? Cài d?t
Ð? s? d?ng, b?n ch? c?n cài d?t 1 t?p duy nh?t thông qua Violentmonkey ho?c Tampermonkey:

?? [**Cài d?t Price Tracker (B?n H?p Nh?t)**](https://raw.githubusercontent.com/hoangtung-lux/Price-Tracker/main/price-tracker.user.js)

---

## ?? Ki?n trúc h? th?ng
D? án du?c tách làm 2 ph?n d? t?i uu hóa vi?c b?o trì:
1. **Entry Point** (price-tracker.user.js): Ch?a giao di?n và b? cài d?t.
2. **Core Engine** (ssets/price-tracker-core.js): Ch?a thu?t toán bóc tách API và x? lý d? li?u.

## ?? Tác gi?
- **Hoàng Tùng**

---
*Ghi chú: Mã ngu?n dã du?c b?o v? b?ng Obfuscation d? d?m b?o an toàn cho các endpoint API.*
