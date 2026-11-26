# Healthy Diet Planner

Trợ lý AI chạy bằng Ollama: xem [hướng dẫn cấu hình và kiểm thử](backend/AI.md).

Cảnh báo sức khỏe, thông báo và phân tích dinh dưỡng: xem [hướng dẫn sử dụng, quy tắc và API](backend/MONITORING.md).

Ứng dụng Angular 21, Angular Material, NestJS 10, Prisma 5 và MySQL 8 để lập kế hoạch, theo dõi bữa ăn và cân nặng. Giao diện tiếng Việt, responsive.

## Cài đặt

Yêu cầu Node.js 20+, npm và MySQL 8. Tạo database UTF-8:

```sql
CREATE DATABASE IF NOT EXISTS healthy_diet_planner CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Khởi động backend:

```powershell
cd backend
Copy-Item .env.example .env
# Sửa DATABASE_URL và JWT_SECRET (tối thiểu 32 ký tự)
npm install
npx prisma migrate deploy
npm run db:generate
npm run db:seed
npm run dev
```

Khởi động frontend trong terminal khác:

```powershell
cd frontend
npm install
npm start
```

Mở `http://localhost:4200`. API chạy tại `http://localhost:3000/api`.

## Onboarding và hai chế độ

Sau khi đăng ký, khảo sát dạng từng câu chỉ xuất hiện ở lần đầu. Người dùng có thể hoàn tất để bật cá nhân hóa hoặc chọn **Bỏ qua khảo sát** để dùng chế độ tự lập kế hoạch. Có thể cập nhật khảo sát và đổi chế độ sau đó trong **Hồ sơ của tôi**; dữ liệu thực phẩm, kế hoạch, nhật ký và cân nặng cũ luôn được giữ nguyên.

### Cá nhân hóa theo khảo sát

- Lưu thông tin cơ thể, mục tiêu cân nặng, mức vận động, tình trạng sức khỏe tự khai báo, dị ứng, phong cách ăn uống và số bữa.
- Tính BMI, BMR, TDEE, calories và macro ước tính.
- Mục **Đề xuất tự động** trên sidebar tạo bản nháp theo ngày hoặc 7 ngày bằng bộ quy tắc.
- Áp dụng quy tắc an toàn riêng cho tình trạng sức khỏe đã khai báo; không tự suy đoán bệnh lý.
- Mọi bản nháp đều có thể từ chối, lưu rồi chỉnh sửa hoặc xóa từng món.

### Tự lập kế hoạch

- Dùng Dashboard, Meal Plan, Food Log, Weight Tracking và phân tích dinh dưỡng mà không cần khảo sát.
- Tự thêm, sửa, ẩn thực phẩm riêng và tự chọn khẩu phần.
- Có thể đặt mục tiêu calories, protein, carbohydrate và fat thủ công.
- Không đưa ra đề xuất điều trị khi chưa có khảo sát.

## Tài khoản demo

Chạy `npm run db:seed` để tạo/cập nhật tài khoản có sẵn hồ sơ, kế hoạch hôm nay, nhật ký và lịch sử cân nặng:

```text
Email: demo@healthydaily.vn
Mật khẩu: Demo@12345
```

Seed có thể chạy lại an toàn. Nếu đặt `SEED_USER_PASSWORD` và `SEED_ADMIN_PASSWORD`, seed cũng tạo `user@example.com` và `admin@example.com`.

## Database và migration

Migration nằm trong `backend/prisma/migrations`. Migration onboarding thêm cờ `onboarding_completed`; tài khoản hiện có được đánh dấu hoàn tất để không bị ép xem khảo sát mới. Trường ngân sách cũ vẫn được giữ trong database để không làm mất dữ liệu, nhưng không còn hiển thị hay được dùng khi đề xuất.

Kiểm tra kết nối và trạng thái migration:

```powershell
cd backend
npx prisma migrate status
```

## Video trang mở đầu

Video và poster nằm trong `frontend/public/media`. Có thể tạo lại bằng `npm run media:video` trong thư mục `frontend`.

Nguồn video: [Vanessa Loring / Pexels](https://www.pexels.com/video/bowls-of-colorful-healthy-food-on-a-yellow-table-5866268/), sử dụng theo [Pexels License](https://www.pexels.com/license/).

## Kiểm tra

```powershell
cd backend
npm test
cd ../frontend
npm test -- --watch=false
npm run build
```

Các chỉ số dinh dưỡng và quy tắc gợi ý mang tính tham khảo, không thay thế tư vấn y tế.
