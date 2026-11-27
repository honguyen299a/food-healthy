import { BadRequestException, Body, Controller, Get, Post, Put, Req } from '@nestjs/common';
import { UserOnly } from '../../common/decorators/access.decorators';
import { PrismaService } from '../../database/prisma.service';
import { MonitoringSettingsDto } from './dto/monitoring.dto';
import { MonitoringJobsService } from './monitoring-jobs.service';

@Controller('monitoring')
@UserOnly()
export class MonitoringController {
  constructor(
    private db: PrismaService,
    private jobs: MonitoringJobsService,
  ) {}
  @Get('settings') async settings(@Req() req: any) {
    return (
      (await this.db.monitoringSettings.findUnique({
        where: { userId: req.user.sub },
      })) || {
        fiberMin: null,
        sugarsMax: null,
        sodiumMax: null,
        weightChangePercent: null,
        weightWindowDays: 14,
        targetTolerancePercent: 10,
        limitSource: '',
        reminders: true,
      }
    );
  }
  @Put('settings') async save(@Req() req: any, @Body() dto: MonitoringSettingsDto) {
    const old = await this.settings(req),
      merged = { ...old, ...dto };
    if (
      ['fiberMin', 'sugarsMax', 'sodiumMax', 'weightChangePercent'].some(
        (k) => (merged as any)[k] != null,
      ) &&
      (!merged.limitSource || merged.limitSource.trim().length < 3)
    )
      throw new BadRequestException(
        'Hãy ghi nguồn mục tiêu/hướng dẫn chuyên gia cho các giới hạn cá nhân.',
      );
    const result = await this.db.monitoringSettings.upsert({
      where: { userId: req.user.sub },
      create: { userId: req.user.sub, ...dto },
      update: dto,
    });
    await this.jobs.enqueue(req.user.sub);
    return result;
  }
  @Post('refresh') async refresh(@Req() req: any) {
    await this.jobs.enqueue(req.user.sub);
    return { queued: true };
  }
}
