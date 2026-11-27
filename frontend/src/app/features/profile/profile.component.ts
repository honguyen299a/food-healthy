import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { ApiService } from '../../core/services/api.service';
import { StyledSelectModule } from '../../shared/components/styled-select/styled-select.module';
import { message } from '../../shared/utils/ui';

@Component({
  selector: 'app-profile',
  imports: [StyledSelectModule, FormsModule, MatButtonModule],
  template: ` <div class="page profile-page">
    <div class="page-head">
      <span class="eyebrow">CÀI ĐẶT SỬ DỤNG</span>
      <h1>Hồ sơ và mục tiêu dinh dưỡng</h1>
      <p>
        Chọn cách sử dụng phù hợp. Việc chuyển chế độ không xóa thực phẩm, kế hoạch hay nhật ký cũ.
      </p>
    </div>
    @if (notice) {
      <p class="notice">{{ notice }}</p>
    }
    @if (error) {
      <p class="error">{{ error }}</p>
    }
    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>Chế độ hiện tại</h2>
          <p class="subtle">
            {{
              settings.usageMode === 'PERSONALIZED'
                ? 'Cá nhân hóa theo khảo sát'
                : 'Tự lập kế hoạch'
            }}
          </p>
        </div>
        <div class="mode-actions">
          <button
            mat-stroked-button
            [class.selected]="settings.usageMode === 'SELF_GUIDED'"
            (click)="changeMode('SELF_GUIDED')"
          >
            Tự lập kế hoạch</button
          ><button
            mat-stroked-button
            [class.selected]="settings.usageMode === 'PERSONALIZED'"
            (click)="changeMode('PERSONALIZED')"
          >
            Cá nhân hóa
          </button>
        </div>
      </div>
    </section>
    <div class="two-cols">
      <section class="panel">
        <h2>Khảo sát cá nhân hóa</h2>
        <p class="subtle">
          Thông tin sức khỏe là tự khai báo và chỉ dùng cho các quy tắc an toàn chung. Hệ thống
          không suy đoán bệnh lý.
        </p>
        <form class="form-grid" (ngSubmit)="saveSurvey()">
          <label
            >Họ tên<input name="name" [(ngModel)]="profile.name" required minlength="2" /></label
          ><label
            >Tuổi<input
              type="number"
              name="age"
              [(ngModel)]="profile.age"
              min="16"
              max="120"
              required
          /></label>
          @if (profile.age >= 16 && profile.age < 19) {
            <p class="full age-guidance">
              16–18 tuổi: cơ thể còn phát triển. Ứng dụng không tự tính mục tiêu calories hoặc gợi ý
              giảm cân; hãy nhờ chuyên gia y tế tư vấn mục tiêu phù hợp.
            </p>
          } @else if (profile.age >= 60) {
            <p class="full age-guidance">
              Từ 60 tuổi: nhu cầu dinh dưỡng khác nhau theo sức khỏe và mức vận động. Hãy trao đổi
              với chuyên gia về chế độ ăn, đặc biệt nếu có bệnh lý hoặc đang giảm cân.
            </p>
          } @else if (profile.age >= 19) {
            <p class="full age-guidance">
              19–59 tuổi: mục tiêu tự động chỉ là ước tính dựa trên hồ sơ, không thay thế tư vấn
              dinh dưỡng cá nhân.
            </p>
          }
          <label
            >Giới tính<mat-select
              panelClass="app-select-panel"
              name="gender"
              [(ngModel)]="profile.gender"
              aria-label="Giới tính"
              ><mat-option value="FEMALE">Nữ</mat-option><mat-option value="MALE">Nam</mat-option
              ><mat-option value="OTHER">Khác</mat-option></mat-select
            ></label
          ><label
            >Chiều cao (cm)<input
              type="number"
              name="heightCm"
              [(ngModel)]="profile.heightCm"
              min="100"
              max="250"
              required
          /></label>
          <label
            >Cân nặng (kg)<input
              type="number"
              name="weightKg"
              [(ngModel)]="profile.weightKg"
              min="25"
              max="400"
              required /></label
          ><label
            >Cân nặng mong muốn (kg)<input
              type="number"
              name="targetWeightKg"
              [(ngModel)]="profile.targetWeightKg"
              min="25"
              max="400"
          /></label>
          <label
            >Mức vận động<mat-select
              panelClass="app-select-panel"
              name="activity"
              [(ngModel)]="profile.activity"
              aria-label="Mức vận động"
              ><mat-option value="SEDENTARY">Ít vận động</mat-option
              ><mat-option value="LIGHT">Nhẹ</mat-option
              ><mat-option value="MODERATE">Vừa</mat-option
              ><mat-option value="ACTIVE">Nhiều</mat-option
              ><mat-option value="VERY_ACTIVE">Rất nhiều</mat-option></mat-select
            ></label
          ><label
            >Mục tiêu<mat-select
              panelClass="app-select-panel"
              name="goal"
              [(ngModel)]="profile.goal"
              aria-label="Mục tiêu"
              ><mat-option value="LOSE">Giảm cân</mat-option
              ><mat-option value="MAINTAIN">Duy trì</mat-option
              ><mat-option value="GAIN">Tăng cân</mat-option></mat-select
            ></label
          >
          <label
            >Số bữa mỗi ngày<input
              type="number"
              name="mealsPerDay"
              [(ngModel)]="profile.mealsPerDay"
              min="1"
              max="4"
              required /></label
          ><label
            >Dị ứng, cách nhau bằng dấu phẩy<input
              name="allergiesText"
              [(ngModel)]="allergiesText"
              placeholder="Ví dụ: đậu phộng, tôm"
          /></label>
          <div class="full">
            <span class="field-title">Tình trạng sức khỏe tự khai báo</span>
            <div class="option-cards">
              @for (item of healthOptions; track item.value) {
                <button
                  type="button"
                  [class.selected]="profile.healthConditions.includes(item.value)"
                  (click)="toggle('healthConditions', item.value)"
                >
                  <span>{{ item.icon }}</span
                  ><strong>{{ item.label }}</strong>
                </button>
              }
            </div>
            <small>Có thể chọn nhiều mục. Hệ thống không tự suy đoán bệnh lý.</small>
          </div>
          <div class="full">
            <button mat-flat-button [disabled]="busy">
              {{ busy ? 'Đang lưu...' : 'Lưu khảo sát và bật cá nhân hóa' }}
            </button>
          </div>
        </form>
      </section>
      <div>
        <section class="panel">
          <h2>Mục tiêu đang áp dụng</h2>
          @if (target) {
            <div class="metric-list">
              @if (target.bmi) {
                <div>
                  <span>BMI</span><strong>{{ target.bmi }}</strong>
                </div>
              }
              @if (target.bmr) {
                <div>
                  <span>BMR / TDEE</span><strong>{{ target.bmr }} / {{ target.tdee }} kcal</strong>
                </div>
              }
              <div>
                <span>Calories</span><strong>{{ target.calories }} kcal</strong>
              </div>
              <div>
                <span>Protein / Carb / Fat</span
                ><strong>{{ target.protein }} / {{ target.carbs }} / {{ target.fat }} g</strong>
              </div>
            </div>
          } @else {
            <p class="subtle">Chưa có mục tiêu. Bạn vẫn có thể ghi nhật ký dinh dưỡng.</p>
          }
          <p class="subtle">Các chỉ số mang tính ước tính, không thay thế tư vấn y tế.</p>
        </section>
        <section class="panel">
          <h2>Mục tiêu thủ công</h2>
          <p class="subtle">
            Dùng cho chế độ tự lập kế hoạch. Có thể bỏ trống và chỉ theo dõi lượng đã ăn.
          </p>
          <form class="form-grid" (ngSubmit)="saveManualTarget()">
            <label
              >Calories<input
                type="number"
                name="manualCalories"
                [(ngModel)]="manual.calories"
                min="800"
                required /></label
            ><label
              >Protein (g)<input
                type="number"
                name="manualProtein"
                [(ngModel)]="manual.protein"
                min="0"
                required /></label
            ><label
              >Carb (g)<input
                type="number"
                name="manualCarbs"
                [(ngModel)]="manual.carbs"
                min="0"
                required /></label
            ><label
              >Fat (g)<input
                type="number"
                name="manualFat"
                [(ngModel)]="manual.fat"
                min="0"
                required
            /></label>
            <div class="full inline-actions">
              <button mat-stroked-button>Lưu mục tiêu</button>
              @if (settings.manualTarget) {
                <button type="button" mat-button (click)="removeManualTarget()">
                  Xóa mục tiêu
                </button>
              }
            </div>
          </form>
        </section>
        <section class="panel">
          <h2>Dị ứng và món không thích trong thư viện</h2>
          <form class="stack" (ngSubmit)="addPreference()">
            <mat-select
              panelClass="app-select-panel"
              name="prefFood"
              [(ngModel)]="prefFoodId"
              aria-label="Thực phẩm loại trừ"
            >
              @for (f of foods; track f.id) {
                <mat-option [value]="f.id">{{ f.name }}</mat-option>
              }</mat-select
            ><mat-select
              panelClass="app-select-panel"
              name="prefKind"
              [(ngModel)]="prefKind"
              aria-label="Loại loại trừ"
              ><mat-option value="ALLERGY">Dị ứng</mat-option
              ><mat-option value="DISLIKE">Không thích</mat-option></mat-select
            ><button mat-stroked-button>Thêm</button>
          </form>
          @for (p of preferences; track p.id) {
            <div class="list-row">
              <span>{{ p.food.name }} · {{ p.kind === 'ALLERGY' ? 'Dị ứng' : 'Không thích' }}</span
              ><button mat-button (click)="removePreference(p.id)">Xóa</button>
            </div>
          }
        </section>
        <section class="panel">
          <h2>Đổi mật khẩu</h2>
          <form (ngSubmit)="changePassword()" class="stack">
            <input
              type="password"
              name="current"
              [(ngModel)]="currentPassword"
              placeholder="Mật khẩu hiện tại"
              required
            /><input
              type="password"
              name="next"
              [(ngModel)]="newPassword"
              placeholder="Mật khẩu mới, ít nhất 8 ký tự"
              minlength="8"
              required
            /><button mat-stroked-button>Đổi mật khẩu</button>
          </form>
        </section>
      </div>
    </div>
  </div>`,
  styles: [
    `
      .age-guidance {
        margin: 0;
        padding: 12px 14px;
        border-radius: 10px;
        background: #eef8f1;
        color: #315b40;
        font-size: 13px;
        line-height: 1.6;
      }
      .field-title {
        display: block;
        font-weight: 800;
        color: #244b39;
        margin-bottom: 10px;
      }
      .option-cards {
        display: grid;
        grid-template-columns: repeat(3, minmax(120px, 1fr));
        gap: 10px;
        margin-bottom: 8px;
      }
      .option-cards button {
        border: 1px solid #d5e2d4;
        background: #fbfdf9;
        border-radius: 14px;
        padding: 14px;
        display: flex;
        gap: 9px;
        align-items: center;
        color: #315846;
        cursor: pointer;
      }
      .option-cards button.selected {
        border: 2px solid #16a34a;
        background: #ecf9ed;
      }
      .option-cards span {
        font-size: 20px;
      }
      @media (max-width: 700px) {
        .option-cards {
          grid-template-columns: 1fr 1fr;
        }
      }
    `,
  ],
})
export class ProfileComponent implements OnInit {
  api = inject(ApiService);
  settings: any = { usageMode: 'SELF_GUIDED', hasSurvey: false, manualTarget: null };
  profile: any = {
    name: '',
    age: 25,
    gender: 'FEMALE',
    heightCm: 165,
    weightKg: 60,
    targetWeightKg: null,
    activity: 'MODERATE',
    goal: 'MAINTAIN',
    healthConditions: [],
    allergies: [],
    dietaryPreferences: [],
    mealsPerDay: 3,
  };
  healthOptions = [
    { value: 'DIABETES', label: 'Tiểu đường', icon: '◌' },
    { value: 'HYPERTENSION', label: 'Tăng huyết áp', icon: '♡' },
    { value: 'KIDNEY_DISEASE', label: 'Bệnh thận', icon: '◇' },
    { value: 'PREGNANCY', label: 'Thai kỳ', icon: '✦' },
  ];
  manual: any = { calories: 2000, protein: 100, carbs: 250, fat: 60 };
  target: any;
  allergiesText = '';
  busy = false;
  notice = '';
  error = '';
  currentPassword = '';
  newPassword = '';
  foods: any[] = [];
  preferences: any[] = [];
  prefFoodId = 0;
  prefKind = 'ALLERGY';
  ngOnInit() {
    this.loadSettings();
    this.api.get('/profile').subscribe({
      next: (p: any) => {
        if (p) {
          this.target = p.target;
          this.profile = {
            ...this.profile,
            name: p.name,
            age: p.age,
            gender: p.gender,
            heightCm: Number(p.heightCm),
            weightKg: Number(p.weightKg),
            targetWeightKg: p.targetWeightKg ? Number(p.targetWeightKg) : null,
            activity: p.activity,
            goal: p.goal,
            mealsPerDay: p.mealsPerDay,
            healthConditions: p.healthConditions || [],
            allergies: p.allergies || [],
            dietaryPreferences: p.dietaryPreferences || [],
          };
          this.allergiesText = (p.allergies || []).join(', ');
        }
      },
    });
    this.api.get('/foods').subscribe((f: any[]) => {
      this.foods = f;
      this.prefFoodId = f[0]?.id || 0;
    });
    this.loadPreferences();
  }
  loadSettings() {
    this.api.get('/profile/settings').subscribe({
      next: (s: any) => {
        this.settings = s;
        this.api.setUsageMode(s.usageMode);
        if (s.manualTarget)
          this.manual = {
            calories: s.manualTarget.calories,
            protein: s.manualTarget.protein,
            carbs: s.manualTarget.carbs,
            fat: s.manualTarget.fat,
          };
      },
      error: (e) => (this.error = message(e)),
    });
  }
  changeMode(mode: string) {
    if (mode === 'PERSONALIZED' && !this.settings.hasSurvey) {
      this.notice = 'Hãy hoàn thành và lưu khảo sát để bật cá nhân hóa.';
      return;
    }
    this.api.put('/profile/mode', { usageMode: mode }).subscribe({
      next: (r: any) => {
        this.settings.usageMode = r.usageMode;
        this.api.setUsageMode(r.usageMode);
        this.notice = 'Đã đổi chế độ. Dữ liệu cũ được giữ nguyên.';
        this.loadProfileTarget();
      },
      error: (e) => (this.error = message(e)),
    });
  }
  saveSurvey() {
    this.busy = true;
    this.error = '';
    const payload = {
      ...this.profile,
      allergies: this.allergiesText
        .split(',')
        .map((x: string) => x.trim())
        .filter(Boolean),
    };
    this.api.put('/profile', payload).subscribe({
      next: (p: any) => {
        this.target = p.target;
        this.settings.usageMode = 'PERSONALIZED';
        this.settings.hasSurvey = true;
        this.api.setUsageMode('PERSONALIZED');
        this.api.setOnboardingCompleted(true);
        this.notice = 'Đã lưu khảo sát và bật cá nhân hóa.';
        this.busy = false;
      },
      error: (e) => {
        this.error = message(e);
        this.busy = false;
      },
    });
  }
  toggle(field: 'healthConditions', value: string) {
    const values = this.profile[field] || [];
    this.profile[field] = values.includes(value)
      ? values.filter((x: string) => x !== value)
      : [...values, value];
  }
  loadProfileTarget() {
    this.api.get('/profile').subscribe({ next: (p: any) => (this.target = p?.target || null) });
  }
  saveManualTarget() {
    this.api.put('/profile/manual-target', this.manual).subscribe({
      next: (r: any) => {
        this.settings.manualTarget = r;
        this.notice = 'Đã lưu mục tiêu thủ công.';
        if (this.settings.usageMode === 'SELF_GUIDED') this.target = { ...r, source: 'MANUAL' };
      },
      error: (e) => (this.error = message(e)),
    });
  }
  removeManualTarget() {
    this.api.delete('/profile/manual-target').subscribe({
      next: () => {
        this.settings.manualTarget = null;
        if (this.settings.usageMode === 'SELF_GUIDED') this.target = null;
        this.notice = 'Đã xóa mục tiêu thủ công.';
      },
      error: (e) => (this.error = message(e)),
    });
  }
  changePassword() {
    this.api
      .put('/auth/password', {
        currentPassword: this.currentPassword,
        newPassword: this.newPassword,
      })
      .subscribe({
        next: () => {
          this.notice = 'Đã đổi mật khẩu.';
          this.currentPassword = '';
          this.newPassword = '';
        },
        error: (e) => (this.error = message(e)),
      });
  }
  loadPreferences() {
    this.api.get('/profile/preferences').subscribe({
      next: (p: any[]) => (this.preferences = p),
      error: (e) => (this.error = message(e)),
    });
  }
  addPreference() {
    this.api
      .post('/profile/preferences', { foodId: this.prefFoodId, kind: this.prefKind })
      .subscribe({ next: () => this.loadPreferences(), error: (e) => (this.error = message(e)) });
  }
  removePreference(id: number) {
    this.api
      .delete(`/profile/preferences/${id}`)
      .subscribe({ next: () => this.loadPreferences(), error: (e) => (this.error = message(e)) });
  }
}
