import { Controller, Get, Query, Req } from '@nestjs/common';
import { UserOnly } from '../../common/decorators/access.decorators';
import { ChartPeriodDto } from './chart-period';
import { DashboardService } from './dashboard.service';
@Controller('dashboard')
@UserOnly()
export class DashboardController {
  constructor(private service: DashboardService) {}
  @Get('charts') chartsForPeriod(@Req() req: any, @Query() q: ChartPeriodDto) {
    return this.service.chartsForPeriod(req, q);
  }
  @Get() async get(@Req() req: any, @Query('date') date: string) {
    return this.service.get(req, date);
  }
}
