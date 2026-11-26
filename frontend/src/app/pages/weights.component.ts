import { DatePickerComponent } from '../core/date-picker.component';
import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewChecked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import Chart from 'chart.js/auto';
import { ApiService } from '../core/services/api.service';
import { message, today } from '../core/ui';
import { ChartPeriodFilterComponent, ChartRange } from '../core/chart-period-filter.component';
@Component({
  selector: 'app-weights',
  imports: [FormsModule, MatButtonModule, DatePickerComponent, ChartPeriodFilterComponent],
  template: ` <div class="page weights-page">
    <div class="page-head">
      <span class="eyebrow">HÀNH TRÌNH CỦA BẠN</span>
      <h1>Theo dõi cân nặng</h1>
      <p>Ghi lại thay đổi theo từng ngày để nhìn thấy tiến bộ.</p>
    </div>
    @if (error) {
      <p class="error" role="alert">{{ error }}</p>
    }
    @if (notice) {
      <p class="notice" role="status">{{ notice }}</p>
    }
    <div class="two-cols">
      <section class="panel">
        <h2>Biểu đồ cân nặng</h2>
        <app-chart-period-filter
          [mode]="period.mode"
          [date]="period.date"
          [month]="period.month"
          (rangeChange)="selectPeriod($event)"
        />
        <div class="weight-plot">
          <canvas
            #chart
            role="img"
            aria-label="Cân nặng theo khoảng ngày hoặc tháng đã chọn"
          ></canvas>
        </div>
        @if (!filteredWeights.length) {
          <p class="subtle">
            Chưa có lần đo trong khoảng đã chọn. Biểu đồ chỉ hiển thị lần đo thực tế.
          </p>
        }
        <h3>Lịch sử trong khoảng chọn</h3>
        @for (w of filteredWeights.slice().reverse(); track w.id) {
          <div class="list-row">
            <span>{{ w.date.slice(0, 10) }}</span
            ><strong>{{ w.weightKg }} kg</strong
            ><button mat-button [disabled]="saving" (click)="remove(w.id)">Xóa</button>
          </div>
        }
      </section>
      <section class="panel">
        <h2>Ghi cân nặng</h2>
        <form class="stack" (ngSubmit)="save()">
          <div>
            <label>Ngày</label>
            <div><app-date-picker [value]="date" (valueChange)="date = $event" /></div>
          </div>
          <label
            >Cân nặng (kg)<input
              type="number"
              name="weight"
              [(ngModel)]="weightKg"
              min="25"
              max="400"
              step="0.1"
              required /></label
          ><button mat-flat-button [disabled]="saving">
            {{ saving ? 'Đang lưu' : 'Lưu cân nặng' }}
          </button>
        </form>
      </section>
    </div>
  </div>`,
  styles: ['.weight-plot{height:280px;position:relative}'],
})
export class WeightsComponent implements OnInit, AfterViewChecked, OnDestroy {
  api = inject(ApiService);
  @ViewChild('chart') canvas?: ElementRef<HTMLCanvasElement>;
  chart?: Chart;
  weights: any[] = [];
  date = today();
  weightKg = 60;
  error = '';
  notice = '';
  dirty = false;
  saving = false;
  period: ChartRange = { mode: 'MONTH', date: today(), month: today().slice(0, 7) };
  ngOnInit() {
    this.load();
  }
  ngAfterViewChecked() {
    if (this.dirty && this.canvas) {
      const values = this.filteredWeights;
      this.chart?.destroy();
      this.chart = new Chart(this.canvas.nativeElement, {
        type: 'line',
        data: {
          labels: values.map((w) => w.date.slice(0, 10)),
          datasets: [
            {
              label: 'Cân nặng (kg)',
              data: values.map((w) => Number(w.weightKg)),
              borderColor: '#16a34a',
              backgroundColor: 'rgba(22,163,74,.12)',
              fill: true,
              tension: 0.3,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
        },
      });
      this.dirty = false;
    }
  }
  ngOnDestroy() {
    this.chart?.destroy();
  }
  get filteredWeights() {
    return this.weights.filter((w) =>
      this.period.mode === 'DAY'
        ? w.date.slice(0, 10) === this.period.date
        : w.date.slice(0, 7) === this.period.month,
    );
  }
  selectPeriod(period: ChartRange) {
    this.period = period;
    this.dirty = true;
  }
  load() {
    this.api.get('/weights').subscribe({
      next: (w) => {
        this.weights = w;
        this.dirty = true;
      },
      error: (e) => (this.error = message(e)),
    });
  }
  save() {
    if (this.saving) return;
    this.saving = true;
    this.error = '';
    this.api.post('/weights', { date: this.date, weightKg: this.weightKg }).subscribe({
      next: () => {
        this.saving = false;
        this.notice = 'Đã lưu cân nặng.';
        this.period = { ...this.period, date: this.date, month: this.date.slice(0, 7) };
        this.load();
      },
      error: (e) => {
        this.error = message(e);
        this.saving = false;
      },
    });
  }
  remove(id: number) {
    if (!confirm('Xóa lần đo cân nặng này?')) return;
    this.api
      .delete(`/weights/${id}`)
      .subscribe({ next: () => this.load(), error: (e) => (this.error = message(e)) });
  }
}
