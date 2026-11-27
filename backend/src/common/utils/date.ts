import { BadRequestException } from '@nestjs/common';
export function validDate(value: string) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString().slice(0, 10) !== value
  )
    throw new BadRequestException('Ngày không hợp lệ.');
  return new Date(value);
}
export const iso = (date: Date | string) =>
  typeof date === 'string' ? date.slice(0, 10) : date.toISOString().slice(0, 10);
export const addDays = (day: string, offset: number) =>
  new Date(Date.parse(day) + offset * 86400000).toISOString().slice(0, 10);
export function localToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
export function monday(day: string) {
  const weekday = new Date(day).getUTCDay();
  return addDays(day, -(weekday === 0 ? 6 : weekday - 1));
}
