import { BadRequestException } from '@nestjs/common';
import { IsIn, IsOptional, IsString, Matches } from 'class-validator';
import { addDays, localToday, validDate } from '../../common/utils/date';
export class ChartPeriodDto {
  @IsOptional() @IsIn(['DAY', 'MONTH']) mode?: 'DAY' | 'MONTH';
  @IsOptional() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) date?: string;
  @IsOptional() @IsString() @Matches(/^\d{4}-(0[1-9]|1[0-2])$/) month?: string;
}
export function chartPeriod(q: ChartPeriodDto) {
  if (q.date) validDate(q.date);
  if (q.month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(q.month))
    throw new BadRequestException('Tháng không hợp lệ.');
  const mode = q.mode || 'DAY';
  if (!['DAY', 'MONTH'].includes(mode)) throw new BadRequestException('Khoảng xem không hợp lệ.');
  const start =
    mode === 'MONTH' ? `${q.month || localToday().slice(0, 7)}-01` : q.date || localToday();
  validDate(start);
  const year = Number(start.slice(0, 4));
  if (year < 1900 || year > 2100) throw new BadRequestException('Năm phải từ 1900 đến 2100.');
  const count =
    mode === 'MONTH' ? new Date(Date.UTC(year, Number(start.slice(5, 7)), 0)).getUTCDate() : 1;
  return { mode, start, end: addDays(start, count - 1), days: count };
}
