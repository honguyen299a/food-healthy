import { Module } from '@nestjs/common';
import { MealRecordsModule } from '../meal-records/meal-records.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { NutritionModule } from '../nutrition/nutrition.module';
import { RecommendationsModule } from '../recommendations/recommendations.module';
import { HealthAlertsController } from './health-alerts.controller';
import { InsightsController } from './insights.controller';
import { LogCompletionController } from './log-completion.controller';
import { MonitoringJobsService } from './monitoring-jobs.service';
import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from './monitoring.service';
@Module({
  imports: [NutritionModule, RecommendationsModule, NotificationsModule, MealRecordsModule],
  controllers: [
    MonitoringController,
    HealthAlertsController,
    InsightsController,
    LogCompletionController,
  ],
  providers: [MonitoringService, MonitoringJobsService],
  exports: [MonitoringService, MonitoringJobsService],
})
export class MonitoringModule {}
