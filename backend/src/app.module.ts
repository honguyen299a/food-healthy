import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthGuard, RoleGuard } from './auth';
import { AuthController } from './controllers/auth.controller';
import { PrismaService } from './services/prisma.service';
import { NutritionController } from './controllers/nutrition.controller';
import { NutritionService } from './services/nutrition.service';
import { ProfilesController } from './controllers/profiles.controller';
import { FoodsController, CategoriesController } from './controllers/foods.controller';
import { MealPlansController, FoodLogsController, WeightLogsController, DashboardController } from './controllers/records.controller';
import { RecommendationsController } from './controllers/recommendations.controller';
import { RecommendationsService } from './services/recommendations.service';
import { AdminController } from './controllers/admin.controller';
import { RecommendationSafetyService } from './services/recommendation-safety.service';
import { AiController } from './controllers/ai.controller';
import { AiService } from './services/ai.service';
import { AiModelService } from './services/ai-model.service';
import { MonitoringService } from './services/monitoring.service';
import { MonitoringJobsService } from './services/monitoring-jobs.service';
import { NotificationsService } from './services/notifications.service';
import { MonitoringInterceptor } from './monitoring.interceptor';
import { AdminAlertsController, HealthAlertsController, InsightsController, LogCompletionController, MonitoringController } from './controllers/monitoring.controller';
import { NotificationsController } from './controllers/notifications.controller';
import { AdminHealthService } from './services/admin-health.service';
import { UserChartsService } from './services/user-charts.service';

@Module({
  imports: [JwtModule.register({ secret: process.env.JWT_SECRET || 'development-only-secret', signOptions: { expiresIn: '7d' } })],
  controllers: [AuthController, NutritionController, ProfilesController, FoodsController, CategoriesController, MealPlansController, FoodLogsController, WeightLogsController, DashboardController, RecommendationsController, AdminController, AiController, MonitoringController, HealthAlertsController, AdminAlertsController, InsightsController, LogCompletionController, NotificationsController],
  providers: [PrismaService, NutritionService, RecommendationsService, RecommendationSafetyService, AiService, AiModelService, MonitoringService, MonitoringJobsService, NotificationsService, AdminHealthService, UserChartsService, { provide: APP_INTERCEPTOR, useClass: MonitoringInterceptor }, { provide: APP_GUARD, useClass: AuthGuard }, { provide: APP_GUARD, useClass: RoleGuard }]
})
export class AppModule {}
