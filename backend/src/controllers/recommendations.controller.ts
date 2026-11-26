import { UserOnly } from '../auth';
import { Body, Controller, Post, Req } from '@nestjs/common';
import { RecommendationsService } from '../services/recommendations.service';
import { SuggestDto } from '../dto';

@Controller('recommendations')
@UserOnly()
export class RecommendationsController {
  constructor(private service: RecommendationsService) {}
  @Post() suggest(@Req() req: any, @Body() dto: SuggestDto) { return this.service.suggest(req.user.sub, dto.date, dto.meals); }
  @Post('plan') plan(@Req() req: any, @Body() dto: SuggestDto) { return this.service.plan(req.user.sub, dto.date, dto.meals); }
  @Post('week') week(@Req() req: any, @Body() dto: SuggestDto) { return this.service.week(req.user.sub, dto.date, dto.meals); }
}
