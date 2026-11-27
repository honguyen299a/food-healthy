import { Body, Controller, Param, Put, Req } from '@nestjs/common';
import { UserOnly } from '../../common/decorators/access.decorators';
import { validDate } from '../../common/utils/date';
import { MealRecordsService } from '../meal-records/meal-records.service';
import { CompletedDto } from './dto/monitoring.dto';
import { MonitoringJobsService } from './monitoring-jobs.service';

@Controller('logs')
@UserOnly()
export class LogCompletionController {
  constructor(
    private records: MealRecordsService,
    private jobs: MonitoringJobsService,
  ) {}
  @Put(':date/completeness') async complete(
    @Req() req: any,
    @Param('date') date: string,
    @Body() dto: CompletedDto,
  ) {
    const result = await this.records.setLogCompleteness(
      req.user.sub,
      validDate(date),
      dto.completed,
    );
    await this.jobs.enqueue(req.user.sub);
    return result;
  }
}
