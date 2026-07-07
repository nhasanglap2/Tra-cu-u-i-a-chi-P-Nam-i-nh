# Website Tra cứu Địa chỉ - Công an phường Nam Định

Website tra cứu địa chỉ nhanh dành cho Công an phường Nam Định. Dữ liệu được đồng bộ tự động từ Google Sheet và hiển thị thông tin Cán bộ Cảnh sát khu vực (CSKV) & Cảnh sát hình sự phụ trách tương ứng.

## Tính năng nổi bật
1. **Tìm kiếm thông minh**: Gõ từ khóa tiếng Việt không dấu vẫn hiển thị kết quả chính xác (ví dụ: gõ `thuy` ra `thủy cơ`).
2. **Hiệu năng cực cao**: Dữ liệu được nén từ 4.1MB xuống còn **1.73MB** (`data.json`) giúp website tải tức thì trên điện thoại.
3. **Phân trang cuộn vô hạn**: Không bị giật/lag trình duyệt điện thoại khi tìm các từ khóa ngắn trả về hàng ngàn kết quả.
4. **Hành động một chạm**: Nhấn "Gọi ngay" để gọi trực tiếp cho cán bộ, hoặc "Sao chép SĐT" để lưu vào danh bạ kèm thông báo trực quan.
5. **Cập nhật dữ liệu tự động**: Đồng bộ dữ liệu mới từ Google Sheet hàng ngày hoàn toàn tự động thông qua GitHub Actions.
6. **Hosting Cloudflare miễn phí 100%**: Lưu trữ trên Cloudflare Pages cực nhanh, không giới hạn băng thông, bảo mật cao và hỗ trợ tên miền riêng miễn phí.

---

## Hướng dẫn đẩy lên Server Cloudflare Pages & Nhận Link miễn phí (.pages.dev)

Để đưa trang web hoạt động online công cộng, bạn hãy thực hiện theo 3 bước cực kỳ đơn giản sau:

### Bước 1: Tạo Kho Lưu Trữ (Repository) trên GitHub
1. Truy cập [github.com](https://github.com/) và đăng nhập (hoặc đăng ký tài khoản miễn phí nếu chưa có).
2. Nhấn nút **New** (Tạo mới) ở góc trên bên trái để tạo kho lưu trữ mới.
3. Đặt tên kho lưu trữ (ví dụ: `tra-cuu-dia-chi-nam-dinh`).
4. Chọn chế độ **Private** (Riêng tư) hoặc **Public** (Công khai) tùy ý bạn.
5. Nhấn **Create repository**.

### Bước 2: Đẩy Mã Nguồn Lên GitHub
Mở Terminal tại thư mục dự án trên máy tính của bạn và chạy các lệnh sau (thay thế URL bằng URL kho lưu trữ GitHub của bạn):

```bash
# 1. Khởi tạo Git cục bộ (nếu chưa khởi tạo)
git init
git branch -M main

# 2. Thêm tất cả các file dự án vào git và commit
git add .
git commit -m "Initial commit for Address Lookup website"

# 3. Liên kết tới kho lưu trữ GitHub của bạn (Thay URL dưới đây bằng URL thật của bạn)
git remote add origin https://github.com/TÊN_TÀI_KHOẢN_CỦA_BẠN/TÊN_KHO_LƯU_TRỮ.git

# 4. Đẩy mã nguồn lên GitHub
git push -u origin main -f
```

### Bước 3: Liên kết GitHub với Cloudflare Pages
1. Truy cập trang quản trị Cloudflare [dash.cloudflare.com](https://dash.cloudflare.com/) và đăng nhập.
2. Tại menu bên trái, chọn **Workers & Pages**.
3. Nhấn **Create application** (Tạo ứng dụng) ở góc phải.
4. Chọn tab **Pages** và nhấn nút **Connect to Git** (Kết nối với Git).
5. Đăng nhập tài khoản GitHub của bạn và chọn kho lưu trữ `tra-cuu-dia-chi-nam-dinh` vừa tạo ở Bước 1.
6. Cấu hình cài đặt dự án (Project Settings):
   - **Framework preset**: Chọn `None` (Dự án của chúng ta là HTML/JS tĩnh).
   - **Build command** (Lệnh build): *Để trống* (Không cần điền).
   - **Build output directory** (Thư mục xuất bản): Điền dấu chấm `.` (nghĩa là thư mục gốc).
7. Nhấn **Save and Deploy** (Lưu và Triển khai).

**Xong!** Cloudflare sẽ xuất bản trang web của bạn sau vài giây và cung cấp một tên miền miễn phí dạng `tra-cuu-dia-chi-nam-dinh.pages.dev`.

---

## Chu trình Tự động Cập nhật Dữ liệu hoạt động thế nào?
1. Hàng ngày, **GitHub Actions** sẽ tự động chạy ngầm, tải dữ liệu mới nhất từ Google Sheets của bạn về, nén và cập nhật vào file `data.json`, sau đó tự động commit & push ngược lại kho lưu trữ GitHub của bạn.
2. **Cloudflare Pages** ngay lập tức phát hiện thay đổi mới trên GitHub và tự động cập nhật website chỉ trong vòng 5 giây.
3. Người dùng truy cập luôn nhận được thông tin địa chỉ và số điện thoại cán bộ mới nhất mà bạn không cần phải làm gì thêm!

---

## Cấu trúc Dự án
- `index.html`: Cấu trúc giao diện người dùng.
- `style.css`: Thiết kế giao diện (màu sắc ngành Công an, các hiệu ứng động, hỗ trợ hiển thị đẹp trên mọi màn hình di động/máy tính).
- `app.js`: Xử lý tìm kiếm không dấu, tải cuộn vô hạn và sao chép số điện thoại.
- `update_data.py`: Kịch bản Python tự động kéo và nén dữ liệu từ Google Sheets.
- `data.json`: Bộ dữ liệu đã nén để website đọc offline (GitHub Actions sẽ tự cập nhật file này).
- `.github/workflows/update_and_deploy.yml`: Cấu hình tiến trình tự động hóa đồng bộ dữ liệu.
