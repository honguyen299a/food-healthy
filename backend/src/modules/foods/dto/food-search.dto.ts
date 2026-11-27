import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class FoodSearchDto {
  @IsOptional() @IsString() @MaxLength(150) search?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) categoryId?: number;
  @IsOptional() @IsString() @MaxLength(100) subgroup?: string;
}
