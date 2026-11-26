import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { NutritionService } from './nutrition.service';
import { nutrition } from '../nutrition';
import { RecommendationSafetyService } from './recommendation-safety.service';

@Injectable()
export class RecommendationsService {
  constructor(private db: PrismaService, private nutritionService: NutritionService, private safety: RecommendationSafetyService) {}
  async suggest(userId: number, date: string, meals = 3) {
    const user = await this.db.user.findUniqueOrThrow({ where: { id: userId }, include: { profile: true } });
    if (user.usageMode !== 'PERSONALIZED' || !user.profile) throw new BadRequestException('Hãy hoàn thành khảo sát và bật chế độ cá nhân hóa để nhận đề xuất. Bạn vẫn có thể tự lập kế hoạch mà không cần khảo sát.');
    const [target, eaten, excluded, foods] = await Promise.all([
      this.nutritionService.target(userId), this.nutritionService.consumed(userId, date),
      this.db.userFoodPreference.findMany({ where: { userId }, select: { foodId: true } }),
      this.db.food.findMany({ where: { isActive: true, OR: [{ ownerId: null }, { ownerId: userId }] }, include: { category: true } })
    ]);
    if (!target) throw new BadRequestException('Không thể tự tính mục tiêu từ hồ sơ này. Người dưới 19 tuổi, đang mang thai hoặc mắc bệnh thận cần mục tiêu riêng từ chuyên gia y tế.');
    const remaining = {
      calories: Math.max(0, target.calories - eaten.calories),
      protein: Math.max(0, target.protein - eaten.protein),
      carbs: Math.max(0, target.carbs - eaten.carbs),
      fat: Math.max(0, target.fat - eaten.fat)
    };
    const blocked = new Set(excluded.map(x => x.foodId));
    const budget = Math.min(remaining.calories, Math.max(150, target.calories / meals));
    const suggestions = foods.filter(f => !blocked.has(f.id) && Number(f.calories) > 0 && this.safety.evaluate(f, user.profile?.healthConditions, user.profile?.allergies, user.profile?.dietaryPreferences).allowed).map(food => {
      const limits = [250, budget / Number(food.calories) * 100];
      for (const key of ['protein','carbs','fat'] as const) if (Number(food[key]) > 0) limits.push(remaining[key] * 1.05 / Number(food[key]) * 100);
      const grams = Math.max(25, Math.floor(Math.min(...limits) / 5) * 5);
      const macros = nutrition({ calories: Number(food.calories), protein: Number(food.protein), carbs: Number(food.carbs), fat: Number(food.fat) }, grams);
      const proteinFit = Math.min(macros.protein, remaining.protein) / Math.max(1, remaining.protein);
      const carbFit = Math.min(macros.carbs, remaining.carbs) / Math.max(1, remaining.carbs);
      const fatFit = Math.min(macros.fat, remaining.fat) / Math.max(1, remaining.fat);
      const over = Math.max(0, macros.calories - remaining.calories) / Math.max(1, target.calories)
        + Math.max(0, macros.protein - remaining.protein) / Math.max(1, target.protein)
        + Math.max(0, macros.carbs - remaining.carbs) / Math.max(1, target.carbs)
        + Math.max(0, macros.fat - remaining.fat) / Math.max(1, target.fat);
      const servingCost = food.estimatedCost ? Number(food.estimatedCost) * grams / 100 : null;
      const score = 3*proteinFit + 2*carbFit + fatFit - 8*over - Math.abs(macros.calories - budget) / Math.max(1, target.calories);
      const nutrient = remaining.protein / target.protein >= remaining.carbs / target.carbs ? 'protein' : 'carbohydrate';
      return { food, grams, macros, servingCost, score, reason: `Phù hợp với nhu cầu ${nutrient} còn thiếu và khẩu phần khoảng ${Math.round(budget)} kcal.` };
    }).filter(x => x.macros.calories <= remaining.calories * 1.05 && x.macros.protein <= Math.max(5, remaining.protein * 1.15) && x.macros.carbs <= Math.max(5, remaining.carbs * 1.15) && x.macros.fat <= Math.max(3, remaining.fat * 1.15))
      .sort((a,b) => b.score - a.score).slice(0, 8);
    return { target, eaten, remaining, suggestions, safetyWarnings: this.safety.warnings(user.profile.healthConditions), disclaimer: 'Đề xuất mang tính tham khảo, không phải thực đơn điều trị. Bạn có thể chỉnh sửa hoặc từ chối toàn bộ.' };
  }
  async plan(userId: number, date: string, meals = 3) {
    const result = await this.suggest(userId, date, meals);
    const mealKeys = ['BREAKFAST','LUNCH','DINNER','SNACK'].slice(0, meals);
    const draft: {foodId:number; meal:string; grams:number; food:any}[] = [];
    const remaining = { ...result.remaining };
    const selected = new Set<number>();
    for (const meal of mealKeys) {
      for (let i=0;i<2;i++) {
        const choice = result.suggestions.find(x => !selected.has(x.food.id) && Number(x.food.calories) > 0 && remaining.calories >= 50);
        if (!choice) break;
        const limits = [choice.grams, remaining.calories / Number(choice.food.calories) * 100];
        for (const key of ['protein','carbs','fat'] as const) if (Number(choice.food[key]) > 0) limits.push(remaining[key] / Number(choice.food[key]) * 100);
        const grams = Math.floor(Math.min(...limits) / 5) * 5;
        if (grams < 25) { selected.add(choice.food.id); continue; }
        const macros = nutrition({ calories: Number(choice.food.calories), protein: Number(choice.food.protein), carbs: Number(choice.food.carbs), fat: Number(choice.food.fat) }, grams);
        draft.push({ foodId: choice.food.id, meal, grams, food: choice.food });
        selected.add(choice.food.id);
        for (const key of ['calories','protein','carbs','fat'] as const) remaining[key] = Math.max(0, remaining[key] - macros[key]);
      }
    }
    return { ...result, draft, draftCalories: Math.round(result.remaining.calories - remaining.calories) };
  }
  async week(userId: number, start: string, meals = 3) {
    const first = new Date(start);
    if (Number.isNaN(first.getTime())) throw new BadRequestException('Ngày bắt đầu không hợp lệ');
    const days = [];
    for (let index = 0; index < 7; index++) {
      const date = new Date(first); date.setUTCDate(date.getUTCDate() + index);
      const value = date.toISOString().slice(0, 10);
      const result = await this.plan(userId, value, meals);
      days.push({ date: value, draft: result.draft, totals: { calories: result.draftCalories }, safetyWarnings: result.safetyWarnings });
    }
    return { days, disclaimer: 'Bản nháp 7 ngày chưa được lưu. Bạn có thể lưu, sửa từng món hoặc từ chối.' };
  }
}
