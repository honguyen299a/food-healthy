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
  selector: 'app-nutrition-trend',
  template:
    '<div class="trend"><canvas #canvas role="img" aria-label="Biểu đồ calories theo nhật ký; ngày chưa ghi được để trống"></canvas></div>',
  styles: ['.trend{height:240px;position:relative;min-width:0}'],
})
export class NutritionTrendComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() days: any[] = [];
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
      type: 'line',
      data: {
        labels: this.days.map((d) => d.date.slice(5)),
        datasets: [
          {
            label: 'Calories đã ghi (kcal)',
            data: this.days.map((d) => (d.logged ? d.totals.calories : null)),
            borderColor: '#16833e',
            backgroundColor: '#16833e12',
            fill: true,
            tension: 0.2,
            spanGaps: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } },
      },
    });
  }
}
