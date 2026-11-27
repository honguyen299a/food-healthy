import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { FoodSearchDto } from './dto/food-search.dto';
import { FoodDto } from './dto/foods.dto';
import { categoryWithSubgroups, searchFoodNames } from './food-taxonomy';
@Injectable()
export class FoodsService {
  constructor(private db: PrismaService) {}
  private async validateSubgroup(dto: FoodDto) {
    if (!dto.subgroup) return;
    const group = await this.db.foodCategory.findUniqueOrThrow({
      where: { id: dto.categoryId },
    });
    if (!categoryWithSubgroups(group).subgroups.includes(dto.subgroup))
      throw new BadRequestException('Loại thực phẩm không thuộc nhóm đã chọn.');
  }
  list(req: any, query: FoodSearchDto) {
    const { search, categoryId, subgroup } = query;
    return this.db.food.findMany({
      where: {
        isActive: true,
        ...(req.user.role === 'ADMIN'
          ? { ownerId: null }
          : { OR: [{ ownerId: null }, { ownerId: req.user.sub }] }),
        ...(search
          ? {
              AND: [
                {
                  OR: [{ name: { contains: search } }, { name: { in: searchFoodNames(search) } }],
                },
              ],
            }
          : {}),
        ...(categoryId ? { categoryId: Number(categoryId) } : {}),
        ...(subgroup ? { subgroup } : {}),
      },
      include: { category: true },
      orderBy: { name: 'asc' },
    });
  }
  catalog() {
    // Compatibility for earlier clients; unverified catalog entries were removed.
    return { pending: [] };
  }
  get(req: any, id: number) {
    return this.db.food.findFirstOrThrow({
      where: {
        id,
        ...(req.user.role === 'ADMIN'
          ? { ownerId: null }
          : { OR: [{ ownerId: null }, { ownerId: req.user.sub }] }),
      },
      include: { category: true },
    });
  }
  async create(req: any, dto: FoodDto) {
    await this.validateSubgroup(dto);
    const ownerId = req.user.role === 'ADMIN' ? null : req.user.sub;
    if (
      await this.db.food.findUnique({
        where: {
          ownerScope_name: { ownerScope: ownerId ?? 0, name: dto.name },
        },
      })
    )
      throw new ConflictException(
        'Bạn đã có thực phẩm tên này. Hãy sửa thực phẩm cũ hoặc chọn tên khác.',
      );
    return this.db.food.create({
      data: {
        ...dto,
        nutritionEdited: true,
        ownerId,
      },
    });
  }
  async customize(req: any, id: number, dto: FoodDto) {
    const original = await this.db.food.findFirstOrThrow({
      where: { id, ownerId: null, isActive: true },
    });
    await this.validateSubgroup(dto);
    const name = dto.name;
    if (
      await this.db.food.findUnique({
        where: { ownerScope_name: { ownerScope: req.user.sub, name } },
        select: { id: true },
      })
    )
      throw new ConflictException(
        'Bạn đã có bản riêng với tên này. Hãy sửa bản riêng hoặc đổi tên để tạo thêm.',
      );
    return this.db.food.create({
      data: {
        ...dto,
        name,
        ownerId: req.user.sub,
        nutritionEdited: true,
        nutritionSource: original.nutritionSource,
        nutritionSourceUrl: original.nutritionSourceUrl,
        foodDescription: original.foodDescription,
        imageUrl: original.imageUrl,
        imageSourceUrl: original.imageSourceUrl,
        imageCredit: original.imageCredit,
        imageLicense: original.imageLicense,
        imageLicenseUrl: original.imageLicenseUrl,
        aliases: original.aliases ?? undefined,
        subgroup:
          dto.subgroup !== undefined
            ? dto.subgroup
            : dto.categoryId === original.categoryId
              ? original.subgroup
              : null,
        canSuggest: original.canSuggest,
      },
    });
  }
  async update(req: any, id: number, dto: FoodDto) {
    const food = await this.db.food.findFirstOrThrow({
      where: { id, ownerId: req.user.role === 'ADMIN' ? null : req.user.sub },
    });
    await this.validateSubgroup(dto);
    const updated = await this.db.food.update({
      where: { id: food.id },
      data: {
        ...dto,
        ...(dto.subgroup === undefined && dto.categoryId !== food.categoryId
          ? { subgroup: null }
          : {}),
        nutritionEdited: true,
      },
    });
    return updated;
  }
  async remove(req: any, id: number) {
    const food = await this.db.food.findFirstOrThrow({
      where: { id, ownerId: req.user.role === 'ADMIN' ? null : req.user.sub },
    });
    return this.db.food.update({
      where: { id: food.id },
      data: { isActive: false },
    });
  }
}
