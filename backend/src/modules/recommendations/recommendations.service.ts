import { BadRequestException, Injectable } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { addDays, validDate } from '../../common/utils/date';
import { PrismaService } from '../../database/prisma.service';
import { nutrition } from '../nutrition/nutrition-calculator';
import { NutritionService } from '../nutrition/nutrition.service';
import { buildMealDraft } from './meal-draft';
import { RecommendationSafetyService } from './recommendation-safety.service';

@Injectable()
export class RecommendationsService {
  constructor(
    private db: PrismaService,
    private nutritionService: NutritionService,
    private safety: RecommendationSafetyService,
  ) {}
  async suggest(userId: number, date: string, _legacyMeals?: number) {
    return this.prepare(userId, date, 8);
  }
  private async prepare(userId: number, date: string, limit?: number) {
    validDate(date);
    const meals = 4;
    const user = await this.db.user.findUniqueOrThrow({
      where: { id: userId },
      include: { profile: true },
    });
    if (user.usageMode !== 'PERSONALIZED' || !user.profile)
      throw new BadRequestException(
        'Hãy hoàn thành khảo sát và bật chế độ cá nhân hóa để nhận đề xuất. Bạn vẫn có thể tự lập kế hoạch mà không cần khảo sát.',
      );
    const [target, eaten, excluded, foods] = await Promise.all([
      this.nutritionService.target(userId),
      this.nutritionService.consumed(userId, date),
      this.db.userFoodPreference.findMany({
        where: { userId },
        select: { foodId: true },
      }),
      this.db.food.findMany({
        where: { isActive: true, canSuggest: true, OR: [{ ownerId: null }, { ownerId: userId }] },
        include: { category: true },
      }),
    ]);
    if (!target)
      throw new BadRequestException(
        'Không thể tự tính mục tiêu từ hồ sơ này. Người dưới 19 tuổi, đang mang thai hoặc mắc bệnh thận cần mục tiêu riêng từ chuyên gia y tế.',
      );
    const remaining = {
      calories: Math.max(0, target.calories - eaten.calories),
      protein: Math.max(0, target.protein - eaten.protein),
      carbs: Math.max(0, target.carbs - eaten.carbs),
      fat: Math.max(0, target.fat - eaten.fat),
    };
    const blocked = new Set(excluded.map((x) => x.foodId));
    const budget = Math.min(remaining.calories, Math.max(150, target.calories / meals));
    const suggestions = foods
      .filter(
        (f) =>
          !blocked.has(f.id) &&
          Number(f.calories) > 0 &&
          this.safety.evaluate(
            f,
            user.profile?.healthConditions,
            user.profile?.allergies,
            user.profile?.dietaryPreferences,
          ).allowed,
      )
      .map((food) => {
        const limits = [250, (budget / Number(food.calories)) * 100];
        for (const key of ['protein', 'carbs', 'fat'] as const)
          if (Number(food[key]) > 0)
            limits.push(((remaining[key] * 1.05) / Number(food[key])) * 100);
        const grams = Math.max(25, Math.floor(Math.min(...limits) / 5) * 5);
        const macros = nutrition(
          {
            calories: Number(food.calories),
            protein: Number(food.protein),
            carbs: Number(food.carbs),
            fat: Number(food.fat),
          },
          grams,
        );
        const proteinFit =
          Math.min(macros.protein, remaining.protein) / Math.max(1, remaining.protein);
        const carbFit = Math.min(macros.carbs, remaining.carbs) / Math.max(1, remaining.carbs);
        const fatFit = Math.min(macros.fat, remaining.fat) / Math.max(1, remaining.fat);
        const over =
          Math.max(0, macros.calories - remaining.calories) / Math.max(1, target.calories) +
          Math.max(0, macros.protein - remaining.protein) / Math.max(1, target.protein) +
          Math.max(0, macros.carbs - remaining.carbs) / Math.max(1, target.carbs) +
          Math.max(0, macros.fat - remaining.fat) / Math.max(1, target.fat);
        const servingCost = food.estimatedCost ? (Number(food.estimatedCost) * grams) / 100 : null;
        const score =
          3 * proteinFit +
          2 * carbFit +
          fatFit -
          8 * over -
          Math.abs(macros.calories - budget) / Math.max(1, target.calories);
        const nutrient =
          remaining.protein / target.protein >= remaining.carbs / target.carbs
            ? 'protein'
            : 'carbohydrate';
        return {
          food,
          grams,
          macros,
          servingCost,
          score,
          reason: `Phù hợp với nhu cầu ${nutrient} còn thiếu và khẩu phần khoảng ${Math.round(budget)} kcal.`,
        };
      })
      .filter(
        (x) =>
          x.macros.calories <= remaining.calories * 1.05 &&
          x.macros.protein <= Math.max(5, remaining.protein * 1.15) &&
          x.macros.carbs <= Math.max(5, remaining.carbs * 1.15) &&
          x.macros.fat <= Math.max(3, remaining.fat * 1.15),
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    return {
      mealCount: 4,
      mealSlots: ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'],
      target,
      eaten,
      remaining,
      suggestions,
      safetyWarnings: this.safety.warnings(user.profile.healthConditions),
      disclaimer:
        'Đề xuất mang tính tham khảo, không phải thực đơn điều trị. Bạn có thể chỉnh sửa hoặc từ chối toàn bộ.',
    };
  }
  private async recentUsage(userId: number, date: string) {
    validDate(date);
    const plans = await this.db.mealPlan.findMany({
      where: {
        userId,
        date: { gte: validDate(addDays(date, -7)), lte: validDate(addDays(date, 6)) },
      },
      select: { items: { select: { foodId: true } } },
    });
    const usage = new Map<number, number>();
    for (const plan of plans)
      for (const item of plan.items) usage.set(item.foodId, (usage.get(item.foodId) || 0) + 1);
    return usage;
  }
  async plan(userId: number, date: string, _legacyMeals?: number) {
    return this.previewPlan(userId, date, await this.recentUsage(userId, date));
  }
  private async previewPlan(userId: number, date: string, usage: Map<number, number>) {
    const result = await this.prepare(userId, date);
    const candidates = result.suggestions.map((x) => x.food);
    // Explore a few safe combinations instead of accepting the first random
    // choice when it leaves large nutritional gaps. Each candidate is checked
    // against exactly the same remaining targets by buildMealDraft.
    const alternatives = Array.from({ length: 6 }, () =>
      buildMealDraft(candidates, result.remaining, {
        seed: randomInt(2147483647),
        recentUsage: usage,
      }),
    );
    const score = (value: (typeof alternatives)[number]) =>
      new Set(value.draft.map((item) => item.meal)).size * 10000 + value.draftCalories;
    const { draft, draftCalories } = alternatives.reduce((best, value) =>
      score(value) > score(best) ? value : best,
    );
    const emptyMeals = result.mealSlots.filter((meal) => !draft.some((item) => item.meal === meal));
    const planWarnings: string[] = [];
    if (emptyMeals.length)
      planWarnings.push(
        'Một số bữa chưa có món phù hợp với thực phẩm và dinh dưỡng còn lại. Bạn có thể tự điều chỉnh kế hoạch.',
      );
    if (draftCalories < result.remaining.calories * 0.8)
      planWarnings.push(
        'Bản nháp chưa đáp ứng đủ năng lượng còn lại; hãy xem lại khẩu phần trước khi lưu.',
      );
    return {
      ...result,
      suggestions: result.suggestions.slice(0, 8),
      draft,
      draftCalories,
      planWarnings,
    };
  }

  async week(userId: number, start: string, _legacyMeals?: number) {
    const meals = 4;
    const first = validDate(start);
    const usage = await this.recentUsage(userId, start);
    const days = [];
    for (let index = 0; index < 7; index++) {
      const date = new Date(first);
      date.setUTCDate(date.getUTCDate() + index);
      const value = date.toISOString().slice(0, 10);
      const result = await this.previewPlan(userId, value, usage);
      for (const item of result.draft) usage.set(item.foodId, (usage.get(item.foodId) || 0) + 1);
      days.push({
        date: value,
        draft: result.draft,
        totals: { calories: result.draftCalories },
        safetyWarnings: result.safetyWarnings,
        planWarnings: result.planWarnings,
      });
    }
    return {
      mealCount: 4,
      mealSlots: ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'],
      days,
      disclaimer: 'Bản nháp 7 ngày chưa được lưu. Bạn có thể lưu, sửa từng món hoặc từ chối.',
    };
  }
}
