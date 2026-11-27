import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { day, totals } from '../meal-records/record-utils';
import { planProgress, withRecordedFood } from '../meal-records/recorded-nutrition';
import { NutritionService } from '../nutrition/nutrition.service';
import { ChartPeriodDto } from './chart-period';
import { UserChartsService } from './user-charts.service';
@Injectable()
export class DashboardService {
  constructor(
    private db: PrismaService,
    private nutrition: NutritionService,
    private charts: UserChartsService,
  ) {}
  chartsForPeriod(req: any, q: ChartPeriodDto) {
    return this.charts.get(req.user.sub, q);
  }
  async get(req: any, date: string) {
    const userId = req.user.sub,
      dateValue = day(date);
    const [user, target, consumed, plan, weights, log] = await Promise.all([
      this.db.user.findUniqueOrThrow({
        where: { id: userId },
        select: { usageMode: true, profile: true },
      }),
      this.nutrition.target(userId),
      this.nutrition.consumed(userId, date),
      this.db.mealPlan.findUnique({
        where: { userId_date: { userId, date: dateValue } },
        include: { items: { include: { food: true } } },
      }),
      this.db.weightLog.findMany({
        where: { userId },
        orderBy: { date: 'asc' },
        take: 30,
      }),
      this.db.foodLog.findUnique({
        where: { userId_date: { userId, date: dateValue } },
        include: { items: { include: { food: true } } },
      }),
    ]);
    return {
      usageMode: user.usageMode,
      target,
      consumed,
      planned: totals(plan?.items || []),
      plan: plan?.items || [],
      logs: (log?.items || []).map(withRecordedFood),
      progress: planProgress(plan?.items || [], log?.items || []),
      weights,
      targetWeightKg: user.profile?.targetWeightKg ? Number(user.profile.targetWeightKg) : null,
    };
  }
}
