import { Activity, Gender, Goal, PreferenceKind, UsageMode } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class ProfileDto {
  @IsString() @MinLength(2) name: string;
  @IsInt() @Min(16) @Max(120) age: number;
  @IsEnum(Gender) gender: Gender;
  @IsNumber() @Min(100) @Max(250) heightCm: number;
  @IsNumber() @Min(25) @Max(400) weightKg: number;
  @IsOptional() @IsNumber() @Min(25) @Max(400) targetWeightKg?: number;
  @IsEnum(Activity) activity: Activity;
  @IsEnum(Goal) goal: Goal;
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) healthConditions?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) allergies?: string[];
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  dietaryPreferences?: string[];
  @IsInt() @Min(1) @Max(4) mealsPerDay: number;
}

export class UsageModeDto {
  @IsEnum(UsageMode) usageMode: UsageMode;
}

export class ManualTargetDto {
  @IsInt() @Min(800) @Max(10000) calories: number;
  @IsInt() @Min(0) @Max(1000) protein: number;
  @IsInt() @Min(0) @Max(2000) carbs: number;
  @IsInt() @Min(0) @Max(1000) fat: number;
}

export class PreferenceDto {
  @IsInt() @Min(1) foodId: number;
  @IsEnum(PreferenceKind) kind: PreferenceKind;
}
