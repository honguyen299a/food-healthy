import { TestBed } from '@angular/core/testing';
import Chart from 'chart.js/auto';
import { WeightChartComponent } from './weight-chart.component';

vi.mock('chart.js/auto', () => ({
  default: vi.fn(function (this: any, _canvas: any, config: any) {
    this.config = config;
    this.destroy = vi.fn();
  }),
}));

describe('Weight chart measurements', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    await TestBed.configureTestingModule({ imports: [WeightChartComponent] }).compileComponents();
  });
  afterEach(() => vi.restoreAllMocks());

  function lastConfig(): any {
    return vi.mocked(Chart).mock.calls.at(-1)?.[1];
  }

  it('explains and centers a single measurement without inventing a trend', () => {
    const fixture = TestBed.createComponent(WeightChartComponent);
    fixture.componentRef.setInput('weights', [{ date: '2026-11-27', weightKg: '76' }]);
    fixture.componentRef.setInput('periodMode', 'DAY');
    fixture.componentRef.setInput('targetWeight', 72);
    const viewMonth = vi.fn();
    fixture.componentInstance.viewMonth.subscribe(viewMonth);
    fixture.detectChanges();
    expect(lastConfig().data.labels).toEqual(['27/11']);
    expect(lastConfig().data.datasets[0].data).toEqual([76]);
    expect(lastConfig().data.datasets[1].pointRadius).toBeGreaterThan(0);
    expect(lastConfig().options.scales.x.offset).toBe(true);
    expect(fixture.nativeElement.querySelector('.weight-point-note').textContent).toContain(
      '1 lần đo',
    );
    fixture.nativeElement.querySelector('.weight-month-link').click();
    expect(viewMonth).toHaveBeenCalledTimes(1);
  });

  it('plots real monthly measurements in date order and uses the latest value', () => {
    const fixture = TestBed.createComponent(WeightChartComponent);
    const weights = [
      { date: '2026-11-27', weightKg: '76' },
      { date: '2026-11-20', weightKg: '77.2' },
      { date: '2026-11-25', weightKg: '76.5' },
    ];
    fixture.componentRef.setInput('weights', weights);
    fixture.componentRef.setInput('periodMode', 'MONTH');
    fixture.detectChanges();
    expect(lastConfig().data.labels).toEqual(['20/11', '25/11', '27/11']);
    expect(lastConfig().data.datasets[0].data).toEqual([77.2, 76.5, 76]);
    expect(lastConfig().options.scales.x.offset).toBe(false);
    expect(fixture.componentInstance.currentWeight).toBe(76);
    expect(weights[0].date).toBe('2026-11-27');
    expect(fixture.nativeElement.querySelector('.weight-point-note')).toBeNull();
  });

  it('clears the previous chart when the selected period has no measurement', () => {
    const fixture = TestBed.createComponent(WeightChartComponent);
    fixture.componentRef.setInput('weights', [{ date: '2026-11-27', weightKg: 76 }]);
    fixture.detectChanges();
    const previous = fixture.componentInstance.chart!;
    fixture.componentRef.setInput('weights', []);
    fixture.detectChanges();
    expect(previous.destroy).toHaveBeenCalled();
    expect(fixture.componentInstance.chart).toBeUndefined();
    expect(fixture.nativeElement.querySelector('.weight-empty-note')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.weight-point-note')).toBeNull();
  });
});
