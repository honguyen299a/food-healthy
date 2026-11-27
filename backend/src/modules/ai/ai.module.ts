import { Module } from '@nestjs/common';
import { NutritionModule } from '../nutrition/nutrition.module';
import { RecommendationsModule } from '../recommendations/recommendations.module';
import { AiModelService } from './ai-model.service';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
@Module({
  imports: [NutritionModule, RecommendationsModule],
  controllers: [AiController],
  providers: [AiService, AiModelService],
  exports: [],
})
export class AiModule {}
