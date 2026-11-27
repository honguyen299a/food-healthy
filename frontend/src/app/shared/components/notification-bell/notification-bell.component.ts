import { Component, ElementRef, HostListener, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { NotificationsService } from '../../../core/services/notifications.service';
import { notificationDestination } from '../../../core/utils/notification-links';
import { AlertLevelComponent } from '../alert-level/alert-level.component';
@Component({
  selector: 'app-notification-bell',
  imports: [RouterLink, AlertLevelComponent],
  template: `
    <button
      type="button"
      class="bell"
      aria-label="Mở thông báo"
      [attr.aria-expanded]="open"
      aria-controls="notification-menu"
      (click)="toggle()"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.7"
        aria-hidden="true"
      >
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
      </svg>
      @if (notifications.unread()) {
        <span class="badge">{{
          notifications.unread() > 99 ? '99+' : notifications.unread()
        }}</span>
      }
    </button>
    @if (open) {
      <section id="notification-menu" class="notification-menu" aria-label="Thông báo gần đây">
        <header>
          <strong>Thông báo</strong><span>{{ notifications.unread() }} chưa đọc</span>
        </header>
        @if (notifications.error()) {
          <p role="alert">{{ notifications.error() }}</p>
          <button type="button" (click)="notifications.refresh()">Thử lại</button>
        }
        @for (n of notifications.recent(); track n.id) {
          <button
            class="notification-preview alert-surface"
            [attr.data-alert-severity]="n.severity"
            [class.unread]="!n.readAt"
            (click)="visit(n)"
          >
            <app-alert-level [severity]="n.severity" />
            <strong>{{ n.title }}</strong
            ><span>{{ n.body }}</span
            ><small>{{ format(n.createdAt) }}</small>
          </button>
        } @empty {
          <p>Chưa có thông báo.</p>
        }
        <a routerLink="/notifications" (click)="open = false">Xem tất cả thông báo</a>
      </section>
    }
  `,
  styles: [
    `
      :host {
        position: relative;
        display: block;
      }
      .bell {
        position: relative;
        display: grid;
        place-items: center;
        width: 36px;
        height: 36px;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        background: #ffffff;
        color: #475569;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .bell:hover {
        background: #f8fafc;
        border-color: #cbd5e1;
        color: #0f172a;
      }
      .bell svg {
        width: 19px;
        height: 19px;
      }
      .badge {
        position: absolute;
        top: -4px;
        right: -5px;
        min-width: 18px;
        height: 18px;
        padding: 0 4px;
        border: 2px solid #ffffff;
        border-radius: 9999px;
        background: #ef4444;
        color: #ffffff;
        font-size: 10px;
        font-weight: 700;
        display: grid;
        place-items: center;
        box-shadow: 0 2px 5px rgba(239, 68, 68, 0.3);
      }
      .notification-menu {
        position: absolute;
        right: 0;
        top: 48px;
        width: 360px;
        max-width: calc(100vw - 32px);
        z-index: 60;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        background: #ffffff;
        box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.1);
        overflow: hidden;
      }
      .notification-menu header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 18px;
        border-bottom: 1px solid #f1f5f9;
      }
      .notification-menu header strong {
        font-size: 14px;
        color: #0f172a;
        font-weight: 700;
      }
      .notification-menu header span {
        font-size: 11.5px;
        color: #64748b;
        font-weight: 600;
      }
      .notification-menu p {
        padding: 16px 18px;
        font-size: 13px;
        color: #64748b;
        margin: 0;
      }
      .notification-preview {
        display: grid;
        gap: 6px;
        width: 100%;
        padding: 14px 18px;
        border: 0;
        border-bottom: 1px solid #f1f5f9;
        background: #ffffff;
        text-align: left;
        cursor: pointer;
        transition: background 0.15s ease;
      }
      .notification-preview:hover {
        background: #f8fafc;
      }
      .notification-preview.unread {
        background: var(--alert-bg, #f0fdf4);
      }
      .notification-preview strong {
        font-size: 13px;
        color: #0f172a;
        line-height: 1.5;
        font-weight: 600;
      }
      .notification-preview span {
        font-size: 12px;
        color: #64748b;
        line-height: 1.5;
      }
      .notification-preview small {
        font-size: 11px;
        color: #94a3b8;
      }
      .notification-menu > a {
        display: block;
        padding: 14px 18px;
        font-size: 12.5px;
        font-weight: 600;
        text-align: center;
        color: #059669;
        text-decoration: none;
        transition: background 0.15s ease;
      }
      .notification-menu > a:hover {
        background: #f8fafc;
      }
      @media (max-width: 700px) {
        .notification-menu {
          position: fixed;
          right: 16px;
          top: 62px;
        }
      }
    `,
  ],
})
export class NotificationBellComponent {
  notifications = inject(NotificationsService);
  private api = inject(ApiService);
  private router = inject(Router);
  private element = inject(ElementRef);
  open = false;
  toggle() {
    this.open = !this.open;
    if (this.open) this.notifications.refresh();
  }
  @HostListener('document:click', ['$event']) outside(event: MouseEvent) {
    if (!this.element.nativeElement.contains(event.target)) this.open = false;
  }
  @HostListener('document:keydown.escape') close() {
    this.open = false;
  }
  format(value: string) {
    return new Date(value).toLocaleString('vi-VN');
  }
  visit(n: any) {
    this.api.put(`/notifications/${n.id}/read`, { read: true }).subscribe({
      next: () => {
        this.notifications.refresh();
        this.open = false;
        this.router.navigateByUrl(notificationDestination(n.targetPath));
      },
      error: () => this.notifications.error.set('Không mở được thông báo. Hãy thử lại.'),
    });
  }
}
