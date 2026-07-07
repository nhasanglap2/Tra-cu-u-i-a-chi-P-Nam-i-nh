# Website Tra cứu Địa chỉ - Công an phường Nam Định

Website tra cứu địa chỉ nhanh dành cho Công an phường Nam Định. Dữ liệu được đồng bộ tự động từ Google Sheet và hiển thị thông tin Cán bộ Cảnh sát khu vực (CSKV) & Cảnh sát hình sự phụ trách tương ứng.

## Tính năng nổi bật
1. **Tìm kiếm thông minh**: Gõ từ khóa tiếng Việt không dấu vẫn hiển thị kết quả chính xác (ví dụ: gõ `thuy` ra `thủy cơ`).
2. **Hiệu năng cực cao**: Dữ liệu được nén từ 4.1MB xuống còn 1.7MB và tải trực tiếp trên trình duyệt, tìm kiếm tức thì không có độ trễ.
3. **Phân trang cuộn vô hạn**: Không bị giật/lag trình duyệt điện thoại khi tìm các từ khóa ngắn trả về hàng ngàn kết quả.
4. **Hành động một chạm**: Nhấn "Gọi ngay" để gọi trực tiếp cho cán bộ, hoặc "Sao chép SĐT" để lưu vào danh bạ kèm thông báo trực quan.
5. **Cập nhật dữ liệu tự động**: Đồng bộ dữ liệu mới từ Google Sheet hàng ngày hoàn toàn tự động thông qua GitHub Actions.
6. **Hosting miễn phí 100%**: Lưu trữ vĩnh viễn trên GitHub Pages không tốn chi phí máy chủ, hỗ trợ gắn tên miền riêng miễn phí.

---

## Hướng dẫn đẩy lên Server (GitHub Pages) & Liên kết tên miền

Để đưa trang web hoạt động online công cộng, bạn hãy thực hiện theo 3 bước cực kỳ đơn giản sau:

### Bước 1: Tạo Kho Lưu Trữ (Repository) trên GitHub
1. Truy cập [github.com](https://github.com/) và đăng nhập (hoặc đăng ký tài khoản miễn phí nếu chưa có).
2. Nhấn nút **New** (Tạo mới) ở góc trên bên trái để tạo kho lưu trữ mới.
3. Đặt tên kho lưu trữ (ví dụ: `tra-cuu-dia-chi-nam-dinh`).
4. Chọn chế độ **Public** (Công khai) hoặc **Private** (Riêng tư) tùy ý của bạn.
5. Nhấn **Create repository** (không tích chọn thêm README, .gitignore hay license).

### Bước 2: Đẩy Mã Nguồn Lên GitHub
Mở Terminal tại thư mục dự án và chạy các lệnh sau (thay thế URL bằng URL kho lưu trữ GitHub của bạn):

```bash
# 1. Khởi tạo Git cục bộ (nếu chưa khởi tạo)
git init
git branch -M main

# 2. Thêm tất cả các file dự án vào git
git add .
git commit -m "Khởi tạo dự án Tra cứu địa chỉ"

# 3. Liên kết tới kho lưu trữ GitHub của bạn (Thay URL dưới đây bằng URL thật của bạn)
git remote add origin https://github.com/TÊN_TÀI_KHOẢN_CỦA_BẠN/TÊN_KHO_LƯU_TRỮ.git

# 4. Đẩy mã nguồn lên GitHub
git push -u origin main -f
```

### Bước 3: Kích hoạt Website (GitHub Pages)
1. Trên giao diện kho lưu trữ GitHub của bạn, truy cập vào mục **Settings** (Cài đặt) ở thanh công cụ phía trên.
2. Tại cột menu bên trái, chọn **Pages**.
3. Tại phần **Build and deployment** -> **Source**, chọn **GitHub Actions** (đây là tùy chọn giúp hệ thống tự động build từ workflow chúng tôi đã cấu hình sẵn).
4. **Xong!** GitHub sẽ bắt đầu tự động chạy tiến trình lấy dữ liệu từ Google Sheets, biên dịch website và xuất bản trong vòng 1-2 phút. Bạn có thể theo dõi tiến trình này tại tab **Actions**.
5. Đường link truy cập trang web của bạn sẽ hiển thị tại đầu mục **Pages** sau khi tiến trình hoàn tất (ví dụ: `https://ten_tai_khoan.github.io/ten_kho_luu_tru/`).

---

## Hướng dẫn liên kết Tên miền riêng (Domain)
Nếu bạn đã mua một tên miền riêng (ví dụ: `tracuudiachinamdinh.vn`) và muốn liên kết:
1. Vào mục **Settings** -> **Pages** trên GitHub.
2. Cuộn xuống phần **Custom domain**, nhập tên miền của bạn (ví dụ: `tracuudiachinamdinh.vn`) và nhấn **Save**.
3. Cấu hình bản ghi DNS tại nơi bạn mua tên miền:
   - Thêm bản ghi **CNAME** trỏ từ tên miền của bạn sang tên miền GitHub mặc định (ví dụ: `ten_tai_khoan.github.io`).
   - Hoặc thêm các bản ghi **A** trỏ về địa chỉ IP của GitHub Pages:
     - `185.199.108.153`
     - `185.199.109.153`
     - `185.199.110.153`
     - `185.199.111.153`

---

## Cấu trúc Dự án
- `index.html`: Cấu trúc giao diện người dùng.
- `style.css`: Thiết kế giao diện (màu sắc ngành Công an, các hiệu ứng động, hỗ trợ hiển thị đẹp trên mọi màn hình di động/máy tính).
- `app.js`: Xử lý tìm kiếm không dấu, tải cuộn vô hạn và sao chép số điện thoại.
- `update_data.py`: Kịch bản Python tự động kéo và nén dữ liệu từ Google Sheets.
- `data.json`: Bộ dữ liệu đã nén để website đọc offline (GitHub Actions sẽ tự cập nhật file này).
- `.github/workflows/update_and_deploy.yml`: Cấu hình tiến trình tự động hóa CI/CD.
