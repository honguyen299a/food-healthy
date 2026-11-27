import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { healthGroups } from '../admin-health';

export class VisibilityDto {
  @IsBoolean() isActive: boolean;
}

export class UsersQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit?: number;
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsIn(healthGroups) group?: string;
}

export class FoodsQueryDto {
  @IsOptional() @IsString() @MaxLength(100) subgroup?: string;
  @IsOptional() @IsIn(['ALL', 'ACTIVE', 'HIDDEN']) status?: string;
  @IsOptional() @IsString() @MaxLength(150) search?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) categoryId?: number;
}
