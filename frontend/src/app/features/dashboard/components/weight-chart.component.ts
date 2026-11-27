import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-weight-chart',
  imports: [CommonModule],
  template: `
    <section class="panel weight-panel">
      <div class="panel-head">
        <div>
          <h2>Xu hướng cân nặng</h2>
          <p class="subtle">{{ periodDescription }}</p>
        </div>
        <div class="weight-summary" *ngIf="weights && weights.length">
          <div class="weight-chip current">
            <small>Lần đo cuối kỳ</small>
            <strong>{{ currentWeight }} <span class="unit">kg</span></strong>
          </div>
          <div class="weight-chip target" *ngIf="targetWeight">
            <small>Mục tiêu</small>
            <strong>{{ targetWeight }} <span class="unit">kg</span></strong>
          </div>
          <div class="weight-chip diff" *ngIf="targetWeight">
            <small>{{
              diffWeight === 0 ? 'Đạt mục tiêu' : diffWeight > 0 ? 'Cần giảm' : 'Cần tăng'
            }}</small>
            <strong [class.success]="diffWeight === 0"
              >{{ Math.abs(diffWeight) }} <span class="unit">kg</span></strong
            >
          </div>
        </div>
      </div>

      <div class="chart-wrapper">
        <canvas #canvas role="img" [attr.aria-label]="periodDescription"></canvas>
      </div>

      @if (measurements.length === 1) {
        <div class="weight-point-note" role="status">
          <p>
            {{
              periodMode === 'DAY'
                ? 'Ngày đã chọn có 1 lần đo. Chọn Theo tháng để xem thay đổi giữa các ngày.'
                : 'Khoảng đã chọn chỉ có 1 lần đo. Cần ít nhất 2 lần đo khác ngày để hiển thị đường xu hướng.'
            }}
          </p>
          @if (periodMode === 'DAY') {
            <button type="button" class="weight-month-link" (click)="viewMonth.emit()">
              Xem theo tháng
            </button>
          }
        </div>
      }

      <div class="weight-empty-note" *ngIf="!weights || !weights.length">
        <p>
          Chưa có dữ liệu cân nặng nào được ghi nhận. Hãy thêm cân nặng đầu tiên để bắt đầu theo
          dõi.
        </p>
      </div>
    </section>
  `,
  styles: [
    `
      .weight-panel {
        position: relative;
      }
      .panel-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 22px;
        flex-wrap: wrap;
        gap: 16px;
      }
      .weight-summary {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }
      .weight-chip {
        background: #f8faf8;
        border: 1px solid #e7efe8;
        border-radius: 12px;
        padding: 8px 14px;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .weight-chip small {
        font-size: 11px;
        color: #7d9486;
        font-weight: 500;
      }
      .weight-chip strong {
        font-size: 16px;
        color: #173d2a;
      }
      .weight-chip .unit {
        font-size: 11px;
        font-weight: 400;
        color: #8fa597;
      }
      .weight-chip.current {
        background: #eef8f1;
        border-color: #d1ebd8;
      }
      .weight-chip.current strong {
        color: #15803d;
      }
      .weight-chip.target {
        background: #fff8f1;
        border-color: #fed7aa;
      }
      .weight-chip.target strong {
        color: #ea580c;
      }
      .weight-chip.diff strong.success {
        color: #16a34a;
      }
      .chart-wrapper {
        height: 250px;
        flex: 0 0 250px;
        min-width: 0;
        position: relative;
        width: 100%;
      }
      .weight-point-note {
        margin-top: 12px;
        color: #607b6a;
        font-size: 12px;
        line-height: 1.7;
      }
      .weight-point-note p {
        margin: 0;
      }
      .weight-month-link {
        margin-top: 6px;
        border: 0;
        padding: 4px 0;
        background: transparent;
        color: #157b3b;
        font: inherit;
        font-weight: 700;
        text-decoration: underline;
        text-underline-offset: 3px;
        cursor: pointer;
      }
      .weight-empty-note {
        text-align: center;
        padding: 30px 10px;
        color: #8da295;
        font-size: 13px;
      }
    `,
  ],
})
export class WeightChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() weights: any[] = [];
  @Input() targetWeight?: number | null = null;
  @Input() periodMode: 'DAY' | 'MONTH' | null = null;
  @Output() viewMonth = new EventEmitter<void>();
  @ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>;
  chart?: Chart;
  ngOnDestroy() {
    this.chart?.destroy();
  }
  Math = Math;

  get measurements(): any[] {
    return [...(this.weights || [])].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }

  get periodDescription(): string {
    return this.periodMode === 'DAY'
      ? 'Lần đo cân nặng trong ngày đã chọn'
      : this.periodMode === 'MONTH'
        ? 'Các lần đo cân nặng trong tháng đã chọn'
        : 'Biểu đồ biến thiên cân nặng theo thời gian';
  }

  get currentWeight(): number {
    const measurements = this.measurements;
    return measurements.length ? Number(measurements[measurements.length - 1].weightKg) : 0;
  }

  get diffWeight(): number {
    if (!this.targetWeight) return 0;
    return Math.round((this.currentWeight - Number(this.targetWeight)) * 10) / 10;
  }

  ngAfterViewInit() {
    this.render();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.canvas && (changes['weights'] || changes['targetWeight'])) {
      this.render();
    }
  }

  render() {
    if (!this.canvas?.nativeElement) return;
    this.chart?.destroy();
    this.chart = undefined;
    const measurements = this.measurements;
    if (!measurements.length) return;

    const ctx = this.canvas.nativeElement.getContext('2d');
    let gradient: any = 'rgba(22, 163, 74, 0.12)';
    if (ctx) {
      const g = ctx.createLinearGradient(0, 0, 0, 250);
      g.addColorStop(0, 'rgba(22, 163, 74, 0.25)');
      g.addColorStop(1, 'rgba(22, 163, 74, 0.01)');
      gradient = g;
    }

    const labels = measurements.map((w) => {
      const [, month, date] = String(w.date).slice(0, 10).split('-');
      return `${Number(date)}/${Number(month)}`;
    });
    const values = measurements.map((w) => Number(w.weightKg));
    const singlePoint = measurements.length === 1;
    const scaleValues = this.targetWeight ? [...values, Number(this.targetWeight)] : values;
    const minWeight = Math.min(...scaleValues),
      maxWeight = Math.max(...scaleValues);
    const axisPadding = Math.max(0.5, (maxWeight - minWeight) * 0.15);

    const datasets: any[] = [
      {
        label: 'Cân nặng (kg)',
        data: values,
        borderColor: '#16a34a',
        backgroundColor: gradient,
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointHoverRadius: 7,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#16a34a',
        pointBorderWidth: 2,
      },
    ];

    if (this.targetWeight) {
      datasets.push({
        label: 'Mục tiêu (kg)',
        data: labels.map(() => Number(this.targetWeight)),
        borderColor: '#f97316',
        borderDash: [6, 6],
        borderWidth: 2,
        pointRadius: singlePoint ? 4 : 0,
        pointBackgroundColor: '#f97316',
        fill: false,
      });
    }

    this.chart = new Chart(this.canvas.nativeElement, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: !!this.targetWeight,
            position: 'top',
            align: 'end',
            labels: {
              boxWidth: 16,
              usePointStyle: true,
              font: { family: 'Be Vietnam Pro', size: 12, weight: 600 },
            },
          },
          tooltip: {
            backgroundColor: '#173c2a',
            padding: 10,
            cornerRadius: 10,
            titleFont: { family: 'Be Vietnam Pro', size: 12 },
            bodyFont: { family: 'Be Vietnam Pro', size: 13, weight: 700 },
            callbacks: {
              label: (context) => ` ${context.dataset.label}: ${context.parsed.y} kg`,
            },
          },
        },
        scales: {
          y: {
            suggestedMin: Math.max(0, minWeight - axisPadding),
            suggestedMax: maxWeight + axisPadding,
            grid: {
              color: 'rgba(0, 0, 0, 0.04)',
            },
            ticks: {
              font: { family: 'Be Vietnam Pro', size: 11 },
              color: '#849b8e',
              callback: (val) => `${val} kg`,
            },
          },
          x: {
            offset: singlePoint,
            grid: { display: false },
            ticks: {
              font: { family: 'Be Vietnam Pro', size: 11 },
              color: '#849b8e',
            },
          },
        },
      },
    });
  }
}
