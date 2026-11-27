# Healthy Diet Planner

Plans liên kết với Logs qua thao tác xác nhận món đã ăn. Hệ thống hỗ trợ cảnh báo sức khỏe, thông báo cho người dùng và admin; trợ lý AI kết nối với Ollama.

Ứng dụng Angular 21, Angular Material, NestJS 10, Prisma 5 và MySQL 8 để lập kế hoạch, theo dõi bữa ăn và cân nặng. Giao diện tiếng Việt, responsive.

## Tổ chức source code

```text
backend/src/
  app.module.ts                 # Ghép các module và đăng ký guard/interceptor toàn cục
  main.ts                       # Khởi động API
  common/                       # Decorator, guard, interceptor, filter, DTO phân trang, tiện ích ngày
  database/                     # PrismaModule và PrismaService dùng chung
  modules/
    auth/                       # Đăng ký, đăng nhập, mật khẩu
    profiles/                   # Khảo sát, chế độ sử dụng, mục tiêu nhập tay, sở thích
    foods/                      # Thực phẩm, nhóm thực phẩm, quyền truy cập và phân loại
    nutrition/                  # Công thức và mục tiêu dinh dưỡng
    meal-records/               # Plans và Logs, trạng thái món ăn, snapshot, transaction
    recommendations/            # Đề xuất thực đơn và lọc an toàn
    monitoring/                 # Theo dõi, quy tắc cảnh báo, tác vụ nền, báo cáo
    weights/                    # Nhật ký cân nặng
    notifications/              # Thông báo
    dashboard/                  # Tổng hợp dữ liệu và biểu đồ
    ai/                         # Kết nối Ollama và xử lý hội thoại
    admin/                      # Quản trị và theo dõi cảnh báo người dùng

frontend/src/app/
  core/                         # API, thông báo toàn ứng dụng, guard, điều hướng quản trị
  shared/                       # Component dùng chung, tiện ích hiển thị và style dùng chung
  features/                     # Mỗi chức năng chứa component, template, style và test liên quan
  styles/                       # Design system và các lớp giao diện toàn ứng dụng
```

Mỗi module Backend khai báo controller, service và dependency trong file `*.module.ts`; DTO nằm trong module sở hữu. `PrismaModule` cung cấp một PrismaService dùng chung. Plans và Logs tiếp tục dùng chung `MealRecordsService` để giữ transaction và chống ghi nhật ký trùng. Angular dùng chung feature `meal-records` cho hai màn hình này; tài liệu hiện được cung cấp ở frontend nên không tạo thêm API tài liệu.

Các đường dẫn API, URL giao diện và schema database được giữ nguyên khi tổ chức lại source. Kiểm thử Backend nằm trong `backend/test`, kiểm thử Angular nằm cạnh feature/component. Script vận hành nằm trong `backend/scripts` và `frontend/scripts`.

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

### Chạy trợ lý AI trên máy

Ollama là dịch vụ riêng, cần chạy cùng Backend để trợ lý AI phản hồi. Cấu hình trong `backend/.env`:

```dotenv
OLLAMA_URL="http://127.0.0.1:11434"
OLLAMA_MODEL="qwen3:4b-instruct"
```

Mở ứng dụng Ollama, hoặc chạy trong một terminal riêng và giữ terminal đó mở:

```powershell
ollama serve
```

Kiểm tra model bằng `ollama list`. Nếu chưa có đúng model, tải bằng `ollama pull qwen3:4b-instruct`. Nếu Ollama đã chạy thì không cần mở thêm `ollama serve`. Khi thay đổi cấu hình `.env`, khởi động lại Backend. Lần hỏi đầu có thể chậm hơn vì cần nạp model vào bộ nhớ.

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

Tạo riêng tài khoản Admin (không chạy seed, không ghi đè tài khoản có sẵn): trong thư mục `backend`, chạy `npm run admin:create`, nhập email và mật khẩu hai lần. Mật khẩu được che khi nhập và lưu bằng bcrypt. Lệnh dùng database được cấu hình trong `backend/.env`.

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
