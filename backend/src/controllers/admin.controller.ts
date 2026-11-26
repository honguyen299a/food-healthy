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
} from "@nestjs/common";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { Role } from "@prisma/client";
import { PrismaService } from "../services/prisma.service";
import { Admin } from "../auth";
import { AdminHealthService } from "../services/admin-health.service";
import { MonitoringJobsService } from "../services/monitoring-jobs.service";
import { healthGroups } from "../admin-health";

class RoleDto {
  @IsEnum(Role) role: Role;
}
class VisibilityDto {
  @IsBoolean() isActive: boolean;
}
class UsersQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit?: number;
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsIn(healthGroups) group?: string;
}
class FoodsQueryDto {
  @IsOptional() @IsIn(["ALL", "ACTIVE", "HIDDEN"]) status?: string;
  @IsOptional() @IsString() @MaxLength(150) search?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) categoryId?: number;
}
@Admin()
@Controller("admin")
export class AdminController {
  constructor(
    private db: PrismaService,
    private health: AdminHealthService,
    private jobs: MonitoringJobsService,
  ) {}
  @Get("dashboard") dashboard(@Req() req: any) {
    return this.health.dashboard(req.user.sub);
  }
  @Get("stats") async stats() {
    const [users, foods, categories, plans, logs] = await Promise.all([
      this.db.user.count({ where: { role: "USER" } }),
      this.db.food.count({ where: { ownerId: null } }),
      this.db.foodCategory.count(),
      this.db.mealPlan.count({ where: { user: { role: "USER" } } }),
      this.db.foodLog.count({ where: { user: { role: "USER" } } }),
    ]);
    return { users, foods, categories, plans, logs };
  }
  @Get("users") users(@Req() req: any, @Query() q: UsersQueryDto) {
    return this.health.users(req.user.sub, q);
  }
  @Get("users/:id/health") detail(
    @Req() req: any,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.health.detail(req.user.sub, id);
  }
  @Post("users/:id/refresh") async refresh(
    @Param("id", ParseIntPipe) id: number,
  ) {
    await this.db.user.findFirstOrThrow({
      where: { id, role: "USER" },
      select: { id: true },
    });
    await this.jobs.enqueue(id);
    return { queued: true };
  }
  @Get("foods") foods(@Query() q: FoodsQueryDto) {
    return this.db.food.findMany({
      where: {
        ownerId: null,
        ...(q.status === "ACTIVE"
          ? { isActive: true }
          : q.status === "HIDDEN"
            ? { isActive: false }
            : {}),
        ...(q.search ? { name: { contains: q.search } } : {}),
        ...(q.categoryId ? { categoryId: q.categoryId } : {}),
      },
      include: { category: true },
      orderBy: { name: "asc" },
    });
  }
  @Put("foods/:id/visibility") async visibility(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: VisibilityDto,
  ) {
    await this.db.food.findFirstOrThrow({ where: { id, ownerId: null } });
    return this.db.food.update({
      where: { id },
      data: { isActive: dto.isActive },
    });
  }
  @Put("users/:id/role") role(
    @Req() req: any,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: RoleDto,
  ) {
    if (req.user.sub === id)
      throw new BadRequestException(
        "Không thể tự đổi vai trò tài khoản đang đăng nhập.",
      );
    return this.db.user.update({
      where: { id },
      data: dto,
      select: { id: true, email: true, role: true },
    });
  }
  @Delete("users/:id") async remove(
    @Req() req: any,
    @Param("id", ParseIntPipe) id: number,
  ) {
    if (req.user.sub === id)
      throw new BadRequestException("Không thể xóa chính mình");
    await this.db.user.findFirstOrThrow({ where: { id, role: "USER" } });
    await this.db.$transaction(async (db) => {
      await db.foodLog.deleteMany({ where: { userId: id } });
      await db.mealPlan.deleteMany({ where: { userId: id } });
      await db.user.delete({ where: { id } });
    });
    return { ok: true };
  }
}
