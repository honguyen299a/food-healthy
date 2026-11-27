import { IsDateString, IsNumber, Max, Min } from 'class-validator';

export class WeightDto {
  @IsDateString() date: string;
  @IsNumber() @Min(25) @Max(400) weightKg: number;
}
