import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { message } from '../../shared/utils/ui';

@Component({
  selector: 'app-setup',
  imports: [FormsModule, MatButtonModule],
  template: ` <div class="survey-shell">
    <header class="survey-top">
      <div class="brand"
        ><span class="brand-mark">✳</span
        ><span>healthy<span class="brand-accent">daily</span></span></div
      ><button type="button" class="skip-link" (click)="skip()" [disabled]="busy">
        Bỏ qua khảo sát
      </button>
    </header>
    <main class="survey-card">
      <div class="progress-copy">
        <span>CÂU {{ step + 1 }} / {{ steps.length }}</span
        ><strong>{{ progress }}%</strong>
      </div>
      <div class="progress"><i [style.width.%]="progress"></i></div>
      <span class="eyebrow">THIẾT LẬP CÁ NHÂN HÓA</span>
      @switch (step) {
        @case (0) {
          <h1>Mình nên gọi bạn là gì?</h1>
          <p>Thông tin này giúp trải nghiệm của bạn thân thiện hơn.</p>
          <label class="input-label"
            >Họ và tên<input
              autofocus
              [(ngModel)]="profile.name"
              placeholder="Ví dụ: Nguyễn Minh Anh"
          /></label>
        }
        @case (1) {
          <h1>Bạn bao nhiêu tuổi?</h1>
          <p>Tuổi được dùng để ước tính nhu cầu năng lượng cơ bản.</p>
          <label class="input-label"
            >Tuổi<input type="number" [(ngModel)]="profile.age" min="16" max="120"
          /></label>
        }
        @case (2) {
          <h1>Giới tính sinh học của bạn?</h1>
          <p>Chọn mục phù hợp nhất để hỗ trợ phép tính dinh dưỡng.</p>
          <div class="choice-grid">
            @for (item of genders; track item.value) {
              <button
                type="button"
                [class.selected]="profile.gender === item.value"
                (click)="profile.gender = item.value"
              >
                <span>{{ item.icon }}</span
                ><strong>{{ item.label }}</strong>
              </button>
            }
          </div>
        }
        @case (3) {
          <h1>Số đo hiện tại của bạn?</h1>
          <p>Bạn có thể cập nhật lại bất cứ lúc nào trong Hồ sơ.</p>
          <div class="field-row">
            <label class="input-label"
              >Chiều cao (cm)<input
                type="number"
                [(ngModel)]="profile.heightCm"
                min="100"
                max="250" /></label
            ><label class="input-label"
              >Cân nặng (kg)<input
                type="number"
                [(ngModel)]="profile.weightKg"
                min="25"
                max="400" /></label
            ><label class="input-label"
              >Mục tiêu (kg)<input
                type="number"
                [(ngModel)]="profile.targetWeightKg"
                min="25"
                max="400"
            /></label>
          </div>
        }
        @case (4) {
          <h1>Mục tiêu chính của bạn?</h1>
          <p>Hệ thống sẽ điều chỉnh mức năng lượng ước tính theo lựa chọn này.</p>
          <div class="choice-grid">
            @for (item of goals; track item.value) {
              <button
                type="button"
                [class.selected]="profile.goal === item.value"
                (click)="profile.goal = item.value"
              >
                <span>{{ item.icon }}</span
                ><strong>{{ item.label }}</strong
                ><small>{{ item.hint }}</small>
              </button>
            }
          </div>
        }
        @case (5) {
          <h1>Mức vận động thường ngày?</h1>
          <p>Hãy chọn theo nhịp sinh hoạt phổ biến của bạn.</p>
          <div class="choice-grid compact">
            @for (item of activities; track item.value) {
              <button
                type="button"
                [class.selected]="profile.activity === item.value"
                (click)="profile.activity = item.value"
              >
                <strong>{{ item.label }}</strong
                ><small>{{ item.hint }}</small>
              </button>
            }
          </div>
        }
        @case (6) {
          <h1>Tình trạng sức khỏe tự khai báo?</h1>
          <p>
            Có thể chọn nhiều mục. Hệ thống chỉ áp dụng quy tắc an toàn chung, không chẩn đoán bệnh.
          </p>
          <div class="choice-grid compact">
            @for (item of healthOptions; track item.value) {
              <button
                type="button"
                [class.selected]="profile.healthConditions.includes(item.value)"
                (click)="toggleHealth(item.value)"
              >
                <span>{{ item.icon }}</span
                ><strong>{{ item.label }}</strong>
              </button>
            }
          </div>
        }
        @case (7) {
          <h1>Bạn có dị ứng thực phẩm nào?</h1>
          <p>Nhập các mục cách nhau bằng dấu phẩy, hoặc để trống nếu không có.</p>
          <label class="input-label"
            >Dị ứng<input [(ngModel)]="allergiesText" placeholder="Ví dụ: đậu phộng, tôm, sữa"
          /></label>
        }
        @case (8) {
          <h1>Bạn muốn ăn bao nhiêu bữa mỗi ngày?</h1>
          <p>
            Số bữa dự kiến dùng để đối chiếu kế hoạch của bạn. Đề xuất tự động luôn có 4 khung bữa.
          </p>
          <div class="meal-grid">
            @for (count of [1, 2, 3, 4]; track count) {
              <button
                type="button"
                [class.selected]="profile.mealsPerDay === count"
                (click)="profile.mealsPerDay = count"
              >
                <strong>{{ count }}</strong
                ><span>bữa</span>
              </button>
            }
          </div>
        }
      }
      @if (error) {
        <p class="error" role="alert">{{ error }}</p>
      }
      <footer class="survey-actions">
        <button mat-button type="button" (click)="back()" [disabled]="step === 0 || busy">
          Quay lại</button
        ><button mat-flat-button type="button" (click)="next()" [disabled]="busy">
          {{
            step === steps.length - 1 ? (busy ? 'Đang lưu...' : 'Hoàn tất khảo sát') : 'Tiếp tục'
          }}
        </button>
      </footer>
    </main>
    <p class="privacy-note">
      🔒 Dữ liệu khảo sát chỉ dùng để cá nhân hóa trải nghiệm trong tài khoản của bạn.
    </p>
  </div>`,
  styleUrl: './setup.component.scss',
})
export class SetupComponent {
  api = inject(ApiService);
  router = inject(Router);
  step = 0;
  busy = false;
  error = '';
  allergiesText = '';
  steps = Array.from({ length: 9 });
  profile: any = {
    name: '',
    age: 25,
    gender: 'FEMALE',
    heightCm: 165,
    weightKg: 60,
    targetWeightKg: 56,
    activity: 'MODERATE',
    goal: 'MAINTAIN',
    healthConditions: [],
    allergies: [],
    dietaryPreferences: [],
    mealsPerDay: 3,
  };
  genders = [
    { value: 'FEMALE', label: 'Nữ', icon: '♀' },
    { value: 'MALE', label: 'Nam', icon: '♂' },
    { value: 'OTHER', label: 'Khác', icon: '○' },
  ];
  goals = [
    { value: 'LOSE', label: 'Giảm cân', icon: '↘', hint: 'Giảm năng lượng hợp lý' },
    { value: 'MAINTAIN', label: 'Duy trì', icon: '◎', hint: 'Giữ nhịp sống cân bằng' },
    { value: 'GAIN', label: 'Tăng cân', icon: '↗', hint: 'Tăng năng lượng có kiểm soát' },
  ];
  activities = [
    { value: 'SEDENTARY', label: 'Ít vận động', hint: 'Hầu hết thời gian ngồi' },
    { value: 'LIGHT', label: 'Nhẹ', hint: '1–2 buổi/tuần' },
    { value: 'MODERATE', label: 'Vừa', hint: '3–5 buổi/tuần' },
    { value: 'ACTIVE', label: 'Nhiều', hint: '6–7 buổi/tuần' },
    { value: 'VERY_ACTIVE', label: 'Rất nhiều', hint: 'Lao động hoặc luyện tập nặng' },
  ];
  healthOptions = [
    { value: 'NONE', label: 'Không có', icon: '✓' },
    { value: 'DIABETES', label: 'Tiểu đường', icon: '◌' },
    { value: 'HYPERTENSION', label: 'Tăng huyết áp', icon: '♡' },
    { value: 'KIDNEY_DISEASE', label: 'Bệnh thận', icon: '◇' },
    { value: 'PREGNANCY', label: 'Thai kỳ', icon: '✦' },
  ];
  get progress() {
    return Math.round(((this.step + 1) / this.steps.length) * 100);
  }
  back() {
    if (this.step > 0) this.step--;
  }
  next() {
    this.error = '';
    if (!this.validStep()) return;
    if (this.step < this.steps.length - 1) {
      this.step++;
      return;
    }
    this.save();
  }
  validStep() {
    if (this.step === 0 && this.profile.name.trim().length < 2) {
      this.error = 'Vui lòng nhập họ tên có ít nhất 2 ký tự.';
      return false;
    }
    if (this.step === 1 && (this.profile.age < 16 || this.profile.age > 120)) {
      this.error = 'Tuổi hợp lệ từ 16 đến 120.';
      return false;
    }
    if (
      this.step === 3 &&
      (this.profile.heightCm < 100 ||
        this.profile.heightCm > 250 ||
        this.profile.weightKg < 25 ||
        this.profile.weightKg > 400)
    ) {
      this.error = 'Vui lòng kiểm tra lại chiều cao và cân nặng.';
      return false;
    }
    return true;
  }
  toggleHealth(v: string) {
    if (v === 'NONE') {
      this.profile.healthConditions = ['NONE'];
      return;
    }
    this.profile.healthConditions = this.toggle(
      this.profile.healthConditions.filter((x: string) => x !== 'NONE'),
      v,
    );
  }
  toggle(values: string[], v: string) {
    return values.includes(v) ? values.filter((x) => x !== v) : [...values, v];
  }
  save() {
    this.busy = true;
    this.profile.allergies = this.allergiesText
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
    const payload = {
      ...this.profile,
      healthConditions: this.profile.healthConditions.filter((x: string) => x !== 'NONE'),
      dietaryPreferences: this.profile.dietaryPreferences.filter((x: string) => x !== 'NONE'),
    };
    this.api.put('/profile', payload).subscribe({
      next: () => {
        this.api.setUsageMode('PERSONALIZED');
        this.api.setOnboardingCompleted(true);
        this.router.navigateByUrl('/dashboard');
      },
      error: (e) => {
        this.error = message(e);
        this.busy = false;
      },
    });
  }
  skip() {
    this.busy = true;
    this.api.put('/profile/onboarding/skip', {}).subscribe({
      next: () => {
        this.api.setUsageMode('SELF_GUIDED');
        this.api.setOnboardingCompleted(true);
        this.router.navigateByUrl('/dashboard');
      },
      error: (e) => {
        this.error = message(e);
        this.busy = false;
      },
    });
  }
}
