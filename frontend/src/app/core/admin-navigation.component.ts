import { Component, EventEmitter, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
@Component({
  selector: 'app-admin-navigation',
  imports: [RouterLink, RouterLinkActive],
  template: ` <p class="nav-caption">KHÔNG GIAN QUẢN TRỊ</p>
    <nav class="side-nav" aria-label="Quản trị">
      @for (item of links; track item.path) {
        <a
          [routerLink]="item.path"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: item.exact }"
          ariaCurrentWhenActive="page"
          (click)="navigate.emit()"
          ><span class="nav-icon" aria-hidden="true"
            ><svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path [attr.d]="item.icon" /></svg></span
          ><span>{{ item.label }}</span></a
        >
      }
    </nav>`,
  styles: [':host{display:block}'],
})
export class AdminNavigationComponent {
  @Output() navigate = new EventEmitter<void>();
  links = [
    {
      path: '/admin',
      label: 'Tổng quan hệ thống',
      exact: true,
      icon: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
    },
    {
      path: '/admin/users',
      label: 'Theo dõi người dùng',
      exact: false,
      icon: 'M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8M18 8a3 3 0 0 1 0 6m2 2a4 4 0 0 1 3 4',
    },
    {
      path: '/admin/alerts',
      label: 'Cảnh báo dinh dưỡng',
      exact: false,
      icon: 'm12 3 10 18H2L12 3Zm0 6v5m0 3v1',
    },
    {
      path: '/admin/foods',
      label: 'Thực phẩm dùng chung',
      exact: false,
      icon: 'M12 21c-4-2-7-5-7-10a7 7 0 0 1 14 0c0 5-3 8-7 10ZM12 8v9m0-4 4-4',
    },
    {
      path: '/admin/categories',
      label: 'Nhóm thực phẩm',
      exact: false,
      icon: 'M3 4h7v6H3zM14 4h7v6h-7zM3 14h7v6H3zM14 14h7v6h-7z',
    },
    {
      path: '/notifications',
      label: 'Thông báo quản trị',
      exact: false,
      icon: 'M5 17h14l-2-4V9a5 5 0 0 0-10 0v4l-2 4Zm5 3h4',
    },
    {
      path: '/admin/account',
      label: 'Tài khoản quản trị',
      exact: false,
      icon: 'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8M5 21v-2a7 7 0 0 1 14 0v2',
    },
  ];
}
