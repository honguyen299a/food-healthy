import { UserOnly } from "../auth";
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../services/prisma.service";
import { ItemDto, PlanItemsDto, WeightDto } from "../dto";
import { NutritionService } from "../services/nutrition.service";
import { nutrition, sum } from "../nutrition";
import { RecommendationSafetyService } from "../services/recommendation-safety.service";
import { analyzePlan } from "../plan-analysis";
import { aggregateNutrition } from "../monitoring-analysis";
import { validDate } from "../ai-contract";
import { assertFoodsAccessible } from "../food-access";
import { UserChartsService } from "../services/user-charts.service";
import { ChartPeriodDto } from "../chart-period";

const day = validDate;
const totals = (items: any[]) => aggregateNutrition(items);

@Controller("plans")
@UserOnly()
export class MealPlansController {
  constructor(
    private db: PrismaService,
    private nutrition: NutritionService,
    private safety: RecommendationSafetyService,
  ) {}
  @Get("week") async week(@Req() req: any, @Query("start") start: string) {
    const first = day(start),
      last = new Date(first);
    last.setUTCDate(last.getUTCDate() + 7);
    const [plans, user, target] = await Promise.all([
      this.db.mealPlan.findMany({
        where: { userId: req.user.sub, date: { gte: first, lt: last } },
        include: { items: { include: { food: true } } },
        orderBy: { date: "asc" },
      }),
      this.db.user.findUniqueOrThrow({
        where: { id: req.user.sub },
        include: { profile: true },
      }),
      this.nutrition.target(req.user.sub),
    ]);
    return plans.map((p) => {
      const planTotals = totals(p.items);
      return {
        date: p.date,
        items: p.items,
        totals: planTotals,
        analysis: analyzePlan(
          p.items,
          planTotals,
          target,
          user.profile,
          this.safety,
        ),
      };
    });
  }
  @Get() async get(@Req() req: any, @Query("date") date: string) {
    const [plan, user, target] = await Promise.all([
      this.db.mealPlan.findUnique({
        where: { userId_date: { userId: req.user.sub, date: day(date) } },
        include: { items: { include: { food: true } } },
      }),
      this.db.user.findUniqueOrThrow({
        where: { id: req.user.sub },
        select: { profile: true },
      }),
      this.nutrition.target(req.user.sub),
    ]);
    const items = plan?.items || [],
      planTotals = totals(items);
    return {
      date,
      items,
      totals: planTotals,
      target,
      analysis: analyzePlan(
        items,
        planTotals,
        target,
        user.profile,
        this.safety,
      ),
    };
  }
  @Post(":date/items") async add(
    @Req() req: any,
    @Param("date") date: string,
    @Body() dto: ItemDto,
  ) {
    await assertFoodsAccessible(this.db, req.user.sub, [dto.foodId]);
    const plan = await this.db.mealPlan.upsert({
      where: { userId_date: { userId: req.user.sub, date: day(date) } },
      create: { userId: req.user.sub, date: day(date) },
      update: {},
    });
    return this.db.mealPlanItem.create({
      data: { ...dto, planId: plan.id },
      include: { food: true },
    });
  }
  @Put(":date/items") async replace(
    @Req() req: any,
    @Param("date") date: string,
    @Body() dto: PlanItemsDto,
  ) {
    await assertFoodsAccessible(
      this.db,
      req.user.sub,
      dto.items.map((i) => i.foodId),
    );
    const dateValue = day(date);
    await this.db.$transaction(async (db) => {
      const plan = await db.mealPlan.upsert({
        where: { userId_date: { userId: req.user.sub, date: dateValue } },
        create: { userId: req.user.sub, date: dateValue },
        update: {},
      });
      await db.mealPlanItem.deleteMany({ where: { planId: plan.id } });
      if (dto.items.length)
        await db.mealPlanItem.createMany({
          data: dto.items.map((item) => ({ ...item, planId: plan.id })),
        });
    });
    return this.get(req, date);
  }
  @Put("items/:id") async update(
    @Req() req: any,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: ItemDto,
  ) {
    const item = await this.db.mealPlanItem.findFirst({
      where: { id, plan: { userId: req.user.sub } },
    });
    if (!item) throw new NotFoundException();
    await assertFoodsAccessible(
      this.db,
      req.user.sub,
      [dto.foodId],
      dto.foodId === item.foodId,
    );
    return this.db.mealPlanItem.update({ where: { id }, data: dto });
  }
  @Delete("items/:id") async remove(
    @Req() req: any,
    @Param("id", ParseIntPipe) id: number,
  ) {
    const result = await this.db.mealPlanItem.deleteMany({
      where: { id, plan: { userId: req.user.sub } },
    });
    if (!result.count) throw new NotFoundException();
    return { ok: true };
  }
}
@Controller("logs")
@UserOnly()
export class FoodLogsController {
  constructor(private db: PrismaService) {}
  @Get() async get(@Req() req: any, @Query("date") date: string) {
    const log = await this.db.foodLog.findUnique({
      where: { userId_date: { userId: req.user.sub, date: day(date) } },
      include: { items: { include: { food: true } } },
    });
    return {
      date,
      completed: log?.completed || false,
      items: log?.items || [],
      totals: totals(log?.items || []),
    };
  }
  @Post(":date/items") async add(
    @Req() req: any,
    @Param("date") date: string,
    @Body() dto: ItemDto,
  ) {
    await assertFoodsAccessible(this.db, req.user.sub, [dto.foodId]);
    return this.db.$transaction(async (db) => {
      const log = await db.foodLog.upsert({
        where: { userId_date: { userId: req.user.sub, date: day(date) } },
        create: { userId: req.user.sub, date: day(date) },
        update: { completed: false },
      });
      return db.foodLogItem.create({
        data: { ...dto, logId: log.id },
        include: { food: true },
      });
    });
  }
  @Put("items/:id") async update(
    @Req() req: any,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: ItemDto,
  ) {
    const item = await this.db.foodLogItem.findFirst({
      where: { id, log: { userId: req.user.sub } },
    });
    if (!item) throw new NotFoundException();
    await assertFoodsAccessible(
      this.db,
      req.user.sub,
      [dto.foodId],
      dto.foodId === item.foodId,
    );
    return this.db.$transaction(async (db) => {
      await db.foodLog.update({
        where: { id: item.logId },
        data: { completed: false },
      });
      return db.foodLogItem.update({ where: { id }, data: dto });
    });
  }
  @Delete("items/:id") async remove(
    @Req() req: any,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.db.$transaction(async (db) => {
      const item = await db.foodLogItem.findFirst({
        where: { id, log: { userId: req.user.sub } },
      });
      if (!item) throw new NotFoundException();
      await db.foodLog.update({
        where: { id: item.logId },
        data: { completed: false },
      });
      await db.foodLogItem.delete({ where: { id } });
      return { ok: true };
    });
  }
}
@Controller("weights")
@UserOnly()
export class WeightLogsController {
  constructor(private db: PrismaService) {}
  @Get() list(@Req() req: any) {
    return this.db.weightLog.findMany({
      where: { userId: req.user.sub },
      orderBy: { date: "asc" },
    });
  }
  @Post() save(@Req() req: any, @Body() dto: WeightDto) {
    return this.db.weightLog.upsert({
      where: { userId_date: { userId: req.user.sub, date: day(dto.date) } },
      create: {
        userId: req.user.sub,
        date: day(dto.date),
        weightKg: dto.weightKg,
      },
      update: { weightKg: dto.weightKg },
    });
  }
  @Delete(":id") async remove(
    @Req() req: any,
    @Param("id", ParseIntPipe) id: number,
  ) {
    const result = await this.db.weightLog.deleteMany({
      where: { id, userId: req.user.sub },
    });
    if (!result.count) throw new NotFoundException();
    return { ok: true };
  }
}
@Controller("dashboard")
@UserOnly()
export class DashboardController {
  constructor(
    private db: PrismaService,
    private nutrition: NutritionService,
    private charts: UserChartsService,
  ) {}
  @Get("charts") chartsForPeriod(@Req() req: any, @Query() q: ChartPeriodDto) {
    return this.charts.get(req.user.sub, q);
  }
  @Get() async get(@Req() req: any, @Query("date") date: string) {
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
        orderBy: { date: "asc" },
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
      logs: log?.items || [],
      weights,
      targetWeightKg: user.profile?.targetWeightKg
        ? Number(user.profile.targetWeightKg)
        : null,
    };
  }
}
