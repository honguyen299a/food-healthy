import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { UserOnly } from '../../common/decorators/access.decorators';
import { PageDto } from '../../common/dto/pagination.dto';
import { addDays, localToday, validDate } from '../../common/utils/date';
import { PrismaService } from '../../database/prisma.service';
import { ReportDto } from './dto/monitoring.dto';
import { MonitoringJobsService } from './monitoring-jobs.service';

@Controller('insights')
@UserOnly()
export class InsightsController {
  constructor(
    private db: PrismaService,
    private jobs: MonitoringJobsService,
  ) {}
  @Get() async get(@Req() req: any) {
    const [snapshot, job] = await Promise.all([
      this.db.monitoringSummary.findUnique({ where: { userId: req.user.sub } }),
      this.db.monitoringJob.findUnique({
        where: { userId_scope: { userId: req.user.sub, scope: 'CURRENT' } },
      }),
    ]);
    if (!snapshot && !job) await this.jobs.enqueue(req.user.sub);
    return {
      summary: snapshot?.payload || null,
      updatedAt: snapshot?.updatedAt || null,
      processing: !snapshot || (!!job && job.revision > job.processedRevision),
      error: job?.lastError || null,
    };
  }
  @Get('reports') async reports(@Req() req: any, @Query() q: PageDto) {
    const limit = q.limit || 20,
      rows = await this.db.nutritionWeeklyReport.findMany({
        where: {
          userId: req.user.sub,
          ...(q.cursor ? { id: { lt: q.cursor } } : {}),
        },
        orderBy: { id: 'desc' },
        take: limit + 1,
        select: {
          id: true,
          weekStart: true,
          weekEnd: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    return {
      items: rows.slice(0, limit),
      nextCursor: rows.length > limit ? rows[limit - 1].id : null,
    };
  }
  @Post('reports') async request(@Req() req: any, @Body() dto: ReportDto) {
    validDate(dto.start);
    if (addDays(dto.start, 6) >= localToday())
      throw new BadRequestException(
        'Hãy chọn 7 ngày đã kết thúc, không bao gồm hôm nay hoặc tương lai.',
      );
    await this.jobs.enqueue(req.user.sub, `REPORT:${dto.start}`);
    return { queued: true };
  }
  @Get('reports/:id') async report(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const report = await this.db.nutritionWeeklyReport.findFirst({
      where: { id, userId: req.user.sub },
    });
    if (!report) throw new NotFoundException();
    return report;
  }
}
