import { Injectable, NotFoundException } from '@nestjs/common';
import { addDays, iso, localToday } from '../../common/utils/date';
import { PrismaService } from '../../database/prisma.service';
import { recordedFood } from '../meal-records/recorded-nutrition';
import { aggregateNutrition, analyzePeriod } from '../monitoring/monitoring-analysis';
import { MonitoringService } from '../monitoring/monitoring.service';
import { classifyHealth, healthGroupNames, healthGroups } from './admin-health';

@Injectable()
export class AdminHealthService {
  constructor(
    private db: PrismaService,
    private monitoring: MonitoringService,
  ) {}
  private async rows() {
    const end = addDays(localToday(), -1);
    const users = await this.db.user.findMany({
      where: { role: 'USER' },
      select: {
        id: true,
        email: true,
        createdAt: true,
        profile: { select: { name: true } },
        monitoringSettings: {
          select: { fiberMin: true, sugarsMax: true, sodiumMax: true },
        },
        monitoringSummary: { select: { payload: true, updatedAt: true } },
        healthAlerts: {
          where: { conditionActive: true },
          select: {
            id: true,
            type: true,
            severity: true,
            source: true,
            status: true,
            conditionActive: true,
          },
        },
      },
      orderBy: { id: 'desc' },
    });
    return users.map((u) => {
      const payload = u.monitoringSummary?.payload as any;
      const group = classifyHealth(
        payload ? { ...payload, monitoringLimits: u.monitoringSettings } : null,
        u.healthAlerts,
        end,
      );
      return {
        id: u.id,
        email: u.email,
        name: u.profile?.name || '',
        createdAt: u.createdAt,
        group,
        groupName: healthGroupNames[group],
        loggedDays: payload?.end === end ? payload.loggedDays : 0,
        completedDays: payload?.end === end ? payload.completedDays : 0,
        activeAlerts: u.healthAlerts.length,
        highAlerts: u.healthAlerts.filter((a) => a.severity === 'HIGH').length,
        updatedAt: u.monitoringSummary?.updatedAt || null,
      };
    });
  }
  async users(
    actorId: number,
    q: { page?: number; limit?: number; search?: string; group?: string },
  ) {
    await this.monitoring.assertAdmin(actorId);
    const query = (q.search || '').trim().toLocaleLowerCase('vi');
    const rows = (await this.rows()).filter(
      (u) =>
        (!query || `${u.name} ${u.email} ${u.id}`.toLocaleLowerCase('vi').includes(query)) &&
        (!q.group || u.group === q.group),
    );
    const page = q.page || 1,
      limit = q.limit || 20;
    return {
      items: rows.slice((page - 1) * limit, page * limit),
      total: rows.length,
      page,
      pages: Math.ceil(rows.length / limit),
    };
  }
  async dashboard(actorId: number) {
    await this.monitoring.assertAdmin(actorId);
    const today = localToday(),
      start = addDays(today, -6);
    const [users, sharedFoods, hiddenFoods, admins, openAlerts, newAlerts, latest, findings] =
      await Promise.all([
        this.rows(),
        this.db.food.count({ where: { ownerId: null, isActive: true } }),
        this.db.food.count({ where: { ownerId: null, isActive: false } }),
        this.db.user.count({ where: { role: 'ADMIN' } }),
        this.db.healthAlert.count({
          where: {
            user: { role: 'USER' },
            conditionActive: true,
            status: { not: 'RESOLVED' },
          },
        }),
        this.db.healthAlert.findMany({
          where: { user: { role: 'USER' }, createdAt: { gte: new Date(start) } },
          select: { createdAt: true, severity: true },
        }),
        this.db.healthAlert.findMany({
          where: {
            user: { role: 'USER' },
            conditionActive: true,
            status: { not: 'RESOLVED' },
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                profile: { select: { name: true } },
              },
            },
          },
          orderBy: [{ severity: 'desc' }, { lastDetectedAt: 'desc' }],
          take: 8,
        }),
        this.db.healthAlert.findMany({
          where: {
            user: { role: 'USER' },
            conditionActive: true,
            source: 'ACTUAL',
            type: {
              in: ['PROTEIN_LOW', 'FIBER_LOW', 'CALORIES_OVER', 'SUGARS_OVER', 'SODIUM_OVER'],
            },
          },
          select: { userId: true, type: true },
        }),
      ]);
    const groups = healthGroups.map((key) => ({
      key,
      label: healthGroupNames[key],
      count: users.filter((u) => u.group === key).length,
    }));
    const daily = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(start, i);
      return {
        date,
        ...Object.fromEntries(
          ['LOW', 'MEDIUM', 'HIGH'].map((severity) => [
            severity,
            newAlerts.filter((a) => iso(a.createdAt) === date && a.severity === severity).length,
          ]),
        ),
      };
    });
    const names: Record<string, string> = {
      PROTEIN_LOW: 'Protein thấp hơn mục tiêu',
      FIBER_LOW: 'Xơ thấp hơn giới hạn cá nhân',
      CALORIES_OVER: 'Calories vượt mục tiêu',
      SUGARS_OVER: 'Đường tổng vượt giới hạn',
      SODIUM_OVER: 'Natri vượt giới hạn',
    };
    return {
      totalUsers: users.length,
      admins,
      sharedFoods,
      hiddenFoods,
      openAlerts,
      usersWithAlerts: users.filter((u) => u.activeAlerts > 0).length,
      groups,
      daily,
      findings: Object.entries(names).map(([type, label]) => ({
        type,
        label,
        count: new Set(findings.filter((a) => a.type === type).map((a) => a.userId)).size,
      })),
      latest,
      period: { start: addDays(today, -7), end: addDays(today, -1) },
      generatedAt: new Date().toISOString(),
      limitations: [
        'Nhóm thống kê hỗ trợ theo dõi, không xác nhận một người khỏe mạnh hay mắc bệnh.',
        'Nhóm chưa ghi nhận cảnh báo cần ít nhất 3 ngày xác nhận ghi đủ trong 7 ngày đã kết thúc và có mục tiêu đối chiếu; thành phần còn thiếu được xét riêng.',
        'Mỗi người thuộc một nhóm trong biểu đồ tổng quan. Biểu đồ từng vấn đề có thể đếm cùng người ở nhiều loại.',
        'Cảnh báo được xử lý nền. Thống kê thay đổi sau khi worker cập nhật dữ liệu.',
      ],
    };
  }
  async detail(actorId: number, userId: number) {
    await this.monitoring.assertAdmin(actorId);
    const user = await this.db.user.findFirst({
      where: { id: userId, role: 'USER' },
      select: {
        id: true,
        email: true,
        createdAt: true,
        profile: true,
        monitoringSettings: true,
      },
    });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng.');
    const today = localToday(),
      start = addDays(today, -7);
    const { target, logs, weights } = await this.monitoring.data(userId, start, today);
    const [alerts, plans] = await Promise.all([
      this.db.healthAlert.findMany({
        where: { userId, conditionActive: true },
        orderBy: [{ lastDetectedAt: 'desc' }],
        take: 100,
      }),
      this.db.mealPlan.findMany({
        where: {
          userId,
          date: { gte: new Date(today), lte: new Date(addDays(today, 6)) },
        },
        include: {
          items: {
            include: {
              food: {
                select: {
                  id: true,
                  name: true,
                  calories: true,
                  protein: true,
                  carbs: true,
                  fat: true,
                  fiber: true,
                  sugars: true,
                  sodium: true,
                },
              },
            },
          },
        },
        orderBy: { date: 'asc' },
      }),
    ]);
    const profile = user.profile;
    const summary = analyzePeriod(start, logs, weights, target, profile, user.monitoringSettings);
    const group = classifyHealth(
      { ...summary, monitoringLimits: user.monitoringSettings },
      alerts,
      addDays(today, -1),
    );
    return {
      user: {
        id: user.id,
        email: user.email,
        name: profile?.name || '',
        createdAt: user.createdAt,
      },
      profile: profile
        ? {
            age: profile.age,
            gender: profile.gender,
            goal: profile.goal,
            targetWeightKg: profile.targetWeightKg,
            allergies: profile.allergies,
            dietaryPreferences: profile.dietaryPreferences,
            healthConditions: profile.healthConditions,
          }
        : null,
      settings: user.monitoringSettings,
      target,
      summary,
      group,
      groupName: healthGroupNames[group],
      alerts,
      logs: logs.map((log) => ({
        date: iso(log.date),
        completed: log.completed,
        totals: aggregateNutrition(log.items),
        items: log.items.map((i) => ({
          id: i.id,
          meal: i.meal,
          grams: i.grams,
          food: { id: i.food.id, name: recordedFood(i).name },
          totals: aggregateNutrition([i]),
        })),
      })),
      plans: plans.map((p) => ({
        date: iso(p.date),
        totals: aggregateNutrition(p.items),
        items: p.items,
      })),
      weights: weights
        .filter((w) => iso(w.date) >= addDays(today, -30))
        .map((w) => ({ date: iso(w.date), kg: Number(w.weightKg) })),
      updatedAt: new Date().toISOString(),
    };
  }
}
