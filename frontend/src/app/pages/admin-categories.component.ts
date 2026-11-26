import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { ApiService } from '../core/services/api.service';
import { message } from '../core/ui';
@Component({
  selector: 'app-admin-categories',
  imports: [FormsModule, MatButtonModule],
  template: `<div class="page admin-workspace">
    <div class="page-head">
      <span class="eyebrow">THƯ VIỆN DÙNG CHUNG</span>
      <h1>Quản lý nhóm thực phẩm</h1>
      <p>Các nhóm được sử dụng cho thư viện chung và thực phẩm riêng của người dùng.</p>
    </div>
    @if (error) {
      <p class="error" role="alert">{{ error }}</p>
    }
    @if (notice) {
      <p class="notice" role="status">{{ notice }}</p>
    }
    <section class="panel">
      @if (loading) {
        <p role="status">Đang tải nhóm thực phẩm…</p>
      }
      @for (c of categories; track c.id) {
        <div class="category-row">
          <strong>{{ c.name }}</strong
          ><button mat-button [disabled]="busy" (click)="edit(c)">Đổi tên</button
          ><button mat-button [disabled]="busy" (click)="remove(c)">Xóa nhóm</button>
        </div>
      } @empty {
        @if (!loading) {
          <p class="empty">Chưa có nhóm thực phẩm.</p>
        }
      }
      <form class="category-form" (ngSubmit)="save()">
        <label
          >{{ editing ? 'Tên nhóm mới' : 'Thêm nhóm thực phẩm'
          }}<input name="name" [(ngModel)]="name" minlength="2" maxlength="100" required /></label
        ><button mat-flat-button [disabled]="busy || name.trim().length < 2">
          {{ editing ? 'Lưu tên nhóm' : 'Thêm nhóm' }}
        </button>
        @if (editing) {
          <button mat-button type="button" (click)="editing = 0; name = ''">Hủy sửa</button>
        }
      </form>
    </section>
  </div>`,
  styleUrl: './admin-workspace.scss',
})
export class AdminCategoriesComponent implements OnInit {
  api = inject(ApiService);
  categories: any[] = [];
  name = '';
  editing = 0;
  busy = false;
  loading = false;
  error = '';
  notice = '';
  ngOnInit() {
    this.load();
  }
  load() {
    this.loading = true;
    this.api.get<any[]>('/categories').subscribe({
      next: (r) => {
        this.categories = r;
        this.loading = false;
      },
      error: (e) => {
        this.error = message(e);
        this.loading = false;
      },
    });
  }
  edit(c: any) {
    this.editing = c.id;
    this.name = c.name;
  }
  save() {
    const name = this.name.trim();
    if (name.length < 2) return;
    this.busy = true;
    this.error = '';
    const call = this.editing
      ? this.api.put('/categories/' + this.editing, { name })
      : this.api.post('/categories', { name });
    call.subscribe({
      next: () => {
        this.busy = false;
        this.editing = 0;
        this.name = '';
        this.notice = 'Đã lưu nhóm thực phẩm.';
        this.load();
      },
      error: (e) => {
        this.error = message(e);
        this.busy = false;
      },
    });
  }
  remove(c: any) {
    if (!confirm(`Xóa nhóm ${c.name}? Nhóm còn thực phẩm sẽ không thể xóa.`)) return;
    this.busy = true;
    this.api.delete('/categories/' + c.id).subscribe({
      next: () => {
        this.busy = false;
        this.notice = 'Đã xóa nhóm.';
        this.load();
      },
      error: (e) => {
        this.error = message(e);
        this.busy = false;
      },
    });
  }
}
