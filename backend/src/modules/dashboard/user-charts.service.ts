import { Injectable } from '@nestjs/common';
import { addDays, iso } from '../../common/utils/date';
import { PrismaService } from '../../database/prisma.service';
import { withRecordedFood } from '../meal-records/recorded-nutrition';
import { aggregateNutrition, extendedKeys, macroKeys } from '../monitoring/monitoring-analysis';
import { NutritionService } from '../nutrition/nutrition.service';
import { ChartPeriodDto, chartPeriod } from './chart-period';
export function chartSummary(period: ReturnType<typeof chartPeriod>, logs: any[], plans: any[]) {
  const days = Array.from({ length: period.days }, (_, i) => {
    const date = addDays(period.start, i),
      log = logs.find((l) => iso(l.date) === date);
    return {
      date,
      logged: !!log?.items.length,
      completed: !!log?.completed,
      totals: aggregateNutrition(log?.items || []),
    };
  });
  const recorded = days.filter((d) => d.logged),
    planned = plans.filter((p) => p.items.length);
  const keys = [...macroKeys, ...extendedKeys];
  const averages = Object.fromEntries(
    keys.map((key) => {
      const known = recorded.filter((d) => d.totals[key] !== null);
      return [
        key,
        known.length ? known.reduce((n, d) => n + Number(d.totals[key]), 0) / known.length : null,
      ];
    }),
  );
  const plannedTotals = planned.map((p) => aggregateNutrition(p.items));
  const plannedAverages = Object.fromEntries(
    keys.map((key) => {
      const known = plannedTotals.filter((t) => t[key] !== null);
      return [
        key,
        known.length ? known.reduce((n, t) => n + Number(t[key]), 0) / known.length : null,
      ];
    }),
  );
  return {
    days,
    loggedDays: recorded.length,
    plannedDays: planned.length,
    averages,
    plannedAverages,
    totals: aggregateNutrition(logs.flatMap((l) => l.items)),
    logs: logs.flatMap((l) => l.items.map(withRecordedFood)),
    plan: plans.flatMap((p) => p.items),
  };
}
@Injectable()
export class UserChartsService {
  constructor(
    private db: PrismaService,
    private nutrition: NutritionService,
  ) {}
  async get(userId: number, q: ChartPeriodDto) {
    const period = chartPeriod(q),
      range = { gte: new Date(period.start), lte: new Date(period.end) };
    const [logs, plans, weights, target, user] = await Promise.all([
      this.db.foodLog.findMany({
        where: { userId, date: range },
        include: { items: { include: { food: true } } },
        orderBy: { date: 'asc' },
      }),
      this.db.mealPlan.findMany({
        where: { userId, date: range },
        include: { items: { include: { food: true } } },
        orderBy: { date: 'asc' },
      }),
      this.db.weightLog.findMany({
        where: { userId, date: range },
        orderBy: { date: 'asc' },
      }),
      this.nutrition.target(userId),
      this.db.user.findUniqueOrThrow({
        where: { id: userId },
        select: { profile: { select: { targetWeightKg: true } } },
      }),
    ]);
    return {
      period,
      ...chartSummary(period, logs, plans),
      weights,
      target,
      targetWeightKg:
        user.profile?.targetWeightKg == null ? null : Number(user.profile.targetWeightKg),
      aggregation: 'AVERAGE_RECORDED_DAY',
      targetReference: 'CURRENT_DAILY_TARGET',
    };
  }
}
