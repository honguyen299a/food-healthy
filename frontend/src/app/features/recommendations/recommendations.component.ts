import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { DatePickerComponent } from '../../shared/components/date-picker/date-picker.component';
import { mealNames, message, num, today } from '../../shared/utils/ui';

@Component({
  selector: 'app-recommendations',
  imports: [FormsModule, RouterLink, MatButtonModule, DatePickerComponent],
  templateUrl: './recommendations.component.html',
  styleUrl: './recommendations.component.scss',
})
export class RecommendationsComponent {
  api = inject(ApiService);
  date = today();
  readonly mealCount = 4;
  previewStart = this.date;
  saving = false;
  mealSlots = Object.keys(mealNames);
  result: any;
  isWeek = false;
  busy = false;
  error = '';
  notice = '';
  n = num;
  mealNames = mealNames;
  get draftDays() {
    if (!this.result) return [];
    return this.isWeek
      ? this.result.days
      : [
          {
            date: this.previewStart,
            draft: this.result.draft,
            totals: { calories: this.result.draftCalories },
            planWarnings: this.result.planWarnings,
          },
        ];
  }
  get hasDraftItems() {
    return this.draftDays.some((day: any) => day.draft.length > 0);
  }
  draftItems(day: any, meal: string) {
    return day.draft.filter((item: any) => item.meal === meal);
  }
  populatedMeals(day: any) {
    return new Set(day.draft.map((item: any) => item.meal)).size;
  }
  generateDay() {
    this.run('/recommendations/plan', false);
  }
  generateWeek() {
    this.run('/recommendations/week', true);
  }
  run(path: string, week: boolean) {
    this.error = '';
    this.notice = '';
    if (this.busy) return;
    const date = this.date;
    this.busy = true;
    this.api.post(path, { date, meals: 4 }).subscribe({
      next: (r) => {
        this.previewStart = date;
        this.result = r;
        this.isWeek = week;
        this.busy = false;
      },
      error: (e) => {
        this.error = message(e);
        this.busy = false;
      },
    });
  }
  save() {
    if (this.saving || this.busy || !this.hasDraftItems) return;
    this.saving = true;
    const days = this.draftDays;
    const requests = days.map((day: any) =>
      this.api.put(`/plans/${day.date}/items`, {
        items: day.draft.map((x: any) => ({ foodId: x.foodId, meal: x.meal, grams: x.grams })),
      }),
    );
    forkJoin(requests).subscribe({
      next: () => {
        this.saving = false;
        this.notice = `Đã lưu bản nháp ${this.isWeek ? '7 ngày' : 'một ngày'}. Bạn có thể chỉnh sửa từng món trong Kế hoạch ăn.`;
        this.result = null;
      },
      error: (e) => {
        this.saving = false;
        this.error = message(e);
      },
    });
  }
  reject() {
    this.result = null;
    this.notice = 'Đã từ chối bản nháp. Kế hoạch hiện tại không thay đổi.';
  }
}
