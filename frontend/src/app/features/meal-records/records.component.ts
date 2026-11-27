import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { AlertLevelComponent } from '../../shared/components/alert-level/alert-level.component';
import { DatePickerComponent } from '../../shared/components/date-picker/date-picker.component';
import { StyledSelectModule } from '../../shared/components/styled-select/styled-select.module';
import { mealNames, message, num, today } from '../../shared/utils/ui';

type Nutrient = 'calories' | 'protein' | 'carbs' | 'fat';
@Component({
  selector: 'app-records',
  imports: [
    StyledSelectModule,
    FormsModule,
    MatButtonModule,
    RouterLink,
    DatePickerComponent,
    AlertLevelComponent,
  ],
  template: ` <div class="page records-page">
    <div class="page-head">
      <span class="eyebrow">{{ isPlan ? 'DỰ ĐỊNH ĂN' : 'THỰC TẾ ĐÃ ĂN' }}</span>
      <h1>{{ isPlan ? 'Kế hoạch ăn uống' : 'Nhật ký ăn uống' }}</h1>
      <p>
        {{
          isPlan
            ? 'Lên kế hoạch theo ngày và nhấn Đã ăn để tự động ghi vào nhật ký.'
            : 'Xem món đã ăn từ kế hoạch và thêm những món ăn ngoài kế hoạch.'
        }}
      </p>
    </div>
    <div class="record-links">
      <a
        mat-stroked-button
        [routerLink]="isPlan ? '/logs' : '/plans'"
        [queryParams]="{ date: date }"
        >{{ isPlan ? 'Xem nhật ký ngày này' : 'Xem kế hoạch ngày này' }}</a
      >
    </div>
    <div class="date-bar">
      <span class="date-label">Chọn ngày</span
      ><button type="button" class="date-arrow" aria-label="Ngày trước" (click)="shiftDay(-1)">
        ‹</button
      ><app-date-picker [value]="date" (valueChange)="selectDate($event)" /><button
        type="button"
        class="date-arrow"
        aria-label="Ngày tiếp theo"
        (click)="shiftDay(1)"
      >
        ›
      </button>
      @if (isPlan && api.usageMode() === 'PERSONALIZED') {
        <a mat-stroked-button routerLink="/recommendations">Mở đề xuất tự động</a>
      }
    </div>
    @if (error) {
      <p class="error" role="alert">{{ error }}</p>
    }
    @if (notice) {
      <p class="notice" role="status">{{ notice }}</p>
    }
    @if (isPlan && record?.analysis) {
      <section class="panel plan-review" id="plan-review" aria-label="Kiểm tra kế hoạch theo ngày">
        <div class="plan-review-head">
          <div>
            <h2>Kiểm tra kế hoạch ngày {{ date }}</h2>
            <p>{{ record.analysis.label }} · Thực đơn dự kiến, chưa phải lượng thực tế đã ăn.</p>
          </div>
          @if (planSeverity) {
            <app-alert-level [severity]="planSeverity" />
          }
        </div>
        @if (record.items.length && record.analysis.ratios) {
          <div class="plan-ratios">
            @for (nutrient of nutrients; track nutrient.key) {
              <div>
                <span>{{ nutrient.label }}</span
                ><strong
                  >{{ n(record.totals[nutrient.key]) }} / {{ n(record.target[nutrient.key]) }}
                  {{ nutrient.unit }}</strong
                ><small>{{ record.analysis.ratios[nutrient.key] }}% mục tiêu ngày</small>
              </div>
            }
          </div>
        }
        <div class="plan-issues">
          @for (issue of record.analysis.issues; track issue.code) {
            <article
              class="plan-issue alert-surface"
              [attr.data-alert-severity]="
                issue.level === 'danger' ? 'HIGH' : issue.level === 'warning' ? 'MEDIUM' : 'LOW'
              "
              [class.danger]="issue.level === 'danger'"
              [class.warning]="issue.level === 'warning'"
            >
              <app-alert-level
                [severity]="
                  issue.level === 'danger' ? 'HIGH' : issue.level === 'warning' ? 'MEDIUM' : 'LOW'
                "
              />
              <p>{{ issue.message }}</p>
            </article>
          } @empty {
            <p>
              {{
                record.items.length
                  ? 'Chưa có lưu ý từ các điều kiện kiểm tra hiện tại.'
                  : 'Chưa có món ăn để kiểm tra kế hoạch ngày này.'
              }}
            </p>
          }
        </div>
        <p class="subtle">
          Phần trăm là tỷ lệ so với mục tiêu ngày hiện tại. Các lưu ý giúp rà lại thực đơn và khẩu
          phần, không phải chẩn đoán thiếu chất hay bệnh.
        </p>
      </section>
    }
    <div class="two-cols">
      <section class="panel">
        <h2>{{ isPlan ? 'Bữa ăn đã lên kế hoạch' : 'Thực phẩm đã ăn' }}</h2>
        @if (isPlan && record?.progress) {
          <div class="record-progress" aria-label="Tiến độ kế hoạch">
            <strong
              >{{ record.progress.completedItems }}/{{ record.progress.totalItems }} món đã
              ăn</strong
            >
            <span
              >{{ record.progress.pendingItems }} chưa ăn · {{ record.progress.skippedItems }} bỏ
              qua</span
            >
            <div class="progress"><i [style.width.%]="record.progress.completionPercent"></i></div>
          </div>
        }
        @for (meal of meals; track meal.key) {
          <div class="meal-group">
            <h3>{{ meal.label }}</h3>
            @for (item of itemsFor(meal.key); track item.id) {
              <div
                class="list-row record-item"
                [class.item-skipped]="isPlan && item.status === 'SKIPPED'"
              >
                <div>
                  <b>{{ item.food.name }}</b
                  ><span
                    >{{ item.grams }}g · {{ n((item.food.calories * item.grams) / 100) }} kcal</span
                  >
                  <small class="item-macros"
                    >Đạm {{ n((item.food.protein * item.grams) / 100) }}g · Carb
                    {{ n((item.food.carbs * item.grams) / 100) }}g · Béo
                    {{ n((item.food.fat * item.grams) / 100) }}g</small
                  >
                  @if (isPlan) {
                    <span class="plan-item-status" [attr.data-status]="item.status || 'PENDING'">{{
                      statusName(item.status)
                    }}</span>
                  } @else {
                    <small class="log-origin">{{
                      item.fromPlan
                        ? item.planItemId
                          ? 'Đồng bộ từ kế hoạch'
                          : 'Từ kế hoạch đã xóa'
                        : 'Nhập trực tiếp vào nhật ký'
                    }}</small>
                  }
                </div>
                <div class="inline-actions">
                  @if (isPlan) {
                    <button
                      mat-stroked-button
                      class="complete-plan-item"
                      [class.is-selected]="item.status === 'COMPLETED'"
                      [attr.aria-pressed]="item.status === 'COMPLETED'"
                      [disabled]="busy || item.status === 'COMPLETED'"
                      (click)="setStatus(item, 'COMPLETED')"
                    >
                      Đã ăn
                    </button>
                    <button
                      mat-button
                      class="skip-plan-item"
                      [class.is-selected]="item.status === 'SKIPPED'"
                      [attr.aria-pressed]="item.status === 'SKIPPED'"
                      [disabled]="busy || item.status === 'SKIPPED'"
                      (click)="setStatus(item, 'SKIPPED')"
                    >
                      Bỏ qua
                    </button>
                  }
                  <button mat-button [disabled]="busy" (click)="edit(item)">Sửa</button
                  ><button mat-button [disabled]="busy" (click)="remove(item)">Xóa</button>
                </div>
              </div>
            } @empty {
              <p class="subtle">Chưa có thực phẩm.</p>
            }
            @if (itemsFor(meal.key).length) {
              <div class="meal-analysis">
                <b>Phân tích {{ meal.label.toLowerCase() }}</b>
                <p>{{ mealSummary(meal.key) }}</p>
                <span>Đây là lượng đã ghi trong bữa, không phải đánh giá thừa hay thiếu chất.</span>
              </div>
            }
          </div>
        }
        <div class="summary">
          <b>{{ isPlan ? 'Tổng dự kiến trong kế hoạch' : 'Tổng thực tế đã ăn' }}</b
          ><strong>{{ n(record?.totals?.calories) }} kcal</strong
          ><span
            >Đạm {{ n(record?.totals?.protein) }}g · Carb {{ n(record?.totals?.carbs) }}g · Béo
            {{ n(record?.totals?.fat) }}g</span
          >
        </div>
        @if (record?.items?.length) {
          <div class="daily-analysis">
            <b>Thành phần dinh dưỡng bổ sung</b>
            @for (key of extraKeys; track key) {
              <span
                >{{ extraLabels[key] }}:
                {{
                  record.totals[key] === null
                    ? 'Chưa đủ dữ liệu'
                    : n(record.totals[key]) + (key === 'sodium' ? ' mg' : ' g')
                }}
                · {{ record.totals.coverage[key].knownItems }}/{{
                  record.totals.coverage[key].totalItems
                }}
                thực phẩm có dữ liệu</span
              >
            }
          </div>
        }
        @if (!isPlan && record?.items?.length && date < presentDay) {
          <div class="daily-analysis">
            <b>Độ đầy đủ của nhật ký</b>
            <p>
              {{
                record.completed
                  ? 'Bạn đã xác nhận ghi đủ ngày này.'
                  : 'Chưa xác nhận đã ghi đủ tất cả bữa ăn trong ngày.'
              }}
            </p>
            <button
              mat-stroked-button
              type="button"
              [disabled]="completing || busy"
              (click)="completeDay()"
            >
              {{ record.completed ? 'Bỏ xác nhận ghi đủ' : 'Xác nhận đã ghi đủ ngày này' }}
            </button>
            <p>
              Đánh giá thiếu chất chỉ sử dụng ngày được xác nhận ghi đủ. Sửa khẩu phần sẽ yêu cầu
              xác nhận lại.
            </p>
          </div>
        }
        @if (target && record?.items?.length) {
          <div class="daily-analysis">
            <b>So với mục tiêu cả ngày</b>
            @for (nutrient of nutrients; track nutrient.key) {
              <span>{{ dailyComparison(nutrient.key, nutrient.label, nutrient.unit) }}</span>
            }
          </div>
        }
      </section>
      <div>
        <section class="panel">
          <h2>
            {{
              editing
                ? 'Thay món hoặc sửa khẩu phần'
                : isPlan
                  ? 'Thêm món vào kế hoạch'
                  : 'Thêm món ngoài kế hoạch'
            }}
          </h2>
          @if (editing && (editingItem?.status === 'COMPLETED' || editingItem?.planItemId)) {
            <p class="subtle">
              Lưu thay đổi sẽ đồng bộ món và khẩu phần thực tế ở cả kế hoạch và nhật ký.
            </p>
          }
          <form class="stack" (ngSubmit)="save()" novalidate>
            <label
              >Thực phẩm<mat-select
                panelClass="app-select-panel"
                name="food"
                [(ngModel)]="form.foodId"
                aria-label="Thực phẩm"
              >
                <mat-option [value]="null">Chọn thực phẩm</mat-option>
                @for (f of foods; track f.id) {
                  <mat-option [value]="f.id">{{ f.name }}</mat-option>
                }
              </mat-select></label
            ><label
              >Bữa ăn<mat-select
                panelClass="app-select-panel"
                name="meal"
                [(ngModel)]="form.meal"
                aria-label="Bữa ăn"
              >
                <mat-option value="">Chọn bữa ăn</mat-option>
                @for (meal of meals; track meal.key) {
                  <mat-option [value]="meal.key">{{ meal.label }}</mat-option>
                }
              </mat-select></label
            ><label
              >Khối lượng (gram)<input
                type="number"
                name="grams"
                [(ngModel)]="form.grams"
                min="1"
                max="2000"
                step="any"
                placeholder="Nhập khối lượng, ví dụ 100"
            /></label>
            @if (selectedFood && (form.grams || 0) > 0) {
              <div class="portion-preview">
                Khẩu phần này:
                <strong>{{ n((selectedFood.calories * (form.grams || 0)) / 100) }} kcal</strong> ·
                Đạm {{ n((selectedFood.protein * (form.grams || 0)) / 100) }}g · Carb
                {{ n((selectedFood.carbs * (form.grams || 0)) / 100) }}g · Béo
                {{ n((selectedFood.fat * (form.grams || 0)) / 100) }}g
              </div>
            }
            <div class="form-actions">
              <button mat-flat-button [disabled]="busy">
                {{ editing ? 'Lưu thay đổi' : 'Thêm vào ' + (isPlan ? 'kế hoạch' : 'nhật ký') }}
              </button>
              @if (editing) {
                @if (isPlan && editingItem?.status !== 'COMPLETED') {
                  <button mat-stroked-button type="button" [disabled]="busy" (click)="save(true)">
                    Lưu và xác nhận đã ăn
                  </button>
                }
                <button mat-button type="button" (click)="cancelEdit()">Hủy</button>
              }
            </div>
          </form>
        </section>
        <section class="panel analysis-note">
          <b>Phân bổ bữa ăn</b>
          <p>
            Không có tỷ lệ calories hoặc dinh dưỡng theo bữa phù hợp cho tất cả mọi người. Lượng phù
            hợp phụ thuộc lịch sinh hoạt, sức khỏe và mục tiêu cá nhân. Hãy trao đổi với chuyên gia
            dinh dưỡng để có kế hoạch riêng.
          </p>
          <p>
            <a
              href="https://www.cdc.gov/diabetes/healthy-eating/diabetes-meal-planning.html"
              target="_blank"
              rel="noopener noreferrer"
              >Tham khảo hướng dẫn lập kế hoạch bữa ăn của CDC</a
            >
          </p>
        </section>
      </div>
    </div>
  </div>`,
  styles: [
    `
      .record-links {
        margin: 0 0 20px;
      }
      .record-progress {
        display: grid;
        gap: 10px;
        padding: 16px;
        margin-bottom: 18px;
        border: 1px solid #dceadc;
        border-radius: 12px;
        background: #f2f8ef;
      }
      .record-progress strong {
        font-size: 14px;
      }
      .record-progress > span {
        font-size: 12px;
        color: #607b66;
      }
      .record-item {
        align-items: flex-start;
        gap: 14px;
      }
      .record-item .inline-actions {
        justify-content: flex-end;
        flex-wrap: wrap;
        max-width: 230px;
      }
      .record-item .item-macros {
        line-height: 1.8;
      }
      .record-item .plan-item-status {
        display: inline-flex;
        width: fit-content;
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 11px;
        line-height: 1.5;
        background: #edf2ee;
        color: #607165;
      }
      .record-item .plan-item-status[data-status='COMPLETED'] {
        background: #e4f5e8;
        color: #197337;
      }
      .record-item .plan-item-status[data-status='SKIPPED'] {
        background: #f4f0e8;
        color: #846b41;
      }
      .record-item .log-origin {
        color: #397448;
        line-height: 1.7;
      }
      .record-item.item-skipped {
        background: #fafbf8;
      }
      @media (max-width: 650px) {
        .record-item {
          flex-direction: column;
        }
        .record-item .inline-actions {
          justify-content: flex-start;
          max-width: none;
        }
      }
      .plan-review {
        margin: 20px 0;
      }
      .plan-review-head {
        display: flex;
        justify-content: space-between;
        gap: 14px;
        align-items: start;
      }
      .plan-review h2 {
        margin: 0 0 8px;
        font-size: 20px;
      }
      .plan-review p {
        font-size: 13px;
        line-height: 1.8;
      }
      .plan-ratios {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
        margin: 20px 0;
      }
      .plan-ratios > div {
        display: grid;
        gap: 7px;
        padding: 14px;
        border: 1px solid #e2ebdf;
        border-radius: 12px;
        background: #f7fbf5;
      }
      .plan-ratios span,
      .plan-ratios small {
        font-size: 12px;
        color: #6d8270;
      }
      .plan-ratios strong {
        font-size: 14px;
        line-height: 1.7;
      }
      .plan-issues {
        display: grid;
        gap: 12px;
        margin: 18px 0;
      }
      .plan-issue {
        padding: 14px 16px;
        border: 1px solid #dce9d9;
        border-radius: 12px;
        background: #f5faf2;
      }
      .plan-issue.warning {
        background: #fff9eb;
        border-color: #f2e4be;
      }
      .plan-issue.danger {
        background: #fff3ef;
        border-color: #eed4cd;
      }
      .plan-issue p {
        margin: 8px 0 0;
        font-size: 14px;
        color: #38523d;
      }
      @media (max-width: 800px) {
        .plan-ratios {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      @media (max-width: 500px) {
        .plan-review-head {
          flex-direction: column;
        }
      }
      .date-bar {
        display: flex;
        align-items: center;
        gap: 9px;
        flex-wrap: wrap;
        margin: 28px 0;
      }
      .date-label {
        font-size: 14px;
        font-weight: 700;
        margin-right: 6px;
      }
      .calendar-wrap {
        position: relative;
      }
      .date-arrow,
      .calendar-trigger {
        height: 48px;
        border: 1px solid #d4e5d8;
        background: #fff;
        color: #204b34;
        border-radius: 12px;
      }
      .date-arrow {
        width: 44px;
        font-size: 23px;
      }
      .calendar-trigger {
        display: flex;
        align-items: center;
        gap: 13px;
        padding: 0 15px;
        font-size: 14px;
      }
      .calendar-trigger span {
        color: #15934a;
        font-size: 20px;
      }
      .date-arrow:hover,
      .calendar-trigger:hover {
        background: #eef9f0;
      }
      .calendar {
        position: absolute;
        z-index: 10;
        top: calc(100% + 8px);
        left: 0;
        width: 300px;
        padding: 18px;
        background: #fff;
        border: 1px solid #e0ece2;
        border-radius: 20px;
        box-shadow: 0 20px 50px rgba(20, 65, 35, 0.18);
      }
      .calendar-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 14px;
        color: #173e2a;
      }
      .calendar-header button {
        width: 36px;
        height: 36px;
        border: 0;
        border-radius: 10px;
        background: #f0f7f1;
        color: #245b38;
        font-size: 22px;
      }
      .calendar-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 4px;
        text-align: center;
      }
      .weekday {
        font-size: 11px;
        font-weight: 700;
        color: #688373;
        padding: 8px 0;
      }
      .calendar-grid button {
        height: 34px;
        border: 0;
        border-radius: 10px;
        background: transparent;
        color: #284d37;
        font-weight: 600;
      }
      .calendar-grid button:hover {
        background: #e5f6e9;
      }
      .calendar-grid button.is-today {
        box-shadow: inset 0 0 0 1px #16a34a;
      }
      .calendar-grid button.selected {
        background: #159447;
        color: #fff;
      }
      .calendar-today {
        width: 100%;
        margin-top: 14px;
        padding: 10px;
        border: 0;
        border-radius: 10px;
        background: #eaf8ed;
        color: #087a35;
        font-weight: 700;
      }
      .calendar button:focus-visible,
      .date-bar button:focus-visible {
        outline: 2px solid #159447;
        outline-offset: 2px;
      }
      .portion-preview,
      .meal-analysis,
      .daily-analysis {
        padding: 14px;
        border-radius: 12px;
        background: #f0f8f1;
        color: #315a3d;
        font-size: 13px;
        line-height: 1.6;
      }
      .meal-analysis {
        margin-top: 12px;
      }
      .meal-analysis p {
        margin: 4px 0;
      }
      .meal-analysis span,
      .daily-analysis span {
        display: block;
      }
      .daily-analysis {
        margin-top: 16px;
      }
      .analysis-note p {
        font-size: 13px;
        line-height: 1.7;
        color: #526c5a;
        margin-bottom: 0;
      }
      .form-actions {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      @media (max-width: 600px) {
        .date-label {
          width: 100%;
        }
        .date-fields {
          flex: 1;
        }
        .date-fields mat-select,
        .date-fields input {
          min-width: 0;
          width: 100%;
        }
        .date-fields label {
          flex: 1;
        }
      }
    `,
  ],
})
export class RecordsComponent implements OnInit {
  destroyRef = inject(DestroyRef);
  private changeDetector = inject(ChangeDetectorRef);
  private recordRequest?: Subscription;
  api = inject(ApiService);
  router = inject(Router);
  route = inject(ActivatedRoute);
  date = today();
  record: any;
  target: any = null;
  foods: any[] = [];
  error = '';
  notice = '';
  editing = 0;
  editingItem: any = null;
  busy = false;
  n = num;
  presentDay = today();
  completing = false;
  extraKeys = ['fiber', 'sugars', 'sodium'];
  extraLabels: Record<string, string> = { fiber: 'Chất xơ', sugars: 'Đường tổng', sodium: 'Natri' };
  completeDay() {
    if (this.busy || this.completing || !this.record) return;
    const date = this.date;
    this.completing = true;
    this.error = '';
    this.api
      .put(`/logs/${this.date}/completeness`, { completed: !this.record.completed })
      .subscribe({
        next: (r: any) => {
          if (this.date === date && this.record) this.record.completed = r.completed;
          this.completing = false;
          this.notice = 'Đã cập nhật độ đầy đủ và xếp lịch phân tích lại.';
        },
        error: (e) => {
          this.error = message(e);
          this.completing = false;
        },
      });
  }
  meals = Object.entries(mealNames).map(([key, label]) => ({ key, label }));
  nutrients: { key: Nutrient; label: string; unit: string }[] = [
    { key: 'calories', label: 'Năng lượng', unit: 'kcal' },
    { key: 'protein', label: 'Đạm', unit: 'g' },
    { key: 'carbs', label: 'Carb', unit: 'g' },
    { key: 'fat', label: 'Béo', unit: 'g' },
  ];
  months = Array.from({ length: 12 }, (_, i) => i + 1);
  form: { foodId: number | null; meal: string; grams: number | null } = {
    foodId: null,
    meal: '',
    grams: null,
  };
  get isPlan() {
    return this.route.routeConfig?.path
      ? this.route.routeConfig.path === 'plans'
      : this.router.url.startsWith('/plans');
  }
  get base() {
    return this.isPlan ? '/plans' : '/logs';
  }
  get planSeverity() {
    const issues = this.record?.analysis?.issues || [];
    return issues.some((i: any) => i.level === 'danger')
      ? 'HIGH'
      : issues.some((i: any) => i.level === 'warning')
        ? 'MEDIUM'
        : issues.length
          ? 'LOW'
          : null;
  }
  get year() {
    return Number(this.date.slice(0, 4));
  }
  get month() {
    return Number(this.date.slice(5, 7));
  }
  get day() {
    return Number(this.date.slice(8, 10));
  }
  get days() {
    return Array.from({ length: new Date(this.year, this.month, 0).getDate() }, (_, i) => i + 1);
  }
  get selectedFood() {
    if (this.editingItem?.foodId === this.form.foodId) return this.editingItem.food;
    return this.foods.find((f) => f.id === this.form.foodId);
  }
  ngOnInit() {
    this.api
      .get('/foods')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (f: any[]) => (this.foods = f), error: (e) => (this.error = message(e)) });
    if (!this.isPlan)
      this.api
        .get('/nutrition/target')
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ next: (t) => (this.target = t), error: (e) => (this.error = message(e)) });
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((q) => {
      this.date = q.get('date') || today();
      this.cancelEdit();
      this.load();
    });
  }
  changeDate(day: number, month: number, year: number) {
    if (!Number.isInteger(year) || year < 1900 || year > 2100) return;
    day = Math.min(day, new Date(year, month, 0).getDate());
    this.date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    this.cancelEdit();
    this.load();
  }
  selectDate(value: string) {
    this.changeDate(
      Number(value.slice(8, 10)),
      Number(value.slice(5, 7)),
      Number(value.slice(0, 4)),
    );
  }
  changeYear(value: string) {
    const year = Number(value);
    if (!Number.isInteger(year) || year < 1900 || year > 2100) {
      this.error = 'Năm phải từ 1900 đến 2100.';
      return;
    }
    this.changeDate(this.day, this.month, year);
  }
  shiftDay(amount: number) {
    const d = new Date(this.year, this.month - 1, this.day + amount);
    this.changeDate(d.getDate(), d.getMonth() + 1, d.getFullYear());
  }
  selectToday() {
    const d = new Date();
    this.changeDate(d.getDate(), d.getMonth() + 1, d.getFullYear());
  }
  load() {
    this.recordRequest?.unsubscribe();
    this.error = '';
    this.record = null;
    this.changeDetector.markForCheck();
    this.recordRequest = this.api
      .get(`${this.base}?date=${this.date}`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.record = r;
          if (this.isPlan && r && Object.prototype.hasOwnProperty.call(r, 'target'))
            this.target = r.target;
          this.changeDetector.markForCheck();
        },
        error: (e) => {
          this.error = message(e);
          this.changeDetector.markForCheck();
        },
      });
  }
  itemsFor(meal: string) {
    return this.record?.items?.filter((x: any) => x.meal === meal) || [];
  }
  mealTotal(meal: string, key: Nutrient) {
    return this.itemsFor(meal).reduce(
      (total: number, item: any) => total + (Number(item.food[key]) * Number(item.grams)) / 100,
      0,
    );
  }
  mealSummary(meal: string) {
    return `${num(this.mealTotal(meal, 'calories'))} kcal · Đạm ${num(this.mealTotal(meal, 'protein'))}g · Carb ${num(this.mealTotal(meal, 'carbs'))}g · Béo ${num(this.mealTotal(meal, 'fat'))}g`;
  }

  dailyComparison(key: Nutrient, label: string, unit: string) {
    const value = Number(this.record?.totals?.[key] || 0),
      goal = Number(this.target[key]),
      delta = value - goal;
    return `${label}: ${num(value)} / ${num(goal)} ${unit} — ${Math.abs(delta) < 0.5 ? 'đạt mục tiêu' : delta > 0 ? 'vượt ' + num(delta) + ' ' + unit : 'còn ' + num(-delta) + ' ' + unit + ' so với mục tiêu'}`;
  }
  edit(item: any) {
    this.error = '';
    this.editing = item.id;
    this.editingItem = item;
    if (!this.foods.some((f) => f.id === item.foodId)) this.foods = [...this.foods, item.food];
    this.form = { foodId: item.foodId, meal: item.meal, grams: Number(item.grams) };
  }
  cancelEdit() {
    this.editing = 0;
    this.editingItem = null;
    this.form = { foodId: null, meal: '', grams: null };
  }
  save(confirmEaten = false) {
    if (this.busy || this.completing) return;
    this.error = '';
    this.notice = '';
    if (
      !this.form.foodId ||
      !this.form.meal ||
      !this.form.grams ||
      this.form.grams < 1 ||
      this.form.grams > 2000
    ) {
      this.error = 'Vui lòng chọn thực phẩm, bữa ăn và nhập khối lượng từ 1 đến 2000 gram.';
      return;
    }
    this.busy = true;
    const body =
      this.isPlan && this.editing
        ? {
            ...this.form,
            expectedRevision: this.editingItem?.revision,
            ...(confirmEaten ? { status: 'COMPLETED' } : {}),
          }
        : this.form;
    const request = this.editing
      ? this.api.put(`${this.base}/items/${this.editing}`, body)
      : this.api.post(`${this.base}/${this.date}/items`, this.form);
    request.subscribe({
      next: () => {
        this.notice = confirmEaten ? 'Đã lưu món thực tế và ghi vào nhật ký.' : 'Đã lưu khẩu phần.';
        this.busy = false;
        this.cancelEdit();
        this.load();
      },
      error: (e) => {
        this.error = message(e);
        this.busy = false;
      },
    });
  }
  statusName(status: string) {
    return status === 'COMPLETED' ? 'Đã ăn' : status === 'SKIPPED' ? 'Bỏ qua' : 'Chưa ăn';
  }
  setStatus(item: any, status: 'COMPLETED' | 'SKIPPED') {
    if (this.busy || this.completing || item.status === status) return;
    this.busy = true;
    this.error = '';
    this.notice = '';
    this.api
      .put(`/plans/items/${item.id}`, {
        foodId: item.foodId,
        meal: item.meal,
        grams: Number(item.grams),
        status,
        expectedRevision: item.revision,
      })
      .subscribe({
        next: () => {
          item.status = status;
          this.busy = false;
          this.notice =
            status === 'COMPLETED'
              ? 'Đã ghi món vào nhật ký, không cần nhập lại.'
              : 'Đã bỏ qua món, không tính vào dinh dưỡng thực tế.';
          this.cancelEdit();
          this.load();
        },
        error: (e) => {
          this.busy = false;
          this.error = message(e);
          this.loadAfterConflict(e);
        },
      });
  }
  private loadAfterConflict(e: any) {
    if (e?.status === 409) {
      const text = this.error;
      this.load();
      this.error = text;
    }
  }
  remove(item: any) {
    if (this.busy || this.completing) return;
    this.busy = true;
    this.api.delete(`${this.base}/items/${typeof item === 'number' ? item : item.id}`).subscribe({
      next: () => {
        this.notice = 'Đã xóa khẩu phần.';
        this.busy = false;
        this.cancelEdit();
        this.load();
      },
      error: (e) => {
        this.busy = false;
        this.error = message(e);
      },
    });
  }
}
