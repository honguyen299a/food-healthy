import { Injectable, NotFoundException } from "@nestjs/common";
import { AlertSeverity, NotificationType, Prisma } from "@prisma/client";
import { PrismaService } from "./prisma.service";
import {
  notificationAlertId,
  notificationAlertPaths,
} from "../notification-alert";
@Injectable()
export class NotificationsService {
  constructor(private db: PrismaService) {}
  async send(
    userId: number,
    key: string,
    type: NotificationType,
    title: string,
    body: string,
    targetPath: string,
    db: Prisma.TransactionClient = this.db,
  ) {
    return db.notification.upsert({
      where: { userId_dedupeKey: { userId, dedupeKey: key } },
      update: {},
      create: { userId, dedupeKey: key, type, title, body, targetPath },
    });
  }
  async list(
    userId: number,
    q: {
      cursor?: number;
      limit?: number;
      type?: NotificationType;
      read?: string;
      severity?: AlertSeverity;
    },
  ) {
    const admin =
      (
        await this.db.user.findUnique({
          where: { id: userId },
          select: { role: true },
        })
      )?.role === "ADMIN";
    const audience = admin
      ? { targetPath: { startsWith: "/admin/" } }
      : { NOT: { targetPath: { startsWith: "/admin/" } } };
    const alertScope: Prisma.HealthAlertWhereInput = admin
      ? { user: { role: "USER" } }
      : { userId };
    const matching = q.severity
      ? await this.db.healthAlert.findMany({
          where: { ...alertScope, severity: q.severity },
          select: { id: true },
        })
      : null;
    const where: Prisma.NotificationWhereInput = {
      userId,
      deletedAt: null,
      ...audience,
      ...(matching
        ? {
            targetPath: {
              in: notificationAlertPaths(
                matching.map((a) => a.id),
                admin,
              ),
            },
          }
        : {}),
      ...(q.type ? { type: q.type } : {}),
      ...(q.read === "UNREAD"
        ? { readAt: null }
        : q.read === "READ"
          ? { readAt: { not: null } }
          : {}),
    };
    const limit = q.limit || 20;
    const [rows, unread] = await Promise.all([
      this.db.notification.findMany({
        where: { ...where, ...(q.cursor ? { id: { lt: q.cursor } } : {}) },
        orderBy: { id: "desc" },
        take: limit + 1,
      }),
      this.db.notification.count({
        where: { userId, deletedAt: null, readAt: null, ...audience },
      }),
    ]);
    const page = rows.slice(0, limit);
    const ids = page
      .map((n) => notificationAlertId(n.targetPath))
      .filter((id): id is number => id !== null);
    const related = ids.length
      ? await this.db.healthAlert.findMany({
          where: { id: { in: ids }, ...alertScope },
          select: {
            id: true,
            title: true,
            body: true,
            source: true,
            severity: true,
            status: true,
            user: {
              select: { email: true, profile: { select: { name: true } } },
            },
          },
        })
      : [];
    return {
      items: page.map((n) => {
        const id = notificationAlertId(n.targetPath),
          alert = related.find((a) => a.id === id);
        const context = {
          severity: alert?.severity || null,
          alertId: alert?.id || null,
          alertStatus: alert?.status || null,
          alertSource: alert?.source || null,
        };
        return alert && admin
          ? {
              ...n,
              ...context,
              title:
                `${alert.user.profile?.name || alert.user.email}: ${n.type === "ALERT_STATUS" ? "Cập nhật xử lý" : alert.title}`.slice(
                  0,
                  200,
                ),
              body: `${alert.user.email} · ${alert.source === "ACTUAL" ? "Thực tế đã ăn" : alert.source === "PLAN" ? "Thực đơn dự kiến" : "Cân nặng"} · ${alert.severity}. ${alert.body}`,
            }
          : { ...n, ...context };
      }),
      nextCursor: rows.length > limit ? rows[limit - 1].id : null,
      unread,
    };
  }
  async read(userId: number, id: number, read: boolean) {
    const result = await this.db.notification.updateMany({
      where: { id, userId, deletedAt: null },
      data: { readAt: read ? new Date() : null },
    });
    if (!result.count) throw new NotFoundException();
    return { ok: true };
  }
  async readAll(userId: number) {
    await this.db.notification.updateMany({
      where: { userId, deletedAt: null, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }
  async remove(userId: number, id: number) {
    const result = await this.db.notification.updateMany({
      where: { id, userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (!result.count) throw new NotFoundException();
    return { ok: true };
  }
}
