import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Req } from '@nestjs/common';
import { UserOnly } from '../../common/decorators/access.decorators';
import { ManualTargetDto, PreferenceDto, ProfileDto, UsageModeDto } from './dto/profiles.dto';
import { ProfilesService } from './profiles.service';
@Controller('profile')
@UserOnly()
export class ProfilesController {
  constructor(private service: ProfilesService) {}
  @Get() async get(@Req() req: any) {
    return this.service.get(req);
  }
  @Put() async save(@Req() req: any, @Body() dto: ProfileDto) {
    return this.service.save(req, dto);
  }
  @Get('settings') async settings(@Req() req: any) {
    return this.service.settings(req);
  }
  @Put('onboarding/skip') async skipOnboarding(@Req() req: any) {
    return this.service.skipOnboarding(req);
  }
  @Put('mode') async mode(@Req() req: any, @Body() dto: UsageModeDto) {
    return this.service.mode(req, dto);
  }
  @Put('manual-target') async manualTarget(@Req() req: any, @Body() dto: ManualTargetDto) {
    return this.service.manualTarget(req, dto);
  }
  @Delete('manual-target') async removeManualTarget(@Req() req: any) {
    return this.service.removeManualTarget(req);
  }
  @Get('preferences') preferences(@Req() req: any) {
    return this.service.preferences(req);
  }
  @Post('preferences') preference(@Req() req: any, @Body() dto: PreferenceDto) {
    return this.service.preference(req, dto);
  }
  @Delete('preferences/:id') async remove(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.service.remove(req, id);
  }
}
