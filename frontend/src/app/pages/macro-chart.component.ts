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
  selector: 'app-macro-chart',
  imports: [CommonModule],
  template: `
    <div class="macro-chart-container">
      <div class="chart-wrapper">
        <canvas #canvas></canvas>
        <div class="chart-center-label">
          <span class="total-cal">{{ Math.round(consumed?.calories || 0) }}</span>
          <span class="cal-unit">kcal đã nạp</span>
        </div>
      </div>
      <div class="macro-legend">
        <div class="legend-item protein">
          <div class="legend-dot"></div>
          <div class="legend-info">
            <div class="legend-title">
              <span>Chất đạm (Protein)</span>
              <strong
                >{{ Math.round(consumed?.protein || 0) }}g
                <small class="target-val" *ngIf="target">/ {{ target.protein }}g</small></strong
              >
            </div>
            <div class="legend-bar">
              <div
                class="legend-progress"
                [style.width.%]="getPercent(consumed?.protein, target?.protein)"
              ></div>
            </div>
            <div class="legend-meta">
              <span>{{ getMacroCalPercent('protein') }}% calo</span>
              <span *ngIf="target"
                >{{ getPercent(consumed?.protein, target?.protein) }}% mục tiêu</span
              >
            </div>
          </div>
        </div>

        <div class="legend-item carbs">
          <div class="legend-dot"></div>
          <div class="legend-info">
            <div class="legend-title">
              <span>Đường bột (Carbs)</span>
              <strong
                >{{ Math.round(consumed?.carbs || 0) }}g
                <small class="target-val" *ngIf="target">/ {{ target.carbs }}g</small></strong
              >
            </div>
            <div class="legend-bar">
              <div
                class="legend-progress"
                [style.width.%]="getPercent(consumed?.carbs, target?.carbs)"
              ></div>
            </div>
            <div class="legend-meta">
              <span>{{ getMacroCalPercent('carbs') }}% calo</span>
              <span *ngIf="target">{{ getPercent(consumed?.carbs, target?.carbs) }}% mục tiêu</span>
            </div>
          </div>
        </div>

        <div class="legend-item fat">
          <div class="legend-dot"></div>
          <div class="legend-info">
            <div class="legend-title">
              <span>Chất béo (Fat)</span>
              <strong
                >{{ Math.round(consumed?.fat || 0) }}g
                <small class="target-val" *ngIf="target">/ {{ target.fat }}g</small></strong
              >
            </div>
            <div class="legend-bar">
              <div
                class="legend-progress"
                [style.width.%]="getPercent(consumed?.fat, target?.fat)"
              ></div>
            </div>
            <div class="legend-meta">
              <span>{{ getMacroCalPercent('fat') }}% calo</span>
              <span *ngIf="target">{{ getPercent(consumed?.fat, target?.fat) }}% mục tiêu</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .macro-chart-container {
        display: grid;
        grid-template-columns: 200px 1fr;
        align-items: center;
        gap: 28px;
      }
      @media (max-width: 640px) {
        .macro-chart-container {
          grid-template-columns: 1fr;
          justify-items: center;
        }
      }
      .chart-wrapper {
        position: relative;
        width: 190px;
        height: 190px;
        margin: 0 auto;
      }
      .chart-center-label {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
        pointer-events: none;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .total-cal {
        font-size: 26px;
        font-weight: 800;
        color: #153c28;
        letter-spacing: -0.04em;
        line-height: 1.1;
      }
      .cal-unit {
        font-size: 11px;
        font-weight: 600;
        color: #728a7c;
        margin-top: 3px;
      }
      .macro-legend {
        display: flex;
        flex-direction: column;
        gap: 16px;
        width: 100%;
      }
      .legend-item {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        background: #fbfdfb;
        padding: 12px 14px;
        border-radius: 14px;
        border: 1px solid #edf4ee;
      }
      .legend-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        margin-top: 5px;
        flex-shrink: 0;
      }
      .protein .legend-dot {
        background: #10b981;
        box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.15);
      }
      .carbs .legend-dot {
        background: #f59e0b;
        box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.15);
      }
      .fat .legend-dot {
        background: #3b82f6;
        box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15);
      }

      .protein .legend-progress {
        background: linear-gradient(90deg, #10b981, #34d399);
      }
      .carbs .legend-progress {
        background: linear-gradient(90deg, #f59e0b, #fbbf24);
      }
      .fat .legend-progress {
        background: linear-gradient(90deg, #3b82f6, #60a5fa);
      }

      .legend-info {
        flex: 1;
        min-width: 0;
      }
      .legend-title {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: 6px;
      }
      .legend-title span {
        font-size: 13px;
        font-weight: 600;
        color: #274836;
      }
      .legend-title strong {
        font-size: 14px;
        color: #173d2a;
      }
      .target-val {
        font-size: 12px;
        color: #8aa193;
        font-weight: 500;
      }
      .legend-bar {
        height: 6px;
        background: #e9f0ea;
        border-radius: 6px;
        overflow: hidden;
        margin-bottom: 5px;
      }
      .legend-progress {
        height: 100%;
        border-radius: 6px;
        transition: width 0.4s ease;
      }
      .legend-meta {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        color: #809689;
        font-weight: 500;
      }
    `,
  ],
})
export class MacroChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() consumed: any;
  @Input() target: any;
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
    if (this.canvas && (changes['consumed'] || changes['target'])) {
      this.renderChart();
    }
  }

  getPercent(val: any, max: any): number {
    if (!max || max <= 0) return 0;
    return Math.min(100, Math.round((Number(val || 0) / Number(max)) * 100));
  }

  getMacroCalPercent(type: 'protein' | 'carbs' | 'fat'): number {
    const p = Number(this.consumed?.protein || 0) * 4;
    const c = Number(this.consumed?.carbs || 0) * 4;
    const f = Number(this.consumed?.fat || 0) * 9;
    const total = p + c + f;
    if (total <= 0) return 0;
    const val = type === 'protein' ? p : type === 'carbs' ? c : f;
    return Math.round((val / total) * 100);
  }

  renderChart() {
    if (!this.canvas?.nativeElement) return;
    this.chart?.destroy();

    const p = Number(this.consumed?.protein || 0);
    const c = Number(this.consumed?.carbs || 0);
    const f = Number(this.consumed?.fat || 0);
    const hasData = p + c + f > 0;

    const data = hasData ? [p, c, f] : [1, 1, 1];
    const colors = hasData ? ['#10b981', '#f59e0b', '#3b82f6'] : ['#e2ebe3', '#e2ebe3', '#e2ebe3'];

    this.chart = new Chart(this.canvas.nativeElement, {
      type: 'doughnut',
      data: {
        labels: ['Chất đạm (g)', 'Đường bột (g)', 'Chất béo (g)'],
        datasets: [
          {
            data,
            backgroundColor: colors,
            borderWidth: 0,
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '76%',
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: hasData,
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const val = context.parsed || 0;
                return ` ${label}: ${Math.round(val)}g`;
              },
            },
          },
        },
      },
    });
  }
}
