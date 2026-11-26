import { Component, ElementRef, HostListener, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from './services/api.service';
import { NotificationsService } from './services/notifications.service';
import { notificationDestination } from './notification-links';
import { AlertLevelComponent } from './alert-level.component';
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
          <button class="notification-preview" [class.unread]="!n.readAt" (click)="visit(n)">
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
        width: 38px;
        height: 38px;
        border: 1px solid #dde8dc;
        border-radius: 10px;
        background: #fff;
        color: #4d7250;
        cursor: pointer;
      }
      .bell svg {
        width: 20px;
        height: 20px;
      }
      .badge {
        position: absolute;
        top: -5px;
        right: -6px;
        min-width: 18px;
        padding: 2px 4px;
        border: 2px solid #fff;
        border-radius: 20px;
        background: #b44b3e;
        color: #fff;
        font-size: 9px;
        font-weight: 700;
      }
      .notification-menu {
        position: absolute;
        right: 0;
        top: 48px;
        width: 350px;
        max-width: calc(100vw - 32px);
        z-index: 60;
        border: 1px solid #dce7d9;
        border-radius: 14px;
        background: #fff;
        box-shadow: 0 12px 45px #24402720;
        overflow: hidden;
      }
      .notification-menu header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 17px;
        border-bottom: 1px solid #edf2eb;
      }
      .notification-menu header strong {
        font-size: 14px;
      }
      .notification-menu header span {
        font-size: 11px;
        color: #7e8e79;
      }
      .notification-menu p {
        padding: 14px;
        font-size: 12px;
        color: #6b7e65;
      }
      .notification-preview {
        display: grid;
        gap: 6px;
        width: 100%;
        padding: 14px 17px;
        border: 0;
        border-bottom: 1px solid #edf2eb;
        background: white;
        text-align: left;
        cursor: pointer;
      }
      .notification-preview.unread {
        background: #f1f8ed;
      }
      .notification-preview strong {
        font-size: 12px;
        color: #36573c;
        line-height: 1.6;
      }
      .notification-preview span {
        font-size: 11px;
        color: #7a8d72;
        line-height: 1.6;
      }
      .notification-preview small {
        font-size: 10px;
        color: #94a38d;
      }
      .notification-menu > a {
        display: block;
        padding: 14px 17px;
        font-size: 12px;
        text-align: center;
        color: #16833e;
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
