import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePickerComponent } from '../date-picker/date-picker.component';
import { StyledSelectModule } from '../styled-select/styled-select.module';
export type ChartRange = { mode: 'DAY' | 'MONTH'; date: string; month: string };
@Component({
  selector: 'app-chart-period-filter',
  imports: [FormsModule, DatePickerComponent, StyledSelectModule],
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
        <div class="month-fields">
          <label
            >Tháng<mat-select
              panelClass="app-select-panel"
              aria-label="Tháng xem biểu đồ"
              [ngModel]="monthNumber"
              (ngModelChange)="changeMonthNumber($event)"
            >
              @for (m of months; track m) {
                <mat-option [value]="m">Tháng {{ m }}</mat-option>
              }
            </mat-select></label
          ><label
            >Năm<mat-select
              panelClass="app-select-panel"
              aria-label="Năm xem biểu đồ"
              [ngModel]="yearNumber"
              (ngModelChange)="changeYearNumber($event)"
            >
              @for (y of years; track y) {
                <mat-option [value]="y">{{ y }}</mat-option>
              }
            </mat-select></label
          >
        </div>
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
        align-items: flex-end;
        gap: 18px;
        flex-wrap: wrap;
        margin: 16px 0;
      }
      .period-modes {
        display: flex;
        gap: 5px;
        border: 1px solid #deeadf;
        background: #f4f8f3;
        height: 46px;
        padding: 4px;
        border-radius: 12px;
      }
      .period-modes button {
        border: 0;
        background: transparent;
        color: #52715b;
        border-radius: 8px;
        min-height: 36px;
        padding: 6px 15px;
        font: inherit;
        font-size: 13px;
        line-height: 20px;
        white-space: nowrap;
        cursor: pointer;
      }
      .period-modes button.active {
        background: #18834c;
        color: white;
      }
      .period-field {
        display: grid;
        gap: 6px;
        width: 220px;
        max-width: 100%;
        font-size: 12px;
        line-height: 18px;
        font-weight: 500;
        color: #57735d;
      }
      .period-field app-date-picker {
        width: 100%;
        --date-picker-control-height: 46px;
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
      .month-fields {
        display: flex;
        align-items: flex-end;
        gap: 10px;
      }
      .month-fields label {
        display: grid;
        gap: 6px;
        line-height: 18px;
        font-size: 12px;
        font-weight: 500;
      }
      .month-fields mat-select {
        margin-top: 0;
        height: 46px;
        min-height: 46px;
        min-width: 112px;
      }
      @media (max-width: 600px) {
        .period-filter {
          align-items: stretch;
          gap: 12px;
        }
        .period-field {
          width: 100%;
        }
        .month-fields {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          width: 100%;
        }
        .month-fields mat-select {
          min-width: 0;
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
  months = Array.from({ length: 12 }, (_, i) => i + 1);
  years = Array.from({ length: 201 }, (_, i) => 1900 + i);
  get monthNumber() {
    return Number(this.month.slice(5, 7));
  }
  get yearNumber() {
    return Number(this.month.slice(0, 4));
  }
  changeMonthNumber(value: number) {
    this.selectMonth(this.yearNumber + '-' + String(value).padStart(2, '0'));
  }
  changeYearNumber(value: number) {
    this.selectMonth(value + '-' + String(this.monthNumber).padStart(2, '0'));
  }
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
