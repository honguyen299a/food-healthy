import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import Chart from 'chart.js/auto';
@Component({
  selector: 'app-admin-chart',
  template: `<div class="chart">
    <canvas #canvas role="img" [attr.aria-label]="description"></canvas>
  </div>`,
  styles: ['.chart{height:300px;min-width:0;position:relative}'],
})
export class AdminChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() type: 'bar' | 'doughnut' = 'bar';
  @Input() labels: string[] = [];
  @Input() datasets: any[] = [];
  @Input() horizontal = false;
  @Input() stacked = false;
  @Input() description = 'Biểu đồ thống kê';
  @ViewChild('canvas') canvas?: ElementRef<HTMLCanvasElement>;
  private chart?: Chart;
  ngAfterViewInit() {
    this.draw();
  }
  ngOnChanges() {
    this.draw();
  }
  ngOnDestroy() {
    this.chart?.destroy();
  }
  private draw() {
    if (!this.canvas) return;
    this.chart?.destroy();
    this.chart = new Chart(this.canvas.nativeElement, {
      type: this.type,
      data: { labels: this.labels, datasets: this.datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: this.horizontal ? 'y' : 'x',
        plugins: {
          legend: { display: this.type === 'bar' && this.datasets.length > 1, position: 'bottom' },
          tooltip: {
            callbacks: {
              label: (context) =>
                `${context.dataset.label || context.label}: ${context.formattedValue}`,
            },
          },
        },
        ...(this.type === 'bar'
          ? {
              scales: {
                x: { stacked: this.stacked, beginAtZero: this.horizontal, ticks: { precision: 0 } },
                y: { stacked: this.stacked, beginAtZero: true, ticks: { precision: 0 } },
              },
            }
          : { cutout: '70%' }),
      },
    });
  }
}
