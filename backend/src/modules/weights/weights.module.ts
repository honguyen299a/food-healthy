import { Module } from '@nestjs/common';
import { WeightLogsController } from './weights.controller';
import { WeightsService } from './weights.service';
@Module({
  imports: [],
  controllers: [WeightLogsController],
  providers: [WeightsService],
  exports: [],
})
export class WeightsModule {}
