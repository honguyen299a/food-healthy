import {
  Equals,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class ChatDto {
  @IsString() @MinLength(1) @MaxLength(2000) message: string;
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) date: string;
  @IsIn(['ADVICE', 'PROPOSAL', 'ACTION']) mode: 'ADVICE' | 'PROPOSAL' | 'ACTION';
  @IsOptional() @IsIn(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK']) meal?: string;
}

export class ConfirmDto {
  @Equals(true, { message: 'Cần xác nhận rõ ràng trước khi lưu.' })
  confirmed: boolean;
  @IsInt() @Min(1) version: number;
  @IsIn(['SAVE_PLAN', 'SHOPPING_LIST']) action: 'SAVE_PLAN' | 'SHOPPING_LIST';
}

export class HistoryDto {
  @IsOptional() @Matches(/^[1-9]\d{0,9}$/) before?: string;
}
