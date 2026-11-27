import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { iso, localToday } from '../../common/utils/date';
import { PrismaService } from '../../database/prisma.service';
import { assertFoodsAccessible } from '../foods/food-access';
import { ItemDto, PlanItemsDto, PlanItemUpdateDto } from './dto/meal-records.dto';
import { nutritionSnapshot, withConsumedPlanFood, withRecordedFood } from './recorded-nutrition';

@Injectable()
export class MealRecordsService {
  constructor(private db: PrismaService) {}
  // A per-user row lock serializes mutations across Plans and Logs, including
  // duplicate clicks and concurrent edits. The unique FK is a second invariant.
  private async transaction<T>(
    userId: number,
    action: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.db.$transaction(
          async (tx) => {
            const users = await tx.$queryRaw<{ id: number }[]>(
              Prisma.sql`SELECT id FROM users WHERE id = ${userId} AND role = 'USER' FOR UPDATE`,
            );
            if (!users.length) throw new NotFoundException();
            return action(tx);
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
            maxWait: 10000,
            timeout: 15000,
          },
        );
      } catch (e) {
        if (attempt < 2 && e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2034')
          continue;
        throw e;
      }
    }
  }
  private async food(
    tx: Prisma.TransactionClient,
    userId: number,
    foodId: number,
    allowHidden = false,
  ) {
    await assertFoodsAccessible(tx, userId, [foodId], allowHidden);
    return tx.food.findUniqueOrThrow({ where: { id: foodId } });
  }
  addPlan(userId: number, date: Date, dto: ItemDto) {
    return this.transaction(userId, async (tx) => {
      await this.food(tx, userId, dto.foodId);
      const plan = await tx.mealPlan.upsert({
        where: { userId_date: { userId, date } },
        create: { userId, date },
        update: {},
      });
      return tx.mealPlanItem.create({
        data: { ...dto, planId: plan.id },
        include: { food: true },
      });
    });
  }
  replacePlan(userId: number, date: Date, dto: PlanItemsDto) {
    return this.transaction(userId, async (tx) => {
      await assertFoodsAccessible(
        tx,
        userId,
        dto.items.map((i) => i.foodId),
      );
      const plan = await tx.mealPlan.upsert({
        where: { userId_date: { userId, date } },
        create: { userId, date },
        update: {},
      });
      const completed = await tx.mealPlanItem.count({
        where: { planId: plan.id, status: 'COMPLETED' },
      });
      if (completed)
        throw new ConflictException(
          'Ngày này đã có món được ghi vào nhật ký. Hãy sửa từng món để giữ đồng bộ dữ liệu thực tế.',
        );
      await tx.mealPlanItem.deleteMany({ where: { planId: plan.id } });
      if (dto.items.length)
        await tx.mealPlanItem.createMany({
          data: dto.items.map((i) => ({ ...i, planId: plan.id })),
        });
      return { ok: true };
    });
  }
  updatePlan(userId: number, id: number, dto: PlanItemUpdateDto) {
    return this.transaction(userId, async (tx) => {
      const item = await tx.mealPlanItem.findFirst({
        where: { id, plan: { userId } },
        include: { plan: true, logItem: true, food: true },
      });
      if (!item) throw new NotFoundException();
      const status = dto.status ?? item.status;
      const same =
        item.foodId === dto.foodId && item.meal === dto.meal && Number(item.grams) === dto.grams;
      if (status === 'COMPLETED' && item.status === 'COMPLETED' && same && item.logItem)
        return withConsumedPlanFood(item);
      if (dto.expectedRevision !== undefined && dto.expectedRevision !== item.revision)
        throw new ConflictException(
          'Món này đã được cập nhật. Hãy tải lại trước khi thao tác tiếp.',
        );
      const food = await this.food(tx, userId, dto.foodId, dto.foodId === item.foodId);
      const values = { foodId: dto.foodId, meal: dto.meal, grams: dto.grams };
      if (status === 'COMPLETED') {
        const log = await tx.foodLog.upsert({
          where: { userId_date: { userId, date: item.plan.date } },
          create: { userId, date: item.plan.date },
          update: { completed: false },
        });
        const snapshot =
          item.logItem && item.logItem.foodId === dto.foodId && item.logItem.caloriesPer100g != null
            ? {}
            : nutritionSnapshot(food);
        await tx.foodLogItem.upsert({
          where: { planItemId: id },
          create: {
            ...values,
            ...nutritionSnapshot(food),
            logId: log.id,
            planItemId: id,
            fromPlan: true,
          },
          update: { ...values, ...snapshot },
        });
      } else if (item.logItem) {
        await tx.foodLog.update({
          where: { id: item.logItem.logId },
          data: { completed: false },
        });
        await tx.foodLogItem.delete({ where: { id: item.logItem.id } });
      }
      return withConsumedPlanFood(
        await tx.mealPlanItem.update({
          where: { id },
          data: { ...values, status, revision: { increment: 1 } },
          include: { food: true, logItem: true },
        }),
      );
    });
  }
  removePlan(userId: number, id: number) {
    return this.transaction(userId, async (tx) => {
      const item = await tx.mealPlanItem.findFirst({
        where: { id, plan: { userId } },
        select: { id: true },
      });
      if (!item) throw new NotFoundException();
      // Consumed food stays part of real history; FK SetNull detaches the plan.
      await tx.mealPlanItem.delete({ where: { id } });
      return { ok: true };
    });
  }
  addLog(userId: number, date: Date, dto: ItemDto) {
    return this.transaction(userId, async (tx) => {
      const food = await this.food(tx, userId, dto.foodId);
      const log = await tx.foodLog.upsert({
        where: { userId_date: { userId, date } },
        create: { userId, date },
        update: { completed: false },
      });
      return withRecordedFood(
        await tx.foodLogItem.create({
          data: { ...dto, ...nutritionSnapshot(food), logId: log.id },
          include: { food: true },
        }),
      );
    });
  }
  setLogCompleteness(userId: number, date: Date, completed: boolean) {
    return this.transaction(userId, async (tx) => {
      const log = await tx.foodLog.findUnique({
        where: { userId_date: { userId, date } },
        include: { _count: { select: { items: true } } },
      });
      if (!log || !log._count.items)
        throw new BadRequestException('Hãy ghi thực phẩm trước khi xác nhận ngày đầy đủ.');
      if (iso(date) >= localToday() && completed)
        throw new BadRequestException(
          'Chỉ xác nhận ngày đã kết thúc để tránh đánh giá thiếu chất khi bạn còn đang ghi bữa ăn.',
        );
      await tx.foodLog.update({ where: { id: log.id }, data: { completed } });
      return { completed };
    });
  }
  updateLog(userId: number, id: number, dto: ItemDto) {
    return this.transaction(userId, async (tx) => {
      const item = await tx.foodLogItem.findFirst({
        where: { id, log: { userId } },
        include: { log: true, planItem: { include: { plan: true } } },
      });
      if (!item) throw new NotFoundException();
      const food = await this.food(tx, userId, dto.foodId, dto.foodId === item.foodId);
      if (
        item.planItem &&
        (item.planItem.plan.userId !== userId || +item.planItem.plan.date !== +item.log.date)
      )
        throw new ConflictException('Liên kết kế hoạch không hợp lệ.');
      if (item.planItemId)
        await tx.mealPlanItem.update({
          where: { id: item.planItemId },
          data: { ...dto, status: 'COMPLETED', revision: { increment: 1 } },
        });
      await tx.foodLog.update({
        where: { id: item.logId },
        data: { completed: false },
      });
      const snapshot =
        item.foodId === dto.foodId && item.caloriesPer100g != null ? {} : nutritionSnapshot(food);
      return withRecordedFood(
        await tx.foodLogItem.update({
          where: { id },
          data: { ...dto, ...snapshot },
          include: { food: true },
        }),
      );
    });
  }
  removeLog(userId: number, id: number) {
    return this.transaction(userId, async (tx) => {
      const item = await tx.foodLogItem.findFirst({
        where: { id, log: { userId } },
        include: { planItem: { include: { plan: true } } },
      });
      if (!item) throw new NotFoundException();
      if (item.planItem && item.planItem.plan.userId !== userId)
        throw new ConflictException('Liên kết kế hoạch không hợp lệ.');
      if (item.planItemId)
        await tx.mealPlanItem.update({
          where: { id: item.planItemId },
          data: { status: 'PENDING', revision: { increment: 1 } },
        });
      await tx.foodLog.update({
        where: { id: item.logId },
        data: { completed: false },
      });
      await tx.foodLogItem.delete({ where: { id } });
      return { ok: true };
    });
  }
}
