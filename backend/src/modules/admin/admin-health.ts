export const healthGroups = ['BELOW_TARGET', 'OTHER_ALERT', 'NO_ALERT', 'INSUFFICIENT'] as const;
export type HealthGroup = (typeof healthGroups)[number];
export const healthGroupNames: Record<HealthGroup, string> = {
  BELOW_TARGET: 'Có dấu hiệu thấp hơn mục tiêu dinh dưỡng',
  OTHER_ALERT: 'Có cảnh báo cần xem xét',
  NO_ALERT: 'Chưa ghi nhận cảnh báo, đủ nhật ký đối chiếu',
  INSUFFICIENT: 'Chưa đủ dữ liệu đánh giá',
};
// These are monitoring groups, never a clinical classification of healthy/sick.
export function classifyHealth(summary: any, alerts: any[], end: string): HealthGroup {
  const fresh = summary?.end === end;
  const complete = fresh ? summary.days?.filter((d: any) => d.completed) || [] : [];
  const enough = complete.length >= 3 && !!summary?.target;
  const lastThree = fresh ? summary.days?.slice(-3) || [] : [];
  const confirmed = lastThree.length === 3 && lastThree.every((d: any) => d.completed);
  const tolerance = Number(summary?.tolerancePercent ?? 10) / 100;
  const proteinLow =
    confirmed &&
    lastThree.every(
      (d: any) =>
        d.totals?.protein != null && d.totals.protein < summary?.target?.protein * (1 - tolerance),
    );
  const fiberMin = summary?.monitoringLimits?.fiberMin;
  const fiberLow =
    confirmed &&
    fiberMin != null &&
    lastThree.every(
      (d: any) => d.totals?.coverage?.fiber?.complete && d.totals.fiber < Number(fiberMin),
    );
  const shortage = alerts.some(
    (a) =>
      a.conditionActive &&
      a.source === 'ACTUAL' &&
      ((a.type === 'PROTEIN_LOW' && proteinLow) || (a.type === 'FIBER_LOW' && fiberLow)),
  );
  if (enough && shortage) return 'BELOW_TARGET';
  if (alerts.some((a) => a.conditionActive)) return 'OTHER_ALERT';
  // Even a confirmed diary is insufficient for a configured fiber minimum if food
  // composition is missing. A missing target also cannot establish goal attainment.
  const limits = summary?.monitoringLimits;
  const compositionComplete = [
    ['fiber', 'fiberMin'],
    ['sugars', 'sugarsMax'],
    ['sodium', 'sodiumMax'],
  ].every(
    ([key, limit]) =>
      limits?.[limit] == null ||
      complete.filter((d: any) => d.totals?.coverage?.[key]?.complete).length >= 3,
  );
  if (enough && compositionComplete) return 'NO_ALERT';
  return 'INSUFFICIENT';
}
