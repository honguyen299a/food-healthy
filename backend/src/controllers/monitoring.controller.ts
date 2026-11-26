import { UserOnly } from '../auth';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  NotFoundException,
} from "@nestjs/common";
import {
  AlertSeverity,
  AlertSource,
  AlertStatus,
  NotificationType,
} from "@prisma/client";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from "class-validator";
import { Type } from "class-transformer";
import { Admin } from "../auth";
import { validDate } from "../ai-contract";
import { addDays, localToday } from "../monitoring-analysis";
import { PrismaService } from "../services/prisma.service";
import { MonitoringJobsService } from "../services/monitoring-jobs.service";
import { MonitoringService } from "../services/monitoring.service";

export class PageDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) cursor?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit?: number;
}
export class AlertQueryDto extends PageDto {
  @IsOptional() @IsEnum(AlertStatus) status?: AlertStatus;
  @IsOptional() @IsEnum(AlertSeverity) severity?: AlertSeverity;
  @IsOptional() @IsEnum(AlertSource) source?: AlertSource;
  @IsOptional() @IsString() @MaxLength(60) @Matches(/^[A-Z_]+$/) type?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) userId?: number;
}
class AlertUpdateDto {
  @IsEnum(AlertStatus) status: AlertStatus;
  @IsString() @MinLength(1) @MaxLength(1000) note: string;
  @IsInt() @Min(1) revision: number;
}
export class MonitoringSettingsDto {
  @IsOptional() @IsNumber() @Min(0) @Max(500) fiberMin?: number | null;
  @IsOptional() @IsNumber() @Min(0) @Max(2000) sugarsMax?: number | null;
  @IsOptional() @IsNumber() @Min(0) @Max(100000) sodiumMax?: number | null;
  @IsOptional() @IsNumber() @Min(0.1) @Max(100) weightChangePercent?:
    number | null;
  @ValidateIf((_, v) => v !== undefined)
  @IsInt()
  @Min(7)
  @Max(90)
  weightWindowDays?: number;
  @ValidateIf((_, v) => v !== undefined)
  @IsInt()
  @Min(0)
  @Max(50)
  targetTolerancePercent?: number;
  @IsOptional() @IsString() @MaxLength(500) limitSource?: string | null;
  @ValidateIf((_, v) => v !== undefined) @IsBoolean() reminders?: boolean;
}
class ReportDto {
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) start: string;
}
class CompletedDto {
  @IsBoolean() completed: boolean;
}

@Controller("monitoring")
@UserOnly()
export class MonitoringController {
  constructor(
    private db: PrismaService,
    private jobs: MonitoringJobsService,
  ) {}
  @Get("settings") async settings(@Req() req: any) {
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
        limitSource: "",
        reminders: true,
      }
    );
  }
  @Put("settings") async save(
    @Req() req: any,
    @Body() dto: MonitoringSettingsDto,
  ) {
    const old = await this.settings(req),
      merged = { ...old, ...dto };
    if (
      ["fiberMin", "sugarsMax", "sodiumMax", "weightChangePercent"].some(
        (k) => (merged as any)[k] != null,
      ) &&
      (!merged.limitSource || merged.limitSource.trim().length < 3)
    )
      throw new BadRequestException(
        "Hãy ghi nguồn mục tiêu/hướng dẫn chuyên gia cho các giới hạn cá nhân.",
      );
    const result = await this.db.monitoringSettings.upsert({
      where: { userId: req.user.sub },
      create: { userId: req.user.sub, ...dto },
      update: dto,
    });
    await this.jobs.enqueue(req.user.sub);
    return result;
  }
  @Post("refresh") async refresh(@Req() req: any) {
    await this.jobs.enqueue(req.user.sub);
    return { queued: true };
  }
}
@Controller("alerts")
@UserOnly()
export class HealthAlertsController {
  constructor(private monitoring: MonitoringService) {}
  @Get() list(@Req() req: any, @Query() q: AlertQueryDto) {
    return this.monitoring.alerts(req.user.sub, q);
  }
  @Get(":id") get(@Req() req: any, @Param("id", ParseIntPipe) id: number) {
    return this.monitoring.alert(req.user.sub, id);
  }
}
@Admin()
@Controller("admin/alerts")
export class AdminAlertsController {
  constructor(private monitoring: MonitoringService) {}
  @Get() list(@Req() req: any, @Query() q: AlertQueryDto) {
    return this.monitoring.alerts(req.user.sub, q, true);
  }
  @Get(":id") get(@Req() req: any, @Param("id", ParseIntPipe) id: number) {
    return this.monitoring.alert(req.user.sub, id, true);
  }
  @Put(":id") update(
    @Req() req: any,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: AlertUpdateDto,
  ) {
    return this.monitoring.updateAlert(
      req.user.sub,
      id,
      dto.status,
      dto.note,
      dto.revision,
    );
  }
}
@Controller("insights")
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
        where: { userId_scope: { userId: req.user.sub, scope: "CURRENT" } },
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
  @Get("reports") async reports(@Req() req: any, @Query() q: PageDto) {
    const limit = q.limit || 20,
      rows = await this.db.nutritionWeeklyReport.findMany({
        where: {
          userId: req.user.sub,
          ...(q.cursor ? { id: { lt: q.cursor } } : {}),
        },
        orderBy: { id: "desc" },
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
  @Post("reports") async request(@Req() req: any, @Body() dto: ReportDto) {
    validDate(dto.start);
    if (addDays(dto.start, 6) >= localToday())
      throw new BadRequestException(
        "Hãy chọn 7 ngày đã kết thúc, không bao gồm hôm nay hoặc tương lai.",
      );
    await this.jobs.enqueue(req.user.sub, `REPORT:${dto.start}`);
    return { queued: true };
  }
  @Get("reports/:id") async report(
    @Req() req: any,
    @Param("id", ParseIntPipe) id: number,
  ) {
    const report = await this.db.nutritionWeeklyReport.findFirst({
      where: { id, userId: req.user.sub },
    });
    if (!report) throw new NotFoundException();
    return report;
  }
}
@Controller("logs")
@UserOnly()
export class LogCompletionController {
  constructor(
    private db: PrismaService,
    private jobs: MonitoringJobsService,
  ) {}
  @Put(":date/completeness") async complete(
    @Req() req: any,
    @Param("date") date: string,
    @Body() dto: CompletedDto,
  ) {
    const log = await this.db.foodLog.findUnique({
      where: { userId_date: { userId: req.user.sub, date: validDate(date) } },
      include: { _count: { select: { items: true } } },
    });
    if (!log || !log._count.items)
      throw new BadRequestException(
        "Hãy ghi thực phẩm trước khi xác nhận ngày đầy đủ.",
      );
    if (date >= localToday() && dto.completed)
      throw new BadRequestException(
        "Chỉ xác nhận ngày đã kết thúc để tránh đánh giá thiếu chất khi bạn còn đang ghi bữa ăn.",
      );
    await this.db.foodLog.update({
      where: { id: log.id },
      data: { completed: dto.completed },
    });
    await this.jobs.enqueue(req.user.sub);
    return { completed: dto.completed };
  }
}
