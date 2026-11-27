import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { mealNames, message } from '../../../shared/utils/ui';
import { NutritionTrendComponent } from '../../dashboard/components/nutrition-trend.component';
import { severityNames, sourceNames, statusNames } from '../alerts/alerts.component';
import { adminGroupNames } from '../users/admin-users.component';
@Component({
  selector: 'app-admin-user-detail',
  imports: [RouterLink, MatButtonModule, NutritionTrendComponent],
  templateUrl: './admin-user-detail.component.html',
  styleUrl: '../admin-workspace.scss',
})
export class AdminUserDetailComponent implements OnInit {
  api = inject(ApiService);
  route = inject(ActivatedRoute);
  destroyRef = inject(DestroyRef);
  id = 0;
  data: any;
  busy = false;
  refreshing = false;
  error = '';
  notice = '';
  tab = 'alerts';
  groups = adminGroupNames;
  severities = severityNames;
  statuses = statusNames;
  sources = sourceNames;
  meals = mealNames;
  keys = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugars', 'sodium'];
  labels: Record<string, string> = {
    calories: 'Calories',
    protein: 'Protein',
    carbs: 'Carb',
    fat: 'Béo',
    fiber: 'Chất xơ',
    sugars: 'Đường tổng',
    sodium: 'Natri',
  };
  tabs = [
    { key: 'alerts', name: 'Cảnh báo' },
    { key: 'nutrition', name: 'Dinh dưỡng 7 ngày' },
    { key: 'logs', name: 'Nhật ký đã ăn' },
    { key: 'plans', name: 'Thực đơn dự kiến' },
    { key: 'weights', name: 'Lịch sử cân nặng' },
  ];
  ngOnInit() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((p) => {
      this.id = Number(p.get('id'));
      this.data = null;
      this.load();
    });
  }
  load() {
    this.busy = true;
    this.error = '';
    this.api.get<any>(`/admin/users/${this.id}/health`).subscribe({
      next: (r) => {
        this.data = r;
        this.busy = false;
      },
      error: (e) => {
        this.error = message(e);
        this.busy = false;
      },
    });
  }
  refresh() {
    this.refreshing = true;
    this.api.post(`/admin/users/${this.id}/refresh`, {}).subscribe({
      next: () => {
        this.refreshing = false;
        this.notice = 'Đã yêu cầu phân tích lại. Chọn tải lại dữ liệu sau ít giây để xem kết quả.';
      },
      error: (e) => {
        this.error = message(e);
        this.refreshing = false;
      },
    });
  }
  format(value: any) {
    return value == null
      ? 'Chưa đủ dữ liệu'
      : new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(Number(value));
  }
  unit(key: string) {
    return key === 'calories' ? 'kcal' : key === 'sodium' ? 'mg' : 'g';
  }
  list(values: any) {
    if (!Array.isArray(values) || !values.length) return 'Chưa khai báo';
    const names: Record<string, string> = {
      DIABETES: 'Tiểu đường tự khai báo',
      HYPERTENSION: 'Tăng huyết áp tự khai báo',
      KIDNEY_DISEASE: 'Bệnh thận tự khai báo',
      PREGNANCY: 'Thai kỳ',
      VEGAN: 'Thuần chay',
      VEGETARIAN: 'Ăn chay',
      NONE: 'Không có',
    };
    return values.map((v) => names[v] || v).join(', ');
  }
  goal(value: string) {
    return (
      ({ LOSE: 'Giảm cân', GAIN: 'Tăng cân', MAINTAIN: 'Duy trì' } as Record<string, string>)[
        value
      ] || 'Chưa thiết lập'
    );
  }
  date(value: string) {
    return new Date(value).toLocaleString('vi-VN');
  }
}
