import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';

export class SuggestDto {
  @IsDateString() date: string;
  @IsOptional() @IsInt() @Min(1) @Max(4) meals?: number;
}
