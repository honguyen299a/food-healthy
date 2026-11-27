import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { message } from '../../../shared/utils/ui';
import { AdminChartComponent } from './admin-chart.component';
@Component({
  selector: 'app-admin-dashboard',
  imports: [RouterLink, MatButtonModule, AdminChartComponent],
  template: ` <div class="page admin-workspace admin-dashboard">
    <div class="page-head">
      <span class="eyebrow">TỔNG QUAN QUẢN TRỊ</span>
      <h1>Theo dõi hệ thống dinh dưỡng</h1>
      <p>Quản lý thư viện thực phẩm và hỗ trợ người dùng từ dữ liệu thực tế.</p>
    </div>
    <div class="admin-actions">
      <button mat-stroked-button [disabled]="loading" (click)="load()">Làm mới thống kê</button
      ><a mat-flat-button routerLink="/admin/foods">Quản lý thực phẩm chung</a>
    </div>
    @if (error) {
      <p class="error" role="alert">{{ error }}</p>
    }
    @if (loading && !data) {
      <section class="panel" role="status">Đang tổng hợp thống kê…</section>
    }
    @if (data) {
      <div class="admin-stats">
        <article class="stat-users">
          <span>Người dùng</span><strong>{{ data.totalUsers }}</strong
          ><small>{{ data.admins }} tài khoản quản trị được tính riêng</small>
        </article>
        <article class="stat-foods">
          <span>Thực phẩm dùng chung</span><strong>{{ data.sharedFoods }}</strong
          ><small>{{ data.hiddenFoods }} thực phẩm đang ẩn</small>
        </article>
        <article class="stat-pending">
          <span>Cảnh báo chờ xử lý</span><strong>{{ data.openAlerts }}</strong
          ><small>Điều kiện đang xuất hiện, chưa đóng xử lý</small>
        </article>
        <article class="stat-alerts">
          <span>Người dùng có cảnh báo</span><strong>{{ data.usersWithAlerts }}</strong
          ><small>Mỗi người được đếm một lần</small>
        </article>
      </div>
      <div class="admin-grid">
        <section class="panel overview-panel">
          <header class="overview-head">
          <div class="panel-head">
            <h2>Tình hình theo dõi người dùng</h2>
            <span class="subtle">{{ data.totalUsers }} người</span>
          </div>
          <p class="subtle">
            Phân nhóm từ nhật ký {{ data.period.start }} đến {{ data.period.end }} và các cảnh báo
            hiện có.
          </p>
          </header>
          <div class="cohort-body">
          @if (data.totalUsers) {
            <app-admin-chart
              type="doughnut"
              [labels]="groupLabels"
              [datasets]="groupData"
              description="Số người theo nhóm theo dõi dinh dưỡng"
              [height]="220"
            />
          } @else {
            <p class="empty">Chưa có tài khoản User.</p>
          }
          <div class="chart-legend">
            @for (group of data.groups; track group.key; let i = $index) {
              <a routerLink="/admin/users" [queryParams]="{ group: group.key }"
                ><i [style.background]="colors[i]"></i><span>{{ group.label }}</span
                ><b>{{ group.count }}</b></a
              >
            }
          </div>
          </div>
        </section>
        <section class="panel overview-panel">
          <header class="overview-head">
          <h2>Cảnh báo mới trong 7 ngày</h2>
          <p class="subtle">
            Đếm cảnh báo được tạo mới theo ngày; các lần cập nhật không tăng số lượng.
          </p>
          </header>
          @if (hasDailyAlerts) {
          <app-admin-chart
            [labels]="dayLabels"
            [datasets]="dayData"
            [stacked]="true"
            description="Số cảnh báo LOW MEDIUM HIGH được tạo trong từng ngày"
            [height]="220"
          />
          } @else {
            <div class="chart-empty" role="status">
              <strong>0 <span>cảnh báo mới</span></strong>
              <p>Chưa ghi nhận cảnh báo mới trong 7 ngày gần đây.</p>
              <div class="severity-summary"><span>Thấp · 0</span><span>Trung bình · 0</span><span>Cao · 0</span></div>
            </div>
          }
        </section>
      </div>
      <section class="panel">
        <h2>Các vấn đề dinh dưỡng đang được ghi nhận</h2>
        <p class="subtle">
          Số người có cảnh báo từ lượng thực tế đã ghi. Một người có thể xuất hiện ở nhiều loại;
          thấp hơn mục tiêu không đồng nghĩa được chẩn đoán thiếu chất.
        </p>
        <app-admin-chart
          [horizontal]="true"
          [labels]="findingLabels"
          [datasets]="findingData"
          description="Số người có từng loại cảnh báo dinh dưỡng"
        />
      </section>
      <section class="panel">
        <div class="panel-head">
          <h2>Cảnh báo cần ưu tiên</h2>
          <a mat-button routerLink="/admin/alerts">Xem tất cả</a>
        </div>
        <div class="admin-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Cảnh báo</th>
                <th>Mức độ</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              @for (a of data.latest; track a.id) {
                <tr class="alert-surface" [attr.data-alert-severity]="a.severity">
                  <td>
                    <a [routerLink]="['/admin/users', a.userId]">{{
                      a.user.profile?.name || a.user.email
                    }}</a
                    ><small>{{ a.user.email }}</small>
                  </td>
                  <td>
                    {{ a.title
                    }}<small>{{
                      a.source === 'PLAN'
                        ? 'Thực đơn dự kiến'
                        : a.source === 'ACTUAL'
                          ? 'Thực tế đã ăn'
                          : 'Cân nặng'
                    }}</small>
                  </td>
                  <td>
                    <span class="admin-badge" [class]="a.severity">{{ a.severity }}</span>
                  </td>
                  <td>
                    <a
                      mat-button
                      routerLink="/admin/alerts"
                      [queryParams]="{ id: a.id, userId: a.userId }"
                      >Xem chi tiết</a
                    >
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="4" class="empty">Chưa có cảnh báo cần xử lý.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
      <section class="panel">
        <h2>Cách đọc thống kê</h2>
        @for (text of data.limitations; track text) {
          <p class="subtle">{{ text }}</p>
        }
        <p class="subtle">Cập nhật lúc {{ date(data.generatedAt) }}.</p>
      </section>
    }
  </div>`,
  styleUrl: '../admin-workspace.scss',
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  api = inject(ApiService);
  data: any;
  loading = false;
  error = '';
  colors = ['#e1a44b', '#ce7461', '#279b68', '#b6c5bb'];
  groupLabels: string[] = [];
  groupData: any[] = [];
  dayLabels: string[] = [];
  dayData: any[] = [];
  findingLabels: string[] = [];
  findingData: any[] = [];
  private timer?: ReturnType<typeof setInterval>;
  get hasDailyAlerts() {
    return this.data?.daily.some((d: any) => ['LOW', 'MEDIUM', 'HIGH'].some(s => Number(d[s]) > 0));
  }
  ngOnInit() {
    this.load();
    this.timer = setInterval(() => this.load(), 60000);
  }
  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  date(value: string) {
    return new Date(value).toLocaleString('vi-VN');
  }
  load() {
    if (this.loading) return;
    this.loading = true;
    this.error = '';
    this.api.get<any>('/admin/dashboard').subscribe({
      next: (d) => {
        this.data = d;
        this.groupLabels = d.groups.map((g: any) => g.label);
        this.groupData = [
          {
            label: 'Người dùng',
            data: d.groups.map((g: any) => g.count),
            backgroundColor: this.colors,
            borderWidth: 3,
            borderColor: '#fff',
          },
        ];
        this.dayLabels = d.daily.map((x: any) => x.date.slice(5));
        this.dayData = ['LOW', 'MEDIUM', 'HIGH'].map((s, i) => ({
          label: s,
          data: d.daily.map((x: any) => x[s]),
          backgroundColor: ['#77b995', '#e1a44b', '#ce7461'][i],
          borderRadius: 4,
        }));
        this.findingLabels = d.findings.map((x: any) => x.label);
        this.findingData = [
          {
            label: 'Người dùng',
            data: d.findings.map((x: any) => x.count),
            backgroundColor: '#439b70',
            borderRadius: 5,
          },
        ];
        this.loading = false;
      },
      error: (e) => {
        this.error = message(e);
        this.loading = false;
      },
    });
  }
}
