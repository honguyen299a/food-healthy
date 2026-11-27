import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import {
  ChartPeriodFilterComponent,
  ChartRange,
} from '../../shared/components/chart-period-filter/chart-period-filter.component';
import { DatePickerComponent } from '../../shared/components/date-picker/date-picker.component';
import { mealNames, message, num, today } from '../../shared/utils/ui';
import { MacroChartComponent } from './components/macro-chart.component';
import { MealChartComponent } from './components/meal-chart.component';
import { NutritionTrendComponent } from './components/nutrition-trend.component';
import { TargetBarChartComponent } from './components/target-bar-chart.component';
import { WeightChartComponent } from './components/weight-chart.component';

@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatButtonModule,
    WeightChartComponent,
    MacroChartComponent,
    MealChartComponent,
    TargetBarChartComponent,
    DatePickerComponent,
    ChartPeriodFilterComponent,
    NutritionTrendComponent,
  ],
  template: `
    <div class="page dashboard-page">
      <!-- Dashboard Header -->
      <div class="dash-head">
        <div class="dash-head-left">
          <div class="badge-row">
            <span class="status-pill active">
              <span class="pulsing-dot"></span>
              {{ api.usageMode() === 'PERSONALIZED' ? 'Chế độ cá nhân hóa' : 'Tự lập kế hoạch' }}
            </span>
            <span class="date-chip">📅 {{ formatDate(date) }}</span>
          </div>
          <h1>Tổng quan dinh dưỡng hôm nay</h1>
          <p class="subtle">
            Theo dõi cân bằng năng lượng và thành phần dinh dưỡng để duy trì sức khỏe bền vững.
          </p>
        </div>

        <div class="dash-head-actions">
          <div class="date-nav">
            <button type="button" class="date-btn" (click)="changeDate(-1)" title="Ngày trước">
              ‹
            </button>
            <app-date-picker [value]="date" (valueChange)="date = $event; load()" />
            <button type="button" class="date-btn" (click)="changeDate(1)" title="Ngày sau">
              ›
            </button>
            <button type="button" class="today-btn" *ngIf="date !== todayStr" (click)="goToToday()">
              Hôm nay
            </button>
          </div>
          <div class="quick-links">
            <a mat-stroked-button routerLink="/logs" [queryParams]="{ date: date }"
              >+ Ghi nhật ký</a
            >
            <a mat-flat-button routerLink="/plans" [queryParams]="{ date: date }">Lập kế hoạch</a>
          </div>
        </div>
      </div>

      @if (error) {
        <div class="error-banner">
          <span class="error-icon">⚠️</span>
          <span>{{ error }}</span>
        </div>
      }

      @if (data) {
        <!-- Callout nếu chưa có khảo sát / mục tiêu -->
        @if (!data.target) {
          <section class="mode-callout-panel">
            <div class="callout-content">
              <div class="callout-icon">🎯</div>
              <div>
                <h2>Bạn chưa thiết lập mục tiêu dinh dưỡng</h2>
                <p>
                  Calories và các chất vi lượng đang được tổng hợp tự động từ nhật ký ăn. Bạn có thể
                  tự đặt mục tiêu theo ý muốn hoặc làm khảo sát sức khỏe để nhận đề xuất khoa học.
                </p>
              </div>
            </div>
            <a mat-flat-button routerLink="/profile" class="callout-btn">Thiết lập mục tiêu ngay</a>
          </section>
        }

        <!-- Bento Stat Cards Hàng đầu -->
        <div class="bento-stats-grid">
          <!-- Card Calories Lớn -->
          <article class="stat-card hero-stat" [class.overflow]="isCaloriesOverflow()">
            <div class="stat-top">
              <span class="stat-label">Năng lượng tiêu thụ</span>
              <span class="stat-badge" [class.badge-warn]="isCaloriesOverflow()">
                {{ isCaloriesOverflow() ? 'Vượt mục tiêu' : 'Đang duy trì tốt' }}
              </span>
            </div>
            <div class="stat-main">
              <strong class="stat-num">{{ n(data.consumed.calories) }}</strong>
              <span class="stat-sub">
                @if (data.target) {
                  / {{ data.target.calories }} kcal
                } @else {
                  kcal
                }
              </span>
            </div>

            @if (data.target) {
              <div class="stat-progress-bar">
                <div
                  class="progress-fill"
                  [style.width.%]="percent(data.consumed.calories, data.target.calories)"
                ></div>
              </div>
              <div class="stat-footer">
                <span>{{ percent(data.consumed.calories, data.target.calories) }}% mục tiêu</span>
                <strong class="remaining-text">
                  @if (remainingCalories() >= 0) {
                    Còn lại: {{ n(remainingCalories()) }} kcal
                  } @else {
                    Vượt: +{{ n(Math.abs(remainingCalories())) }} kcal
                  }
                </strong>
              </div>
            }
          </article>

          <!-- Card Protein -->
          <article class="stat-card macro-stat protein-stat">
            <div class="stat-top">
              <span class="macro-name"><i class="macro-dot protein-bg"></i> Đạm (Protein)</span>
              <span class="macro-ratio"
                >{{ percent(data.consumed.protein, data.target?.protein) }}%</span
              >
            </div>
            <div class="stat-main">
              <strong class="stat-num">{{ n(data.consumed.protein) }}</strong>
              <span class="stat-sub">
                @if (data.target) {
                  / {{ data.target.protein }} g
                } @else {
                  g
                }
              </span>
            </div>
            <div class="stat-progress-bar">
              <div
                class="progress-fill protein-bg"
                [style.width.%]="percent(data.consumed.protein, data.target?.protein)"
              ></div>
            </div>
            <div class="stat-footer">
              <small>{{ Math.round(Number(data.consumed.protein || 0) * 4) }} kcal từ đạm</small>
            </div>
          </article>

          <!-- Card Carbs -->
          <article class="stat-card macro-stat carbs-stat">
            <div class="stat-top">
              <span class="macro-name"><i class="macro-dot carbs-bg"></i> Đường bột (Carbs)</span>
              <span class="macro-ratio"
                >{{ percent(data.consumed.carbs, data.target?.carbs) }}%</span
              >
            </div>
            <div class="stat-main">
              <strong class="stat-num">{{ n(data.consumed.carbs) }}</strong>
              <span class="stat-sub">
                @if (data.target) {
                  / {{ data.target.carbs }} g
                } @else {
                  g
                }
              </span>
            </div>
            <div class="stat-progress-bar">
              <div
                class="progress-fill carbs-bg"
                [style.width.%]="percent(data.consumed.carbs, data.target?.carbs)"
              ></div>
            </div>
            <div class="stat-footer">
              <small>{{ Math.round(Number(data.consumed.carbs || 0) * 4) }} kcal từ carbs</small>
            </div>
          </article>

          <!-- Card Fat -->
          <article class="stat-card macro-stat fat-stat">
            <div class="stat-top">
              <span class="macro-name"><i class="macro-dot fat-bg"></i> Chất béo (Fat)</span>
              <span class="macro-ratio">{{ percent(data.consumed.fat, data.target?.fat) }}%</span>
            </div>
            <div class="stat-main">
              <strong class="stat-num">{{ n(data.consumed.fat) }}</strong>
              <span class="stat-sub">
                @if (data.target) {
                  / {{ data.target.fat }} g
                } @else {
                  g
                }
              </span>
            </div>
            <div class="stat-progress-bar">
              <div
                class="progress-fill fat-bg"
                [style.width.%]="percent(data.consumed.fat, data.target?.fat)"
              ></div>
            </div>
            <div class="stat-footer">
              <small>{{ Math.round(Number(data.consumed.fat || 0) * 9) }} kcal từ chất béo</small>
            </div>
          </article>
        </div>

        <!-- Mini KPI Chỉ số cơ thể nếu có profile -->
        @if (data.target && data.target.bmi) {
          <div class="body-metrics-bar">
            <div class="metric-item">
              <span class="metric-label">Chỉ số BMI</span>
              <strong>{{ data.target.bmi }}</strong>
              <span
                class="metric-tag"
                [class.normal]="data.target.bmi >= 18.5 && data.target.bmi < 25"
              >
                {{ getBmiStatus(data.target.bmi) }}
              </span>
            </div>
            <div class="metric-item">
              <span class="metric-label">BMR (Trao đổi chất cơ bản)</span>
              <strong>{{ data.target.bmr }} <small>kcal/ngày</small></strong>
              <span class="metric-desc">Năng lượng tiêu hao khi nghỉ ngơi</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">TDEE (Tổng năng lượng tiêu hao)</span>
              <strong>{{ data.target.tdee }} <small>kcal/ngày</small></strong>
              <span class="metric-desc">Năng lượng cần dựa trên vận động</span>
            </div>
            <div class="metric-item" *ngIf="data.targetWeightKg">
              <span class="metric-label">Mục tiêu cân nặng</span>
              <strong>{{ data.targetWeightKg }} <small>kg</small></strong>
              <span class="metric-desc">Cần hướng tới</span>
            </div>
          </div>
        }

        <section class="panel chart-workspace" aria-label="Biểu đồ theo thời gian">
          <header class="chart-workspace-header">
            <div class="chart-workspace-toolbar">
              <h2>Biểu đồ theo thời gian</h2>
              <app-chart-period-filter
                [mode]="chartRange.mode"
                [date]="chartRange.date"
                [month]="chartRange.month"
                (rangeChange)="selectChartRange($event)"
              />
            </div>
            @if (chartsLoading) {
              <p class="subtle" role="status">Đang tải dữ liệu biểu đồ…</p>
            }
            @if (chartsError) {
              <p class="error" role="alert">{{ chartsError }}</p>
            }
            @if (chartData) {
              <p class="subtle">
                Khoảng xem: {{ chartData.period.start }} – {{ chartData.period.end }} ·
                {{ chartData.loggedDays }} ngày có nhật ký, {{ chartData.plannedDays }} ngày có kế
                hoạch.
              </p>
              <p class="subtle">
                {{
                  chartRange.mode === 'MONTH'
                    ? 'Biểu đồ thành phần và so sánh mục tiêu dùng trung bình trên ngày có dữ liệu; ngày chưa ghi được để trống. Mục tiêu đối chiếu là mục tiêu ngày hiện tại.'
                    : 'Biểu đồ chỉ dùng dữ liệu của ngày đã chọn.'
                }}
              </p>
            }
          </header>
          @if (chartData) {
            <div class="charts-grid-two">
              <section class="chart-panel chart-block">
                <div class="panel-head">
                  <div>
                    <h2>Phân bổ thành phần dinh dưỡng</h2>
                    <p class="subtle">Tỷ lệ đóng góp năng lượng từ Protein, Carbs và Chất béo</p>
                  </div>
                </div>
                @if (chartData.loggedDays) {
                  <app-macro-chart
                    [consumed]="chartData.averages"
                    [target]="chartData.target"
                  ></app-macro-chart>
                } @else {
                  <p class="subtle">Chưa có nhật ký thực tế trong khoảng đã chọn.</p>
                }
              </section>

              <section class="chart-panel chart-block">
                <div class="panel-head">
                  <div>
                    <h2>So sánh Thực tế vs Mục tiêu</h2>
                    <p class="subtle">
                      {{
                        chartRange.mode === 'MONTH'
                          ? 'Trung bình mỗi ngày có nhật ký/kế hoạch so với mục tiêu ngày hiện tại'
                          : 'Đối chiếu lượng đã ghi với kế hoạch và mục tiêu ngày'
                      }}
                    </p>
                  </div>
                </div>
                <app-target-bar-chart
                  [consumed]="chartData.averages"
                  [target]="chartData.target"
                  [planned]="chartData.plannedAverages"
                  [hasActual]="chartData.loggedDays > 0"
                >
                </app-target-bar-chart>
              </section>
            </div>

            <!-- Charts Bento Grid 2: Phân bổ theo bữa ăn & Xu hướng cân nặng -->
            <div class="charts-grid-two">
              <section class="chart-panel chart-block">
                <div class="panel-head">
                  <div>
                    <h2>Năng lượng theo từng bữa ăn</h2>
                    <p class="subtle">Tổng calories của các bữa thực tế đã ghi trong khoảng chọn</p>
                  </div>
                </div>
                @if (chartData.loggedDays) {
                  <app-meal-chart [items]="chartData.logs"></app-meal-chart>
                } @else {
                  <p class="subtle">Chưa có dữ liệu bữa ăn thực tế.</p>
                }
              </section>

              <app-weight-chart
                [weights]="chartData.weights || []"
                [targetWeight]="chartData.targetWeightKg"
                [periodMode]="chartRange.mode"
                (viewMonth)="
                  selectChartRange({
                    mode: 'MONTH',
                    date: chartRange.date,
                    month: chartRange.date.slice(0, 7),
                  })
                "
              >
              </app-weight-chart>
            </div>
            <section class="chart-panel chart-block trend-block">
              <h2>Calories đã ghi theo ngày trong khoảng chọn</h2>
              <app-nutrition-trend [days]="chartData.days" />
              <p class="subtle">Ngày chưa ghi nhật ký được để trống trên biểu đồ.</p>
            </section>
          }
        </section>

        <!-- Kế hoạch & Thực đơn trong ngày -->
        @if (data.progress) {
          <section class="panel plan-progress-panel">
            <div class="panel-head">
              <h2>Tiến độ kế hoạch ăn uống</h2>
              <a mat-stroked-button routerLink="/plans" [queryParams]="{ date: date }"
                >Xem kế hoạch</a
              >
            </div>
            @if (data.progress.totalItems) {
              <div class="plan-progress-numbers">
                <strong
                  >{{ data.progress.completedItems }}/{{ data.progress.totalItems }} món đã
                  ăn</strong
                ><span
                  >{{ data.progress.pendingItems }} chưa ăn · {{ data.progress.skippedItems }} bỏ
                  qua</span
                >
              </div>
              <div class="progress" aria-label="Tỷ lệ món đã ăn">
                <i [style.width.%]="data.progress.completionPercent"></i>
              </div>
              <p class="subtle">
                {{ data.progress.completedMeals }} bữa hoàn thành ·
                {{ data.progress.pendingMeals }} bữa còn món chưa ăn ·
                {{ data.progress.skippedMeals }} bữa bỏ qua
              </p>
            } @else {
              <p class="subtle">Chưa có kế hoạch cho ngày này.</p>
            }
            <p class="subtle">
              Đã ghi nhận {{ data.progress.loggedMeals }} bữa trong nhật ký thực tế. Calories đã
              tiêu thụ chỉ lấy từ nhật ký.
            </p>
          </section>
        }
        <div class="meal-plan-section">
          <section class="panel">
            <div class="panel-head">
              <div>
                <h2>Thực phẩm thực tế đã ăn</h2>
                <p class="subtle">Các món đã ghi nhận trong nhật ký của ngày đang chọn.</p>
              </div>
              <div class="panel-actions">
                <a routerLink="/logs" class="panel-link" [queryParams]="{ date: date }"
                  >Xem nhật ký chi tiết</a
                >
              </div>
            </div>

            @if (currentMealsList().length) {
              <div class="today-foods-grid">
                @for (item of currentMealsList(); track item.id) {
                  <div class="today-food-item">
                    <div class="food-main">
                      <span class="meal-badge" [class]="item.meal.toLowerCase()">{{
                        meal(item.meal)
                      }}</span>
                      <div>
                        <strong>{{ item.food.name }}</strong>
                        <small>{{ item.grams }}g</small>
                      </div>
                    </div>
                    <div class="food-cals">
                      <b>{{ n((item.food.calories * item.grams) / 100) }} kcal</b>
                      <span
                        >Đ {{ n((item.food.protein * item.grams) / 100) }}g · C
                        {{ n((item.food.carbs * item.grams) / 100) }}g · B
                        {{ n((item.food.fat * item.grams) / 100) }}g</span
                      >
                    </div>
                  </div>
                }
              </div>
            } @else {
              <div class="empty-state">
                <span class="empty-icon">🥗</span>
                <h3>Chưa có dữ liệu món ăn cho ngày này</h3>
                <p class="subtle">Hãy chọn món để lên kế hoạch trước hoặc ghi lại món bạn đã ăn.</p>
                <div class="empty-actions">
                  <a mat-flat-button routerLink="/plans" [queryParams]="{ date: date }"
                    >Lập kế hoạch</a
                  >
                  <a mat-stroked-button routerLink="/logs" [queryParams]="{ date: date }"
                    >Ghi nhật ký</a
                  >
                </div>
              </div>
            }
          </section>
        </div>
      }
    </div>
  `,
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {
  api = inject(ApiService);
  date = today();
  todayStr = today();
  data: any;
  chartData: any;
  chartsLoading = false;
  chartsError = '';
  chartRange: ChartRange = { mode: 'DAY', date: this.date, month: this.date.slice(0, 7) };
  private chartsRequest?: Subscription;
  private dashboardRequest?: Subscription;
  error = '';
  n = num;
  Math = Math;
  Number = Number;
  meal = (key: string) => mealNames[key] || key;

  ngOnInit() {
    this.load();
  }

  load() {
    this.dashboardRequest?.unsubscribe();
    if (this.chartRange.mode === 'DAY')
      this.chartRange = { ...this.chartRange, date: this.date, month: this.date.slice(0, 7) };
    this.loadCharts();
    this.error = '';
    this.dashboardRequest = this.api.get(`/dashboard?date=${this.date}`).subscribe({
      next: (d: any) => {
        this.data = d;
        if (d.usageMode) {
          this.api.setUsageMode(d.usageMode);
        }
      },
      error: (e) => (this.error = message(e)),
    });
  }
  ngOnDestroy() {
    this.dashboardRequest?.unsubscribe();
    this.chartsRequest?.unsubscribe();
  }
  selectChartRange(range: ChartRange) {
    this.chartRange = range;
    this.loadCharts();
  }
  loadCharts() {
    this.chartsRequest?.unsubscribe();
    this.chartData = null;
    this.chartsError = '';
    this.chartsLoading = true;
    const q = new URLSearchParams(this.chartRange);
    this.chartsRequest = this.api.get<any>('/dashboard/charts?' + q).subscribe({
      next: (d) => {
        this.chartData = d;
        this.chartsLoading = false;
      },
      error: (e) => {
        this.chartsError = message(e);
        this.chartsLoading = false;
      },
    });
  }

  changeDate(offset: number) {
    const current = new Date(this.date);
    current.setDate(current.getDate() + offset);
    this.date = current.toISOString().slice(0, 10);
    this.load();
  }

  goToToday() {
    this.date = this.todayStr;
    this.load();
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    if (dateStr === this.todayStr) return 'Hôm nay';
    const d = new Date(dateStr);
    return `Ngày ${d.getDate()} tháng ${d.getMonth() + 1}, ${d.getFullYear()}`;
  }

  percent(a: any, b: any): number {
    if (!b || Number(b) <= 0) return 0;
    return Math.min(100, Math.round((Number(a || 0) / Number(b)) * 100));
  }

  remainingCalories(): number {
    if (!this.data?.target?.calories) return 0;
    return Number(this.data.target.calories) - Number(this.data.consumed.calories || 0);
  }

  isCaloriesOverflow(): boolean {
    if (!this.data?.target?.calories) return false;
    return Number(this.data.consumed.calories) > Number(this.data.target.calories);
  }

  getBmiStatus(bmi: number): string {
    if (bmi < 18.5) return 'Gầy / Thiếu cân';
    if (bmi < 24.9) return 'Chuẩn / Cân đối';
    if (bmi < 29.9) return 'Thừa cân';
    return 'Béo phì';
  }

  currentMealsList(): any[] {
    return this.data?.logs || [];
  }
}
