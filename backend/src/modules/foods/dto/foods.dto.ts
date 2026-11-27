import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class FoodDto {
  @IsOptional() @IsString() @MaxLength(100) subgroup?: string | null;
  @IsOptional() @IsNumber() @Min(0) @Max(100) fiber?: number | null;
  @IsOptional() @IsNumber() @Min(0) @Max(100) sugars?: number | null;
  @IsOptional() @IsNumber() @Min(0) @Max(100000) sodium?: number | null;
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name: string;
  @IsInt() @Min(1) categoryId: number;
  @IsNumber() @Min(0) @Max(1000) calories: number;
  @IsNumber() @Min(0) @Max(100) protein: number;
  @IsNumber() @Min(0) @Max(100) carbs: number;
  @IsNumber() @Min(0) @Max(100) fat: number;
  @IsOptional() @IsNumber() @Min(0) @Max(10000000) estimatedCost?: number;
}

export class CategoryDto {
  @IsString() @MinLength(2) name: string;
}
