import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CategoryDto } from './dto/foods.dto';
import { categoryWithSubgroups } from './food-taxonomy';
@Injectable()
export class CategoriesService {
  constructor(private db: PrismaService) {}
  async list() {
    return (
      await this.db.foodCategory.findMany({
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      })
    ).map(categoryWithSubgroups);
  }
  create(dto: CategoryDto) {
    return this.db.foodCategory.create({ data: dto });
  }
  update(id: number, dto: CategoryDto) {
    return this.db.foodCategory.update({ where: { id }, data: dto });
  }
  async remove(id: number) {
    const category = await this.db.foodCategory.findUniqueOrThrow({
      where: { id },
    });
    if (category.code)
      throw new BadRequestException(
        'Đây là nhóm thực phẩm chuẩn, bạn có thể đổi tên nhưng không xóa nhóm.',
      );
    return this.db.foodCategory.delete({ where: { id } });
  }
}
