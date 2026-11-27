export type DocumentTopic = 'calculations' | 'food' | 'health';
export interface ReferenceDocument {
  id: string;
  topic: DocumentTopic;
  title: string;
  publisher: string;
  description: string;
  url: string;
  language: 'Tiếng Việt' | 'Tiếng Anh';
  format: 'Bài viết' | 'Nghiên cứu' | 'PDF' | 'Cơ sở dữ liệu' | 'Công cụ';
  appUse?: string;
  keywords: string;
}

// Link targets and source descriptions reviewed on this date. This is not the
// publication date, nor a claim that the app implements every linked guideline.
export const DOCUMENTS_REVIEWED_AT = '27/11/2026';
export const REFERENCE_DOCUMENTS: readonly ReferenceDocument[] = [
  {
    id: 'mifflin-st-jeor',
    topic: 'calculations',
    title: 'Cơ sở ước tính năng lượng nghỉ: Mifflin–St Jeor',
    publisher: 'Mifflin và cộng sự · American Journal of Clinical Nutrition',
    description:
      'Bài nghiên cứu năm 1990 về phương trình dự đoán năng lượng nghỉ ở người khỏe mạnh. Đọc để hiểu cơ sở và phạm vi của phép ước tính.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/2305711/',
    language: 'Tiếng Anh',
    format: 'Nghiên cứu',
    appUse: 'Cơ sở của phép ước tính BMR trong ứng dụng.',
    keywords: 'BMR REE TDEE calories calo chuyển hóa cơ bản năng lượng nghỉ công thức',
  },
  {
    id: 'adult-bmi',
    topic: 'calculations',
    title: 'BMI người trưởng thành: cách tính và ý nghĩa',
    publisher: 'CDC · Trung tâm Kiểm soát và Phòng ngừa Dịch bệnh Hoa Kỳ',
    description:
      'Giải thích cách tính BMI từ cân nặng và chiều cao, cách đọc các khoảng BMI ở người từ 20 tuổi và những giới hạn của chỉ số này.',
    url: 'https://www.cdc.gov/bmi/adult-calculator/bmi-categories.html',
    language: 'Tiếng Anh',
    format: 'Bài viết',
    keywords: 'BMI chỉ số khối cơ thể cân nặng chiều cao',
  },
  {
    id: 'food-energy',
    topic: 'calculations',
    title: 'Quy đổi năng lượng từ protein, carbohydrate và chất béo',
    publisher: 'FAO · Tổ chức Lương thực và Nông nghiệp Liên Hợp Quốc',
    description:
      'Tài liệu giải thích các hệ số chuyển đổi năng lượng, đơn vị kcal/kJ và lý do giá trị calories có thể khác giữa các cách tính.',
    url: 'https://www.fao.org/4/y5022e/y5022e04.htm',
    language: 'Tiếng Anh',
    format: 'Bài viết',
    keywords: 'calories kcal kJ protein carbohydrate carb chất béo lipid Atwater 4 9',
  },
  {
    id: 'body-weight-planner',
    topic: 'calculations',
    title: 'Tìm hiểu mối liên hệ giữa năng lượng, vận động và cân nặng',
    publisher: 'NIDDK · Viện Y tế Quốc gia Hoa Kỳ (NIH)',
    description:
      'Công cụ tham khảo để khám phá ảnh hưởng của năng lượng ăn vào và hoạt động thể chất đến mục tiêu cân nặng. Công cụ này có mô hình tính riêng.',
    url: 'https://www.niddk.nih.gov/bwp',
    language: 'Tiếng Anh',
    format: 'Công cụ',
    keywords: 'TDEE năng lượng vận động cân nặng mục tiêu calo',
  },
  {
    id: 'vietnam-food-table',
    topic: 'food',
    title: 'Bảng thành phần thực phẩm Việt Nam 2007',
    publisher: 'Bộ Y tế · Viện Dinh dưỡng · bản lưu trên FAO',
    description:
      'Bảng tra cứu thành phần dinh dưỡng của thực phẩm Việt Nam trên 100 g phần ăn được, cùng chú thích về phương pháp và dữ liệu còn thiếu.',
    url: 'https://www.fao.org/fileadmin/templates/food_composition/documents/pdf/VTN_FCT_2007.pdf',
    language: 'Tiếng Việt',
    format: 'PDF',
    appUse: 'Một trong các nguồn số liệu của thư viện thực phẩm.',
    keywords: 'thực phẩm việt nam thành phần dinh dưỡng 100g số liệu protein xơ natri đường',
  },
  {
    id: 'usda-food-search',
    topic: 'food',
    title: 'Tra cứu dinh dưỡng thực phẩm trên FoodData Central',
    publisher: 'USDA · Bộ Nông nghiệp Hoa Kỳ',
    description:
      'Tìm thực phẩm và đối chiếu số liệu dinh dưỡng. Chú ý chọn đúng dạng sống, đã nấu chín, khô hoặc sản phẩm theo nhãn hàng.',
    url: 'https://fdc.nal.usda.gov/',
    language: 'Tiếng Anh',
    format: 'Cơ sở dữ liệu',
    appUse: 'Thư viện sử dụng các bản ghi được chọn từ bộ SR Legacy.',
    keywords: 'USDA FoodData Central SR Legacy cơ sở dữ liệu đồ ăn thực phẩm calories dinh dưỡng',
  },
  {
    id: 'usda-data-guide',
    topic: 'food',
    title: 'Hiểu các loại dữ liệu dinh dưỡng của USDA',
    publisher: 'USDA · FoodData Central',
    description:
      'Giải thích sự khác nhau giữa dữ liệu thực phẩm nền tảng, SR Legacy và dữ liệu sản phẩm có thương hiệu để đọc số liệu đúng ngữ cảnh.',
    url: 'https://fdc.nal.usda.gov/data-documentation/',
    language: 'Tiếng Anh',
    format: 'Bài viết',
    keywords: 'USDA nguồn dữ liệu nhãn hàng thương hiệu Foundation SR Legacy',
  },
  {
    id: 'healthy-diet',
    topic: 'health',
    title: 'Ăn uống lành mạnh: những nguyên tắc cơ bản',
    publisher: 'WHO · Tổ chức Y tế Thế giới',
    description:
      'Tổng quan về một chế độ ăn đa dạng, cân đối và các yếu tố cần cân nhắc khi lựa chọn thực phẩm trong đời sống hằng ngày.',
    url: 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet',
    language: 'Tiếng Anh',
    format: 'Bài viết',
    keywords: 'WHO ăn uống lành mạnh chế độ ăn rau trái cây đường chất béo dinh dưỡng',
  },
  {
    id: 'physical-activity',
    topic: 'health',
    title: 'Vận động và giảm thời gian ngồi lâu',
    publisher: 'WHO · Tổ chức Y tế Thế giới',
    description:
      'Tìm hiểu lợi ích của hoạt động thể chất và khuyến nghị vận động cho từng nhóm tuổi, cùng các tình huống cần điều chỉnh riêng.',
    url: 'https://www.who.int/news-room/fact-sheets/detail/physical-activity',
    language: 'Tiếng Anh',
    format: 'Bài viết',
    keywords: 'WHO tập luyện vận động thể dục thể thao hoạt động thể chất',
  },
  {
    id: 'sodium',
    topic: 'health',
    title: 'Muối và natri: hiểu đúng để lựa chọn thực phẩm',
    publisher: 'WHO · Tổ chức Y tế Thế giới',
    description:
      'Giải thích nguồn natri trong khẩu phần và các cách giảm lượng natri. Hữu ích khi đọc nhãn thực phẩm và theo dõi lượng muối ăn vào.',
    url: 'https://www.who.int/news-room/fact-sheets/detail/sodium-reduction',
    language: 'Tiếng Anh',
    format: 'Bài viết',
    keywords: 'WHO muối natri sodium huyết áp nhãn thực phẩm',
  },
  {
    id: 'sleep',
    topic: 'health',
    title: 'Giấc ngủ và thói quen chăm sóc sức khỏe',
    publisher: 'CDC · Trung tâm Kiểm soát và Phòng ngừa Dịch bệnh Hoa Kỳ',
    description:
      'Kiến thức về thời lượng và chất lượng giấc ngủ, thói quen ngủ và những dấu hiệu nên trao đổi với nhân viên y tế.',
    url: 'https://www.cdc.gov/sleep/about/index.html',
    language: 'Tiếng Anh',
    format: 'Bài viết',
    keywords: 'CDC ngủ giấc ngủ sức khỏe nghỉ ngơi sinh hoạt',
  },
];
