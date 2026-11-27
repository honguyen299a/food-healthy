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
import { ItemDto } from './dto/meal-records.dto';
import { MealRecordsService } from './meal-records.service';
import { day, totals } from './record-utils';
import { withRecordedFood } from './recorded-nutrition';

@Controller('logs')
@UserOnly()
export class FoodLogsController {
  constructor(
    private db: PrismaService,
    private records: MealRecordsService,
  ) {}
  @Get() async get(@Req() req: any, @Query('date') date: string) {
    const log = await this.db.foodLog.findUnique({
      where: { userId_date: { userId: req.user.sub, date: day(date) } },
      include: { items: { include: { food: true } } },
    });
    const items = (log?.items || []).map(withRecordedFood);
    return {
      date,
      completed: log?.completed || false,
      items,
      totals: totals(items),
    };
  }
  @Post(':date/items') add(@Req() req: any, @Param('date') date: string, @Body() dto: ItemDto) {
    return this.records.addLog(req.user.sub, day(date), dto);
  }
  @Put('items/:id') update(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ItemDto,
  ) {
    return this.records.updateLog(req.user.sub, id, dto);
  }
  @Delete('items/:id') remove(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.records.removeLog(req.user.sub, id);
  }
}
