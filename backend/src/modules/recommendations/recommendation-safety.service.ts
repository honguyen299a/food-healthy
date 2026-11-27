import { Injectable } from '@nestjs/common';

type FoodLike = {
  name: string;
  category?: { name: string; code?: string | null } | null;
};

const policies: Record<string, { blocked: string[]; warning: string }> = {
  DIABETES: {
    blocked: ['nước ngọt', 'kẹo', 'đường', 'bánh ngọt'],
    warning:
      'Đã loại các món nhiều đường bổ sung theo quy tắc an toàn chung cho người tự khai báo tiểu đường.',
  },
  HYPERTENSION: {
    blocked: ['mì gói', 'xúc xích', 'thịt xông khói'],
    warning:
      'Đã loại một số thực phẩm chế biến thường nhiều natri. Việc kiểm tra giới hạn natri cần mục tiêu cá nhân được cấu hình và dữ liệu thực phẩm đầy đủ.',
  },
  KIDNEY_DISEASE: {
    blocked: [],
    warning:
      'Bệnh thận cần chỉ định riêng. Hệ thống không đưa ra thực đơn điều trị; hãy xác nhận thực đơn với chuyên gia y tế.',
  },
  PREGNANCY: {
    blocked: ['cá sống', 'trứng sống'],
    warning: 'Đã loại thực phẩm sống thường cần tránh trong thai kỳ theo quy tắc an toàn chung.',
  },
};

const normalized = (value: unknown) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\u0111/g, 'd')
    .trim();

@Injectable()
export class RecommendationSafetyService {
  evaluate(food: FoodLike, conditions: unknown, allergies: unknown, dietaryPreferences: unknown) {
    const name = normalized(food.name);
    const conditionList = Array.isArray(conditions)
      ? conditions.map((x) => String(x).toUpperCase())
      : [];
    const allergyList = Array.isArray(allergies) ? allergies.map(normalized).filter(Boolean) : [];
    const preferenceList = Array.isArray(dietaryPreferences)
      ? dietaryPreferences.map((x) => String(x).toUpperCase())
      : [];
    const category = food.category?.code;
    const animalMeat = category === 'MEAT_POULTRY' || category === 'SEAFOOD';
    const animalProduct = animalMeat || category === 'EGGS' || category === 'DAIRY';
    const useNameFallback = !category || category === 'PREPARED';
    const blockedByCondition = conditionList.some((condition) =>
      (policies[condition]?.blocked || []).some((term) =>
        (condition === 'DIABETES' ? name.replace(/\bkhong\s+duong\b/g, '') : name).includes(
          normalized(term),
        ),
      ),
    );
    const blockedByAllergy = allergyList.some((allergy) => name.includes(allergy));
    const blockedByDiet =
      (preferenceList.includes('VEGETARIAN') &&
        (animalMeat ||
          (useNameFallback &&
            ['gà', 'bò', 'heo', 'cá', 'tôm', 'thịt']
              .map(normalized)
              .some((term) => name.includes(term))))) ||
      (preferenceList.includes('VEGAN') &&
        (animalProduct ||
          (useNameFallback &&
            ['gà', 'bò', 'heo', 'cá', 'tôm', 'thịt', 'trứng', 'sữa', 'phô mai']
              .map(normalized)
              .some((term) => name.includes(term)))));
    const reasons: Array<'CONDITION' | 'ALLERGY' | 'DIET'> = [];
    if (blockedByCondition) reasons.push('CONDITION');
    if (blockedByAllergy) reasons.push('ALLERGY');
    if (blockedByDiet) reasons.push('DIET');
    return { allowed: !reasons.length, reasons };
  }
  warnings(conditions: unknown) {
    if (!Array.isArray(conditions)) return [];
    return [
      ...new Set(conditions.map((x) => policies[String(x).toUpperCase()]?.warning).filter(Boolean)),
    ];
  }
}
