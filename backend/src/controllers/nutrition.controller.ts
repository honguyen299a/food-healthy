import { UserOnly } from '../auth';
import { Controller, Get, Req } from '@nestjs/common';
import { NutritionService } from '../services/nutrition.service';

@Controller('nutrition')
@UserOnly()
export class NutritionController {
  constructor(private service: NutritionService) {}
  @Get('target') target(@Req() req: any) { return this.service.target(req.user.sub); }
}
