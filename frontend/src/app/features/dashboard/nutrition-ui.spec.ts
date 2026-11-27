import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { RecordsComponent } from '../meal-records/records.component';
import { WeightsComponent } from '../weights/weights.component';
import { DashboardComponent } from './dashboard.component';

describe('Nutrition UI regression checks', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecordsComponent, DashboardComponent, WeightsComponent],
      providers: [
        provideRouter([]),
        { provide: ApiService, useValue: { get: () => of([]), setUsageMode: () => {} } },
      ],
    }).compileComponents();
  });
  it('filters actual weight points by selected day and month without carrying outside measurements', () => {
    const component = TestBed.createComponent(WeightsComponent).componentInstance;
    component.weights = [
      { id: 1, date: '2026-10-31T00:00:00Z', weightKg: '60' },
      { id: 2, date: '2026-11-01T00:00:00Z', weightKg: '61' },
      { id: 3, date: '2026-11-25T00:00:00Z', weightKg: '62' },
    ];
    component.selectPeriod({ mode: 'MONTH', date: '2026-11-25', month: '2026-11' });
    expect(component.filteredWeights.map((w) => w.id)).toEqual([2, 3]);
    component.selectPeriod({ mode: 'DAY', date: '2026-11-25', month: '2026-11' });
    expect(component.filteredWeights.map((w) => w.id)).toEqual([3]);
    component.selectPeriod({ mode: 'DAY', date: '2026-11-02', month: '2026-11' });
    expect(component.filteredWeights).toEqual([]);
  });
  it('keeps decimal portion amounts and separate meal totals', () => {
    const component = TestBed.createComponent(RecordsComponent).componentInstance;
    component.record = {
      items: [
        {
          meal: 'LUNCH',
          grams: '150.00',
          food: { calories: '165.00', protein: '31.00', carbs: '0.00', fat: '3.60' },
        },
        {
          meal: 'LUNCH',
          grams: '180.00',
          food: { calories: '111.00', protein: '2.60', carbs: '23.00', fat: '0.90' },
        },
        { meal: 'DINNER', grams: 100, food: { calories: 208, protein: 20, carbs: 0, fat: 13 } },
      ],
    };
    expect(component.mealTotal('LUNCH', 'calories')).toBeCloseTo(447.3);
    expect(component.mealTotal('LUNCH', 'protein')).toBeCloseTo(51.18);
    expect(component.mealTotal('LUNCH', 'fat')).toBeCloseTo(7.02);
    expect(component.mealTotal('DINNER', 'calories')).toBe(208);
    expect(component.mealTotal('BREAKFAST', 'calories')).toBe(0);
  });
  it('compares actual intake to the daily target in both directions', () => {
    const component = TestBed.createComponent(RecordsComponent).componentInstance;
    component.target = { calories: 2000, protein: 100 };
    component.record = { totals: { calories: 1500, protein: 125 } };
    expect(component.dailyComparison('calories', 'Năng lượng', 'kcal')).toContain('còn 500 kcal');
    expect(component.dailyComparison('protein', 'Đạm', 'g')).toContain('vượt 25 g');
  });
  it('does not confuse a full progress bar with intake exactly at target', () => {
    const component = TestBed.createComponent(DashboardComponent).componentInstance;
    component.data = { target: { calories: 2000 }, consumed: { calories: 2250 } };
    expect(component.percent(2250, 2000)).toBe(100);
    expect(component.remainingCalories()).toBe(-250);
    expect(component.isCaloriesOverflow()).toBe(true);
    expect(component.percent(100, null)).toBe(0);
  });
  it('shows actual logged foods only, including when a day has unconfirmed planned foods', () => {
    const component = TestBed.createComponent(DashboardComponent).componentInstance;
    component.data = { plan: [{ food: { name: 'Planned' }, grams: 100 }], logs: [] };
    expect(component.currentMealsList()).toEqual([]);
    const actual = { food: { name: 'Actually eaten' }, grams: 150 };
    component.data.logs = [actual];
    expect(component.currentMealsList()).toEqual([actual]);
  });
  it('ignores a late dashboard response after switching to another day', () => {
    const component = TestBed.createComponent(DashboardComponent).componentInstance;
    const first = new Subject<any>(),
      second = new Subject<any>();
    vi.spyOn(TestBed.inject(ApiService), 'get')
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(second);
    vi.spyOn(component, 'loadCharts').mockImplementation(() => {});
    component.date = '2026-11-10';
    component.load();
    component.date = '2026-11-11';
    component.load();
    second.next({ consumed: { calories: 450 } });
    first.next({ consumed: { calories: 500 } });
    expect(component.data.consumed.calories).toBe(450);
  });
});
