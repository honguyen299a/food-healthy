import { Activity, Gender, Goal, Meal, PreferenceKind, UsageMode } from '@prisma/client';
import { ArrayMaxSize, IsArray, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

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
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) dietaryPreferences?: string[];
  @IsInt() @Min(1) @Max(4) mealsPerDay: number;
}
export class UsageModeDto { @IsEnum(UsageMode) usageMode: UsageMode; }
export class ManualTargetDto {
  @IsInt() @Min(800) @Max(10000) calories: number;
  @IsInt() @Min(0) @Max(1000) protein: number;
  @IsInt() @Min(0) @Max(2000) carbs: number;
  @IsInt() @Min(0) @Max(1000) fat: number;
}
export class FoodDto {
  @IsOptional() @IsNumber() @Min(0) @Max(100) fiber?: number | null;
  @IsOptional() @IsNumber() @Min(0) @Max(100) sugars?: number | null;
  @IsOptional() @IsNumber() @Min(0) @Max(100000) sodium?: number | null;
  @IsString() @MinLength(2) name: string;
  @IsInt() @Min(1) categoryId: number;
  @IsNumber() @Min(0) @Max(1000) calories: number;
  @IsNumber() @Min(0) @Max(100) protein: number;
  @IsNumber() @Min(0) @Max(100) carbs: number;
  @IsNumber() @Min(0) @Max(100) fat: number;
  @IsOptional() @IsNumber() @Min(0) @Max(10000000) estimatedCost?: number;
}
export class CategoryDto { @IsString() @MinLength(2) name: string; }
export class ItemDto {
  @IsInt() @Min(1) foodId: number;
  @IsEnum(Meal) meal: Meal;
  @IsNumber() @Min(1) @Max(2000) grams: number;
}
export class PlanItemsDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => ItemDto) items: ItemDto[];
}
export class WeightDto {
  @IsDateString() date: string;
  @IsNumber() @Min(25) @Max(400) weightKg: number;
}
export class PreferenceDto {
  @IsInt() @Min(1) foodId: number;
  @IsEnum(PreferenceKind) kind: PreferenceKind;
}
export class SuggestDto {
  @IsDateString() date: string;
  @IsOptional() @IsInt() @Min(1) @Max(4) meals?: number;
}
