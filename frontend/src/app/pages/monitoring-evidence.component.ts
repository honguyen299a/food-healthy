import { Component, Input } from '@angular/core';

const labels: Record<string, string> = {
  days: 'Ngày làm căn cứ',
  date: 'Ngày',
  value: 'Giá trị đã ghi',
  completed: 'Xác nhận ghi đủ',
  target: 'Mục tiêu',
  tolerancePercent: 'Khoảng so sánh (%)',
  rule: 'Điều kiện theo dõi',
  limit: 'Giới hạn cá nhân',
  limitSource: 'Nguồn giới hạn',
  knownTotal: 'Tổng đã biết',
  complete: 'Đủ dữ liệu thành phần',
  missingItems: 'Thực phẩm thiếu thành phần',
  foods: 'Thực phẩm liên quan',
  method: 'Cách đối chiếu',
  measurements: 'Các lần đo',
  kg: 'Cân nặng (kg)',
  percent: 'Thay đổi (%)',
  spanDays: 'Khoảng cách giữa lần đo (ngày)',
  windowDays: 'Cửa sổ theo dõi (ngày)',
  first: 'Lần đo đầu',
  last: 'Lần đo cuối',
  targetWeight: 'Cân nặng mục tiêu (kg)',
  reason: 'Lý do',
  average: 'Trung bình',
  loggedDays: 'Ngày có nhật ký',
  completedDays: 'Ngày xác nhận ghi đủ',
  currentSD: 'Độ lệch chuẩn calories kỳ này',
  previousSD: 'Độ lệch chuẩn calories kỳ trước',
  currentDays: 'Số ngày kỳ này',
  previousDays: 'Số ngày kỳ trước',
  count: 'Số lần đo',
  change: 'Thay đổi (kg)',
  missingDays: 'Ngày thiếu thành phần',
};
export function evidenceText(value: unknown, depth = 0): string {
  if (value === null || value === undefined) return 'Chưa đủ dữ liệu';
  if (typeof value === 'boolean') return value ? 'Có' : 'Chưa';
  if (typeof value === 'number')
    return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value);
  if (Array.isArray(value))
    return value.length
      ? value
          .map((v) => (typeof v === 'object' ? evidenceText(v, depth + 1) : evidenceText(v)))
          .join('\n')
      : 'Chưa có';
  if (typeof value === 'object')
    return Object.entries(value)
      .map(
        ([k, v]) =>
          `${'  '.repeat(depth)}${labels[k] || k}: ${v !== null && typeof v === 'object' ? '\n' + evidenceText(v, depth + 1) : evidenceText(v)}`,
      )
      .join('\n');
  return String(value);
}
@Component({
  selector: 'app-monitoring-evidence',
  template: `<pre>{{ text }}</pre>`,
  styles: [
    `
      pre {
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        font: inherit;
        font-size: 13px;
        line-height: 1.8;
        background: #f5f8f3;
        border-radius: 12px;
        padding: 16px;
        margin: 10px 0;
        color: #426044;
      }
    `,
  ],
})
export class MonitoringEvidenceComponent {
  @Input() value: unknown;
  get text() {
    return evidenceText(this.value);
  }
}
