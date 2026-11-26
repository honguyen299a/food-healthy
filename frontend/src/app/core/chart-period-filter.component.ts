import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePickerComponent } from './date-picker.component';
export type ChartRange = { mode: 'DAY' | 'MONTH'; date: string; month: string };
@Component({
  selector: 'app-chart-period-filter',
  imports: [FormsModule, DatePickerComponent],
  template: `
    <div class="period-filter">
      <div class="period-modes" role="group" aria-label="Khoảng xem biểu đồ">
        <button
          type="button"
          [class.active]="mode === 'DAY'"
          [attr.aria-pressed]="mode === 'DAY'"
          (click)="selectMode('DAY')"
        >
          Theo ngày</button
        ><button
          type="button"
          [class.active]="mode === 'MONTH'"
          [attr.aria-pressed]="mode === 'MONTH'"
          (click)="selectMode('MONTH')"
        >
          Theo tháng
        </button>
      </div>
      @if (mode === 'DAY') {
        <div class="period-field">
          <span>Chọn ngày</span
          ><app-date-picker [value]="date" (valueChange)="date = $event; emit()" />
        </div>
      } @else {
        <label class="period-field"
          >Chọn tháng<input
            type="month"
            [ngModel]="month"
            (ngModelChange)="selectMonth($event)"
            min="1900-01"
            max="2100-12"
            required
            aria-label="Tháng và năm xem biểu đồ"
        /></label>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .period-filter {
        display: flex;
        align-items: center;
        gap: 18px;
        flex-wrap: wrap;
        margin: 16px 0;
      }
      .period-modes {
        display: flex;
        gap: 5px;
        border: 1px solid #deeadf;
        background: #f4f8f3;
        padding: 5px;
        border-radius: 12px;
      }
      .period-modes button {
        border: 0;
        background: transparent;
        color: #52715b;
        border-radius: 8px;
        padding: 10px 15px;
        font: inherit;
        font-size: 13px;
        cursor: pointer;
      }
      .period-modes button.active {
        background: #18834c;
        color: white;
      }
      .period-field {
        display: flex;
        gap: 10px;
        align-items: center;
        font-size: 13px;
        color: #57735d;
      }
      .period-field input {
        width: 190px;
        min-height: 44px;
        padding: 9px 12px;
        border: 1px solid #d4e5d8;
        border-radius: 10px;
        background: white;
        color: #31553a;
        font: inherit;
      }
      @media (max-width: 600px) {
        .period-filter {
          align-items: stretch;
          gap: 12px;
        }
        .period-field {
          flex-wrap: wrap;
        }
        .period-modes button {
          flex: 1;
        }
        .period-modes {
          width: 100%;
        }
      }
    `,
  ],
})
export class ChartPeriodFilterComponent {
  @Input() mode: 'DAY' | 'MONTH' = 'DAY';
  @Input() date = '';
  @Input() month = '';
  @Output() rangeChange = new EventEmitter<ChartRange>();
  selectMode(mode: 'DAY' | 'MONTH') {
    if (this.mode === mode) return;
    this.mode = mode;
    this.emit();
  }
  selectMonth(value: string) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return;
    const year = Number(value.slice(0, 4));
    if (year < 1900 || year > 2100) return;
    this.month = value;
    this.emit();
  }
  emit() {
    this.rangeChange.emit({ mode: this.mode, date: this.date, month: this.month });
  }
}
