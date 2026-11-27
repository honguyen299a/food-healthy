import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { message } from '../../shared/utils/ui';

@Component({
  selector: 'app-auth',
  imports: [FormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <section class="auth-layout">
      <div class="auth-visual">
        <div class="auth-visual-shade"></div>
        <div class="auth-visual-content">
          <span class="auth-visual-kicker">NOURISH YOUR EVERYDAY ✳</span>
          <h2>Chọn điều tốt hơn,<br />mỗi ngày một chút.</h2>
          <p>Một bữa ăn cân bằng là bước đầu của một ngày đầy năng lượng.</p>
        </div>
      </div>
      <div class="auth-form-wrap">
        <div class="auth-card">
          <span class="eyebrow">BẮT ĐẦU HÀNH TRÌNH</span>
          <h1>{{ register ? 'Tạo tài khoản' : 'Chào mừng trở lại' }}</h1>
          <p>
            {{
              register
                ? 'Một vài bước để bắt đầu chăm sóc bản thân tốt hơn.'
                : 'Đăng nhập để tiếp tục hành trình sống khỏe của bạn.'
            }}
          </p>
          <form class="auth-fields" (ngSubmit)="submit()" novalidate>
            <mat-form-field appearance="outline" subscriptSizing="dynamic"
              ><mat-label>Địa chỉ email</mat-label
              ><input
                matInput
                type="email"
                name="email"
                [(ngModel)]="email"
                required
                email
                autocomplete="email" /></mat-form-field
            ><mat-form-field appearance="outline" subscriptSizing="dynamic"
              ><mat-label>Mật khẩu</mat-label
              ><input
                matInput
                type="password"
                name="password"
                [(ngModel)]="password"
                required
                minlength="8"
                [attr.autocomplete]="register ? 'new-password' : 'current-password'"
            /></mat-form-field>
            @if (register) {
              <mat-form-field appearance="outline" subscriptSizing="dynamic"
                ><mat-label>Xác nhận mật khẩu</mat-label
                ><input
                  matInput
                  type="password"
                  name="confirmPassword"
                  [(ngModel)]="confirmPassword"
                  required
                  autocomplete="new-password"
              /></mat-form-field>
            }
            <button mat-flat-button type="submit" [disabled]="busy">
              {{ busy ? 'Đang xử lý...' : register ? 'Tạo tài khoản' : 'Đăng nhập' }}
            </button>
          </form>
          @if (error) {
            <p class="error" role="alert">{{ error }}</p>
          }
          <p class="auth-switch">
            {{ register ? 'Đã có tài khoản?' : 'Chưa có tài khoản?' }}
            <a [routerLink]="register ? '/login' : '/register'">{{
              register ? 'Đăng nhập' : 'Đăng ký ngay'
            }}</a>
          </p>
          <p class="auth-disclaimer">
            Các chỉ số dinh dưỡng trong ứng dụng chỉ mang tính ước tính, không thay thế tư vấn y tế.
          </p>
        </div>
      </div>
    </section>
  `,
  styleUrl: './auth.component.scss',
})
export class AuthComponent {
  api = inject(ApiService);
  router = inject(Router);
  email = '';
  password = '';
  confirmPassword = '';
  error = '';
  busy = false;
  get register() {
    return this.router.url.startsWith('/register');
  }
  submit() {
    this.error = '';
    const isRegister = this.register;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim())) {
      this.error = 'Vui lòng nhập email hợp lệ.';
      return;
    }
    if (!this.password) {
      this.error = 'Vui lòng nhập mật khẩu.';
      return;
    }
    if (isRegister && this.password.length < 8) {
      this.error = 'Mật khẩu phải có ít nhất 8 ký tự.';
      return;
    }
    if (isRegister && !this.confirmPassword) {
      this.error = 'Vui lòng xác nhận mật khẩu.';
      return;
    }
    if (isRegister && this.password !== this.confirmPassword) {
      this.error = 'Mật khẩu xác nhận không khớp.';
      return;
    }
    this.busy = true;
    this.api
      .authenticate(isRegister ? '/auth/register' : '/auth/login', {
        email: this.email,
        password: this.password,
      })
      .subscribe({
        next: (res: any) =>
          this.router.navigateByUrl(
            res.user.role === 'ADMIN'
              ? '/admin'
              : res.user.onboardingCompleted
                ? '/dashboard'
                : '/setup',
          ),
        error: (e) => {
          this.error = message(e);
          this.busy = false;
        },
      });
  }
}
