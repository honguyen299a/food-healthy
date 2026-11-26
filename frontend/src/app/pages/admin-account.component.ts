import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { ApiService } from '../core/services/api.service';
import { message } from '../core/ui';
@Component({
  selector: 'app-admin-account',
  imports: [FormsModule, MatButtonModule],
  template: `<div class="page admin-workspace">
    <div class="page-head">
      <span class="eyebrow">TÀI KHOẢN QUẢN TRỊ</span>
      <h1>Bảo mật tài khoản</h1>
      <p>{{ email }} · Quản trị viên</p>
    </div>
    @if (error) {
      <p class="error" role="alert">{{ error }}</p>
    }
    @if (notice) {
      <p class="notice" role="status">{{ notice }}</p>
    }
    <section class="panel">
      <h2>Đổi mật khẩu</h2>
      <form class="form-stack" (ngSubmit)="save()">
        <label
          >Mật khẩu hiện tại<input
            name="currentPassword"
            type="password"
            [(ngModel)]="currentPassword"
            autocomplete="current-password"
            required /></label
        ><label
          >Mật khẩu mới<input
            name="newPassword"
            type="password"
            [(ngModel)]="newPassword"
            autocomplete="new-password"
            minlength="8"
            required /></label
        ><label
          >Xác nhận mật khẩu mới<input
            name="confirmation"
            type="password"
            [(ngModel)]="confirmation"
            autocomplete="new-password"
            required /></label
        ><button mat-flat-button [disabled]="busy">Lưu mật khẩu</button>
      </form>
    </section>
  </div>`,
  styleUrl: './admin-workspace.scss',
})
export class AdminAccountComponent implements OnInit {
  api = inject(ApiService);
  email = '';
  currentPassword = '';
  newPassword = '';
  confirmation = '';
  busy = false;
  error = '';
  notice = '';
  ngOnInit() {
    this.api
      .get<any>('/auth/me')
      .subscribe({ next: (u) => (this.email = u.email), error: (e) => (this.error = message(e)) });
  }
  save() {
    this.error = '';
    this.notice = '';
    if (
      !this.currentPassword ||
      this.newPassword.length < 8 ||
      this.newPassword !== this.confirmation
    ) {
      this.error = 'Nhập mật khẩu hiện tại, mật khẩu mới ít nhất 8 ký tự và xác nhận trùng nhau.';
      return;
    }
    this.busy = true;
    this.api
      .put('/auth/password', {
        currentPassword: this.currentPassword,
        newPassword: this.newPassword,
      })
      .subscribe({
        next: () => {
          this.busy = false;
          this.currentPassword = '';
          this.newPassword = '';
          this.confirmation = '';
          this.notice = 'Đã đổi mật khẩu.';
        },
        error: (e) => {
          this.busy = false;
          this.error = message(e);
        },
      });
  }
}
