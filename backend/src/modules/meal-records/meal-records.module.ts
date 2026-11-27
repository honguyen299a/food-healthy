import { Module } from '@nestjs/common';
import { NutritionModule } from '../nutrition/nutrition.module';
import { RecommendationsModule } from '../recommendations/recommendations.module';
import { FoodLogsController } from './food-logs.controller';
import { MealPlansController } from './meal-plans.controller';
import { MealRecordsService } from './meal-records.service';
@Module({
  imports: [NutritionModule, RecommendationsModule],
  controllers: [MealPlansController, FoodLogsController],
  providers: [MealRecordsService],
  exports: [MealRecordsService],
})
export class MealRecordsModule {}
