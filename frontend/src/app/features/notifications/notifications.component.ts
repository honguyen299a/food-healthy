import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { NotificationsService } from '../../core/services/notifications.service';
import { notificationDestination } from '../../core/utils/notification-links';
import {
  AlertLevelComponent,
  alertLevelNames,
} from '../../shared/components/alert-level/alert-level.component';
import { StyledSelectModule } from '../../shared/components/styled-select/styled-select.module';
import { message } from '../../shared/utils/ui';
export const notificationNames: Record<string, string> = {
  HEALTH_ALERT: 'Cảnh báo mới',
  ALERT_STATUS: 'Trạng thái cảnh báo',
  NUTRITION_INSIGHT: 'Nhận xét dinh dưỡng',
  WEIGHT_REMINDER: 'Nhắc cân nặng',
  LOG_REMINDER: 'Nhắc nhật ký',
  GOAL_REMINDER: 'Nhắc mục tiêu',
  WEEKLY_REPORT: 'Báo cáo tuần',
};
@Component({
  selector: 'app-notifications',
  imports: [StyledSelectModule, FormsModule, MatButtonModule, AlertLevelComponent],
  template: ` <div class="page monitoring-page">
    <div class="page-head">
      <span class="eyebrow">TRUNG TÂM THÔNG BÁO</span>
      <h1>{{ api.role() === 'ADMIN' ? 'Thông báo quản trị' : 'Thông báo và cảnh báo' }}</h1>
      <p>
        {{
          api.role() === 'ADMIN'
            ? 'Theo dõi cảnh báo cần xử lý và các cập nhật dành cho tài khoản quản trị.'
            : 'Cảnh báo, nhận xét và nhắc nhở dinh dưỡng được lưu tự động.'
        }}
      </p>
    </div>
    <div class="toolbar">
      <label
        >Mức độ cảnh báo<mat-select
          panelClass="app-select-panel"
          [(ngModel)]="severity"
          (ngModelChange)="load()"
          aria-label="Mức độ cảnh báo"
        >
          <mat-option value="">Tất cả mức độ</mat-option>
          @for (level of levels; track level) {
            <mat-option [value]="level">{{ levelNames[level] }}</mat-option>
          }
        </mat-select></label
      >
      <label
        >Loại<mat-select
          panelClass="app-select-panel"
          [(ngModel)]="type"
          (ngModelChange)="load()"
          aria-label="Loại"
        >
          <mat-option value="">Tất cả loại</mat-option>
          @for (key of keys; track key) {
            <mat-option [value]="key">{{ names[key] }}</mat-option>
          }
        </mat-select></label
      ><label
        >Trạng thái<mat-select
          panelClass="app-select-panel"
          [(ngModel)]="read"
          (ngModelChange)="load()"
          aria-label="Trạng thái"
        >
          <mat-option value="ALL">Tất cả</mat-option>
          <mat-option value="UNREAD">Chưa đọc</mat-option>
          <mat-option value="READ">Đã đọc</mat-option>
        </mat-select></label
      ><button mat-flat-button [disabled]="busy || working" (click)="readAll()">
        Đánh dấu tất cả đã đọc
      </button>
    </div>
    @if (error) {
      <p class="error" role="alert">{{ error }}</p>
    }
    @if (busy) {
      <p role="status">Đang tải thông báo…</p>
    }
    <section class="panel">
      @for (n of items; track n.id) {
        <article
          class="notification-row alert-surface"
          [attr.data-alert-severity]="n.severity"
          [class.unread]="!n.readAt"
        >
          <div>
            <span class="monitor-tag">{{ names[n.type] }}</span>
            <app-alert-level [severity]="n.severity" />
            <h2>
              <button class="text-link" (click)="visit(n)">{{ n.title }}</button>
            </h2>
            <p>{{ n.body }}</p>
            <small>{{ date(n.createdAt) }} · {{ n.readAt ? 'Đã đọc' : 'Chưa đọc' }}</small>
          </div>
          <div class="monitor-actions">
            <button mat-stroked-button [disabled]="working" (click)="visit(n)">Xem chi tiết</button>
            <button mat-button [disabled]="working" (click)="mark(n)">
              {{ n.readAt ? 'Đánh dấu chưa đọc' : 'Đánh dấu đã đọc' }}</button
            ><button mat-button [disabled]="working" (click)="remove(n)">Ẩn</button>
          </div>
        </article>
      } @empty {
        @if (!busy) {
          <p class="monitor-empty">Chưa có thông báo phù hợp.</p>
        }
      }
      @if (cursor) {
        <button mat-stroked-button [disabled]="busy" (click)="load(true)">Tải thêm</button>
      }
    </section>
  </div>`,
  styleUrl: '../../shared/styles/monitoring.scss',
})
export class NotificationsComponent implements OnInit {
  api = inject(ApiService);
  private bell = inject(NotificationsService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  items: any[] = [];
  cursor: number | null = null;
  type = '';
  read = 'ALL';
  severity = '';
  levels = ['HIGH', 'MEDIUM', 'LOW'];
  levelNames = alertLevelNames;
  busy = false;
  working = false;
  error = '';
  names = notificationNames;
  get keys() {
    return this.api.role() === 'ADMIN'
      ? ['HEALTH_ALERT', 'ALERT_STATUS']
      : Object.keys(notificationNames).filter(
          (key) => !['NUTRITION_INSIGHT', 'WEEKLY_REPORT'].includes(key),
        );
  }
  ngOnInit() {
    const type = this.route.snapshot.queryParamMap.get('type');
    if (type && this.keys.includes(type)) this.type = type;
    const severity = this.route.snapshot.queryParamMap.get('severity');
    if (severity && this.levels.includes(severity)) this.severity = severity;
    this.load();
  }
  date(value: string) {
    return new Date(value).toLocaleString('vi-VN');
  }
  load(more = false) {
    this.busy = true;
    this.error = '';
    this.api
      .get<any>(
        `/notifications?limit=20&read=${this.read}${this.type ? '&type=' + this.type : ''}${this.severity ? '&severity=' + this.severity : ''}${more && this.cursor ? '&cursor=' + this.cursor : ''}`,
      )
      .subscribe({
        next: (r) => {
          this.items = more ? [...this.items, ...r.items] : r.items;
          this.cursor = r.nextCursor;
          this.busy = false;
          this.bell.refresh();
        },
        error: (e) => {
          this.error = message(e);
          this.busy = false;
        },
      });
  }
  private update(path: string, body: any) {
    this.working = true;
    this.api.put(path, body).subscribe({
      next: () => {
        this.working = false;
        this.load();
      },
      error: (e) => {
        this.error = message(e);
        this.working = false;
      },
    });
  }
  mark(n: any) {
    this.update(`/notifications/${n.id}/read`, { read: !n.readAt });
  }
  readAll() {
    this.update('/notifications/read-all', {});
  }
  visit(n: any) {
    this.working = true;
    this.api.put(`/notifications/${n.id}/read`, { read: true }).subscribe({
      next: () => {
        this.working = false;
        this.bell.refresh();
        this.router.navigateByUrl(notificationDestination(n.targetPath));
      },
      error: (e) => {
        this.error = message(e);
        this.working = false;
      },
    });
  }
  remove(n: any) {
    if (!confirm('Ẩn thông báo này khỏi danh sách?')) return;
    this.working = true;
    this.api.delete(`/notifications/${n.id}`).subscribe({
      next: () => {
        this.working = false;
        this.load();
      },
      error: (e) => {
        this.error = message(e);
        this.working = false;
      },
    });
  }
}
