import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-target-bar-chart',
  imports: [CommonModule],
  template: `
    <div class="target-chart-box">
      <div class="chart-canvas-wrapper">
        <canvas #canvas></canvas>
      </div>
      <div class="legend-row">
        <span class="legend-tag consumed" *ngIf="hasActual"><i class="dot"></i> Thực tế đã ăn</span>
        <span class="legend-tag target" *ngIf="target"><i class="dot"></i> Mục tiêu</span>
        <span class="legend-tag planned" *ngIf="planned && planned.calories > 0"
          ><i class="dot"></i> Đã lên kế hoạch</span
        >
      </div>
    </div>
  `,
  styles: [
    `
      .target-chart-box {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .chart-canvas-wrapper {
        height: 220px;
        position: relative;
      }
      .legend-row {
        display: flex;
        justify-content: center;
        gap: 18px;
        flex-wrap: wrap;
      }
      .legend-tag {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        font-size: 12px;
        font-weight: 600;
        color: #4b6656;
      }
      .legend-tag .dot {
        width: 10px;
        height: 10px;
        border-radius: 3px;
        display: inline-block;
      }
      .legend-tag.consumed .dot {
        background: #16a34a;
      }
      .legend-tag.target .dot {
        background: #cbd5e1;
      }
      .legend-tag.planned .dot {
        background: #38bdf8;
      }
    `,
  ],
})
export class TargetBarChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() consumed: any;
  @Input() target: any;
  @Input() planned: any;
  @Input() hasActual = true;
  @ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>;
  chart?: Chart;
  ngOnDestroy() {
    this.chart?.destroy();
  }

  ngAfterViewInit() {
    this.render();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (
      this.canvas &&
      (changes['consumed'] || changes['target'] || changes['planned'] || changes['hasActual'])
    ) {
      this.render();
    }
  }

  render() {
    if (!this.canvas?.nativeElement) return;
    this.chart?.destroy();

    // Chuẩn hóa theo % mục tiêu để so sánh công bằng trên cùng 1 biểu đồ
    // Protein, Carbs, Fat, Calories
    const labels = ['Calories (kcal)', 'Chất đạm (g)', 'Đường bột (g)', 'Chất béo (g)'];

    const targetVals = [
      Number(this.target?.calories || 0),
      Number(this.target?.protein || 0),
      Number(this.target?.carbs || 0),
      Number(this.target?.fat || 0),
    ];

    const consumedVals = [
      Math.round(Number(this.consumed?.calories || 0)),
      Math.round(Number(this.consumed?.protein || 0)),
      Math.round(Number(this.consumed?.carbs || 0)),
      Math.round(Number(this.consumed?.fat || 0)),
    ];

    const plannedVals = [
      Math.round(Number(this.planned?.calories || 0)),
      Math.round(Number(this.planned?.protein || 0)),
      Math.round(Number(this.planned?.carbs || 0)),
      Math.round(Number(this.planned?.fat || 0)),
    ];

    const datasets: any[] = [];

    // Dataset Thực tế đã ăn
    if (this.hasActual)
      datasets.push({
        label: 'Đã ăn thực tế',
        data: consumedVals,
        backgroundColor: '#16a34a',
        borderRadius: 6,
        maxBarThickness: 32,
      });

    // Dataset Mục tiêu (nếu có)
    if (this.target) {
      datasets.push({
        label: 'Mục tiêu',
        data: targetVals,
        backgroundColor: '#cbd5e1',
        borderRadius: 6,
        maxBarThickness: 32,
      });
    }

    // Dataset Kế hoạch (nếu có)
    if (this.planned && Number(this.planned.calories) > 0) {
      datasets.push({
        label: 'Đã lập kế hoạch',
        data: plannedVals,
        backgroundColor: '#38bdf8',
        borderRadius: 6,
        maxBarThickness: 32,
      });
    }

    this.chart = new Chart(this.canvas.nativeElement, {
      type: 'bar',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#173c2a',
            padding: 10,
            cornerRadius: 10,
            titleFont: { family: 'Be Vietnam Pro', size: 12 },
            bodyFont: { family: 'Be Vietnam Pro', size: 13, weight: 600 },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: {
              font: { family: 'Be Vietnam Pro', size: 11 },
              color: '#849b8e',
            },
          },
          x: {
            grid: { display: false },
            ticks: {
              font: { family: 'Be Vietnam Pro', size: 12, weight: 600 },
              color: '#2a4a37',
            },
          },
        },
      },
    });
  }
}
