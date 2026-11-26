import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { ApiService } from '../core/services/api.service';
import { message, num } from '../core/ui';

@Component({
  selector: 'app-foods',
  imports: [FormsModule, MatButtonModule],
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
      /><button mat-flat-button (click)="showForm = true">
        {{ isAdmin ? '+ Thêm vào thư viện chung' : '+ Thêm thực phẩm riêng' }}
      </button>
      @if (isAdmin) {
        <label
          >Hiển thị<select [(ngModel)]="status" (ngModelChange)="load()">
            <option value="ALL">Tất cả thực phẩm chung</option>
            <option value="ACTIVE">Đang hiển thị</option>
            <option value="HIDDEN">Đã ẩn</option>
          </select></label
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
      @for (f of foods; track f.id) {
        <article class="food-card">
          <span class="food-icon">{{ icon(f.category.name) }}</span>
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
          @if (f.ownerId || api.role() === 'ADMIN') {
            <div class="card-actions">
              <button mat-button (click)="edit(f)">Sửa</button>
              @if (f.isActive !== false) {
                <button mat-button (click)="remove(f.id)">
                  {{ isAdmin ? 'Ẩn khỏi thư viện' : 'Xóa' }}
                </button>
              } @else if (isAdmin) {
                <button mat-button (click)="restore(f.id)">Hiển thị lại</button>
              }
            </div>
          }
        </article>
      } @empty {
        <p>Không tìm thấy thực phẩm.</p>
      }
    </div>
    @if (showForm) {
      <section class="panel admin-form">
        <div class="panel-head">
          <h2>
            {{
              editing
                ? 'Sửa thực phẩm'
                : isAdmin
                  ? 'Thêm thực phẩm dùng chung'
                  : 'Thêm thực phẩm riêng'
            }}
          </h2>
          <button mat-button (click)="cancel()">Đóng</button>
        </div>
        <form class="form-grid" (ngSubmit)="save()">
          <label>Tên<input name="name" [(ngModel)]="form.name" required /></label
          ><label
            >Nhóm<select name="categoryId" [(ngModel)]="form.categoryId" required>
              @for (c of categories; track c.id) {
                <option [ngValue]="c.id">{{ c.name }}</option>
              }
            </select></label
          ><label
            >Calories<input
              type="number"
              name="calories"
              [(ngModel)]="form.calories"
              required
              min="0" /></label
          ><label
            >Protein (g)<input
              type="number"
              name="protein"
              [(ngModel)]="form.protein"
              required
              min="0" /></label
          ><label
            >Carb (g)<input
              type="number"
              name="carbs"
              [(ngModel)]="form.carbs"
              required
              min="0" /></label
          ><label
            >Fat (g)<input
              type="number"
              name="fat"
              [(ngModel)]="form.fat"
              required
              min="0" /></label
          ><label
            >Chi phí ước tính / 100g (VNĐ)<input
              type="number"
              name="estimatedCost"
              [(ngModel)]="form.estimatedCost"
              min="0"
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
            Các chỉ số tính trên 100g. Để trống nếu chưa có dữ liệu; 0 nghĩa là đã xác nhận không có
            chất đó.
          </p>
          <div class="full">
            <button mat-flat-button [disabled]="saving">
              {{
                saving
                  ? 'Đang lưu'
                  : editing
                    ? 'Lưu thay đổi'
                    : isAdmin
                      ? 'Thêm vào thư viện chung'
                      : 'Thêm thực phẩm riêng'
              }}
            </button>
          </div>
        </form>
      </section>
    }
  </div>`,
  styles: [
    `
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
export class FoodsComponent implements OnInit {
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
  error = '';
  notice = '';
  editing = 0;
  showForm = false;
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
    this.api.get('/categories').subscribe((c: any[]) => {
      this.categories = c;
      this.form.categoryId = c[0]?.id || 0;
    });
    this.load();
  }
  load() {
    this.loading = true;
    this.error = '';
    this.api
      .get(
        `${this.isAdmin ? '/admin/foods' : '/foods'}?search=${encodeURIComponent(this.search)}${this.categoryId ? '&categoryId=' + this.categoryId : ''}${this.isAdmin ? '&status=' + this.status : ''}`,
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
    this.load();
  }
  icon(category: string) {
    return category.includes('Rau')
      ? '🥦'
      : category.includes('Trái')
        ? '🍎'
        : category.includes('Đạm')
          ? '🥚'
          : category.includes('Ngũ')
            ? '🌾'
            : '🥛';
  }
  edit(f: any) {
    this.editing = f.id;
    this.showForm = true;
    this.form = {
      name: f.name,
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
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }
  save() {
    if (this.saving) return;
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
    this.error = '';
    const request = this.editing
      ? this.api.put(`/foods/${this.editing}`, this.form)
      : this.api.post('/foods', this.form);
    request.subscribe({
      next: () => {
        this.saving = false;
        this.notice = this.editing
          ? 'Đã cập nhật thực phẩm.'
          : this.isAdmin
            ? 'Đã thêm thực phẩm dùng chung cho tất cả người dùng.'
            : 'Đã thêm thực phẩm riêng.';
        this.cancel();
        this.load();
      },
      error: (e) => {
        this.error = message(e);
        this.saving = false;
      },
    });
  }
  cancel() {
    this.editing = 0;
    this.showForm = false;
    this.form = {
      name: '',
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
