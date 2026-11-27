import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { DateAdapter } from '@angular/material/core';
import { MatSelect } from '@angular/material/select';
import { By } from '@angular/platform-browser';
import { today } from '../../utils/ui';
import { DatePickerComponent } from '../date-picker/date-picker.component';
import { StyledSelectModule } from './styled-select.module';

@Component({
  imports: [FormsModule, StyledSelectModule],
  template: `<mat-select [(ngModel)]="value" aria-label="Thực phẩm" panelClass="app-select-panel"
    ><mat-option [value]="null">Chọn thực phẩm</mat-option
    ><mat-option [value]="12">Yến mạch</mat-option></mat-select
  >`,
})
class SelectFixture {
  value: number | null = null;
}

describe('Shared selection controls', () => {
  it('preserves null placeholders and numeric food identifiers with the Material value accessor', async () => {
    const fixture = TestBed.createComponent(SelectFixture);
    fixture.detectChanges();
    await fixture.whenStable();
    const select = fixture.debugElement.query(By.directive(MatSelect))
      .componentInstance as MatSelect;
    expect(select.canSelectNullableOptions).toBe(true);
    expect(select.triggerValue).toBe('Chọn thực phẩm');
    select.options.last._selectViaInteraction();
    await fixture.whenStable();
    expect(fixture.componentInstance.value).toBe(12);
    expect(typeof fixture.componentInstance.value).toBe('number');
  });
  it('emits the selected local calendar day without shifting the date through UTC', () => {
    const fixture = TestBed.createComponent(DatePickerComponent),
      calendar = fixture.componentInstance,
      changed = vi.fn();
    calendar.valueChange.subscribe(changed);
    calendar.pickDate(new Date(2024, 1, 29));
    expect(changed).toHaveBeenLastCalledWith('2024-02-29');
    calendar.pickDate(new Date(1899, 11, 31));
    expect(changed).toHaveBeenCalledTimes(1);
    calendar.selectToday();
    expect(changed).toHaveBeenLastCalledWith(today());
    expect(fixture.debugElement.injector.get(DateAdapter).getFirstDayOfWeek()).toBe(1);
  });
  it('closes the calendar with Escape and restores focus to its trigger', () => {
    const fixture = TestBed.createComponent(DatePickerComponent);
    fixture.detectChanges();
    const picker = fixture.componentInstance,
      button = fixture.nativeElement.querySelector('.dp-trigger') as HTMLButtonElement;
    const focus = vi.spyOn(button, 'focus');
    picker.open = true;
    picker.onKeydown(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(picker.open).toBe(false);
    expect(focus).toHaveBeenCalled();
  });
});
