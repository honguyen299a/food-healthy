# Health Alert, Notification Center và Nutrition Insight

Ba module dùng NestJS, Prisma/MySQL và Angular hiện có. Không cần Redis, dịch vụ AI mới hoặc thay cấu hình Ollama. Nội dung phân tích được tạo bằng quy tắc Backend; vẫn hoạt động khi Ollama tắt. Công thức BMI/BMR/TDEE, calories/macro mục tiêu và phép tính khẩu phần trong `src/nutrition.ts` được giữ nguyên.

## Cài đặt và vị trí giao diện

```powershell
cd backend
npx prisma migrate deploy
npm run db:generate
npm run build
npm start
```

Migration `20261126030000_monitoring` thêm các bảng `monitoring_settings`, `monitoring_jobs`, `monitoring_summaries`, `health_alerts`, `health_alert_events`, `notifications`, `nutrition_insights`, `nutrition_weekly_reports` và cờ `food_logs.completed`. Không xóa hoặc xác nhận thay nhật ký cũ.

- `/insights`: phân tích 7 ngày đã kết thúc, dinh dưỡng, độ đầy đủ, biểu đồ, nhận xét có căn cứ, cân nặng, cài đặt và báo cáo lưu trữ.
- `/alerts`: cảnh báo của người dùng, nguyên nhân, dữ liệu đối chiếu và lịch sử xử lý.
- `/notifications`: lọc, phân trang, đọc/chưa đọc, đọc tất cả và ẩn thông báo. Chuông trên header hiển thị 5 thông báo gần đây và số chưa đọc, cập nhật mỗi 30 giây.
- `/admin/alerts`: Admin xem cảnh báo của các User ở cả ba mức LOW/MEDIUM/HIGH, thống kê, lọc, cập nhật trạng thái và ghi chú. Mọi cảnh báo mới được gửi đồng thời tới User liên quan và các tài khoản Admin; hai vai trò mở cùng một cảnh báo theo quyền riêng. Backend kiểm tra lại vai trò hiện tại trong database. Chỉ cung cấp định danh và dữ liệu liên quan cảnh báo, không cung cấp hội thoại AI hay toàn bộ hồ sơ sức khỏe.
- `/logs`: sau khi ghi một ngày đã kết thúc, chọn **Xác nhận đã ghi đủ ngày này**. Thêm/sửa/xóa khẩu phần sẽ hủy xác nhận để người dùng kiểm tra lại.

### Thông báo và bộ lọc biểu đồ của User

- Thông báo cảnh báo hiển thị rõ **Cao / Trung bình / Thấp** tại chuông, danh sách và trang chi tiết. Bộ lọc `GET /notifications?severity=HIGH|MEDIUM|LOW` lọc ở Backend trước khi phân trang, hỗ trợ cả liên kết cũ và mới. Mức độ được lấy từ cảnh báo liên quan theo quyền hiện tại; các nhắc nhở không gắn cảnh báo không bị gán mức độ giả. Không thêm cột dinh dưỡng hay đổi ngưỡng phát hiện.
- `GET /plans?date=...` trả thêm `analysis` và `target` từ cùng hàm `analyzePlan` đang dùng cho lịch tuần. Trang kế hoạch ngày hiện toàn bộ lưu ý và tỷ lệ đối chiếu, không cắt còn hai dòng. Liên kết “Xem đủ ... lưu ý” trong lịch tuần mở đúng ngày; dữ liệu được tải lại khi query ngày đổi, hoặc sau khi sửa/xóa khẩu phần. Đây là kiểm tra thực đơn dự kiến, được phân biệt với lượng thực tế đã ăn và cảnh báo theo dõi dài ngày.

- User sử dụng một mục **Thông báo và cảnh báo**. Nút **Xem chi tiết** và chuông mở `/notifications/alerts/:id` cho sự kiện cảnh báo, hiển thị nguyên nhân, căn cứ, lịch sử và phản hồi Admin. Các đường dẫn cũ `/alerts?id=...` được chuyển tới chi tiết trong trung tâm thông báo. Không còn mục danh sách cảnh báo riêng hoặc ô gợi ý trợ lý ở cuối sidebar User. Chức năng Trợ lý AI trong menu vẫn được giữ.
- Bộ lọc **Theo ngày / Theo tháng** áp dụng cho biểu đồ tại Dashboard, Phân tích dinh dưỡng và Cân nặng. API `GET /dashboard/charts?mode=DAY&date=YYYY-MM-DD` hoặc `?mode=MONTH&month=YYYY-MM` chỉ đọc dữ liệu của người đang đăng nhập. Kiểm tra ngày hợp lệ, tháng/năm, giới hạn năm 1900–2100; chặn Admin và các trường truy vấn không được khai báo.
- Dashboard vẫn giữ các thẻ tổng quan theo ngày đã chọn ở đầu trang. Phần biểu đồ có bộ lọc riêng. Với tháng, biểu đồ thành phần và so sánh dùng trung bình trên **ngày có nhật ký**, kế hoạch dùng trung bình trên **ngày có kế hoạch**; đối chiếu mục tiêu ngày hiện tại. Tổng calories theo bữa là tổng trong khoảng đã chọn và được ghi rõ ở tiêu đề. Không nhân mục tiêu ngày rồi mặc định mọi ngày trong tháng đều đã được ghi đủ.
- Không có nhật ký thì trung bình là `null`; đường calories để trống tại ngày chưa ghi, không nối thành dữ liệu 0 giả. Biểu đồ bữa ăn chỉ dùng dữ liệu thực tế, không tự lấy kế hoạch thay thế. Cân nặng chỉ hiển thị các lần đo trong đúng khoảng chọn, không mang lần đo ngoài khoảng vào biểu đồ.
- Ở trang Phân tích dinh dưỡng, bộ lọc áp dụng cho biểu đồ và bảng ngay dưới nó; nhận xét và báo cáo 7 ngày vẫn giữ phạm vi được ghi riêng. Công thức tính mục tiêu, dinh dưỡng theo gram và quy tắc phát hiện cảnh báo không đổi.

## Quy tắc và giới hạn của dữ liệu

### Khu vực Admin riêng

- Admin đăng nhập được chuyển tới `/admin`, không thực hiện onboarding dinh dưỡng. Sidebar, header và API tách khỏi nhật ký, khảo sát, cân nặng, kế hoạch và trợ lý cá nhân. `/admin/account` chỉ quản lý bảo mật tài khoản.
- Dashboard `/admin` có biểu đồ phân nhóm người dùng, cảnh báo mới 7 ngày, số người có từng loại cảnh báo và danh sách cần ưu tiên. Tài khoản Admin không được đếm vào nhóm người dùng dinh dưỡng. Không có dữ liệu không được coi là “khỏe mạnh”.
- Bốn nhóm độc lập: thấp hơn mục tiêu có dữ liệu xác nhận, có cảnh báo khác cần xem xét, chưa ghi nhận cảnh báo với đủ nhật ký đối chiếu, và chưa đủ dữ liệu. Nhóm thấp hơn mục tiêu đối chiếu lại protein/xơ của 3 ngày gần nhất đã xác nhận ghi đủ; cảnh báo cũ chưa thể xác nhận lại chỉ được xếp vào nhóm cần xem xét. Mỗi người chỉ thuộc một nhóm. Đây không phải chẩn đoán khỏe mạnh/thiếu chất/bệnh.
- `/admin/users` hỗ trợ tìm tên/email/mã, lọc nhóm, phân trang, quản lý tài khoản và mở `/admin/users/:id`. Trang chi tiết đọc nhật ký 7 ngày và hôm nay, mục tiêu/giới hạn, số liệu dinh dưỡng, thực đơn dự kiến, các lần đo 30 ngày và khai báo liên quan đến việc xử lý cảnh báo. Admin không chỉnh nhật ký hay ghi cân nặng thay User. Không cung cấp mật khẩu hoặc hội thoại AI.
- `/admin/foods` tái sử dụng chức năng quản lý thực phẩm hiện có. Admin thêm thực phẩm `ownerId=null`, tất cả User nhìn thấy; có thể sửa, ẩn và hiển thị lại. User thêm thực phẩm mang `ownerId` của chính mình, chỉ tài khoản đó nhìn thấy. Admin không sửa thực phẩm riêng của User qua công cụ thư viện chung. Khi sửa thực phẩm đã được sử dụng, các User liên quan được xếp lịch phân tích lại. `/admin/categories` quản lý nhóm dùng chung.
- Thông báo Admin nêu tên/email người liên quan, nguồn thực tế/dự kiến, mức độ và nội dung cụ thể. Mở cảnh báo có liên kết sang hồ sơ User. Thông báo được lọc theo vai trò hiện tại; tài khoản bị thu hồi quyền Admin không còn xem danh sách thông báo quản trị cũ. Backend đọc vai trò hiện tại từ database trên mỗi request, không chỉ tin vai trò trong JWT cũ.
- API mới: `GET /admin/dashboard`, `GET /admin/users?page=1&limit=20&search=...&group=...`, `GET /admin/users/:id/health`, `POST /admin/users/:id/refresh`, `GET /admin/foods?status=ALL|ACTIVE|HIDDEN`, `PUT /admin/foods/:id/visibility` với `{isActive}`. Giữ các API thực phẩm và nhóm hiện có, kiểm tra phạm vi sở hữu tại Backend. Thay đổi này dùng các bảng đã có, không cần thêm migration.
- Với quy mô dữ liệu lớn, nên chuyển kết quả phân nhóm toàn hệ thống sang bảng tổng hợp nền. Hiện dashboard đọc bản tổng hợp từng người đã được worker tính sẵn; không chạy lại model hoặc tính lại thực đơn toàn hệ thống trong request thống kê.

- Chỉ dùng Food Log để tính lượng thực tế đã ăn. Meal Plan luôn mang nguồn `PLAN`; không thay cho nhật ký.
- Không có nhật ký không đồng nghĩa ăn 0 kcal. Trung bình tính trên ngày có dữ liệu và ghi rõ mẫu số. Xơ/đường/natri thiếu ở một thực phẩm làm tổng đầy đủ của ngày đó thành `null`; vẫn giữ số thực phẩm có dữ liệu và tổng tối thiểu đã biết. Giá trị 0 đã biết vẫn là 0.
- Calories cao hơn mục tiêu và protein thấp hơn mục tiêu được theo dõi trên **3 ngày lịch liên tiếp trước hôm nay**. Calories đã ghi vượt giới hạn có thể kết luận vượt dù chưa ghi đủ; protein/xơ thấp cần cả 3 ngày xác nhận đầy đủ và đủ thành phần tương ứng.
- Khoảng so sánh mục tiêu mặc định ±10%, có thể đổi 0–50%. Số 3 ngày, biên so sánh và lịch nhắc là quy ước vận hành theo dõi, không phải tiêu chuẩn chẩn đoán hoặc phân loại nguy cơ y khoa.
- Không đặt sẵn giới hạn xơ, đường tổng, natri hoặc biến động cân nặng theo bệnh lý. Người dùng nhập giới hạn cá nhân và nguồn/hướng dẫn tại `/insights`. Backend yêu cầu nguồn khi có giới hạn. Nhập `null` để bỏ giới hạn.
- Với đường/natri, tổng tối thiểu đã biết lớn hơn giới hạn cá nhân vẫn đủ tạo cảnh báo vượt; nếu dữ liệu thiếu và số đã biết chưa vượt thì kết quả là chưa đủ dữ liệu, không kết luận an toàn.
- Cân nặng cần ít nhất 3 lần đo cách nhau tổng cộng ít nhất 7 ngày, trong cửa sổ mặc định 14 ngày (cấu hình 7–90). Chỉ cảnh báo “vượt ngưỡng biến động” khi có ngưỡng cá nhân. Tiến độ xa mục tiêu là nhận xét mô tả khoảng cách tới cân nặng mục tiêu. Báo cáo mô tả thay đổi giữa 2 lần đo trong kỳ, không suy ra bệnh hay nguyên nhân.
- Nhận xét thói quen cần ít nhất 3 ngày có nhật ký. Đánh giá thiếu dinh dưỡng cần ngày xác nhận ghi đủ. Không suy luận thiếu/thừa theo từng bữa nếu chưa có mục tiêu riêng theo bữa; giao diện chỉ mô tả số ngày có ghi và calories trung bình các bữa đã ghi.
- Dị ứng và kiểu ăn tái sử dụng `RecommendationSafetyService`, danh sách dị ứng/loại trừ đã khai báo và đối chiếu tên thực phẩm. Database hiện chưa có bộ nguyên liệu đầy đủ nên không xác nhận món an toàn chỉ từ việc không khớp tên. `HIGH` nghĩa cần ưu tiên kiểm tra, không phải chẩn đoán phản ứng dị ứng.
- Các so sánh lịch sử dùng **mục tiêu hiện tại**, vì dự án chưa lưu lịch sử thay đổi mục tiêu. Giao diện và báo cáo ghi rõ giới hạn này.

Nguồn tham khảo về bối cảnh cá nhân và dữ liệu: [WHO — Healthy diet](https://www.who.int/news-room/fact-sheets/detail/healthy-diet), [USDA FoodData Central — Data documentation](https://fdc.nal.usda.gov/data-documentation/). Đặc biệt, dữ liệu **đường tổng** không phải **đường tự do**; không áp giới hạn đường tự do của WHO trực tiếp lên đường tổng. Không có ngưỡng bệnh lý nào được suy ra từ hai tài liệu này trong code.

## Xử lý nền, chống trùng và trạng thái

1. Các request ghi nhật ký, cân nặng, kế hoạch, hồ sơ, thực phẩm hoặc xác nhận thực đơn AI xếp một công việc nhỏ sau khi ghi thành công. Tác vụ phân tích không chạy trong request ghi chính.
2. Worker trong Backend kiểm tra hàng đợi MySQL mỗi 5 giây, tối đa 10 công việc/lượt. Quét người dùng theo lô mỗi 15 phút để phục hồi enqueue thất bại và thực hiện nhắc định kỳ. Backend phải đang chạy; frontend không cần mở.
3. Khóa lease 120 giây và token giúp phục hồi sau khi tiến trình dừng; revision giữ lại thay đổi phát sinh khi đang phân tích. Lỗi được thử lại với độ trễ tăng dần tới 5 phút. Công việc được giữ trong database khi Backend khởi động lại.
4. Cảnh báo có khóa duy nhất theo người dùng + quy tắc + nguồn + ngày/phạm vi. Điều kiện đang xuất hiện được tách khỏi trạng thái Admin xử lý. Admin đóng cảnh báo sẽ không bị mở lại mỗi lần quét; chỉ mở lại khi điều kiện đã hết rồi tái diễn. Khi đủ dữ liệu xác định điều kiện hết, hoặc ngày không còn trong cửa sổ theo dõi, hệ thống đóng và thêm lịch sử. Thiếu dữ liệu không bị coi là điều kiện đã hết.
5. Thông báo có khóa sự kiện duy nhất theo người nhận. Cảnh báo mới, tái diễn, tăng mức độ và cập nhật trạng thái có sự kiện riêng. Cập nhật Admin cần revision hiện tại, xác nhận và ghi chú; chỉnh sửa đồng thời bị từ chối để tải lại.
6. Ẩn thông báo là xóa mềm; đánh dấu đã đọc hoặc ẩn không khiến worker tạo lại cùng thông báo. User chỉ thao tác trên thông báo/cảnh báo/báo cáo của mình. Các Admin nhận bản thông báo riêng cho mọi cảnh báo LOW/MEDIUM/HIGH; Admin xem toàn bộ cảnh báo theo quyền quản trị. Thông báo nhận xét, báo cáo và nhắc nhở cá nhân vẫn chỉ thuộc người dùng tương ứng.
7. Báo cáo tuần trước (thứ Hai–Chủ nhật, múi giờ Việt Nam) tự tạo nếu có nhật ký. Có thể yêu cầu một khoảng 7 ngày khác đã kết thúc. Báo cáo lưu tổng hợp và căn cứ tại thời điểm tạo; muốn phản ánh nhật ký hoặc mục tiêu đã sửa, yêu cầu cập nhật lại báo cáo. Mỗi kỳ có một báo cáo, một thông báo sẵn sàng, không gửi lặp mỗi lần quét.

`MONITORING_WORKER=false` tắt worker trong tiến trình chuyên phục vụ API/kiểm thử. Mặc định worker bật. Nếu tách nhiều tiến trình, phải giữ ít nhất một tiến trình bật worker; với tác vụ dài hơn 120 giây cần tăng lease hoặc triển khai heartbeat trước khi mở rộng tải lớn. Quy mô hiện tại xử lý tuần tự theo người dùng, không dùng hàng đợi ngoài.

## API

Tất cả API dưới `/api`, yêu cầu Bearer JWT. ID dùng số nguyên; `limit` 1–50 và `cursor` số nguyên dương. Sai enum, trường lạ, ngày không tồn tại hoặc input ngoài giới hạn bị từ chối.

| API | Công dụng |
| --- | --- |
| `GET /alerts`, `GET /alerts/:id` | Danh sách/chi tiết cảnh báo của mình; lọc status, severity, source, type |
| `GET /admin/alerts`, `GET /admin/alerts/:id` | Admin xem các cảnh báo cần theo dõi; thêm lọc userId |
| `PUT /admin/alerts/:id` | `{status, note, revision}`, lưu lịch sử và thông báo |
| `GET /notifications` | Lọc type, read=`ALL\|READ\|UNREAD`, cursor, limit |
| `PUT /notifications/:id/read` | `{read: true\|false}` |
| `PUT /notifications/read-all` | Đọc tất cả thông báo hiện có của mình |
| `DELETE /notifications/:id` | Ẩn thông báo của mình |
| `GET /insights` | Bản tổng hợp gần nhất, thời điểm cập nhật, trạng thái xử lý và lỗi tạm thời |
| `GET /insights/reports`, `GET /insights/reports/:id` | Lịch sử báo cáo riêng của mình |
| `POST /insights/reports` | `{start: "YYYY-MM-DD"}`, xếp lịch 7 ngày đã kết thúc |
| `GET /monitoring/settings`, `PUT /monitoring/settings` | Giới hạn cá nhân, nguồn, cửa sổ cân nặng, biên mục tiêu và bật/tắt nhắc |
| `POST /monitoring/refresh` | Xếp lịch cập nhật phân tích của mình |
| `PUT /logs/:date/completeness` | `{completed: true\|false}`; cần có thực phẩm; chỉ xác nhận ngày đã kết thúc |

## Kiểm tra

Để tạo dữ liệu giả lập được giữ lại cho việc thử trực tiếp trên giao diện, chạy `npm run monitoring:demo` trong `backend` khi API và worker đang chạy. Lệnh tạo riêng một User và một Admin, in mật khẩu một lần, tạo nhật ký 3 ngày, kế hoạch có thực phẩm trùng dị ứng và lịch sử cân nặng. Các thực phẩm, hồ sơ và nguồn giới hạn đều được đánh dấu **GIẢ LẬP**. Worker thật tạo cảnh báo/thông báo, bao gồm thông báo gửi tới các Admin hiện có. Dùng cửa sổ thường và ẩn danh để đăng nhập đồng thời hai vai trò.

Thông tin định danh bộ giả lập nằm trong `backend/.alert-demo-state.json`, không lưu mật khẩu. Muốn dọn bộ này, chạy `npm run monitoring:demo:cleanup`; lệnh kiểm tra đúng định danh rồi chỉ xóa tài khoản giả lập, dữ liệu liên quan và thông báo cảnh báo của bộ giả lập. Không chạy lại lệnh tạo khi còn bộ giả lập cũ.

```powershell
cd backend
npm test
npm run monitoring:check
cd ../frontend
npm test -- --watch=false
npm run build
```

`monitoring:check` dùng MySQL cấu hình trong `.env` và mở HTTP trên cổng ngẫu nhiên localhost; tắt worker của tiến trình kiểm thử, tạo tài khoản/thực phẩm riêng có UUID rồi dọn lại trong `finally`. Chỉ gửi thông báo Admin tới tài khoản kiểm thử. Kiểm tra xác thực, phân quyền chéo tài khoản, validation, tính tổng, hủy xác nhận khi sửa khẩu phần, chống trùng, lịch sử đóng/tái diễn, báo cáo và revision hàng đợi.
