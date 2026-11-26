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
  SetMetadata,
} from "@nestjs/common";
import { PrismaService } from "../services/prisma.service";
import { Admin } from "../auth";
import { FoodDto, CategoryDto } from "../dto";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

class FoodSearchDto {
  @IsOptional() @IsString() @MaxLength(150) search?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) categoryId?: number;
}

@Controller("foods")
export class FoodsController {
  constructor(private db: PrismaService) {}
  @Get() list(@Req() req: any, @Query() query: FoodSearchDto) {
    const { search, categoryId } = query;
    return this.db.food.findMany({
      where: {
        isActive: true,
        ...(req.user.role === "ADMIN"
          ? { ownerId: null }
          : { OR: [{ ownerId: null }, { ownerId: req.user.sub }] }),
        ...(search ? { name: { contains: search } } : {}),
        ...(categoryId ? { categoryId: Number(categoryId) } : {}),
      },
      include: { category: true },
      orderBy: { name: "asc" },
    });
  }
  @Get(":id") get(@Req() req: any, @Param("id", ParseIntPipe) id: number) {
    return this.db.food.findFirstOrThrow({
      where: {
        id,
        ...(req.user.role === "ADMIN"
          ? { ownerId: null }
          : { OR: [{ ownerId: null }, { ownerId: req.user.sub }] }),
      },
      include: { category: true },
    });
  }
  @Post() create(@Req() req: any, @Body() dto: FoodDto) {
    return this.db.food.create({
      data: {
        ...dto,
        ownerId: req.user.role === "ADMIN" ? null : req.user.sub,
      },
    });
  }
  @Put(":id") async update(
    @Req() req: any,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: FoodDto,
  ) {
    const food = await this.db.food.findFirstOrThrow({
      where: { id, ownerId: req.user.role === "ADMIN" ? null : req.user.sub },
    });
    return this.db.food.update({ where: { id: food.id }, data: dto });
  }
  @Delete(":id") async remove(
    @Req() req: any,
    @Param("id", ParseIntPipe) id: number,
  ) {
    const food = await this.db.food.findFirstOrThrow({
      where: { id, ownerId: req.user.role === "ADMIN" ? null : req.user.sub },
    });
    return this.db.food.update({
      where: { id: food.id },
      data: { isActive: false },
    });
  }
}
@Controller("categories")
export class CategoriesController {
  constructor(private db: PrismaService) {}
  @Get() list() {
    return this.db.foodCategory.findMany({ orderBy: { name: "asc" } });
  }
  @Admin() @Post() create(@Body() dto: CategoryDto) {
    return this.db.foodCategory.create({ data: dto });
  }
  @Admin() @Put(":id") update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: CategoryDto,
  ) {
    return this.db.foodCategory.update({ where: { id }, data: dto });
  }
  @Admin() @Delete(":id") remove(@Param("id", ParseIntPipe) id: number) {
    return this.db.foodCategory.delete({ where: { id } });
  }
}
