import { NotFoundException } from '@nestjs/common';
export async function assertFoodsAccessible(
  db: any,
  userId: number,
  ids: number[],
  allowHidden = false,
) {
  const unique = [...new Set(ids)];
  if (!unique.length) return;
  const count = await db.food.count({
    where: {
      id: { in: unique },
      OR: [{ ownerId: null }, { ownerId: userId }],
      ...(allowHidden ? {} : { isActive: true }),
    },
  });
  if (count !== unique.length)
    throw new NotFoundException(
      'Thực phẩm không tồn tại hoặc không thuộc thư viện có thể sử dụng.',
    );
}
