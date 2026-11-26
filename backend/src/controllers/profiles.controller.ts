import { UserOnly } from '../auth';
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Req } from '@nestjs/common';
import { PrismaService } from '../services/prisma.service';
import { ManualTargetDto, PreferenceDto, ProfileDto, UsageModeDto } from '../dto';
import { NutritionService } from '../services/nutrition.service';
import { assertFoodsAccessible } from '../food-access';

@Controller('profile')
@UserOnly()
export class ProfilesController {
  constructor(private db: PrismaService, private nutrition: NutritionService) {}
  @Get() async get(@Req() req: any) {
    const profile = await this.db.userProfile.findUnique({ where: { userId: req.user.sub } });
    return profile ? { ...profile, target: await this.nutrition.target(req.user.sub) } : null;
  }
  @Put() async save(@Req() req: any, @Body() dto: ProfileDto) {
    const profile = await this.db.userProfile.upsert({ where: { userId: req.user.sub }, create: { ...dto, userId: req.user.sub }, update: dto });
    await this.db.user.update({ where: { id: req.user.sub }, data: { usageMode: 'PERSONALIZED', onboardingCompleted: true } });
    return { ...profile, target: await this.nutrition.target(req.user.sub), usageMode: 'PERSONALIZED' };
  }
  @Get('settings') async settings(@Req() req: any) {
    const user = await this.db.user.findUniqueOrThrow({ where: { id: req.user.sub }, include: { profile: true, manualTarget: true } });
    return { usageMode: user.usageMode, hasSurvey: !!user.profile, onboardingCompleted: user.onboardingCompleted, manualTarget: user.manualTarget };
  }
  @Put('onboarding/skip') async skipOnboarding(@Req() req: any) {
    const user = await this.db.user.update({ where: { id: req.user.sub }, data: { onboardingCompleted: true, usageMode: 'SELF_GUIDED' } });
    return { onboardingCompleted: user.onboardingCompleted, usageMode: user.usageMode };
  }
  @Put('mode') async mode(@Req() req: any, @Body() dto: UsageModeDto) {
    const profile = await this.db.userProfile.findUnique({ where: { userId: req.user.sub }, select: { userId: true } });
    if (dto.usageMode === 'PERSONALIZED' && !profile) return { usageMode: 'SELF_GUIDED', hasSurvey: false, requiresSurvey: true };
    const user = await this.db.user.update({ where: { id: req.user.sub }, data: { usageMode: dto.usageMode } });
    return { usageMode: user.usageMode, hasSurvey: !!profile, requiresSurvey: false };
  }
  @Put('manual-target') async manualTarget(@Req() req: any, @Body() dto: ManualTargetDto) {
    return this.db.manualNutritionTarget.upsert({ where: { userId: req.user.sub }, create: { userId: req.user.sub, ...dto }, update: dto });
  }
  @Delete('manual-target') async removeManualTarget(@Req() req: any) {
    await this.db.manualNutritionTarget.deleteMany({ where: { userId: req.user.sub } }); return { ok: true };
  }
  @Get('preferences') preferences(@Req() req: any) { return this.db.userFoodPreference.findMany({ where: { userId: req.user.sub, food:{OR:[{ownerId:null},{ownerId:req.user.sub}]} }, include: { food: true } }); }
  @Post('preferences') preference(@Req() req: any, @Body() dto: PreferenceDto) {
    return assertFoodsAccessible(this.db,req.user.sub,[dto.foodId]).then(()=>this.db.userFoodPreference.upsert({ where: { userId_foodId_kind: { userId: req.user.sub, ...dto } }, create: { userId: req.user.sub, ...dto }, update: {} }));
  }
  @Delete('preferences/:id') async remove(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    await this.db.userFoodPreference.deleteMany({ where: { id, userId: req.user.sub } }); return { ok: true };
  }
}
