import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { DatePickerComponent } from '../../shared/components/date-picker/date-picker.component';
import { mealNames, message, num, today } from '../../shared/utils/ui';

@Component({
  selector: 'app-week',
  imports: [FormsModule, RouterLink, MatButtonModule, DatePickerComponent],
  template: `
    <div class="page week-page">
      <header class="week-hero">
        <div>
          <span class="eyebrow">KẾ HOẠCH 7 NGÀY</span>
          <h1>Tuần ăn uống của bạn</h1>
          <p>
            Xem nhanh từng ngày, nhận biết ngày còn trống và mở kế hoạch để chỉnh sửa khẩu phần.
          </p>
        </div>
        @if (api.usageMode() === 'PERSONALIZED') {
          <a mat-flat-button routerLink="/recommendations" class="recommend-button"
            >✦ Tạo đề xuất tự động</a
          >
        }
      </header>

      <section class="week-controls" aria-label="Điều khiển tuần">
        <div class="week-navigation">
          <button type="button" class="nav-button" (click)="shiftWeek(-1)" aria-label="Tuần trước">
            ←
          </button>
          <div class="date-control">
            <span>Ngày bắt đầu</span>
            <app-date-picker [value]="start" (valueChange)="start = $event; load()" />
          </div>
          <button type="button" class="nav-button" (click)="shiftWeek(1)" aria-label="Tuần sau">
            →
          </button>
          <button type="button" class="today-button" (click)="goToCurrentWeek()">
            Tuần hiện tại
          </button>
        </div>

        <div class="week-summary" aria-label="Tóm tắt tuần">
          <div>
            <span>Ngày đã lập</span><strong>{{ plannedDays() }}/7</strong>
          </div>
          <div>
            <span>Tổng món</span><strong>{{ totalItems() }}</strong>
          </div>
          <div>
            <span>Năng lượng</span><strong>{{ n(totalCalories()) }} kcal</strong>
          </div>
          <div class="summary-alert">
            <span>Cần xem lại</span><strong>{{ flaggedDays() }} ngày</strong>
          </div>
        </div>
      </section>

      @if (error) {
        <p class="error" role="alert">{{ error }}</p>
      }
      @if (notice) {
        <p class="notice">{{ notice }}</p>
      }

      <section class="week-board">
        <div class="board-heading">
          <div>
            <span class="board-kicker">LỊCH TRONG TUẦN</span>
            <h2>{{ rangeLabel() }}</h2>
          </div>
          <div class="legend">
            <span><i class="dot good"></i>Trong mục tiêu</span
            ><span><i class="dot warning"></i>Cần điều chỉnh</span
            ><span><i class="dot empty"></i>Chưa có món</span>
          </div>
        </div>

        <div class="days-grid">
          @for (day of displayDays; track day.date) {
            <article
              class="day-card"
              [class.today]="isToday(day.date)"
              [class.has-plan]="day.items.length"
              [class.status-good]="day.analysis?.status === 'GOOD'"
              [class.status-warning]="day.analysis?.status === 'WARNING'"
              [class.status-danger]="day.analysis?.status === 'DANGER'"
            >
              <div class="day-card-head">
                <div>
                  <span class="weekday">{{ weekday(day.date) }}</span>
                  <strong class="day-number">{{ dayNumber(day.date) }}</strong>
                  <span class="month">{{ monthLabel(day.date) }}</span>
                </div>
                <div class="status-column">
                  @if (isToday(day.date)) {
                    <span class="today-badge">Hôm nay</span>
                  }
                  @if (day.items.length) {
                    <span class="analysis-badge">{{
                      day.analysis?.label || 'Đang phân tích'
                    }}</span>
                  }
                </div>
              </div>

              @if (day.items.length) {
                <div class="day-content">
                  <div class="primary-stat">
                    <strong>{{ day.items.length }}</strong
                    ><span>món ăn</span>
                  </div>
                  <div class="calorie-stat">
                    <span>Ước tính</span><strong>{{ n(day.totals.calories) }} kcal</strong>
                  </div>
                  <div class="meal-tags">
                    @for (label of mealLabels(day); track label) {
                      <span>{{ label }}</span>
                    }
                  </div>
                  @if (day.analysis?.issues?.length) {
                    <div class="issue-list">
                      @for (issue of day.analysis.issues.slice(0, 2); track issue.code) {
                        <p
                          class="alert-surface"
                          [attr.data-alert-severity]="
                            issue.level === 'danger'
                              ? 'HIGH'
                              : issue.level === 'warning'
                                ? 'MEDIUM'
                                : 'LOW'
                          "
                          [class.danger]="issue.level === 'danger'"
                        >
                          <span>{{ issue.level === 'danger' ? '!' : 'i' }}</span
                          >{{ issue.message }}
                        </p>
                      }
                      @if (day.analysis.issues.length > 2) {
                        <a
                          class="issue-more"
                          routerLink="/plans"
                          [queryParams]="{ date: day.date }"
                          fragment="plan-review"
                          >Xem đủ {{ day.analysis.issues.length }} lưu ý</a
                        >
                      }
                    </div>
                  } @else {
                    <p class="balanced-note">✓ Calories và macro đang trong khoảng kiểm tra.</p>
                  }
                </div>
              } @else {
                <div class="empty-day">
                  <span class="empty-icon">＋</span>
                  <strong>Chưa có món</strong>
                  <p>Bắt đầu thêm món cho ngày này.</p>
                </div>
              }

              <a [routerLink]="'/plans'" [queryParams]="{ date: day.date }" class="day-action">
                {{ day.items.length ? 'Xem kế hoạch' : 'Thêm món' }}
              </a>
            </article>
          }
        </div>
      </section>

      <div class="week-tip">
        <span>💡</span>
        <p>
          <strong>Mẹo nhỏ:</strong> Lập trước 2–3 ngày giúp bạn chủ động chuẩn bị nguyên liệu mà vẫn
          dễ điều chỉnh khi lịch sinh hoạt thay đổi.
        </p>
      </div>
    </div>
  `,
  styleUrl: './week.component.scss',
})
export class WeekComponent implements OnInit {
  api = inject(ApiService);
  start = today();
  days: any[] = [];
  displayDays: any[] = [];
  error = '';
  notice = '';
  n = num;

  ngOnInit() {
    this.load();
  }

  load() {
    this.error = '';
    this.api.get(`/plans/week?start=${this.start}`).subscribe({
      next: (plans: any[]) => {
        const normalized = plans.map((plan) => ({ ...plan, date: String(plan.date).slice(0, 10) }));
        const byDate = new Map(normalized.map((plan) => [plan.date, plan]));
        this.days = Array.from({ length: 7 }, (_, index) => {
          const dateValue = new Date(`${this.start}T00:00:00Z`);
          dateValue.setUTCDate(dateValue.getUTCDate() + index);
          const date = dateValue.toISOString().slice(0, 10);
          return (
            byDate.get(date) || {
              date,
              items: [],
              totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
              analysis: { status: 'EMPTY', label: 'Chưa có kế hoạch', issues: [] },
            }
          );
        });
        this.displayDays = this.days;
      },
      error: (error) => (this.error = message(error)),
    });
  }

  shiftWeek(direction: number) {
    const value = new Date(`${this.start}T00:00:00Z`);
    value.setUTCDate(value.getUTCDate() + direction * 7);
    this.start = value.toISOString().slice(0, 10);
    this.load();
  }

  goToCurrentWeek() {
    this.start = today();
    this.load();
  }
  plannedDays() {
    return this.displayDays.filter((day) => day.items.length).length;
  }
  totalItems() {
    return this.displayDays.reduce((sum, day) => sum + day.items.length, 0);
  }
  totalCalories() {
    return this.displayDays.reduce((sum, day) => sum + Number(day.totals?.calories || 0), 0);
  }
  flaggedDays() {
    return this.displayDays.filter(
      (day) => day.analysis?.status === 'WARNING' || day.analysis?.status === 'DANGER',
    ).length;
  }
  isToday(date: string) {
    return date === today();
  }

  weekday(date: string) {
    const value = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', timeZone: 'UTC' }).format(
      new Date(`${date}T00:00:00Z`),
    );
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  dayNumber(date: string) {
    return new Date(`${date}T00:00:00Z`).getUTCDate().toString().padStart(2, '0');
  }
  monthLabel(date: string) {
    return `Tháng ${new Date(`${date}T00:00:00Z`).getUTCMonth() + 1}`;
  }

  rangeLabel() {
    if (!this.displayDays.length) return 'Đang tải kế hoạch...';
    const first = this.displayDays[0].date;
    const last = this.displayDays[this.displayDays.length - 1].date;
    const format = (date: string) =>
      new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(`${date}T00:00:00Z`));
    return `${format(first)} – ${format(last)}`;
  }

  mealLabels(day: any) {
    return [...new Set(day.items.map((item: any) => mealNames[item.meal] || item.meal))];
  }
}
