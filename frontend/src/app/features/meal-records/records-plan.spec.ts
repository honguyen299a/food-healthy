import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, Subject, of } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { RecordsComponent } from './records.component';

describe('Day plan review', () => {
  it('shows every weekly warning in the day plan and follows a new date query', async () => {
    const params = new BehaviorSubject(convertToParamMap({ date: '2026-11-26' }));
    const issues = [
      { code: 'HIGH_CALORIES', level: 'warning', message: 'Năng lượng vượt 122% mục tiêu ngày.' },
      { code: 'HIGH_PROTEIN', level: 'warning', message: 'Protein vượt nhiều (175%).' },
      { code: 'HIGH_CARBS', level: 'warning', message: 'Carbohydrate vượt nhiều (175%).' },
      { code: 'HIGH_FAT', level: 'warning', message: 'Chất béo vượt nhiều (167%).' },
      { code: 'MISSING_MEALS', level: 'info', message: 'Mới có 1/3 bữa đã thiết lập.' },
    ];
    const get = vi.fn((path: string) => {
      if (path === '/foods') return of([]);
      const date = new URL(path, 'http://local').searchParams.get('date');
      return of({
        date,
        items: [
          {
            id: 1,
            foodId: 1,
            meal: 'LUNCH',
            grams: 500,
            food: { name: 'Món kiểm thử', calories: 801, protein: 35, carbs: 70, fat: 20 },
          },
        ],
        totals: {
          calories: 4005,
          protein: 175,
          carbs: 350,
          fat: 100,
          fiber: 5,
          sugars: 10,
          sodium: 100,
          coverage: Object.fromEntries(
            ['fiber', 'sugars', 'sodium'].map((k) => [
              k,
              { knownItems: 1, totalItems: 1, complete: true },
            ]),
          ),
        },
        target: { calories: 1807, protein: 100, carbs: 200, fat: 60 },
        analysis: {
          status: 'WARNING',
          label: 'Chưa cân đối',
          ratios: { calories: 222, protein: 175, carbs: 175, fat: 167 },
          issues,
        },
      });
    });
    await TestBed.configureTestingModule({
      imports: [RecordsComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { queryParamMap: params, routeConfig: { path: 'plans' } },
        },
        { provide: ApiService, useValue: { get, usageMode: () => 'SELF_GUIDED' } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(RecordsComponent);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelectorAll('.plan-issue')).toHaveLength(5);
    expect(root.querySelector('#plan-review')?.textContent).toContain('Năng lượng vượt 122%');
    expect(root.querySelector('#plan-review')?.textContent).toContain('Protein vượt nhiều (175%)');
    expect(root.querySelector('#plan-review')?.textContent).toContain('Mới có 1/3 bữa');
    params.next(convertToParamMap({ date: '2026-11-27' }));
    fixture.detectChanges();
    expect(get).toHaveBeenLastCalledWith('/plans?date=2026-11-27');
    expect(root.querySelector('#plan-review')?.textContent).toContain('2026-11-27');
  });
});

describe('Plan consumption actions', () => {
  const item = {
    id: 12,
    foodId: 3,
    meal: 'LUNCH',
    grams: '150.5',
    status: 'PENDING',
    revision: 4,
    food: { id: 3, name: 'Planned food', calories: 100, protein: 10, carbs: 12, fat: 2 },
  };
  let put: ReturnType<typeof vi.fn>;
  let remove: ReturnType<typeof vi.fn>;
  let result: Subject<any>;
  let component: RecordsComponent;
  beforeEach(async () => {
    item.status = 'PENDING';
    result = new Subject();
    put = vi.fn(() => result);
    remove = vi.fn(() => result);
    await TestBed.configureTestingModule({
      imports: [RecordsComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { routeConfig: { path: 'plans' } } },
        { provide: ApiService, useValue: { get: () => of({ items: [] }), put, delete: remove } },
      ],
    }).compileComponents();
    component = TestBed.createComponent(RecordsComponent).componentInstance;
  });
  it('confirms the existing portion without re-entry and blocks another request while saving', () => {
    component.setStatus(item, 'COMPLETED');
    component.setStatus(item, 'COMPLETED');
    expect(put).toHaveBeenCalledTimes(1);
    expect(put).toHaveBeenCalledWith('/plans/items/12', {
      foodId: 3,
      meal: 'LUNCH',
      grams: 150.5,
      status: 'COMPLETED',
      expectedRevision: 4,
    });
    result.next({});
    expect(component.busy).toBe(false);
  });
  it('sends replacement, actual portion and confirmation in one update', () => {
    component.edit(item);
    component.form = { foodId: 7, meal: 'DINNER', grams: 200 };
    component.save(true);
    expect(put).toHaveBeenCalledWith('/plans/items/12', {
      foodId: 7,
      meal: 'DINNER',
      grams: 200,
      status: 'COMPLETED',
      expectedRevision: 4,
    });
  });
  it('skips a pending item and leaves the form empty', () => {
    component.setStatus(item, 'SKIPPED');
    expect(put).toHaveBeenCalledWith('/plans/items/12', {
      foodId: 3,
      meal: 'LUNCH',
      grams: 150.5,
      status: 'SKIPPED',
      expectedRevision: 4,
    });
    expect(component.form.foodId).toBeNull();
  });
  it('skips a completed item directly without a browser confirmation', () => {
    const dialog = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const completed = { ...item, status: 'COMPLETED' };
    component.setStatus(completed, 'SKIPPED');
    expect(dialog).not.toHaveBeenCalled();
    expect(put).toHaveBeenCalledWith('/plans/items/12', expect.objectContaining({ status: 'SKIPPED' }));
    result.next({});
    expect(completed.status).toBe('SKIPPED');
    expect(component.statusName(completed.status)).toBe('Bỏ qua');
    dialog.mockRestore();
  });
  it('deletes a completed plan item directly without a browser confirmation', () => {
    const dialog = vi.spyOn(window, 'confirm').mockReturnValue(false);
    component.remove({ ...item, status: 'COMPLETED' });
    expect(dialog).not.toHaveBeenCalled();
    expect(remove).toHaveBeenCalledWith('/plans/items/12');
    result.next({});
    expect(component.busy).toBe(false);
    dialog.mockRestore();
  });
});
