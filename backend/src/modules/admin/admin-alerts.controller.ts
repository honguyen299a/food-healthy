import { Body, Controller, Get, Param, ParseIntPipe, Put, Query, Req } from '@nestjs/common';
import { Admin } from '../../common/decorators/access.decorators';
import { AlertQueryDto, AlertUpdateDto } from '../monitoring/dto/monitoring.dto';
import { MonitoringService } from '../monitoring/monitoring.service';

@Admin()
@Controller('admin/alerts')
export class AdminAlertsController {
  constructor(private monitoring: MonitoringService) {}
  @Get() list(@Req() req: any, @Query() q: AlertQueryDto) {
    return this.monitoring.alerts(req.user.sub, q, true);
  }
  @Get(':id') get(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.monitoring.alert(req.user.sub, id, true);
  }
  @Put(':id') update(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AlertUpdateDto,
  ) {
    return this.monitoring.updateAlert(req.user.sub, id, dto.status, dto.note, dto.revision);
  }
}
