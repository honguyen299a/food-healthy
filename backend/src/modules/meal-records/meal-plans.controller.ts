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
} from '@nestjs/common';
import { UserOnly } from '../../common/decorators/access.decorators';
import { PrismaService } from '../../database/prisma.service';
import { NutritionService } from '../nutrition/nutrition.service';
import { RecommendationSafetyService } from '../recommendations/recommendation-safety.service';
import { ItemDto, PlanItemsDto, PlanItemUpdateDto } from './dto/meal-records.dto';
import { MealRecordsService } from './meal-records.service';
import { analyzePlan } from './plan-analysis';
import { day, totals } from './record-utils';
import { planProgress, withConsumedPlanFood } from './recorded-nutrition';

@Controller('plans')
@UserOnly()
export class MealPlansController {
  constructor(
    private db: PrismaService,
    private nutrition: NutritionService,
    private safety: RecommendationSafetyService,
    private records: MealRecordsService,
  ) {}
  @Get('week') async week(@Req() req: any, @Query('start') start: string) {
    const first = day(start),
      last = new Date(first);
    last.setUTCDate(last.getUTCDate() + 7);
    const [plans, user, target] = await Promise.all([
      this.db.mealPlan.findMany({
        where: { userId: req.user.sub, date: { gte: first, lt: last } },
        include: { items: { include: { food: true, logItem: true } } },
        orderBy: { date: 'asc' },
      }),
      this.db.user.findUniqueOrThrow({
        where: { id: req.user.sub },
        include: { profile: true },
      }),
      this.nutrition.target(req.user.sub),
    ]);
    return plans.map((p) => {
      const items = p.items.map(withConsumedPlanFood);
      const planTotals = totals(items);
      return {
        date: p.date,
        items,
        progress: planProgress(items),
        totals: planTotals,
        analysis: analyzePlan(items, planTotals, target, user.profile, this.safety),
      };
    });
  }
  @Get() async get(@Req() req: any, @Query('date') date: string) {
    const [plan, user, target] = await Promise.all([
      this.db.mealPlan.findUnique({
        where: { userId_date: { userId: req.user.sub, date: day(date) } },
        include: { items: { include: { food: true, logItem: true } } },
      }),
      this.db.user.findUniqueOrThrow({
        where: { id: req.user.sub },
        select: { profile: true },
      }),
      this.nutrition.target(req.user.sub),
    ]);
    const items = (plan?.items || []).map(withConsumedPlanFood),
      planTotals = totals(items);
    return {
      date,
      items,
      progress: planProgress(items),
      totals: planTotals,
      target,
      analysis: analyzePlan(items, planTotals, target, user.profile, this.safety),
    };
  }
  @Post(':date/items') add(@Req() req: any, @Param('date') date: string, @Body() dto: ItemDto) {
    return this.records.addPlan(req.user.sub, day(date), dto);
  }
  @Put(':date/items') async replace(
    @Req() req: any,
    @Param('date') date: string,
    @Body() dto: PlanItemsDto,
  ) {
    await this.records.replacePlan(req.user.sub, day(date), dto);
    return this.get(req, date);
  }
  @Put('items/:id') update(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PlanItemUpdateDto,
  ) {
    return this.records.updatePlan(req.user.sub, id, dto);
  }
  @Delete('items/:id') remove(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.records.removePlan(req.user.sub, id);
  }
}
