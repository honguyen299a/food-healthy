import { Component, inject, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { StyledSelectModule } from '../../shared/components/styled-select/styled-select.module';
import { message, num } from '../../shared/utils/ui';

@Component({
  selector: 'app-foods',
  imports: [StyledSelectModule, FormsModule, MatButtonModule, MatDialogModule],
  template: ` <div class="page foods-page">
    <div class="page-head">
      <span class="eyebrow">THƯ VIỆN DINH DƯỠNG</span>
      <h1>{{ isAdmin ? 'Quản lý thực phẩm dùng chung' : 'Thực phẩm của bạn' }}</h1>
      <p>
        {{
          isAdmin
            ? 'Thực phẩm được Admin thêm sẽ hiển thị cho tất cả người dùng.'
            : 'Dùng thư viện chung hoặc tự thêm thực phẩm riêng, chỉ tài khoản của bạn nhìn thấy.'
        }}
        Dinh dưỡng được tính trên 100g.
      </p>
    </div>
    <div class="toolbar">
      <input
        [(ngModel)]="search"
        (ngModelChange)="load()"
        placeholder="Tìm thực phẩm..."
        aria-label="Tìm thực phẩm"
      /><button mat-flat-button (click)="add()" [disabled]="!categories.length">
        {{ isAdmin ? '+ Thêm vào thư viện chung' : '+ Thêm thực phẩm riêng' }}
      </button>
      @if (isAdmin) {
        <label
          >Hiển thị<mat-select
            panelClass="app-select-panel"
            [(ngModel)]="status"
            (ngModelChange)="load()"
            aria-label="Hiển thị"
          >
            <mat-option value="ALL">Tất cả thực phẩm chung</mat-option>
            <mat-option value="ACTIVE">Đang hiển thị</mat-option>
            <mat-option value="HIDDEN">Đã ẩn</mat-option>
          </mat-select></label
        >
      }
    </div>
    <div class="category-filters" role="group" aria-label="Lọc nhóm thực phẩm">
      <button
        type="button"
        class="category-filter"
        [class.selected]="categoryId === ''"
        [attr.aria-pressed]="categoryId === ''"
        (click)="selectCategory('')"
      >
        Tất cả nhóm
      </button>
      @for (c of categories; track c.id) {
        <button
          type="button"
          class="category-filter"
          [class.selected]="categoryId === c.id.toString()"
          [attr.aria-pressed]="categoryId === c.id.toString()"
          (click)="selectCategory(c.id.toString())"
        >
          {{ c.name }}
        </button>
      }
    </div>
    @if (subgroups.length) {
      <div class="subgroup-filters" role="group" aria-label="Lọc loại thực phẩm">
        <button type="button" [class.selected]="!subgroup" (click)="selectSubgroup('')">
          Tất cả loại
        </button>
        @for (s of subgroups; track s) {
          <button type="button" [class.selected]="subgroup === s" (click)="selectSubgroup(s)">
            {{ s }}
          </button>
        }
      </div>
    }
    @if (error) {
      <p class="error">{{ error }}</p>
    }
    @if (notice) {
      <p class="notice">{{ notice }}</p>
    }
    @if (loading) {
      <p role="status">Đang tải thực phẩm…</p>
    }
    <div class="food-grid">
      @for (f of foods.slice(0, visibleLimit); track f.id) {
        <article class="food-card">
          <span class="food-icon" aria-hidden="true">{{
            icon(f.category.code || f.category.name)
          }}</span>
          <div>
            <small
              >{{ f.category.name }} · {{ f.ownerId ? 'Của bạn' : 'Thư viện chung'
              }}{{ f.isActive === false ? ' · Đã ẩn' : '' }}</small
            >
            <h3>{{ f.name }}</h3>
          </div>
          <strong>{{ n(f.calories) }} <small>kcal</small></strong>
          <dl class="food-nutrient-list" aria-label="Dinh dưỡng trên 100g">
            <div>
              <dt>Đạm (Protein)</dt>
              <dd>{{ nutrientValue(f.protein, 'g') }}</dd>
            </div>
            <div>
              <dt>Carbohydrate</dt>
              <dd>{{ nutrientValue(f.carbs, 'g') }}</dd>
            </div>
            <div>
              <dt>Chất béo</dt>
              <dd>{{ nutrientValue(f.fat, 'g') }}</dd>
            </div>
            <div>
              <dt>Chất xơ</dt>
              <dd [class.missing]="f.fiber == null">{{ nutrientValue(f.fiber, 'g') }}</dd>
            </div>
            <div>
              <dt>Đường tổng</dt>
              <dd [class.missing]="f.sugars == null">{{ nutrientValue(f.sugars, 'g') }}</dd>
            </div>
            <div>
              <dt>Natri</dt>
              <dd [class.missing]="f.sodium == null">{{ nutrientValue(f.sodium, 'mg') }}</dd>
            </div>
          </dl>
          <div class="card-actions">
            <button mat-button (click)="edit(f)">Sửa</button>
            @if (f.ownerId || isAdmin) {
              @if (f.isActive !== false) {
                <button mat-button (click)="remove(f.id)">
                  {{ isAdmin ? 'Ẩn khỏi thư viện' : 'Xóa' }}
                </button>
              } @else if (isAdmin) {
                <button mat-button (click)="restore(f.id)">Hiển thị lại</button>
              }
            }
          </div>
        </article>
      } @empty {
        <p>Không tìm thấy thực phẩm.</p>
      }
    </div>
    @if (foods.length > visibleLimit) {
      <button class="load-foods" mat-stroked-button (click)="visibleLimit = visibleLimit + 24">
        Xem thêm thực phẩm ({{ visibleLimit }}/{{ foods.length }})
      </button>
    }
    <ng-template #foodDialog>
      <div class="food-editor">
        <div class="editor-head">
          <h2 id="food-editor-title">
            {{
              copying
                ? 'Tùy chỉnh dinh dưỡng cho riêng bạn'
                : editing
                  ? 'Sửa thực phẩm'
                  : isAdmin
                    ? 'Thêm thực phẩm dùng chung'
                    : 'Thêm thực phẩm riêng'
            }}
          </h2>
          <button type="button" mat-button (click)="cancel()" [disabled]="saving">Đóng</button>
        </div>
        <form #foodForm="ngForm" class="food-editor-form" (ngSubmit)="save(foodForm)" novalidate>
          <div class="editor-body">
            @if (error) {
              <p class="error" role="alert">{{ error }}</p>
            }
            @if (submitted && foodForm.invalid) {
              <p class="error" role="alert">Vui lòng kiểm tra các ô bắt buộc và giới hạn chỉ số.</p>
            }
            <div class="form-grid">
              <label
                >Tên<input
                  name="name"
                  [(ngModel)]="form.name"
                  required
                  minlength="2"
                  maxlength="150" /></label
              ><label
                >Nhóm<mat-select
                  panelClass="app-select-panel"
                  name="categoryId"
                  [(ngModel)]="form.categoryId"
                  (ngModelChange)="form.subgroup = null"
                  required
                  aria-label="Nhóm"
                >
                  @for (c of categories; track c.id) {
                    <mat-option [value]="c.id">{{ c.name }}</mat-option>
                  }
                </mat-select></label
              >
              @if (formSubgroups.length) {
                <label
                  >Loại thực phẩm<mat-select
                    name="subgroup"
                    [(ngModel)]="form.subgroup"
                    aria-label="Loại thực phẩm"
                    ><mat-option [value]="null">Chưa phân loại chi tiết</mat-option>
                    @for (s of formSubgroups; track s) {
                      <mat-option [value]="s">{{ s }}</mat-option>
                    }
                  </mat-select></label
                >
              }
              <label
                >Calories<input
                  type="number"
                  name="calories"
                  step="any"
                  [(ngModel)]="form.calories"
                  required
                  min="0"
                  max="1000" /></label
              ><label
                >Protein (g)<input
                  type="number"
                  name="protein"
                  step="any"
                  [(ngModel)]="form.protein"
                  required
                  min="0"
                  max="100" /></label
              ><label
                >Carb (g)<input
                  type="number"
                  name="carbs"
                  step="any"
                  [(ngModel)]="form.carbs"
                  required
                  min="0"
                  max="100" /></label
              ><label
                >Fat (g)<input
                  type="number"
                  name="fat"
                  step="any"
                  [(ngModel)]="form.fat"
                  required
                  min="0"
                  max="100" /></label
              ><label
                >Chi phí ước tính / 100g (VNĐ)<input
                  type="number"
                  name="estimatedCost"
                  [(ngModel)]="form.estimatedCost"
                  min="0"
                  max="10000000"
              /></label>
              <label
                >Chất xơ (g)<input
                  type="number"
                  name="fiber"
                  [(ngModel)]="form.fiber"
                  min="0"
                  max="100"
                  step="any"
                  placeholder="Chưa có dữ liệu"
              /></label>
              <label
                >Đường tổng (g)<input
                  type="number"
                  name="sugars"
                  [(ngModel)]="form.sugars"
                  min="0"
                  max="100"
                  step="any"
                  placeholder="Chưa có dữ liệu"
              /></label>
              <label
                >Natri (mg)<input
                  type="number"
                  name="sodium"
                  [(ngModel)]="form.sodium"
                  min="0"
                  max="100000"
                  step="any"
                  placeholder="Chưa có dữ liệu"
              /></label>
              <p class="full subtle">
                Các chỉ số tính trên 100g. Để trống nếu chưa có dữ liệu; 0 nghĩa là đã xác nhận
                không có chất đó.
              </p>
              @if (copying) {
                <p class="full notice">
                  Lưu thành thực phẩm riêng của bạn. Món trong thư viện chung và các bữa ăn đã ghi
                  vẫn giữ nguyên.
                </p>
              }
            </div>
          </div>
          <div class="editor-actions">
            <button type="button" mat-stroked-button [disabled]="saving" (click)="cancel()">
              Hủy
            </button>
            <button type="submit" mat-flat-button [disabled]="saving">
              {{
                saving
                  ? 'Đang lưu'
                  : copying
                    ? 'Lưu bản riêng'
                    : editing
                      ? 'Lưu thay đổi'
                      : isAdmin
                        ? 'Thêm vào thư viện chung'
                        : 'Thêm thực phẩm riêng'
              }}
            </button>
          </div>
        </form>
      </div>
    </ng-template>
  </div>`,
  styles: [
    `
      .subgroup-filters {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin: 0 0 20px;
      }
      .subgroup-filters button {
        padding: 8px 12px;
        border: 1px solid #d9e6dc;
        border-radius: 8px;
        background: white;
        color: #496450;
        font: inherit;
        font-size: 12px;
        cursor: pointer;
      }
      .subgroup-filters button.selected {
        background: #e5f3e8;
        border-color: #83b995;
        color: #156b32;
      }
      .load-foods {
        margin-top: 20px;
      }
      .food-editor {
        display: flex;
        flex-direction: column;
        max-height: calc(100dvh - 32px);
        background: #fff;
        color: #172b21;
      }
      .editor-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        padding: 20px 24px;
        border-bottom: 1px solid #e5ede7;
      }
      .editor-head h2 {
        font-size: 21px;
        line-height: 1.4;
        margin: 0;
      }
      .food-editor-form {
        display: flex;
        flex-direction: column;
        min-height: 0;
      }
      .editor-body {
        padding: 22px 24px;
        overflow-y: auto;
      }
      .editor-body label {
        display: grid;
        gap: 7px;
        font-size: 13px;
      }
      .editor-body input {
        width: 100%;
        min-height: 42px;
        padding: 10px 12px;
        border: 1px solid #d9e5dc;
        border-radius: 9px;
        background: #fbfdfb;
        font: inherit;
      }
      .editor-body input:focus {
        outline: 2px solid #15803d;
        outline-offset: 1px;
      }
      .editor-body .ng-invalid.ng-touched {
        border-color: #b91c1c;
      }
      .editor-body .subtle,
      .editor-body .notice {
        margin: 0;
        line-height: 1.6;
        font-size: 12px;
      }
      .editor-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        padding: 16px 24px;
        border-top: 1px solid #e5ede7;
      }
      @media (max-width: 550px) {
        .editor-head,
        .editor-body,
        .editor-actions {
          padding: 16px;
        }
        .editor-head h2 {
          font-size: 18px;
        }
      }
      .food-nutrient-list {
        grid-column: 1 / -1;
        margin: 0;
        padding-top: 6px;
        border-top: 1px solid #edf2ee;
        font-size: 13px;
      }
      .food-nutrient-list > div {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 14px;
        padding: 9px 0;
        border-bottom: 1px solid #f0f3ef;
      }
      .food-nutrient-list > div:last-child {
        border-bottom: 0;
      }
      .food-nutrient-list dt {
        color: #718578;
      }
      .food-nutrient-list dd {
        margin: 0;
        text-align: right;
        color: #28543a;
        font-weight: 600;
      }
      .food-nutrient-list dd.missing {
        color: #8b968d;
        font-size: 12px;
        font-weight: 400;
      }
      .category-filters {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin: 0 0 24px;
      }
      .category-filter {
        padding: 11px 18px;
        border: 1px solid #d4e5d8;
        border-radius: 999px;
        background: #fff;
        color: #426350;
        font: inherit;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition:
          background 0.15s,
          border-color 0.15s;
      }
      .category-filter:hover {
        background: #eef9f0;
        border-color: #159447;
      }
      .category-filter.selected {
        background: #159447;
        border-color: #159447;
        color: #fff;
      }
      .category-filter:focus-visible {
        outline: 2px solid #159447;
        outline-offset: 3px;
      }
      @media (max-width: 550px) {
        .category-filters {
          gap: 8px;
        }
        .category-filter {
          padding: 10px 14px;
        }
      }
    `,
  ],
})
export class FoodsComponent implements OnInit, OnDestroy {
  private request?: Subscription;
  private dialog = inject(MatDialog);
  private dialogRef?: MatDialogRef<unknown>;
  @ViewChild('foodDialog') editor!: TemplateRef<unknown>;
  submitted = false;
  api = inject(ApiService);
  get isAdmin() {
    return this.api.role() === 'ADMIN';
  }
  status = 'ALL';
  loading = false;
  saving = false;
  foods: any[] = [];
  categories: any[] = [];
  search = '';
  categoryId = '';
  subgroup = '';
  visibleLimit = 24;
  get subgroups(): string[] {
    return this.categories.find((c) => String(c.id) === this.categoryId)?.subgroups || [];
  }
  get formSubgroups(): string[] {
    return this.categories.find((c) => c.id === this.form.categoryId)?.subgroups || [];
  }
  error = '';
  notice = '';
  editing = 0;
  copying = 0;
  n = num;
  nutrientValue(value: unknown, unit: string) {
    if (value === null || value === undefined || value === '') return 'Chưa có dữ liệu';
    const amount = Number(value);
    return Number.isFinite(amount)
      ? `${new Intl.NumberFormat('vi-VN', { maximumSignificantDigits: 8 }).format(amount)} ${unit}`
      : 'Chưa có dữ liệu';
  }
  form: any = {
    name: '',
    subgroup: null,
    categoryId: 0,
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    estimatedCost: null,
    fiber: null,
    sugars: null,
    sodium: null,
  };
  ngOnInit() {
    this.api.get('/categories').subscribe({
      next: (c: any[]) => {
        this.categories = c;
        if (!this.form.categoryId) this.form.categoryId = c[0]?.id || 0;
      },
      error: (e) => (this.error = message(e)),
    });
    this.load();
  }
  load() {
    this.request?.unsubscribe();
    this.visibleLimit = 24;
    this.loading = true;
    this.error = '';
    this.request = this.api
      .get(
        `${this.isAdmin ? '/admin/foods' : '/foods'}?search=${encodeURIComponent(this.search)}${this.categoryId ? '&categoryId=' + this.categoryId : ''}${this.subgroup ? '&subgroup=' + encodeURIComponent(this.subgroup) : ''}${this.isAdmin ? '&status=' + this.status : ''}`,
      )
      .subscribe({
        next: (f: any[]) => {
          this.foods = f;
          this.loading = false;
        },
        error: (e) => {
          this.error = message(e);
          this.loading = false;
        },
      });
  }
  selectCategory(id: string) {
    if (this.categoryId === id) return;
    this.categoryId = id;
    this.subgroup = '';
    this.load();
  }
  icon(category: string) {
    const icons: Record<string, string> = {
      GRAINS: '🌾',
      VEGETABLES: '🥬',
      FRUITS: '🍎',
      MEAT_POULTRY: '🍗',
      SEAFOOD: '🐟',
      EGGS: '🥚',
      DAIRY: '🥛',
      LEGUMES_NUTS: '🫘',
      PREPARED: '🍽️',
    };
    return icons[category] || '🍽️';
  }
  edit(f: any) {
    this.copying = !this.isAdmin && !f.ownerId ? f.id : 0;
    this.editing = this.copying ? 0 : f.id;
    this.form = {
      name: f.name,
      subgroup: f.subgroup || null,
      categoryId: f.categoryId,
      calories: Number(f.calories),
      protein: Number(f.protein),
      carbs: Number(f.carbs),
      fat: Number(f.fat),
      estimatedCost: f.estimatedCost ? Number(f.estimatedCost) : null,
      fiber: f.fiber == null ? null : Number(f.fiber),
      sugars: f.sugars == null ? null : Number(f.sugars),
      sodium: f.sodium == null ? null : Number(f.sodium),
    };
    this.openEditor();
  }
  add() {
    this.resetForm();
    this.openEditor();
  }
  selectSubgroup(subgroup: string) {
    this.subgroup = subgroup;
    this.load();
  }
  private openEditor() {
    this.error = '';
    this.submitted = false;
    this.dialogRef = this.dialog.open(this.editor, {
      width: '680px',
      maxWidth: 'calc(100vw - 32px)',
      maxHeight: 'calc(100dvh - 32px)',
      ariaLabelledBy: 'food-editor-title',
      restoreFocus: true,
      panelClass: 'food-editor-dialog',
    });
  }
  ngOnDestroy() {
    this.request?.unsubscribe();
    this.dialogRef?.close();
  }
  save(editorForm: NgForm) {
    if (this.saving) return;
    this.submitted = true;
    this.form.name = this.form.name.trim();
    if (editorForm.invalid || this.form.name.length < 2) {
      editorForm.form.markAllAsTouched();
      return;
    }
    if (
      this.isAdmin &&
      !confirm(
        this.editing
          ? 'Lưu thay đổi thực phẩm chung? Số liệu phân tích sử dụng thực phẩm này cũng sẽ được tính lại.'
          : 'Thêm thực phẩm này vào thư viện cho tất cả người dùng?',
      )
    )
      return;
    this.saving = true;
    if (this.dialogRef) this.dialogRef.disableClose = true;
    this.error = '';
    const request = this.copying
      ? this.api.post(`/foods/${this.copying}/customize`, this.form)
      : this.editing
        ? this.api.put(`/foods/${this.editing}`, this.form)
        : this.api.post('/foods', this.form);
    request.subscribe({
      next: () => {
        this.saving = false;
        if (this.dialogRef) this.dialogRef.disableClose = false;
        this.notice = this.copying
          ? 'Đã lưu bản riêng. Bạn có thể chọn bản này khi thêm món vào nhật ký hoặc thực đơn.'
          : this.editing
            ? 'Đã cập nhật thực phẩm.'
            : this.isAdmin
              ? 'Đã thêm thực phẩm dùng chung cho tất cả người dùng.'
              : 'Đã thêm thực phẩm riêng.';
        this.dialogRef?.close();
        this.search = '';
        this.categoryId = '';
        this.subgroup = '';
        this.load();
      },
      error: (e) => {
        this.error = message(e);
        this.saving = false;
        if (this.dialogRef) this.dialogRef.disableClose = false;
      },
    });
  }
  cancel() {
    if (this.saving) return;
    this.dialogRef?.close();
  }
  private resetForm() {
    this.editing = 0;
    this.copying = 0;
    this.form = {
      name: '',
      subgroup: null,
      categoryId: this.categories[0]?.id || 0,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      estimatedCost: null,
      fiber: null,
      sugars: null,
      sodium: null,
    };
  }
  remove(id: number) {
    if (
      confirm(
        'Xóa thực phẩm này khỏi danh sách? Dữ liệu cũ trong kế hoạch và nhật ký vẫn được giữ.',
      )
    )
      this.api.delete(`/foods/${id}`).subscribe({
        next: () => {
          this.notice = 'Đã ẩn thực phẩm. Dữ liệu cũ vẫn được giữ.';
          this.load();
        },
        error: (e) => (this.error = message(e)),
      });
  }
  restore(id: number) {
    if (!confirm('Hiển thị lại thực phẩm này cho tất cả người dùng?')) return;
    this.api.put(`/admin/foods/${id}/visibility`, { isActive: true }).subscribe({
      next: () => {
        this.notice = 'Đã hiển thị lại thực phẩm chung.';
        this.load();
      },
      error: (e) => (this.error = message(e)),
    });
  }
}
