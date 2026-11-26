import { Component, DestroyRef, OnDestroy, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { ApiService } from '../core/services/api.service';
import { DatePickerComponent } from '../core/date-picker.component';
import { message, today } from '../core/ui';
import { NutritionTrendComponent } from './nutrition-trend.component';
import { MonitoringEvidenceComponent } from './monitoring-evidence.component';
import { ChartPeriodFilterComponent, ChartRange } from '../core/chart-period-filter.component';
import { Subscription } from 'rxjs';
@Component({
  selector: 'app-insights',
  imports: [
    FormsModule,
    RouterLink,
    MatButtonModule,
    DatePickerComponent,
    NutritionTrendComponent,
    MonitoringEvidenceComponent,
    ChartPeriodFilterComponent,
  ],
  templateUrl: './insights.component.html',
  styleUrl: './monitoring.scss',
})
export class InsightsComponent implements OnInit, OnDestroy {
  api = inject(ApiService);
  route = inject(ActivatedRoute);
  summary: any = null;
  trend: any = null;
  trendBusy = false;
  trendError = '';
  chartRange: ChartRange = { mode: 'MONTH', date: today(), month: today().slice(0, 7) };
  private trendRequest?: Subscription;
  settings: any = null;
  reports: any[] = [];
  report: any = null;
  cursor: number | null = null;
  busy = true;
  saving = false;
  queued = false;
  error = '';
  notice = '';
  updatedAt = '';
  private poll?: ReturnType<typeof setInterval>;
  keys = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugars', 'sodium'];
  labels: Record<string, string> = {
    calories: 'Năng lượng',
    protein: 'Protein',
    carbs: 'Carbohydrate',
    fat: 'Chất béo',
    fiber: 'Chất xơ',
    sugars: 'Đường tổng',
    sodium: 'Natri',
  };
  reportStart = this.previousWeek();
  private destroyRef = inject(DestroyRef);
  ngOnInit() {
    this.loadTrend();
    this.load();
    this.loadSettings();
    this.loadReports();
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((q) => {
      const id = Number(q.get('report'));
      if (id > 0) this.openReport(id);
    });
    this.poll = setInterval(() => {
      if (!this.trendBusy) this.loadTrend(false);
      this.load(false);
      this.loadReports(false, true);
    }, 20000);
  }
  ngOnDestroy() {
    this.trendRequest?.unsubscribe();
    if (this.poll) clearInterval(this.poll);
  }
  selectChartRange(range: ChartRange) {
    this.chartRange = range;
    this.loadTrend();
  }
  loadTrend(show = true) {
    this.trendRequest?.unsubscribe();
    if (show) this.trend = null;
    this.trendBusy = true;
    this.trendError = '';
    this.trendRequest = this.api
      .get<any>('/dashboard/charts?' + new URLSearchParams(this.chartRange))
      .subscribe({
        next: (r) => {
          this.trend = r;
          this.trendBusy = false;
        },
        error: (e) => {
          this.trendError = message(e);
          this.trendBusy = false;
        },
      });
  }
  previousWeek() {
    const d = new Date(today() + 'T00:00:00Z');
    const day = d.getUTCDay();
    d.setUTCDate(d.getUTCDate() - (day === 0 ? 6 : day - 1) - 7);
    return d.toISOString().slice(0, 10);
  }
  format(value: any) {
    return value === null || value === undefined
      ? 'Chưa đủ dữ liệu'
      : new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(Number(value));
  }
  unit(key: string) {
    return key === 'calories' ? 'kcal' : key === 'sodium' ? 'mg' : 'g';
  }
  date(value: string) {
    return value ? new Date(value).toLocaleString('vi-VN') : '';
  }
  load(show = true) {
    if (show) this.busy = true;
    this.api.get<any>('/insights').subscribe({
      next: (r) => {
        this.summary = r.summary;
        this.updatedAt = r.updatedAt;
        this.queued = r.processing;
        this.busy = false;
        if (r.error) this.error = r.error;
      },
      error: (e) => {
        this.error = message(e);
        this.busy = false;
      },
    });
  }
  refresh() {
    this.error = '';
    this.queued = true;
    this.api.post('/monitoring/refresh', {}).subscribe({
      next: () => {
        this.notice = 'Đã xếp lịch phân tích. Dữ liệu sẽ tự cập nhật khi hoàn tất.';
        this.load(false);
      },
      error: (e) => {
        this.error = message(e);
        this.queued = false;
      },
    });
  }
  loadSettings() {
    this.api.get<any>('/monitoring/settings').subscribe({
      next: (r) => {
        this.settings = {};
        for (const key of ['fiberMin', 'sugarsMax', 'sodiumMax', 'weightChangePercent'])
          this.settings[key] = r[key] == null ? null : Number(r[key]);
        for (const key of [
          'weightWindowDays',
          'targetTolerancePercent',
          'limitSource',
          'reminders',
        ])
          this.settings[key] = r[key];
      },
      error: (e) => (this.error = message(e)),
    });
  }
  saveSettings() {
    this.saving = true;
    this.error = '';
    this.api.put('/monitoring/settings', this.settings).subscribe({
      next: () => {
        this.saving = false;
        this.notice = 'Đã lưu giới hạn cá nhân và xếp lịch kiểm tra lại.';
        this.load(false);
      },
      error: (e) => {
        this.error = message(e);
        this.saving = false;
      },
    });
  }
  loadReports(more = false, background = false) {
    this.api
      .get<any>(
        '/insights/reports?limit=20' + (more && this.cursor ? '&cursor=' + this.cursor : ''),
      )
      .subscribe({
        next: (r) => {
          if (background) {
            const ids = new Set(r.items.map((x: any) => x.id));
            const tail = this.reports.filter((x) => !ids.has(x.id));
            this.reports = [...r.items, ...tail];
            if (!tail.length) this.cursor = r.nextCursor;
            if (
              this.report &&
              r.items.some(
                (x: any) => x.id === this.report.id && x.updatedAt !== this.report.updatedAt,
              )
            )
              this.openReport(this.report.id);
          } else {
            this.reports = more ? [...this.reports, ...r.items] : r.items;
            this.cursor = r.nextCursor;
          }
        },
        error: (e) => (this.error = message(e)),
      });
  }
  openReport(id: number) {
    this.api
      .get<any>(`/insights/reports/${id}`)
      .subscribe({ next: (r) => (this.report = r), error: (e) => (this.error = message(e)) });
  }
  createReport() {
    this.error = '';
    this.api.post('/insights/reports', { start: this.reportStart }).subscribe({
      next: () =>
        (this.notice =
          'Đã xếp lịch tạo/cập nhật báo cáo 7 ngày. Bạn sẽ nhận thông báo khi hoàn tất.'),
      error: (e) => (this.error = message(e)),
    });
  }
}
