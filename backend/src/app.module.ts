import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthGuard } from './common/guards/auth.guard';
import { RoleGuard } from './common/guards/role.guard';
import { MonitoringInterceptor } from './common/interceptors/monitoring.interceptor';
import { PrismaModule } from './database/prisma.module';
import { AdminModule } from './modules/admin/admin.module';
import { AiModule } from './modules/ai/ai.module';
import { AuthModule } from './modules/auth/auth.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { FoodsModule } from './modules/foods/foods.module';
import { MealRecordsModule } from './modules/meal-records/meal-records.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { NutritionModule } from './modules/nutrition/nutrition.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
import { WeightsModule } from './modules/weights/weights.module';
@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ProfilesModule,
    FoodsModule,
    NutritionModule,
    MealRecordsModule,
    RecommendationsModule,
    MonitoringModule,
    WeightsModule,
    NotificationsModule,
    DashboardModule,
    AiModule,
    AdminModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RoleGuard },
    { provide: APP_INTERCEPTOR, useClass: MonitoringInterceptor },
  ],
})
export class AppModule {}
