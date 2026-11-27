import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { day } from '../meal-records/record-utils';
import { WeightDto } from './dto/weights.dto';
@Injectable()
export class WeightsService {
  constructor(private db: PrismaService) {}
  list(req: any) {
    return this.db.weightLog.findMany({
      where: { userId: req.user.sub },
      orderBy: { date: 'asc' },
    });
  }
  save(req: any, dto: WeightDto) {
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
  async remove(req: any, id: number) {
    const result = await this.db.weightLog.deleteMany({
      where: { id, userId: req.user.sub },
    });
    if (!result.count) throw new NotFoundException();
    return { ok: true };
  }
}
