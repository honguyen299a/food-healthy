import { Module } from '@nestjs/common';
import { MonitoringModule } from '../monitoring/monitoring.module';
import { AdminAlertsController } from './admin-alerts.controller';
import { AdminHealthService } from './admin-health.service';
import { AdminController } from './admin.controller';
@Module({
  imports: [MonitoringModule],
  controllers: [AdminController, AdminAlertsController],
  providers: [AdminHealthService],
  exports: [],
})
export class AdminModule {}
