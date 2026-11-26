# Phương pháp ước tính dinh dưỡng

Mục tiêu tự động dành cho người trưởng thành, là điểm khởi đầu tham khảo chứ không phải chỉ định điều trị. Nhu cầu năng lượng thực tế khác nhau theo từng người và cần được đánh giá lại theo thời gian.

- Năng lượng: công thức Mifflin–St Jeor trong `nutrition.ts`, nhân hệ số vận động, sau đó điều chỉnh 300 kcal cho mục tiêu tăng hoặc giảm. Mức điều chỉnh này là lựa chọn của ứng dụng, không phải con số phù hợp cho tất cả mọi người. Công thức không xác định trực tiếp nhu cầu năng lượng của từng cá nhân.
- Đạm, carbohydrate và chất béo: điểm tham khảo lần lượt 20%, 50% và 30% năng lượng, tương đương 4, 4 và 9 kcal/g. Các tỷ lệ này nằm trong khoảng phân bố đại dưỡng chất tham khảo cho người trưởng thành (10–35%, 45–65% và 20–35%). Chúng không đảm bảo đáp ứng mọi nhu cầu theo cân nặng hoặc vi chất.
- Không tự tạo mục tiêu từ khảo sát cho người dưới 19 tuổi, người đang mang thai hoặc có khai báo bệnh thận. Các trường hợp này cần tư vấn cá nhân. Các bệnh khác, dị ứng và các nhu cầu đặc biệt cũng có thể cần chuyên gia; bộ lọc tên thực phẩm của ứng dụng không đảm bảo phát hiện đầy đủ dị nguyên hay thành phần.
- Dữ liệu hiện có chỉ gồm năng lượng, đạm, carbohydrate và chất béo; không đủ để đánh giá vitamin, khoáng chất, natri, chất xơ hoặc độ an toàn thực phẩm. Giao diện ghi nhận tổng từng bữa, không tự áp đặt tỷ lệ dinh dưỡng cho từng bữa.

Nguồn tham khảo: [USDA DRI Calculator](https://www.nal.usda.gov/human-nutrition-and-food-safety/dri-calculator), [HHS: khoảng phân bố đại dưỡng chất](https://odphp.health.gov/sites/default/files/2020-01/DietaryGuidelines2010.pdf), [NIDDK: khẩu phần và nhu cầu năng lượng](https://www.niddk.nih.gov/health-information/weight-management/just-enough-food-portions).

## Đối chiếu thêm về mục tiêu cân nặng

- [Nghiên cứu Mifflin–St Jeor gốc](https://pubmed.ncbi.nlm.nih.gov/2305711/) đưa ra phương trình riêng cho nam và nữ, không đưa ra hệ số `OTHER` đang được ứng dụng sử dụng. Giá trị trung gian này là giả định của ứng dụng và chưa được nghiên cứu gốc xác nhận.
- [NHS về tăng cân](https://www.nhs.uk/live-well/healthy-weight/managing-your-weight/healthy-ways-to-gain-weight/) nêu người trưởng thành có thể thử bổ sung khoảng 300–500 kcal/ngày. Con số này không bảo đảm phù hợp với mọi cá nhân, và không chứng minh rằng cộng 300 kcal vào TDEE ước tính là mục tiêu điều trị cho người dùng.
- [NHS về giảm cân](https://www.nhs.uk/better-health/lose-weight/calorie-counting/) nêu mức giảm khoảng 600 kcal so với lượng ăn thường ngày trong hướng dẫn chung. Không thể suy ra từ đó rằng trừ 600 kcal từ TDEE ước tính là phù hợp cho mọi người, hoặc áp dụng cho trẻ vị thành niên, người đang mang thai hay có bệnh lý.
- [NIDDK Body Weight Planner](https://www.niddk.nih.gov/bwp) dùng thêm cân nặng mục tiêu, thời hạn và thay đổi vận động. Thuật toán hiện tại không triển khai mô hình này và không được mô tả là tính theo Body Weight Planner.

Quy tắc cộng/trừ 300 kcal, chia 20/50/30 và quy tắc chia ngân sách của gợi ý vẫn là lựa chọn triển khai của ứng dụng. Chúng chưa được xác thực là mục tiêu cá nhân, và cần được thay thế hoặc gắn rõ nguồn, phạm vi và giới hạn trước khi khẳng định các gợi ý dựa đầy đủ trên hướng dẫn y tế.

Phân bổ giữa các bữa: [CDC](https://www.cdc.gov/diabetes/healthy-eating/diabetes-meal-planning.html) khuyến nghị cá nhân hóa kế hoạch theo sức khỏe, mục tiêu, sở thích, sinh hoạt và thuốc, đặc biệt đối với người có đái tháo đường. Không có một tỷ lệ bữa sáng/trưa/tối/phụ được nguồn này quy định cho tất cả mọi người. Giao diện nhật ký và kế hoạch không còn hiển thị các ngưỡng bữa cố định. Thuật toán tạo gợi ý tự động vẫn sử dụng quy tắc riêng để chia ngân sách và chưa triển khai kế hoạch do chuyên gia chỉ định.
