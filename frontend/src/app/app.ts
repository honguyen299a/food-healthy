import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ApiService } from './core/services/api.service';
import { NotificationBellComponent } from './core/notification-bell.component';
import { AdminNavigationComponent } from './core/admin-navigation.component';
@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    NotificationBellComponent,
    AdminNavigationComponent,
  ],
  templateUrl: './app.html',
})
export class App implements OnInit {
  api = inject(ApiService);
  router = inject(Router);
  menuOpen = signal(false);
  get isAdmin() {
    return this.api.role() === 'ADMIN';
  }
  get pageTitle() {
    if (this.isAdmin) {
      const path = this.router.url.split('?')[0];
      if (path.startsWith('/admin/users/')) return 'Chi tiết người dùng';
      return (
        (
          {
            '/admin': 'Tổng quan hệ thống',
            '/admin/users': 'Theo dõi người dùng',
            '/admin/alerts': 'Cảnh báo dinh dưỡng',
            '/admin/foods': 'Thực phẩm dùng chung',
            '/admin/categories': 'Nhóm thực phẩm',
            '/admin/account': 'Tài khoản quản trị',
            '/notifications': 'Thông báo quản trị',
          } as Record<string, string>
        )[path] || 'Quản trị'
      );
    }
    if (this.router.url.startsWith('/admin/alerts')) return 'Quản lý cảnh báo';
    const path = this.router.url.split('?')[0].split('/')[1];
    return (
      (
        {
          dashboard: 'Tổng quan',
          alerts: 'Cảnh báo của bạn',
          notifications: 'Thông báo và cảnh báo',
          insights: 'Phân tích dinh dưỡng',
          foods: 'Thư viện thực phẩm',
          plans: 'Kế hoạch ăn uống',
          week: 'Thực đơn tuần',
          recommendations: 'Đề xuất thực đơn',
          logs: 'Nhật ký ăn uống',
          weights: 'Theo dõi cân nặng',
          ai: 'Trợ lý AI',
          profile: 'Hồ sơ và mục tiêu',
          admin: 'Quản trị hệ thống',
        } as Record<string, string>
      )[path] || 'Healthy Daily'
    );
  }
  ngOnInit() {
    if (localStorage.getItem('healthy_token'))
      this.api.get('/auth/me').subscribe({
        next: (user: any) => {
          this.api.role.set(user.role);
          localStorage.setItem('healthy_role', user.role);
          if (
            user.role === 'ADMIN' &&
            !this.router.url.startsWith('/admin') &&
            !this.router.url.startsWith('/notifications')
          )
            this.router.navigateByUrl('/admin');
          this.api.setUsageMode(user.usageMode);
          this.api.setOnboardingCompleted(!!user.onboardingCompleted);
        },
        error: () => {},
      });
  }
  toggleMenu() {
    this.menuOpen.update((value) => !value);
  }
  closeMenu() {
    this.menuOpen.set(false);
  }
  logout() {
    this.closeMenu();
    this.api.logout();
    this.router.navigateByUrl('/');
  }
}
