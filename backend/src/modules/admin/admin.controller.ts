import {
  BadRequestException,
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
import { Admin } from '../../common/decorators/access.decorators';
import { PrismaService } from '../../database/prisma.service';
import { searchFoodNames } from '../foods/food-taxonomy';
import { MonitoringJobsService } from '../monitoring/monitoring-jobs.service';
import { AdminHealthService } from './admin-health.service';
import { FoodsQueryDto, UsersQueryDto, VisibilityDto } from './dto/admin.dto';

@Admin()
@Controller('admin')
export class AdminController {
  constructor(
    private db: PrismaService,
    private health: AdminHealthService,
    private jobs: MonitoringJobsService,
  ) {}
  @Get('dashboard') dashboard(@Req() req: any) {
    return this.health.dashboard(req.user.sub);
  }
  @Get('stats') async stats() {
    const [users, foods, categories, plans, logs] = await Promise.all([
      this.db.user.count({ where: { role: 'USER' } }),
      this.db.food.count({ where: { ownerId: null } }),
      this.db.foodCategory.count(),
      this.db.mealPlan.count({ where: { user: { role: 'USER' } } }),
      this.db.foodLog.count({ where: { user: { role: 'USER' } } }),
    ]);
    return { users, foods, categories, plans, logs };
  }
  @Get('users') users(@Req() req: any, @Query() q: UsersQueryDto) {
    return this.health.users(req.user.sub, q);
  }
  @Get('users/:id/health') detail(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.health.detail(req.user.sub, id);
  }
  @Post('users/:id/refresh') async refresh(@Param('id', ParseIntPipe) id: number) {
    await this.db.user.findFirstOrThrow({
      where: { id, role: 'USER' },
      select: { id: true },
    });
    await this.jobs.enqueue(id);
    return { queued: true };
  }
  @Get('foods') foods(@Query() q: FoodsQueryDto) {
    return this.db.food.findMany({
      where: {
        ownerId: null,
        ...(q.status === 'ACTIVE'
          ? { isActive: true }
          : q.status === 'HIDDEN'
            ? { isActive: false }
            : {}),
        ...(q.search
          ? {
              OR: [{ name: { contains: q.search } }, { name: { in: searchFoodNames(q.search) } }],
            }
          : {}),
        ...(q.subgroup ? { subgroup: q.subgroup } : {}),
        ...(q.categoryId ? { categoryId: q.categoryId } : {}),
      },
      include: { category: true },
      orderBy: { name: 'asc' },
    });
  }
  @Put('foods/:id/visibility') async visibility(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: VisibilityDto,
  ) {
    await this.db.food.findFirstOrThrow({ where: { id, ownerId: null } });
    return this.db.food.update({
      where: { id },
      data: { isActive: dto.isActive },
    });
  }
  @Delete('users/:id') async remove(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    if (req.user.sub === id) throw new BadRequestException('Không thể xóa chính mình');
    await this.db.user.findFirstOrThrow({ where: { id, role: 'USER' } });
    await this.db.$transaction(async (db) => {
      await db.foodLog.deleteMany({ where: { userId: id } });
      await db.mealPlan.deleteMany({ where: { userId: id } });
      await db.user.delete({ where: { id } });
    });
    return { ok: true };
  }
}
