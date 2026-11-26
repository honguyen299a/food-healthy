import { TestBed } from '@angular/core/testing';
import { ChartPeriodFilterComponent } from './chart-period-filter.component';
import { notificationDestination } from './notification-links';
describe('Chart filters and notification links', () => {
  it('emits valid day/month selections and ignores invalid months', () => {
    const filter = TestBed.createComponent(ChartPeriodFilterComponent).componentInstance;
    filter.date = '2026-11-25';
    filter.month = '2026-11';
    const changed = vi.fn();
    filter.rangeChange.subscribe(changed);
    filter.selectMode('MONTH');
    expect(changed).toHaveBeenLastCalledWith({
      mode: 'MONTH',
      date: '2026-11-25',
      month: '2026-11',
    });
    filter.selectMonth('2026-02');
    expect(changed).toHaveBeenLastCalledWith({
      mode: 'MONTH',
      date: '2026-11-25',
      month: '2026-02',
    });
    filter.selectMonth('2026-13');
    expect(changed).toHaveBeenCalledTimes(2);
  });
  it('opens current and old user alert notifications in notification details while preserving Admin destinations', () => {
    expect(notificationDestination('/alerts?id=27')).toBe('/notifications/alerts/27');
    expect(notificationDestination('/notifications/alerts/27')).toBe('/notifications/alerts/27');
    expect(notificationDestination('/admin/alerts?id=27')).toBe('/admin/alerts?id=27');
    expect(notificationDestination('/insights?report=2')).toBe('/insights?report=2');
    expect(notificationDestination('/alerts')).toBe('/notifications');
  });
});
