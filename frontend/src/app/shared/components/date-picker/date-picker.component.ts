import { A11yModule } from '@angular/cdk/a11y';
import { ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
import {
  Component,
  ElementRef,
  EventEmitter,
  Injectable,
  Input,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import {
  DateAdapter,
  MAT_DATE_LOCALE,
  NativeDateAdapter,
  provideNativeDateAdapter,
} from '@angular/material/core';
import { MatCalendar, MatDatepickerModule } from '@angular/material/datepicker';
import { today } from '../../utils/ui';

@Injectable()
class MondayDateAdapter extends NativeDateAdapter {
  override getFirstDayOfWeek() {
    return 1;
  }
}
@Component({
  selector: 'app-date-picker',
  imports: [OverlayModule, A11yModule, MatDatepickerModule],
  providers: [
    provideNativeDateAdapter(),
    { provide: MAT_DATE_LOCALE, useValue: 'vi-VN' },
    { provide: DateAdapter, useClass: MondayDateAdapter },
  ],
  templateUrl: './date-picker.component.html',
  styleUrl: './date-picker.component.scss',
})
export class DatePickerComponent implements OnDestroy {
  private focusTimer?: ReturnType<typeof setTimeout>;
  @Input() value = today();
  @Output() valueChange = new EventEmitter<string>();
  @ViewChild('trigger') trigger?: ElementRef<HTMLButtonElement>;
  @ViewChild(MatCalendar) calendar?: MatCalendar<Date>;
  open = false;
  minDate = new Date(1900, 0, 1);
  maxDate = new Date(2100, 11, 31);
  positions: ConnectedPosition[] = [
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 8 },
    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 },
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -8 },
    { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -8 },
  ];
  get selectedDate() {
    const parts = (this.value || today()).split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return Number.isFinite(d.getTime()) ? d : new Date();
  }
  get formattedDate() {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(this.selectedDate);
  }
  toggle() {
    this.open = !this.open;
  }
  focusCalendar() {
    clearTimeout(this.focusTimer);
    this.focusTimer = setTimeout(() => {
      if (this.open) this.calendar?.focusActiveCell();
    }, 80);
  }
  close(restoreFocus = true) {
    this.open = false;
    clearTimeout(this.focusTimer);
    if (restoreFocus) this.trigger?.nativeElement.focus();
  }
  ngOnDestroy() {
    this.open = false;
    clearTimeout(this.focusTimer);
  }
  pickDate(date: Date | null) {
    if (!date || !Number.isFinite(date.getTime()) || date < this.minDate || date > this.maxDate)
      return;
    const value =
      date.getFullYear() +
      '-' +
      String(date.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(date.getDate()).padStart(2, '0');
    this.valueChange.emit(value);
    this.close();
  }
  selectToday() {
    this.valueChange.emit(today());
    this.close();
  }
  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.close();
    }
  }
}
