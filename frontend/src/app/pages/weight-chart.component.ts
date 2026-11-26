import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-weight-chart',
  imports: [CommonModule],
  template: `
    <section class="panel weight-panel">
      <div class="panel-head">
        <div>
          <h2>Xu hướng cân nặng</h2>
          <p class="subtle">Biểu đồ biến thiên cân nặng theo thời gian</p>
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
            <small>{{ diffWeight > 0 ? 'Cần giảm' : 'Cần tăng' }}</small>
            <strong [class.success]="diffWeight === 0"
              >{{ Math.abs(diffWeight) }} <span class="unit">kg</span></strong
            >
          </div>
        </div>
      </div>

      <div class="chart-wrapper">
        <canvas #canvas></canvas>
      </div>

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
        position: relative;
        width: 100%;
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
  @ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>;
  chart?: Chart;
  ngOnDestroy() {
    this.chart?.destroy();
  }
  Math = Math;

  get currentWeight(): number {
    if (!this.weights || !this.weights.length) return 0;
    return Number(this.weights[this.weights.length - 1].weightKg);
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
    if (!this.weights || !this.weights.length) return;

    const ctx = this.canvas.nativeElement.getContext('2d');
    let gradient: any = 'rgba(22, 163, 74, 0.12)';
    if (ctx) {
      const g = ctx.createLinearGradient(0, 0, 0, 250);
      g.addColorStop(0, 'rgba(22, 163, 74, 0.25)');
      g.addColorStop(1, 'rgba(22, 163, 74, 0.01)');
      gradient = g;
    }

    const labels = this.weights.map((w) => {
      const d = new Date(w.date);
      return `${d.getDate()}/${d.getMonth() + 1}`;
    });
    const values = this.weights.map((w) => Number(w.weightKg));

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
        pointRadius: 0,
        fill: false,
      });
    }

    this.chart = new Chart(this.canvas.nativeElement, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
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
