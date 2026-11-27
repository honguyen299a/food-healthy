import { Module } from '@nestjs/common';
import { NutritionModule } from '../nutrition/nutrition.module';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
@Module({
  imports: [NutritionModule],
  controllers: [ProfilesController],
  providers: [ProfilesService],
  exports: [],
})
export class ProfilesModule {}
