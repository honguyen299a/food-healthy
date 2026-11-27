import { RecommendationSafetyService } from '../recommendations/recommendation-safety.service';

type Totals = { calories: number; protein: number; carbs: number; fat: number };
type Target = Totals | null;
type ProfileLike = {
  mealsPerDay?: number | null;
  healthConditions?: unknown;
  allergies?: unknown;
  dietaryPreferences?: unknown;
} | null;

export type PlanIssue = {
  level: 'info' | 'warning' | 'danger';
  code: string;
  message: string;
};

const percent = (value: number, target: number) =>
  target > 0 ? Math.round((value / target) * 100) : 0;

export function analyzePlan(
  items: any[],
  totals: Totals,
  target: Target,
  profile: ProfileLike,
  safety: RecommendationSafetyService,
) {
  if (!items.length)
    return { status: 'EMPTY', label: 'Chưa có kế hoạch', issues: [], ratios: null };

  const issues: PlanIssue[] = [];
  const ratios = target
    ? {
        calories: percent(totals.calories, target.calories),
        protein: percent(totals.protein, target.protein),
        carbs: percent(totals.carbs, target.carbs),
        fat: percent(totals.fat, target.fat),
      }
    : null;

  if (target && ratios) {
    if (ratios.calories < 70)
      issues.push({
        level: 'warning',
        code: 'LOW_CALORIES',
        message: `Năng lượng mới đạt ${ratios.calories}% mục tiêu ngày.`,
      });
    else if (ratios.calories > 115)
      issues.push({
        level: 'warning',
        code: 'HIGH_CALORIES',
        message: `Năng lượng vượt ${ratios.calories - 100}% mục tiêu ngày.`,
      });

    const macroRules: Array<[keyof Omit<Totals, 'calories'>, string]> = [
      ['protein', 'Protein'],
      ['carbs', 'Carbohydrate'],
      ['fat', 'Chất béo'],
    ];
    for (const [key, label] of macroRules) {
      if (ratios[key] < 65)
        issues.push({
          level: 'info',
          code: `LOW_${key.toUpperCase()}`,
          message: `${label} còn thấp (${ratios[key]}%).`,
        });
      else if (ratios[key] > 135)
        issues.push({
          level: 'warning',
          code: `HIGH_${key.toUpperCase()}`,
          message: `${label} vượt nhiều (${ratios[key]}%).`,
        });
    }
  }

  const mealCount = new Set(items.map((item) => item.meal)).size;
  const expectedMeals = Number(profile?.mealsPerDay || 0);
  if (expectedMeals && mealCount < expectedMeals) {
    issues.push({
      level: 'info',
      code: 'MISSING_MEALS',
      message: `Mới có ${mealCount}/${expectedMeals} bữa đã thiết lập.`,
    });
  }

  for (const item of items) {
    const result = safety.evaluate(
      item.food,
      profile?.healthConditions,
      profile?.allergies,
      profile?.dietaryPreferences,
    );
    for (const reason of result.reasons || []) {
      const code = `${reason}_${item.foodId}`;
      if (issues.some((issue) => issue.code === code)) continue;
      const message =
        reason === 'ALLERGY'
          ? `${item.food.name}: có thể liên quan dị ứng đã khai báo.`
          : reason === 'DIET'
            ? `${item.food.name}: chưa phù hợp kiểu ăn đã chọn.`
            : `${item.food.name}: cần xem lại theo tình trạng sức khỏe đã khai báo.`;
      issues.push({ level: 'danger', code, message });
    }
  }

  const conditions = Array.isArray(profile?.healthConditions)
    ? profile?.healthConditions.map((value) => String(value).toUpperCase())
    : [];
  if (conditions.includes('KIDNEY_DISEASE')) {
    issues.push({
      level: 'danger',
      code: 'KIDNEY_REVIEW',
      message: 'Bệnh thận cần chỉ định riêng; hãy xác nhận kế hoạch với chuyên gia y tế.',
    });
  }

  const status = issues.some((issue) => issue.level === 'danger')
    ? 'DANGER'
    : issues.some((issue) => issue.level === 'warning' || issue.level === 'info')
      ? 'WARNING'
      : 'GOOD';
  const label =
    status === 'DANGER'
      ? 'Cần kiểm tra'
      : status === 'WARNING'
        ? 'Chưa cân đối'
        : 'Trong khoảng mục tiêu';
  return { status, label, issues, ratios };
}
