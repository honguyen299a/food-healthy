import { Meal, PlanItemStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class ItemDto {
  @IsInt() @Min(1) foodId: number;
  @IsEnum(Meal) meal: Meal;
  @IsNumber() @Min(1) @Max(2000) grams: number;
}

export class PlanItemsDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => ItemDto) items: ItemDto[];
}

export class PlanItemUpdateDto extends ItemDto {
  @IsOptional() @IsEnum(PlanItemStatus) status?: PlanItemStatus;
  @IsOptional() @IsInt() @Min(0) expectedRevision?: number;
}
