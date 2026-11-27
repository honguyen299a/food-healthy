import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service';
import { MonitoringService } from './monitoring.service';

@Injectable()
export class MonitoringJobsService implements OnModuleInit, OnModuleDestroy {
  private logger = new Logger(MonitoringJobsService.name);
  private timer?: ReturnType<typeof setInterval>;
  private working = false;
  private lastSweep = 0;
  constructor(
    private db: PrismaService,
    private monitoring: MonitoringService,
  ) {}
  async enqueue(userId: number, scope = 'CURRENT') {
    return this.db.monitoringJob.upsert({
      where: { userId_scope: { userId, scope } },
      create: { userId, scope, runAfter: new Date() },
      update: { revision: { increment: 1 }, runAfter: new Date(), attempts: 0 },
    });
  }
  async enqueueFoodUsers(foodId: number) {
    const [logs, plans] = await Promise.all([
      this.db.foodLogItem.findMany({
        where: { foodId },
        distinct: ['logId'],
        select: { log: { select: { userId: true } } },
      }),
      this.db.mealPlanItem.findMany({
        where: { foodId },
        distinct: ['planId'],
        select: { plan: { select: { userId: true } } },
      }),
    ]);
    for (const id of new Set([
      ...logs.map((x) => x.log.userId),
      ...plans.map((x) => x.plan.userId),
    ]))
      await this.enqueue(id);
  }
  onModuleInit() {
    if (process.env.MONITORING_WORKER === 'false') return;
    this.timer = setInterval(() => void this.tick(), 5000);
    this.timer.unref();
    void this.tick();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  async tick() {
    if (this.working) return;
    this.working = true;
    try {
      if (Date.now() - this.lastSweep > 15 * 60000) {
        this.lastSweep = Date.now();
        let cursor = 0;
        for (;;) {
          const users = await this.db.user.findMany({
            where: { id: { gt: cursor }, role: 'USER' },
            orderBy: { id: 'asc' },
            take: 100,
            select: { id: true },
          });
          if (!users.length) break;
          for (const user of users) await this.enqueue(user.id);
          cursor = users.at(-1)!.id;
        }
      }
      const now = new Date();
      const jobs = await this.db.monitoringJob.findMany({
        where: {
          revision: { gt: this.db.monitoringJob.fields.processedRevision },
          runAfter: { lte: now },
          OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }],
        },
        orderBy: { runAfter: 'asc' },
        take: 10,
      });
      for (const job of jobs) {
        const token = randomUUID();
        const claimed = await this.db.monitoringJob.updateMany({
          where: {
            id: job.id,
            revision: job.revision,
            OR: [{ lockedUntil: null }, { lockedUntil: { lt: new Date() } }],
          },
          data: {
            lockToken: token,
            lockedUntil: new Date(Date.now() + 120000),
          },
        });
        if (!claimed.count) continue;
        try {
          if (job.scope === 'CURRENT') await this.monitoring.refresh(job.userId);
          else if (/^REPORT:\d{4}-\d{2}-\d{2}$/.test(job.scope))
            await this.monitoring.generateReport(job.userId, job.scope.slice(7));
          await this.db.monitoringJob.updateMany({
            where: { id: job.id, lockToken: token },
            data: {
              processedRevision: job.revision,
              lockedUntil: null,
              lockToken: null,
              lastError: null,
              attempts: 0,
            },
          });
        } catch {
          this.logger.warn(`Monitoring job ${job.id} failed; retry scheduled.`);
          await this.db.monitoringJob.updateMany({
            where: { id: job.id, lockToken: token },
            data: {
              lockedUntil: null,
              lockToken: null,
              attempts: { increment: 1 },
              lastError: 'Phân tích tạm thời chưa hoàn tất; hệ thống sẽ tự thử lại.',
              runAfter: new Date(
                Date.now() + Math.min(300000, 5000 * 2 ** Math.min(job.attempts, 6)),
              ),
            },
          });
        }
      }
    } catch {
      this.logger.warn('Monitoring worker temporarily unavailable.');
    } finally {
      this.working = false;
    }
  }
}
