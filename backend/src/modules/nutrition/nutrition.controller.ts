import { Controller, Get, Req } from '@nestjs/common';
import { UserOnly } from '../../common/decorators/access.decorators';
import { NutritionService } from './nutrition.service';

@Controller('nutrition')
@UserOnly()
export class NutritionController {
  constructor(private service: NutritionService) {}
  @Get('target') target(@Req() req: any) {
    return this.service.target(req.user.sub);
  }
}
