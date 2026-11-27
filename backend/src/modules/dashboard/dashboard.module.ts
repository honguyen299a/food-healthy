import { Module } from '@nestjs/common';
import { NutritionModule } from '../nutrition/nutrition.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { UserChartsService } from './user-charts.service';
@Module({
  imports: [NutritionModule],
  controllers: [DashboardController],
  providers: [DashboardService, UserChartsService],
  exports: [],
})
export class DashboardModule {}
