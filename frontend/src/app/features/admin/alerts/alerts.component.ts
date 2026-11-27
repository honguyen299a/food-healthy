import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { MonitoringEvidenceComponent } from '../../../shared/components/monitoring-evidence/monitoring-evidence.component';
import { StyledSelectModule } from '../../../shared/components/styled-select/styled-select.module';
import { message } from '../../../shared/utils/ui';
export const severityNames: Record<string, string> = {
  LOW: 'Cần chú ý',
  MEDIUM: 'Cần theo dõi',
  HIGH: 'Ưu tiên xem xét',
};
export const statusNames: Record<string, string> = {
  OPEN: 'Mới phát hiện',
  IN_PROGRESS: 'Đang xử lý',
  RESOLVED: 'Đã xử lý/đóng',
};
export const sourceNames: Record<string, string> = {
  ACTUAL: 'Thực tế đã ăn',
  PLAN: 'Thực đơn dự kiến',
  WEIGHT: 'Theo dõi cân nặng',
};
@Component({
  selector: 'app-alerts',
  imports: [
    StyledSelectModule,
    FormsModule,
    MatButtonModule,
    MonitoringEvidenceComponent,
    RouterLink,
  ],
  template: ` <div class="page monitoring-page">
    <div class="page-head">
      <span class="eyebrow">HEALTH ALERT</span>
      <h1>{{ admin ? 'Quản lý cảnh báo' : 'Cảnh báo của bạn' }}</h1>
      <p>
        Hỗ trợ theo dõi dinh dưỡng, không chẩn đoán bệnh. Mức độ thể hiện thứ tự cần xem xét, không
        phải mức nguy cơ y khoa.
      </p>
    </div>
    @if (admin) {
      <p class="notice">
        Theo dõi các cảnh báo cần xử lý, ghi nhận kết quả kiểm tra và bước hỗ trợ tiếp theo.
      </p>
    }
    <div class="monitor-stats">
      <article>
        <span>Tổng theo bộ lọc</span><strong>{{ total }}</strong>
      </article>
      @for (key of severityKeys; track key) {
        <article>
          <span>{{ severities[key] }}</span
          ><strong>{{ count(key) }}</strong>
        </article>
      }
    </div>
    <div class="toolbar">
      @if (admin) {
        <label
          >Mã người dùng<input
            type="number"
            [(ngModel)]="userId"
            min="1"
            (change)="load()"
            placeholder="Tất cả người dùng"
        /></label>
      }
      <label
        >Trạng thái<mat-select
          panelClass="app-select-panel"
          [(ngModel)]="status"
          (ngModelChange)="load()"
          aria-label="Trạng thái"
        >
          <mat-option value="">Tất cả</mat-option>
          @for (key of statusKeys; track key) {
            <mat-option [value]="key">{{ statuses[key] }}</mat-option>
          }
        </mat-select></label
      ><label
        >Mức độ<mat-select
          panelClass="app-select-panel"
          [(ngModel)]="severity"
          (ngModelChange)="load()"
          aria-label="Mức độ"
        >
          <mat-option value="">Tất cả</mat-option>
          @for (key of severityKeys; track key) {
            <mat-option [value]="key">{{ severities[key] }}</mat-option>
          }
        </mat-select></label
      ><label
        >Nguồn<mat-select
          panelClass="app-select-panel"
          [(ngModel)]="source"
          (ngModelChange)="load()"
          aria-label="Nguồn"
        >
          <mat-option value="">Tất cả</mat-option>
          @for (key of sourceKeys; track key) {
            <mat-option [value]="key">{{ sources[key] }}</mat-option>
          }
        </mat-select></label
      ><label
        >Loại<mat-select
          panelClass="app-select-panel"
          [(ngModel)]="type"
          (ngModelChange)="load()"
          aria-label="Loại"
        >
          <mat-option value="">Tất cả</mat-option>
          @for (t of types; track t) {
            <mat-option [value]="t">{{ typeNames[t] || t }}</mat-option>
          }
        </mat-select></label
      >
    </div>
    @if (error) {
      <p class="error" role="alert">{{ error }}</p>
    }
    @if (notice) {
      <p class="notice" role="status">{{ notice }}</p>
    }
    @if (busy) {
      <p role="status">Đang tải cảnh báo…</p>
    }
    <div class="monitor-columns">
      <section class="panel">
        @for (a of items; track a.id) {
          <button
            class="alert-list-item alert-surface"
            [attr.data-alert-severity]="a.severity"
            [class.active]="selected?.id === a.id"
            (click)="detail(a.id)"
          >
            <span class="severity" [class]="a.severity">{{ severities[a.severity] }}</span
            ><strong>{{ a.title }}</strong
            ><span>{{ sources[a.source] }} · {{ statuses[a.status] }}</span>
            @if (admin) {
              <small>{{ a.user?.profile?.name || a.user?.email }} · #{{ a.userId }}</small>
            }
            <small>{{ date(a.lastDetectedAt) }}</small>
          </button>
        } @empty {
          @if (!busy) {
            <p class="monitor-empty">Chưa có cảnh báo phù hợp.</p>
          }
        }
        @if (cursor) {
          <button mat-stroked-button [disabled]="busy" (click)="load(true)">Tải thêm</button>
        }
      </section>
      <section
        class="panel alert-surface"
        [attr.data-alert-severity]="detailBusy ? null : selected?.severity"
      >
        @if (detailBusy) {
          <p>Đang tải chi tiết…</p>
        } @else if (selected) {
          <span class="severity" [class]="selected.severity">{{
            severities[selected.severity]
          }}</span>
          <h2>{{ selected.title }}</h2>
          @if (admin) {
            <div class="monitor-history">
              <strong>{{ selected.user?.profile?.name || selected.user?.email }}</strong>
              <p>{{ selected.user?.email }} · Mã #{{ selected.userId }}</p>
              <a mat-stroked-button [routerLink]="['/admin/users', selected.userId]"
                >Xem hồ sơ và nhật ký liên quan</a
              >
            </div>
          }
          <p>{{ selected.body }}</p>
          <p class="subtle">
            {{ sources[selected.source] }} · Phát hiện {{ date(selected.detectedAt) }} ·
            {{ statuses[selected.status] }}
          </p>
          <h3>Dữ liệu làm căn cứ</h3>
          <app-monitoring-evidence [value]="selected.evidence" />
          @if (admin) {
            <div class="monitor-edit">
              <label
                >Trạng thái xử lý<mat-select
                  panelClass="app-select-panel"
                  [(ngModel)]="editStatus"
                  aria-label="Trạng thái xử lý"
                >
                  @for (key of statusKeys; track key) {
                    <mat-option [value]="key">{{ statuses[key] }}</mat-option>
                  }
                </mat-select></label
              ><label
                >Ghi chú xử lý (hiển thị cho người dùng)<textarea
                  [(ngModel)]="note"
                  rows="3"
                  maxlength="1000"
                  placeholder="Mô tả việc đã kiểm tra hoặc bước cần theo dõi"
                ></textarea></label
              ><button mat-flat-button [disabled]="saving || !note.trim()" (click)="save()">
                Lưu cập nhật
              </button>
            </div>
          }
          <h3>Lịch sử xử lý</h3>
          @for (event of selected.events; track event.id) {
            <article class="monitor-history">
              <strong>{{ statuses[event.status] }}</strong>
              <p>{{ event.note }}</p>
              <small
                >{{ date(event.createdAt) }} ·
                {{ event.actorId ? 'Quản trị viên' : 'Hệ thống' }}</small
              >
            </article>
          }
        } @else {
          <p class="monitor-empty">Chọn một cảnh báo để xem nguyên nhân và lịch sử.</p>
        }
      </section>
    </div>
  </div>`,
  styleUrl: '../../../shared/styles/monitoring.scss',
})
export class AlertsComponent implements OnInit {
  api = inject(ApiService);
  router = inject(Router);
  route = inject(ActivatedRoute);
  items: any[] = [];
  selected: any = null;
  stats: any[] = [];
  total = 0;
  cursor: number | null = null;
  status = '';
  severity = '';
  source = '';
  type = '';
  userId: number | null = null;
  busy = false;
  detailBusy = false;
  saving = false;
  error = '';
  notice = '';
  editStatus = 'OPEN';
  note = '';
  severities = severityNames;
  statuses = statusNames;
  sources = sourceNames;
  severityKeys = Object.keys(severityNames);
  statusKeys = Object.keys(statusNames);
  sourceKeys = Object.keys(sourceNames);
  typeNames: Record<string, string> = {
    CALORIES_OVER: 'Calories vượt mục tiêu',
    PROTEIN_LOW: 'Protein thấp',
    FIBER_LOW: 'Chất xơ thấp',
    SUGARS_OVER: 'Đường tổng vượt giới hạn',
    SODIUM_OVER: 'Natri vượt giới hạn',
    ALLERGY_MATCH: 'Dị ứng khai báo',
    FOOD_CONSTRAINT: 'Ràng buộc thực phẩm',
    WEIGHT_CHANGE: 'Biến động cân nặng',
    WEIGHT_GOAL: 'Tiến độ cân nặng',
    PLAN_CALORIES: 'Calories dự kiến',
    PLAN_FIBER: 'Xơ dự kiến',
    PLAN_SUGARS: 'Đường dự kiến',
    PLAN_SODIUM: 'Natri dự kiến',
  };
  get types() {
    return Object.keys(this.typeNames);
  }
  get admin() {
    return this.router.url.startsWith('/admin/alerts');
  }
  get base() {
    return this.admin ? '/admin/alerts' : '/alerts';
  }
  private destroyRef = inject(DestroyRef);
  ngOnInit() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((q) => {
      this.userId = Number(q.get('userId')) || null;
      this.load();
      const id = Number(q.get('id'));
      if (id > 0) this.detail(id);
    });
  }
  date(value: string) {
    return new Date(value).toLocaleString('vi-VN');
  }
  count(key: string) {
    return this.stats.filter((x) => x.severity === key).reduce((a, x) => a + x._count._all, 0);
  }
  load(more = false) {
    this.busy = true;
    this.error = '';
    const q = new URLSearchParams({ limit: '20' });
    if (this.admin && this.userId) q.set('userId', String(this.userId));
    for (const [k, v] of Object.entries({
      status: this.status,
      severity: this.severity,
      source: this.source,
      type: this.type,
    }))
      if (v) q.set(k, v);
    if (more && this.cursor) q.set('cursor', String(this.cursor));
    this.api.get<any>(this.base + '?' + q).subscribe({
      next: (r) => {
        this.items = more ? [...this.items, ...r.items] : r.items;
        this.total = r.total;
        this.stats = r.stats;
        this.cursor = r.nextCursor;
        this.busy = false;
      },
      error: (e) => {
        this.error = message(e);
        this.busy = false;
      },
    });
  }
  detail(id: number) {
    this.detailBusy = true;
    this.error = '';
    this.api.get<any>(`${this.base}/${id}`).subscribe({
      next: (r) => {
        this.selected = r;
        this.editStatus = r.status;
        this.note = '';
        this.detailBusy = false;
      },
      error: (e) => {
        this.error = message(e);
        this.detailBusy = false;
      },
    });
  }
  save() {
    if (
      !this.selected ||
      !this.note.trim() ||
      !confirm('Xác nhận cập nhật trạng thái và lưu ghi chú vào lịch sử cảnh báo?')
    )
      return;
    this.saving = true;
    this.api
      .put(`${this.base}/${this.selected.id}`, {
        status: this.editStatus,
        note: this.note.trim(),
        revision: this.selected.revision,
      })
      .subscribe({
        next: () => {
          this.notice = 'Đã lưu cập nhật và tạo thông báo liên quan.';
          this.saving = false;
          this.detail(this.selected.id);
          this.load();
        },
        error: (e) => {
          this.error = message(e);
          this.saving = false;
        },
      });
  }
}
