import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AlertStatus, Prisma } from "@prisma/client";
import { PrismaService } from "./prisma.service";
import { NutritionService } from "./nutrition.service";
import { NotificationsService } from "./notifications.service";
import { RecommendationSafetyService } from "./recommendation-safety.service";
import {
  addDays,
  analyzePeriod,
  createInsights,
  extendedKeys,
  iso,
  localToday,
  monday,
} from "../monitoring-analysis";
import { evaluateRules, RuleResult } from "../monitoring-rules";

const json = (value: any): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value));
const linked = {
  items: { include: { food: { include: { category: true } } } },
} as const;
@Injectable()
export class MonitoringService {
  constructor(
    private db: PrismaService,
    private nutrition: NutritionService,
    private notifications: NotificationsService,
    private safety: RecommendationSafetyService,
  ) {}
  async data(userId: number, start: string, end: string) {
    const [user, target, logs, weights] = await Promise.all([
      this.db.user.findUniqueOrThrow({
        where: { id: userId },
        include: { profile: true, monitoringSettings: true, preferences: true },
      }),
      this.nutrition.target(userId),
      this.db.foodLog.findMany({
        where: { userId, date: { gte: new Date(start), lte: new Date(end) } },
        include: linked,
        orderBy: { date: "asc" },
      }),
      this.db.weightLog.findMany({
        where: {
          userId,
          date: { gte: new Date(addDays(start, -90)), lte: new Date(end) },
        },
        orderBy: { date: "asc" },
      }),
    ]);
    return { user, target, logs, weights };
  }
  private insights(
    current: ReturnType<typeof analyzePeriod>,
    previous: ReturnType<typeof analyzePeriod>,
    settings: any,
  ) {
    const items = createInsights(current, previous);
    if (current.completedDays >= 3)
      for (const [key, limitKey, low, label] of [
        ["fiber", "fiberMin", true, "Chất xơ"],
        ["sugars", "sugarsMax", false, "Đường tổng"],
        ["sodium", "sodiumMax", false, "Natri"],
      ] as const) {
        const eligible = current.days.filter(
            (d) => d.completed && d.totals.coverage[key].complete,
          ),
          limit = settings?.[limitKey];
        if (limit == null || eligible.length < 3) continue;
        const average =
          eligible.reduce((a, d) => a + Number(d.totals[key]), 0) /
          eligible.length;
        if (low ? average < Number(limit) : average > Number(limit))
          items.push({
            type: `LIMIT_${key.toUpperCase()}`,
            priority: "MEDIUM",
            title: `${label} trung bình chưa phù hợp giới hạn cá nhân`,
            body: `Trên ${eligible.length} ngày ghi đủ và đủ thành phần, trung bình ${average.toFixed(1)} ${key === "sodium" ? "mg" : "g"}; giới hạn bạn đã thiết lập là ${Number(limit)}.`,
            suggestion:
              "Kiểm tra lại dữ liệu và nguồn mục tiêu; trao đổi với chuyên gia trước khi đổi giới hạn theo bệnh lý.",
            evidence: {
              average,
              limit: Number(limit),
              limitSource: settings.limitSource,
              days: eligible.map((d) => d.date),
            },
          });
      }
    return items;
  }
  async refresh(userId: number) {
    const today = localToday(),
      start = addDays(today, -7);
    const { user, target, logs, weights } = await this.data(
      userId,
      addDays(start, -7),
      today,
    );
    if (user.role !== "USER") return;
    const [plans, admins] = await Promise.all([
      this.db.mealPlan.findMany({
        where: {
          userId,
          date: { gte: new Date(today), lte: new Date(addDays(today, 6)) },
        },
        include: linked,
      }),
      this.db.user.findMany({ where: { role: "ADMIN" }, select: { id: true } }),
    ]);
    const current = analyzePeriod(
        start,
        logs,
        weights,
        target,
        user.profile,
        user.monitoringSettings,
      ),
      previous = analyzePeriod(
        addDays(start, -7),
        logs,
        weights,
        target,
        user.profile,
        user.monitoringSettings,
      );
    const insights = this.insights(current, previous, user.monitoringSettings);
    const payload = {
      ...current,
      previous: {
        averages: previous.averages,
        loggedDays: previous.loggedDays,
        weight: previous.weight,
      },
      rulesVersion: "1.0",
      dataSource: "ACTUAL",
      insights,
    };
    await this.db.monitoringSummary.upsert({
      where: { userId },
      create: { userId, payload: json(payload) },
      update: { payload: json(payload) },
    });
    for (const item of insights)
      await this.db.nutritionInsight.upsert({
        where: {
          userId_fingerprint: { userId, fingerprint: `${start}:${item.type}` },
        },
        create: {
          userId,
          fingerprint: `${start}:${item.type}`,
          ...item,
          evidence: json(item.evidence),
          periodStart: new Date(start),
          periodEnd: new Date(addDays(start, 6)),
        },
        update: { ...item, evidence: json(item.evidence) },
      });
    if (insights.length)
      await this.notifications.send(
        userId,
        `insights:${start}`,
        "NUTRITION_INSIGHT",
        "Nhận xét dinh dưỡng mới",
        "Đã có phân tích dựa trên nhật ký thực tế và độ đầy đủ của dữ liệu.",
        "/insights",
      );
    const rules = evaluateRules(
      today,
      logs,
      plans,
      weights,
      target,
      user.profile,
      user.preferences,
      user.monitoringSettings,
      this.safety,
    );
    for (const rule of rules)
      await this.reconcile(
        userId,
        rule,
        admins.map((a) => a.id),
      );
    // Remove an active finding only when its referenced day is gone/outside the monitoring window;
    // incomplete nutrient data (active:null) is deliberately retained, never declared safe.
    const known = new Set(rules.map((r) => r.fingerprint));
    const stale = await this.db.healthAlert.findMany({
      where: { userId, conditionActive: true },
    });
    for (const alert of stale)
      if (
        !known.has(alert.fingerprint) &&
        alert.fingerprint.split(":").at(-1) !== "trend"
      )
        await this.reconcile(
          userId,
          {
            fingerprint: alert.fingerprint,
            type: alert.type,
            source: alert.source,
            severity: alert.severity,
            title: alert.title,
            body: alert.body,
            evidence: {
              reason:
                "Ngày nằm ngoài cửa sổ theo dõi hoặc bản ghi không còn tồn tại.",
            },
            active: false,
            adminReview: alert.adminReview,
          },
          admins.map((a) => a.id),
        );
    await this.remind(user, target, logs, weights, today);
    const weekStart = addDays(monday(today), -7);
    if (iso(user.createdAt) <= addDays(weekStart, 6)) {
      const count = await this.db.foodLogItem.count({
        where: {
          log: {
            userId,
            date: {
              gte: new Date(weekStart),
              lte: new Date(addDays(weekStart, 6)),
            },
          },
        },
      });
      if (count) await this.generateReport(userId, weekStart);
    }
  }
  private async reconcile(userId: number, rule: RuleResult, admins: number[]) {
    if (rule.active === null) return;
    await this.db.$transaction(async (db) => {
      const old = await db.healthAlert.findUnique({
        where: {
          userId_fingerprint: { userId, fingerprint: rule.fingerprint },
        },
      });
      if (!rule.active) {
        if (!old || !old.conditionActive) return;
        const changed = await db.healthAlert.update({
          where: { id: old.id },
          data: {
            conditionActive: false,
            status: "RESOLVED",
            resolvedAt: new Date(),
            evidence: json(rule.evidence),
            revision: { increment: 1 },
          },
        });
        await db.healthAlertEvent.create({
          data: {
            alertId: old.id,
            status: "RESOLVED",
            note: "Hệ thống: điều kiện không còn xuất hiện trong dữ liệu đủ điều kiện hoặc không còn trong cửa sổ theo dõi.",
          },
        });
        await this.alertNotification(
          changed,
          admins,
          "ALERT_STATUS",
          "Đã cập nhật trạng thái cảnh báo",
          db,
        );
        return;
      }
      const changedEpisode = !old || !old.conditionActive;
      const newlySharedWithAdmin =
        !!old &&
        old.conditionActive &&
        old.status !== "RESOLVED" &&
        !old.adminReview &&
        rule.adminReview;
      const escalated =
        old?.conditionActive &&
        old.status !== "RESOLVED" &&
        { LOW: 0, MEDIUM: 1, HIGH: 2 }[rule.severity] >
          { LOW: 0, MEDIUM: 1, HIGH: 2 }[old.severity];
      const data = {
        type: rule.type,
        source: rule.source,
        severity: rule.severity,
        title: rule.title,
        body: rule.body,
        evidence: json(rule.evidence),
        adminReview: rule.adminReview,
        lastDetectedAt: new Date(),
        conditionActive: true,
      };
      const alert = old
        ? await db.healthAlert.update({
            where: { id: old.id },
            data: {
              ...data,
              ...(changedEpisode
                ? { status: "OPEN", resolvedAt: null, detectedAt: new Date() }
                : {}),
              ...(changedEpisode || escalated
                ? { revision: { increment: 1 } }
                : {}),
            },
          })
        : await db.healthAlert.create({
            data: { ...data, userId, fingerprint: rule.fingerprint },
          });
      if (changedEpisode || escalated || newlySharedWithAdmin) {
        await db.healthAlertEvent.create({
          data: {
            alertId: alert.id,
            status: alert.status,
            note: newlySharedWithAdmin
              ? "Hệ thống: chuyển cảnh báo hiện có tới Admin theo dõi."
              : escalated
                ? "Hệ thống: mức độ cần chú ý tăng."
                : "Hệ thống: phát hiện điều kiện theo dõi. Các mức độ không phải phân loại nguy cơ bệnh.",
          },
        });
        await this.alertNotification(
          alert,
          admins,
          "HEALTH_ALERT",
          rule.title,
          db,
        );
      }
    });
  }
  private async alertNotification(
    alert: any,
    admins: number[],
    type: "HEALTH_ALERT" | "ALERT_STATUS",
    title: string,
    db: Prisma.TransactionClient,
  ) {
    const person = await db.user.findUnique({
      where: { id: alert.userId },
      select: { email: true, profile: { select: { name: true } } },
    });
    const identity =
      person?.profile?.name || person?.email || `Người dùng #${alert.userId}`;
    const key = `alert:${alert.id}:${alert.revision}:${type}`;
    await this.notifications.send(
      alert.userId,
      key,
      type,
      title,
      "Mở cảnh báo để xem căn cứ, nguồn dữ liệu và trạng thái xử lý.",
      `/notifications/alerts/${alert.id}`,
      db,
    );
    for (const id of admins)
      await this.notifications.send(
        id,
        key + ":admin",
        type,
        `${alert.severity === "HIGH" ? "Ưu tiên: " : ""}${identity}: ${title}`.slice(
          0,
          200,
        ),
        `${person?.email || identity} · ${alert.source === "PLAN" ? "Thực đơn dự kiến" : alert.source === "ACTUAL" ? "Thực tế đã ăn" : "Cân nặng"} · ${alert.severity}. ${alert.body}`,
        `/admin/alerts?id=${alert.id}`,
        db,
      );
  }
  private async remind(
    user: any,
    target: any,
    logs: any[],
    weights: any[],
    today: string,
  ) {
    if (
      user.monitoringSettings?.reminders === false ||
      !user.onboardingCompleted
    )
      return;
    const hour = Number(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Ho_Chi_Minh",
        hour: "2-digit",
        hourCycle: "h23",
      }).format(new Date()),
    );
    if (
      hour >= 20 &&
      iso(user.createdAt) < today &&
      !logs.some((x) => iso(x.date) === today && x.items.length)
    )
      await this.notifications.send(
        user.id,
        `log:${today}`,
        "LOG_REMINDER",
        "Nhắc ghi nhật ký ăn uống",
        "Bạn chưa ghi thực phẩm hôm nay. Nếu muốn theo dõi, hãy ghi các bữa đã ăn.",
        "/logs",
      );
    const last = weights.at(-1),
      lastDay = last ? iso(last.date) : iso(user.createdAt);
    if (lastDay <= addDays(today, -7))
      await this.notifications.send(
        user.id,
        `weight:${monday(today)}`,
        "WEIGHT_REMINDER",
        "Nhắc cập nhật cân nặng",
        "Đã ít nhất 7 ngày chưa có bản ghi cân nặng mới. Bạn có thể cập nhật khi phù hợp.",
        "/weights",
      );
    if (!target)
      await this.notifications.send(
        user.id,
        `goal:${monday(today)}`,
        "GOAL_REMINDER",
        "Theo dõi mục tiêu dinh dưỡng",
        "Hiện chưa có mục tiêu để đối chiếu. Với hồ sơ cần chỉ định riêng, hãy dùng mục tiêu được chuyên gia xác nhận.",
        "/profile",
      );
  }
  async generateReport(userId: number, start: string) {
    const end = addDays(start, 6);
    const { user, target, logs, weights } = await this.data(
      userId,
      addDays(start, -7),
      end,
    );
    const current = analyzePeriod(
        start,
        logs,
        weights,
        target,
        user.profile,
        user.monitoringSettings,
      ),
      previous = analyzePeriod(
        addDays(start, -7),
        logs,
        weights,
        target,
        user.profile,
        user.monitoringSettings,
      );
    const insights = this.insights(current, previous, user.monitoringSettings);
    const positives: string[] = [];
    if (current.loggedDays === 7) positives.push("Có nhật ký cho cả 7 ngày.");
    if (current.completedDays >= 3)
      positives.push(
        `Có ${current.completedDays} ngày xác nhận ghi đủ để đối chiếu mục tiêu.`,
      );
    const gaps = [
      ...extendedKeys
        .filter((k) => current.averages[k].missingDays > 0)
        .map(
          (k) =>
            `Chưa đủ dữ liệu ${k} trên ${current.averages[k].missingDays} ngày đã ghi.`,
        ),
      ...insights.filter((x) => x.priority === "MEDIUM").map((x) => x.title),
    ];
    const payload = {
      ...current,
      dataSource: "ACTUAL",
      previous: {
        averages: previous.averages,
        loggedDays: previous.loggedDays,
        weight: previous.weight,
      },
      insights,
      positives,
      gaps,
      nextSteps: insights.length
        ? insights.map((x) => x.suggestion)
        : [
            "Cần thêm ít nhất 3 ngày nhật ký để tạo nhận xét thói quen có căn cứ.",
          ],
      generatedAt: new Date().toISOString(),
      rulesVersion: "1.0",
    };
    const report = await this.db.nutritionWeeklyReport.upsert({
      where: { userId_weekStart: { userId, weekStart: new Date(start) } },
      create: {
        userId,
        weekStart: new Date(start),
        weekEnd: new Date(end),
        payload: json(payload),
      },
      update: { payload: json(payload) },
    });
    await this.notifications.send(
      userId,
      `report:${report.id}`,
      "WEEKLY_REPORT",
      "Báo cáo dinh dưỡng tuần đã sẵn sàng",
      `Báo cáo ${start} đến ${end}, dựa trên ${current.loggedDays}/7 ngày có nhật ký.`,
      `/insights?report=${report.id}`,
    );
    return report;
  }
  async assertAdmin(id: number) {
    const user = await this.db.user.findUnique({
      where: { id },
      select: { role: true },
    });
    if (user?.role !== "ADMIN") throw new ForbiddenException();
  }
  async alerts(userId: number, q: any, admin = false) {
    if (admin) await this.assertAdmin(userId);
    const where: Prisma.HealthAlertWhereInput = {
      ...(admin ? { user: { role: "USER" } } : { userId }),
      ...(q.status ? { status: q.status } : {}),
      ...(q.severity ? { severity: q.severity } : {}),
      ...(q.type ? { type: q.type } : {}),
      ...(q.source ? { source: q.source } : {}),
      ...(admin && q.userId ? { userId: q.userId } : {}),
    };
    const limit = q.limit || 20;
    const [rows, total, groups] = await Promise.all([
      this.db.healthAlert.findMany({
        where: { ...where, ...(q.cursor ? { id: { lt: q.cursor } } : {}) },
        orderBy: { id: "desc" },
        take: limit + 1,
        ...(admin
          ? {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    profile: { select: { name: true } },
                  },
                },
              },
            }
          : {}),
      }),
      this.db.healthAlert.count({ where }),
      this.db.healthAlert.groupBy({
        by: ["severity", "status"],
        where,
        _count: { _all: true },
      }),
    ]);
    return {
      items: rows.slice(0, limit),
      total,
      stats: groups,
      nextCursor: rows.length > limit ? rows[limit - 1].id : null,
    };
  }
  async alert(userId: number, id: number, admin = false) {
    if (admin) await this.assertAdmin(userId);
    const alert = await this.db.healthAlert.findFirst({
      where: { id, ...(admin ? { user: { role: "USER" } } : { userId }) },
      include: {
        events: { orderBy: { id: "desc" }, take: 100 },
        ...(admin
          ? {
              user: {
                select: {
                  id: true,
                  email: true,
                  profile: { select: { name: true } },
                },
              },
            }
          : {}),
      },
    });
    if (!alert) throw new NotFoundException();
    return alert;
  }
  async updateAlert(
    actorId: number,
    id: number,
    status: AlertStatus,
    note: string,
    version: number,
  ) {
    await this.assertAdmin(actorId);
    if (!note.trim()) throw new BadRequestException("Hãy nhập ghi chú xử lý.");
    return this.db.$transaction(async (db) => {
      const result = await db.healthAlert.updateMany({
        where: { id, revision: version, user: { role: "USER" } },
        data: {
          status,
          resolvedAt: status === "RESOLVED" ? new Date() : null,
          revision: { increment: 1 },
        },
      });
      if (!result.count)
        throw new BadRequestException(
          "Cảnh báo đã thay đổi hoặc không còn truy cập được. Hãy tải lại.",
        );
      const alert = await db.healthAlert.findUniqueOrThrow({ where: { id } });
      await db.healthAlertEvent.create({
        data: { alertId: id, actorId, status, note: note.trim() },
      });
      const admins = await db.user.findMany({
        where: { role: "ADMIN", id: { not: actorId } },
        select: { id: true },
      });
      await this.alertNotification(
        alert,
        admins.map((x) => x.id),
        "ALERT_STATUS",
        "Cập nhật quá trình xử lý cảnh báo",
        db,
      );
      return { ok: true };
    });
  }
}
