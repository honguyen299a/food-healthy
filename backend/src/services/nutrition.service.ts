import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { nutrition, sum, targets } from '../nutrition';
import { aggregateNutrition } from '../monitoring-analysis';

@Injectable()
export class NutritionService {
  constructor(private db: PrismaService) {}
  async target(userId: number) {
    const user = await this.db.user.findUniqueOrThrow({ where: { id: userId }, include: { profile: true, manualTarget: true } });
    if (user.usageMode === 'PERSONALIZED' && user.profile) {
      const conditions = Array.isArray(user.profile.healthConditions) ? user.profile.healthConditions.map(value => String(value).toUpperCase()) : [];
      // Adult equations and general macro targets are not individualized care for these groups.
      if (user.profile.age < 19 || conditions.includes('PREGNANCY') || conditions.includes('KIDNEY_DISEASE')) return null;
      return { ...targets(user.profile), source: 'SURVEY' as const };
    }
    if (user.manualTarget) return { calories: user.manualTarget.calories, protein: user.manualTarget.protein, carbs: user.manualTarget.carbs, fat: user.manualTarget.fat, source: 'MANUAL' as const };
    return null;
  }
  async consumed(userId: number, date: string) {
    const log = await this.db.foodLog.findUnique({ where: { userId_date: { userId, date: new Date(date) } }, include: { items: { include: { food: true } } } });
    return aggregateNutrition(log?.items || []);
  }
}
