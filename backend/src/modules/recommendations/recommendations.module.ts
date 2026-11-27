import { Module } from '@nestjs/common';
import { NutritionModule } from '../nutrition/nutrition.module';
import { RecommendationSafetyService } from './recommendation-safety.service';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';
@Module({
  imports: [NutritionModule],
  controllers: [RecommendationsController],
  providers: [RecommendationsService, RecommendationSafetyService],
  exports: [RecommendationsService, RecommendationSafetyService],
})
export class RecommendationsModule {}
