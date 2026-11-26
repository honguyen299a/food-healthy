cd # Trợ lý AI với Ollama

## Chạy trên máy

Model được kiểm tra trong môi trường phát triển này: `qwen3:4b-instruct`.
Backend mặc định kết nối `http://127.0.0.1:11434`. Có thể đặt trong `backend/.env`:

```dotenv
OLLAMA_URL="http://127.0.0.1:11434"
OLLAMA_MODEL="qwen3:4b-instruct"
```

Nếu dùng tên model khác, đặt đúng tag từ `ollama list`. Sau khi đổi cấu hình cần khởi động lại backend.

```powershell
cd backend
npx prisma migrate deploy
npx prisma generate
npm run ai:check
npm run dev
```

Mở mục **Trợ lý AI**. Chọn ngày và chế độ tư vấn, tạo/điều chỉnh đề xuất, hoặc yêu cầu hành động. Tạo thực đơn cần hoàn thành khảo sát và bật cá nhân hóa. Người dùng có thể chọn một bữa để chỉ thay bữa đó; bản xem trước luôn chứa cả ngày. Yêu cầu mơ hồ cần được làm rõ thay vì tự chọn món/bữa.

## Điều phối và dữ liệu

- Chế độ giao diện là giới hạn quyền của yêu cầu. Model phân biệt tư vấn và đề xuất trong giới hạn đó. Chế độ hành động do Backend xử lý, chỉ hướng dẫn xác nhận bản nháp, không dùng lời gọi model để ghi dữ liệu.
- `ADVICE`: chỉ trả lời; `PROPOSAL`: tạo bản nháp mới; `ACTION`: chỉ mở luồng xác nhận. Tạo lịch sử/bản nháp là ghi dữ liệu hội thoại, không tự thay đổi kế hoạch ăn.
- Không thực thi native tool calls. `ai:check` kiểm tra riêng JSON Schema và một tool call vô hại trên runtime thực tế. Kết quả probe không đảm bảo mọi lời gọi công cụ đều chính xác. Luồng chính dùng JSON Schema + kiểm tra cấu trúc thủ công nghiêm ngặt + kiểm tra nghiệp vụ.
- Chỉ ba lượt suy luận tối đa cho một yêu cầu: lần đầu và hai lần sửa chung cho cả lỗi JSON lẫn nghiệp vụ. Lỗi kết nối/timeout không tự lặp. Không lưu đầu ra model bị lỗi.
- Mỗi lượt dùng tối đa sáu tin gần nhất, mỗi tin 600 ký tự, yêu cầu tối đa 2000 ký tự, tối đa 60 thực phẩm. Dữ liệu hiện hành tối đa 20.000 ký tự; quá giới hạn trả lỗi thay vì để runtime cắt mất ngữ cảnh. Ollama dùng context 8192 token, tối đa 1800 token đầu ra, timeout mỗi lượt 60 giây. Không gửi email, mật khẩu hoặc toàn bộ lịch sử sang model.
- Hội thoại, bản nháp và danh sách mua sắm lưu trong MySQL, luôn truy vấn theo người dùng từ JWT. Lịch sử phân trang 30 tin; danh sách hội thoại hiển thị 50 cuộc gần nhất.
- Ngữ cảnh liên quan được lưu bằng bản nháp có ngày, bữa, phiên bản và ID. Khi đổi ngày giao diện xóa bản xem trước. Model được cung cấp bản nháp đang chờ đúng ngày; Backend kiểm tra các bữa không được chọn vẫn giữ nguyên.
- JSON chỉ chấp nhận `foodId`, `meal`, `grams`. Thực phẩm phải đang hoạt động, là thực phẩm chung hoặc thuộc người dùng hiện tại. Tính lại calories/macros bằng dữ liệu database và kiểm tra lại tại thời điểm xác nhận.
- Bộ lọc hiện dựa vào tên thực phẩm và hồ sơ khai báo, **chưa thể bảo đảm loại bỏ mọi chất gây dị ứng** do chưa có dữ liệu thành phần đầy đủ. Hiển thị giới hạn này trong bản xem trước. Không tạo thực đơn cho nhóm cần chỉ định riêng theo quy tắc hiện có.
- Giới hạn kỹ thuật cho bản nháp: 1–24 món, 5–1000g/món, tối đa 1500g/bữa, 1500 kcal/món và 2500 kcal/bữa, không trùng thực phẩm trong một bữa. Đây là ngưỡng phát hiện khẩu phần bất thường, không phải chỉ định y tế. Chênh lệch mục tiêu được phân tích bằng `analyzePlan` và hiển thị, không buộc thực đơn đạt 100%.
- Bản nháp có hiệu lực 24 giờ; bản mới thay thế bản đang chờ trong cùng hội thoại. Xác nhận gửi đúng ID, phiên bản, hành động và `confirmed: true`. Backend không tin `userId` hay tên hàm từ model/client.
- Lưu kế hoạch thay toàn bộ món trong ngày đã xem trước, trong transaction Serializable. Dấu vân tay kế hoạch ngăn ghi đè nếu kế hoạch thay đổi sau lúc tạo đề xuất. Xác nhận lặp không thêm món trùng; transaction lỗi không đánh dấu bản nháp là đã lưu.
- Danh sách mua sắm tổng hợp theo thực phẩm và khối lượng trong kế hoạch, chưa phân rã công thức hoặc quy đổi thực phẩm chín sang nguyên liệu sống. Mỗi bản nháp chỉ tạo một danh sách.
- Chưa hỗ trợ AI xóa dữ liệu, thực đơn nhiều ngày, ảnh món ăn hay nhập nhật ký bằng hội thoại.

## Kiểm tra

```powershell
cd backend
npm test
npm run ai:check
node scripts/ai-smoke.cjs
cd ../frontend
npm test -- --watch=false
npm run build
```

`ai-smoke.cjs` dùng database và Ollama thật: tạo tài khoản thử duy nhất, tư vấn, tạo đề xuất, xác nhận kế hoạch, xác nhận lặp và tạo danh sách mua sắm. Tài khoản thử cùng dữ liệu liên quan được xóa trong `finally`. Chỉ chạy trên database phát triển; nếu tiến trình bị tắt cưỡng bức trước `finally`, cần dọn tài khoản có email bắt đầu bằng `ai-smoke-`.

Nguồn giao thức: [Ollama Structured Outputs](https://docs.ollama.com/capabilities/structured-outputs), [Qwen Function Calling](https://qwen.readthedocs.io/en/latest/framework/function_call.html).
