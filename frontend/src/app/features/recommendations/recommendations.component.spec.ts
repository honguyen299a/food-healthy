import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { RecommendationsComponent } from './recommendations.component';
describe('Fixed four-meal proposals', () => {
  it('has no meal-count input and always requests and displays four meal slots', async () => {
    const post = vi.fn(() => of({ draft: [], draftCalories: 0, disclaimer: 'Bản nháp chưa lưu.' }));
    await TestBed.configureTestingModule({
      imports: [RecommendationsComponent],
      providers: [
        provideRouter([]),
        { provide: ApiService, useValue: { usageMode: () => 'PERSONALIZED', post } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(RecommendationsComponent);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('.fixed-meals')?.textContent).toContain('4 bữa mỗi ngày');
    expect(root.querySelector('input[type=number],input[type=radio]')).toBeNull();
    (root.querySelector('.generate-actions button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(post).toHaveBeenCalledWith('/recommendations/plan', {
      date: fixture.componentInstance.date,
      meals: 4,
    });
    expect(
      Array.from(root.querySelectorAll('.draft-meal h3'), (el) => el.textContent?.trim()),
    ).toEqual(['Bữa sáng', 'Bữa trưa', 'Bữa tối', 'Bữa phụ']);
    expect(fixture.componentInstance.hasDraftItems).toBe(false);
    expect(root.querySelector('.four-meal-tag')?.textContent).toContain('0/4');
    fixture.componentInstance.result = {
      disclaimer: 'Bản nháp chưa lưu.',
      draft: [{ foodId: 1, meal: 'LUNCH', grams: 100, food: { name: 'Rice', calories: 123 } }],
      draftCalories: 123,
      planWarnings: ['Không đủ thực phẩm phù hợp.'],
    };
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    expect(root.querySelector('.four-meal-tag')?.textContent).toContain('1/4');
    expect(root.textContent).toContain('Không đủ thực phẩm phù hợp.');
    expect(root.querySelectorAll('.food-row').length).toBe(1);
  });
});
