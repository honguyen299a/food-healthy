import { AlertSeverity, AlertSource, AlertStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { PageDto } from '../../../common/dto/pagination.dto';

export class AlertQueryDto extends PageDto {
  @IsOptional() @IsEnum(AlertStatus) status?: AlertStatus;
  @IsOptional() @IsEnum(AlertSeverity) severity?: AlertSeverity;
  @IsOptional() @IsEnum(AlertSource) source?: AlertSource;
  @IsOptional() @IsString() @MaxLength(60) @Matches(/^[A-Z_]+$/) type?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) userId?: number;
}

export class AlertUpdateDto {
  @IsEnum(AlertStatus) status: AlertStatus;
  @IsString() @MinLength(1) @MaxLength(1000) note: string;
  @IsInt() @Min(1) revision: number;
}

export class MonitoringSettingsDto {
  @IsOptional() @IsNumber() @Min(0) @Max(500) fiberMin?: number | null;
  @IsOptional() @IsNumber() @Min(0) @Max(2000) sugarsMax?: number | null;
  @IsOptional() @IsNumber() @Min(0) @Max(100000) sodiumMax?: number | null;
  @IsOptional() @IsNumber() @Min(0.1) @Max(100) weightChangePercent?: number | null;
  @ValidateIf((_, v) => v !== undefined)
  @IsInt()
  @Min(7)
  @Max(90)
  weightWindowDays?: number;
  @ValidateIf((_, v) => v !== undefined)
  @IsInt()
  @Min(0)
  @Max(50)
  targetTolerancePercent?: number;
  @IsOptional() @IsString() @MaxLength(500) limitSource?: string | null;
  @ValidateIf((_, v) => v !== undefined) @IsBoolean() reminders?: boolean;
}

export class ReportDto {
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) start: string;
}

export class CompletedDto {
  @IsBoolean() completed: boolean;
}
