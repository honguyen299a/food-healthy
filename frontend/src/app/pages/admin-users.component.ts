import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { ApiService } from '../core/services/api.service';
import { message } from '../core/ui';
export const adminGroupNames: Record<string, string> = {
  BELOW_TARGET: 'Thấp hơn mục tiêu dinh dưỡng',
  OTHER_ALERT: 'Có cảnh báo cần xem xét',
  NO_ALERT: 'Chưa ghi nhận cảnh báo, đủ nhật ký',
  INSUFFICIENT: 'Chưa đủ dữ liệu đánh giá',
};
@Component({
  selector: 'app-admin-users',
  imports: [FormsModule, RouterLink, MatButtonModule],
  template: ` <div class="page admin-workspace">
    <div class="page-head">
      <span class="eyebrow">QUẢN LÝ NGƯỜI DÙNG</span>
      <h1>Theo dõi từng người dùng</h1>
      <p>
        Xem độ đầy đủ của nhật ký, cảnh báo và dữ liệu liên quan. Tài khoản Admin không được đưa vào
        thống kê dinh dưỡng.
      </p>
    </div>
    <form class="admin-filters" (ngSubmit)="go(1)">
      <label
        >Tìm người dùng<input
          name="search"
          [(ngModel)]="search"
          maxlength="100"
          placeholder="Tên, email hoặc mã người dùng" /></label
      ><label
        >Nhóm theo dõi<select name="group" [(ngModel)]="group" (ngModelChange)="go(1)">
          <option value="">Tất cả người dùng</option>
          @for (key of groupKeys; track key) {
            <option [value]="key">{{ groups[key] }}</option>
          }
        </select></label
      ><button mat-flat-button [disabled]="busy">Tìm kiếm</button>
    </form>
    @if (error) {
      <p class="error" role="alert">{{ error }}</p>
    }
    @if (notice) {
      <p class="notice" role="status">{{ notice }}</p>
    }
    <section class="panel">
      <div class="panel-head">
        <h2>{{ total }} người dùng</h2>
        @if (busy) {
          <span role="status">Đang tải…</span>
        }
      </div>
      <div class="admin-table-scroll">
        <table>
          <thead>
            <tr>
              <th>Người dùng</th>
              <th>Tình hình theo dõi</th>
              <th>Nhật ký 7 ngày</th>
              <th>Cảnh báo hiện có</th>
              <th>Quản lý</th>
            </tr>
          </thead>
          <tbody>
            @for (u of users; track u.id) {
              <tr>
                <td>
                  <a [routerLink]="['/admin/users', u.id]"
                    ><b>{{ u.name || 'Chưa đặt tên' }}</b></a
                  ><small>{{ u.email }}</small
                  ><small>Mã #{{ u.id }}</small>
                </td>
                <td>
                  <span class="admin-badge" [class]="u.group">{{ groups[u.group] }}</span>
                </td>
                <td>
                  {{ u.loggedDays }}/7 ngày có ghi<small
                    >{{ u.completedDays }} ngày xác nhận ghi đủ</small
                  >
                </td>
                <td>
                  {{ u.activeAlerts }} cảnh báo<small>{{ u.highAlerts }} ưu tiên cao</small>
                </td>
                <td>
                  <div class="actions">
                    <a mat-stroked-button [routerLink]="['/admin/users', u.id]">Xem chi tiết</a
                    ><button mat-button [disabled]="working" (click)="promote(u)">
                      Cấp quyền Admin</button
                    ><button mat-button [disabled]="working" (click)="remove(u)">
                      Xóa tài khoản
                    </button>
                  </div>
                </td>
              </tr>
            } @empty {
              @if (!busy) {
                <tr>
                  <td colspan="5" class="empty">Chưa có người dùng phù hợp.</td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>
      <div class="admin-pager">
        <button mat-stroked-button [disabled]="page <= 1 || busy" (click)="go(page - 1)">
          Trước</button
        ><span>Trang {{ page }} / {{ pages || 1 }}</span
        ><button mat-stroked-button [disabled]="page >= pages || busy" (click)="go(page + 1)">
          Tiếp
        </button>
      </div>
    </section>
  </div>`,
  styleUrl: './admin-workspace.scss',
})
export class AdminUsersComponent implements OnInit {
  api = inject(ApiService);
  router = inject(Router);
  route = inject(ActivatedRoute);
  destroyRef = inject(DestroyRef);
  groups = adminGroupNames;
  groupKeys = Object.keys(adminGroupNames);
  users: any[] = [];
  search = '';
  group = '';
  page = 1;
  pages = 0;
  total = 0;
  busy = false;
  working = false;
  error = '';
  notice = '';
  ngOnInit() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((p) => {
      this.group = p.get('group') || '';
      this.search = p.get('search') || '';
      this.page = Math.max(1, Number(p.get('page')) || 1);
      this.load();
    });
  }
  go(page: number) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page, group: this.group || null, search: this.search || null },
    });
  }
  load() {
    this.busy = true;
    this.error = '';
    const q = new URLSearchParams({ page: String(this.page), limit: '20' });
    if (this.group) q.set('group', this.group);
    if (this.search) q.set('search', this.search);
    this.api.get<any>('/admin/users?' + q).subscribe({
      next: (r) => {
        this.users = r.items;
        this.total = r.total;
        this.pages = r.pages;
        this.busy = false;
      },
      error: (e) => {
        this.error = message(e);
        this.busy = false;
      },
    });
  }
  promote(u: any) {
    if (
      !confirm(
        `Cấp quyền quản trị cho ${u.email}? Tài khoản này sẽ có quyền quản lý người dùng, cảnh báo và thực phẩm dùng chung.`,
      )
    )
      return;
    this.working = true;
    this.api.put(`/admin/users/${u.id}/role`, { role: 'ADMIN' }).subscribe({
      next: () => {
        this.working = false;
        this.notice = 'Đã cập nhật vai trò. Tài khoản được cấp quyền cần tải lại trang.';
        this.load();
      },
      error: (e) => {
        this.error = message(e);
        this.working = false;
      },
    });
  }
  remove(u: any) {
    if (!confirm(`Xóa vĩnh viễn tài khoản ${u.email} và dữ liệu cá nhân của tài khoản?`)) return;
    this.working = true;
    this.api.delete(`/admin/users/${u.id}`).subscribe({
      next: () => {
        this.working = false;
        this.notice = 'Đã xóa tài khoản.';
        this.load();
      },
      error: (e) => {
        this.error = message(e);
        this.working = false;
      },
    });
  }
}
