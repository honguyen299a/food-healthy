import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Req } from '@nestjs/common';
import { UserOnly } from '../../common/decorators/access.decorators';
import { WeightDto } from './dto/weights.dto';
import { WeightsService } from './weights.service';
@Controller('weights')
@UserOnly()
export class WeightLogsController {
  constructor(private service: WeightsService) {}
  @Get() list(@Req() req: any) {
    return this.service.list(req);
  }
  @Post() save(@Req() req: any, @Body() dto: WeightDto) {
    return this.service.save(req, dto);
  }
  @Delete(':id') async remove(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.service.remove(req, id);
  }
}
