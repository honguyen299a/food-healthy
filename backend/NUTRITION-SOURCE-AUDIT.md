# Đối chiếu yêu cầu một nguồn dinh dưỡng

Nguồn đề xuất cho mức tham khảo dinh dưỡng: National Academies, Food and Nutrition Board, bộ Dietary Reference Intakes (DRI). [Báo cáo EER 2023, bảng 5-16](https://www.nationalacademies.org/read/26818/chapter/7) đưa ra công thức ước tính nhu cầu năng lượng duy trì của người trưởng thành theo tuổi, giới tính trong nghiên cứu, chiều cao, cân nặng và bốn mức hoạt động. [Bảng DRI đại dưỡng chất](https://www.nationalacademies.org/index.php/cdn/materials/9fb9fae6-337c-4b7c-9821-2c81d1f65ad0) nêu lượng tham khảo theo nhóm tuổi và giai đoạn sống. Đây là các tài liệu thuộc cùng bộ DRI, nhưng không phải một tài liệu duy nhất.

## Các phép tính hiện tại cần thay đổi trước khi khẳng định theo DRI

- Năng lượng nghỉ Mifflin–St Jeor, hệ số hoạt động 1,2–1,9, ngưỡng 1.200 kcal và điều chỉnh ±300 kcal không phải công thức EER 2023; không được gắn nhãn là công thức DRI.
- DRI 2023 có bốn nhóm hoạt động, còn hồ sơ hiện có năm nhóm. Không thể giả định ánh xạ một-một; phải thu thập hoặc làm rõ mức hoạt động theo mô tả PAL của nguồn.
- Công thức nguồn phân theo nam/nữ; giá trị trung gian `OTHER` hiện có không xuất hiện trong bảng nguồn. Cần xử lý riêng, không tự đặt hệ số.
- Tỷ lệ 20/50/30, mốc từng bữa 25/35/30/10, các ngưỡng cảnh báo trong `plan-analysis.ts`, cách xếp hạng thực phẩm và khẩu phần của thuật toán gợi ý là lựa chọn của ứng dụng, không phải các giá trị bắt buộc từ DRI.
- EER là ước tính để duy trì cân bằng năng lượng, không phải công thức điều trị giảm/tăng cân. Không gắn nhãn EER là mục tiêu giảm/tăng cân.
- DRI cung cấp các khoảng hoặc lượng tham khảo, không chỉ định duy nhất một lượng calories, protein, carbohydrate, chất béo cho từng người; không tự chọn một điểm giữa và nói rằng nguồn quy định điểm đó.
- Tính dinh dưỡng món ăn theo khối lượng là phép quy đổi toán học từ dữ liệu mỗi 100 g; độ chính xác phụ thuộc chất lượng và trạng thái thực phẩm trong cơ sở dữ liệu.

Các số hiện đang hiển thị trong ứng dụng chưa đáp ứng yêu cầu mới này. Tài liệu này là kết quả rà soát, chưa thay đổi thuật toán đang chạy.
