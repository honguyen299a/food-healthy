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
  selector: 'app-meal-chart',
  imports: [CommonModule],
  template: `
    <div class="meal-chart-container">
      <div class="chart-box">
        <canvas #canvas></canvas>
      </div>
      <div class="meal-cards-grid">
        <div class="meal-pill breakfast">
          <div class="meal-pill-head">
            <span class="icon">🌅</span>
            <div>
              <strong>Bữa sáng</strong>
              <small>{{ getMealCount('BREAKFAST') }} món</small>
            </div>
          </div>
          <div class="meal-pill-body">
            <b>{{ Math.round(getMealCalories('BREAKFAST')) }}</b>
            <span>kcal ({{ getMealPercent('BREAKFAST') }}%)</span>
          </div>
        </div>

        <div class="meal-pill lunch">
          <div class="meal-pill-head">
            <span class="icon">☀️</span>
            <div>
              <strong>Bữa trưa</strong>
              <small>{{ getMealCount('LUNCH') }} món</small>
            </div>
          </div>
          <div class="meal-pill-body">
            <b>{{ Math.round(getMealCalories('LUNCH')) }}</b>
            <span>kcal ({{ getMealPercent('LUNCH') }}%)</span>
          </div>
        </div>

        <div class="meal-pill dinner">
          <div class="meal-pill-head">
            <span class="icon">🌙</span>
            <div>
              <strong>Bữa tối</strong>
              <small>{{ getMealCount('DINNER') }} món</small>
            </div>
          </div>
          <div class="meal-pill-body">
            <b>{{ Math.round(getMealCalories('DINNER')) }}</b>
            <span>kcal ({{ getMealPercent('DINNER') }}%)</span>
          </div>
        </div>

        <div class="meal-pill snack">
          <div class="meal-pill-head">
            <span class="icon">🍎</span>
            <div>
              <strong>Bữa phụ</strong>
              <small>{{ getMealCount('SNACK') }} món</small>
            </div>
          </div>
          <div class="meal-pill-body">
            <b>{{ Math.round(getMealCalories('SNACK')) }}</b>
            <span>kcal ({{ getMealPercent('SNACK') }}%)</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .meal-chart-container {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      .chart-box {
        height: 190px;
        position: relative;
      }
      .meal-cards-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 12px;
      }
      @media (max-width: 768px) {
        .meal-cards-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }
      .meal-pill {
        background: #fbfdfb;
        border: 1px solid #ebf2ec;
        border-radius: 14px;
        padding: 12px 14px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        transition:
          transform 0.2s,
          box-shadow 0.2s;
      }
      .meal-pill:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(20, 60, 35, 0.06);
      }
      .meal-pill-head {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .meal-pill-head .icon {
        font-size: 20px;
        line-height: 1;
      }
      .meal-pill-head strong {
        display: block;
        font-size: 13px;
        color: #1a3d2a;
      }
      .meal-pill-head small {
        font-size: 11px;
        color: #83978a;
      }
      .meal-pill-body {
        display: flex;
        align-items: baseline;
        gap: 5px;
      }
      .meal-pill-body b {
        font-size: 18px;
        color: #153c28;
      }
      .meal-pill-body span {
        font-size: 11px;
        color: #728c7d;
      }
      .breakfast {
        border-top: 3px solid #f97316;
      }
      .lunch {
        border-top: 3px solid #16a34a;
      }
      .dinner {
        border-top: 3px solid #8b5cf6;
      }
      .snack {
        border-top: 3px solid #06b6d4;
      }
    `,
  ],
})
export class MealChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() items: any[] = [];
  @ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>;
  chart?: Chart;
  ngOnDestroy() {
    this.chart?.destroy();
  }
  Math = Math;

  ngAfterViewInit() {
    this.renderChart();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.canvas && changes['items']) {
      this.renderChart();
    }
  }

  getMealCalories(meal: string): number {
    return (this.items || [])
      .filter((x) => x.meal === meal)
      .reduce(
        (acc, curr) => acc + (Number(curr.food?.calories || 0) * Number(curr.grams || 0)) / 100,
        0,
      );
  }

  getMealCount(meal: string): number {
    return (this.items || []).filter((x) => x.meal === meal).length;
  }

  getTotalCalories(): number {
    return (this.items || []).reduce(
      (acc, curr) => acc + (Number(curr.food?.calories || 0) * Number(curr.grams || 0)) / 100,
      0,
    );
  }

  getMealPercent(meal: string): number {
    const total = this.getTotalCalories();
    if (total <= 0) return 0;
    return Math.round((this.getMealCalories(meal) / total) * 100);
  }

  renderChart() {
    if (!this.canvas?.nativeElement) return;
    this.chart?.destroy();

    const b = this.getMealCalories('BREAKFAST');
    const l = this.getMealCalories('LUNCH');
    const d = this.getMealCalories('DINNER');
    const s = this.getMealCalories('SNACK');

    this.chart = new Chart(this.canvas.nativeElement, {
      type: 'bar',
      data: {
        labels: ['Bữa sáng', 'Bữa trưa', 'Bữa tối', 'Bữa phụ'],
        datasets: [
          {
            label: 'Năng lượng (kcal)',
            data: [Math.round(b), Math.round(l), Math.round(d), Math.round(s)],
            backgroundColor: [
              'rgba(249, 115, 22, 0.85)',
              'rgba(22, 163, 74, 0.85)',
              'rgba(139, 92, 246, 0.85)',
              'rgba(6, 182, 212, 0.85)',
            ],
            borderColor: ['#f97316', '#16a34a', '#8b5cf6', '#06b6d4'],
            borderWidth: 1,
            borderRadius: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => ` ${context.parsed.y} kcal`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.04)',
            },
            ticks: {
              font: { family: 'Be Vietnam Pro', size: 11 },
              color: '#849b8e',
            },
          },
          x: {
            grid: { display: false },
            ticks: {
              font: { family: 'Be Vietnam Pro', size: 12, weight: 600 },
              color: '#345241',
            },
          },
        },
      },
    });
  }
}
