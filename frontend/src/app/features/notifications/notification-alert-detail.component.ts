import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { AlertLevelComponent } from '../../shared/components/alert-level/alert-level.component';
import { MonitoringEvidenceComponent } from '../../shared/components/monitoring-evidence/monitoring-evidence.component';
import { message, today } from '../../shared/utils/ui';
import { severityNames, sourceNames, statusNames } from '../admin/alerts/alerts.component';
@Component({
  selector: 'app-notification-alert-detail',
  imports: [RouterLink, MatButtonModule, MonitoringEvidenceComponent, AlertLevelComponent],
  template: ` <div class="page monitoring-page">
    <div class="page-head">
      <span class="eyebrow">THÔNG BÁO VÀ CẢNH BÁO</span>
      <h1>Chi tiết cảnh báo</h1>
      <p>Xem nguyên nhân, dữ liệu đối chiếu và kết quả hỗ trợ từ Admin.</p>
    </div>
    <div class="monitor-actions">
      <a mat-stroked-button routerLink="/notifications">Về danh sách thông báo</a
      ><button mat-button [disabled]="loading" (click)="load()">Tải lại trạng thái</button>
    </div>
    @if (error) {
      <p class="error" role="alert">{{ error }}</p>
    }
    @if (loading) {
      <p role="status">Đang tải chi tiết cảnh báo…</p>
    }
    @if (alert) {
      <section class="panel alert-surface" [attr.data-alert-severity]="alert.severity">
        <app-alert-level [severity]="alert.severity" />
        <h2>{{ alert.title }}</h2>
        <p>{{ alert.body }}</p>
        <p class="subtle">{{ sources[alert.source] }} · {{ statuses[alert.status] }}</p>
        <p class="subtle">
          Phát hiện {{ date(alert.detectedAt) }} · Ghi nhận gần nhất
          {{ date(alert.lastDetectedAt) }}
        </p>
        <h3>Dữ liệu làm căn cứ</h3>
        <app-monitoring-evidence [value]="alert.evidence" />
        <div class="monitor-actions">
          <a
            mat-stroked-button
            [routerLink]="relatedPath"
            [queryParams]="alert.source === 'WEIGHT' ? {} : { date: relatedDate }"
            >{{
              alert.source === 'PLAN'
                ? 'Xem thực đơn liên quan'
                : alert.source === 'WEIGHT'
                  ? 'Xem cân nặng'
                  : 'Xem nhật ký liên quan'
            }}</a
          >
        </div>
        <p class="subtle">Cảnh báo hỗ trợ theo dõi dinh dưỡng, không chẩn đoán bệnh.</p>
      </section>
      <section class="panel">
        <h2>Lịch sử và phản hồi từ Admin</h2>
        @for (event of alert.events; track event.id) {
          <article class="monitor-history">
            <strong>{{ statuses[event.status] }}</strong>
            <p>{{ event.note }}</p>
            <small
              >{{ date(event.createdAt) }} ·
              {{ event.actorId ? 'Quản trị viên' : 'Hệ thống' }}</small
            >
          </article>
        } @empty {
          <p class="monitor-empty">Chưa có cập nhật xử lý.</p>
        }
      </section>
    }
  </div>`,
  styleUrl: '../../shared/styles/monitoring.scss',
})
export class NotificationAlertDetailComponent implements OnInit {
  private request?: Subscription;
  api = inject(ApiService);
  route = inject(ActivatedRoute);
  destroyRef = inject(DestroyRef);
  alert: any = null;
  loading = false;
  error = '';
  severities = severityNames;
  sources = sourceNames;
  statuses = statusNames;
  ngOnInit() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
  }
  load() {
    this.request?.unsubscribe();
    this.loading = true;
    this.error = '';
    this.alert = null;
    this.request = this.api
      .get<any>('/alerts/' + this.route.snapshot.paramMap.get('id'))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (a) => {
          this.alert = a;
          this.loading = false;
        },
        error: (e) => {
          this.error = message(e);
          this.loading = false;
        },
      });
  }
  get relatedPath() {
    return this.alert?.source === 'PLAN'
      ? '/plans'
      : this.alert?.source === 'WEIGHT'
        ? '/weights'
        : '/logs';
  }
  get relatedDate() {
    return this.alert?.evidence?.date || this.alert?.evidence?.days?.at(-1)?.date || today();
  }
  date(value: string) {
    return new Date(value).toLocaleString('vi-VN');
  }
}
