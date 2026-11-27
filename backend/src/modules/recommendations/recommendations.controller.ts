import { Body, Controller, Post, Req } from '@nestjs/common';
import { UserOnly } from '../../common/decorators/access.decorators';
import { SuggestDto } from './dto/recommendations.dto';
import { RecommendationsService } from './recommendations.service';

@Controller('recommendations')
@UserOnly()
export class RecommendationsController {
  constructor(private service: RecommendationsService) {}
  @Post() suggest(@Req() req: any, @Body() dto: SuggestDto) {
    return this.service.suggest(req.user.sub, dto.date, 4);
  }
  @Post('plan') plan(@Req() req: any, @Body() dto: SuggestDto) {
    return this.service.plan(req.user.sub, dto.date, 4);
  }
  @Post('week') week(@Req() req: any, @Body() dto: SuggestDto) {
    return this.service.week(req.user.sub, dto.date, 4);
  }
}
