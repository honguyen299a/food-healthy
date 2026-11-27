import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { assertFoodsAccessible } from '../foods/food-access';
import { NutritionService } from '../nutrition/nutrition.service';
import { ManualTargetDto, PreferenceDto, ProfileDto, UsageModeDto } from './dto/profiles.dto';
@Injectable()
export class ProfilesService {
  constructor(
    private db: PrismaService,
    private nutrition: NutritionService,
  ) {}
  async get(req: any) {
    const profile = await this.db.userProfile.findUnique({ where: { userId: req.user.sub } });
    return profile ? { ...profile, target: await this.nutrition.target(req.user.sub) } : null;
  }
  async save(req: any, dto: ProfileDto) {
    const profile = await this.db.userProfile.upsert({
      where: { userId: req.user.sub },
      create: { ...dto, userId: req.user.sub },
      update: dto,
    });
    await this.db.user.update({
      where: { id: req.user.sub },
      data: { usageMode: 'PERSONALIZED', onboardingCompleted: true },
    });
    return {
      ...profile,
      target: await this.nutrition.target(req.user.sub),
      usageMode: 'PERSONALIZED',
    };
  }
  async settings(req: any) {
    const user = await this.db.user.findUniqueOrThrow({
      where: { id: req.user.sub },
      include: { profile: true, manualTarget: true },
    });
    return {
      usageMode: user.usageMode,
      hasSurvey: !!user.profile,
      onboardingCompleted: user.onboardingCompleted,
      manualTarget: user.manualTarget,
    };
  }
  async skipOnboarding(req: any) {
    const user = await this.db.user.update({
      where: { id: req.user.sub },
      data: { onboardingCompleted: true, usageMode: 'SELF_GUIDED' },
    });
    return { onboardingCompleted: user.onboardingCompleted, usageMode: user.usageMode };
  }
  async mode(req: any, dto: UsageModeDto) {
    const profile = await this.db.userProfile.findUnique({
      where: { userId: req.user.sub },
      select: { userId: true },
    });
    if (dto.usageMode === 'PERSONALIZED' && !profile)
      return { usageMode: 'SELF_GUIDED', hasSurvey: false, requiresSurvey: true };
    const user = await this.db.user.update({
      where: { id: req.user.sub },
      data: { usageMode: dto.usageMode },
    });
    return { usageMode: user.usageMode, hasSurvey: !!profile, requiresSurvey: false };
  }
  async manualTarget(req: any, dto: ManualTargetDto) {
    return this.db.manualNutritionTarget.upsert({
      where: { userId: req.user.sub },
      create: { userId: req.user.sub, ...dto },
      update: dto,
    });
  }
  async removeManualTarget(req: any) {
    await this.db.manualNutritionTarget.deleteMany({ where: { userId: req.user.sub } });
    return { ok: true };
  }
  preferences(req: any) {
    return this.db.userFoodPreference.findMany({
      where: { userId: req.user.sub, food: { OR: [{ ownerId: null }, { ownerId: req.user.sub }] } },
      include: { food: true },
    });
  }
  preference(req: any, dto: PreferenceDto) {
    return assertFoodsAccessible(this.db, req.user.sub, [dto.foodId]).then(() =>
      this.db.userFoodPreference.upsert({
        where: { userId_foodId_kind: { userId: req.user.sub, ...dto } },
        create: { userId: req.user.sub, ...dto },
        update: {},
      }),
    );
  }
  async remove(req: any, id: number) {
    await this.db.userFoodPreference.deleteMany({ where: { id, userId: req.user.sub } });
    return { ok: true };
  }
}
