import { Controller, Get, Param, ParseIntPipe, Query, Req } from '@nestjs/common';
import { UserOnly } from '../../common/decorators/access.decorators';
import { AlertQueryDto } from './dto/monitoring.dto';
import { MonitoringService } from './monitoring.service';

@Controller('alerts')
@UserOnly()
export class HealthAlertsController {
  constructor(private monitoring: MonitoringService) {}
  @Get() list(@Req() req: any, @Query() q: AlertQueryDto) {
    return this.monitoring.alerts(req.user.sub, q);
  }
  @Get(':id') get(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.monitoring.alert(req.user.sub, id);
  }
}
