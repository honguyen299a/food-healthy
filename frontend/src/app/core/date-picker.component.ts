import { Component, ElementRef, EventEmitter, HostListener, Input, Output, inject } from '@angular/core';
import { today } from './ui';

@Component({
  selector: 'app-date-picker',
  template: `<div class="calendar-wrap"><button type="button" class="calendar-trigger" (click)="toggle()" [attr.aria-expanded]="open" aria-label="Mở lịch chọn ngày"><span aria-hidden="true">▦</span><span class="date-text">{{day}} tháng {{month}}, {{year}}</span></button>@if(open){<div class="calendar" [class.align-right]="alignRight" role="dialog" aria-label="Chọn ngày"><div class="calendar-header"><button type="button" aria-label="Tháng trước" (click)="moveMonth(-1)">‹</button><strong>Tháng {{calendarMonth}} {{calendarYear}}</strong><button type="button" aria-label="Tháng sau" (click)="moveMonth(1)">›</button></div><div class="calendar-grid">@for(label of weekdays;track $index){<span class="weekday">{{label}}</span>}@for(cell of calendarDays;track $index){@if(cell){<button type="button" [class.selected]="cell === day && calendarMonth === month && calendarYear === year" [class.is-today]="isToday(cell)" [attr.aria-label]="'Ngày '+cell+' tháng '+calendarMonth+' năm '+calendarYear" [attr.aria-pressed]="cell === day && calendarMonth === month && calendarYear === year" (click)="pick(cell)">{{cell}}</button>}@else{<span></span>}}</div><button type="button" class="calendar-today" (click)="selectToday()">Về hôm nay</button></div>}</div>`,
  styles: [`:host{display:inline-block;max-width:100%}.calendar-wrap{position:relative}.calendar-trigger{height:48px;border:1px solid #d4e5d8;background:#fff;color:#204b34;border-radius:12px;display:flex;align-items:center;gap:13px;padding:0 15px;font-size:14px;cursor:pointer}.calendar-trigger span{color:#15934a;font-size:20px}.calendar-trigger .date-text{font-size:14px;color:#557363;font-weight:500}.calendar-trigger:hover{background:#eef9f0}.calendar{position:absolute;z-index:50;top:calc(100% + 8px);left:0;width:300px;max-width:calc(100vw - 40px);padding:18px;background:#fff;border:1px solid #e0ece2;border-radius:20px;box-shadow:0 20px 50px rgba(20,65,35,.18)}.calendar.align-right{left:auto;right:0}.calendar-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;color:#426350;font-weight:500}.calendar-header button{width:36px;height:36px;border:0;border-radius:10px;background:#f0f7f1;color:#245b38;font-size:22px}.calendar-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;text-align:center}.weekday{font-size:11px;font-weight:700;color:#8a9e90;padding:8px 0}.calendar-grid button{height:34px;border:0;border-radius:10px;background:transparent;color:#557363;font-weight:400}.calendar-grid button:hover{background:#e5f6e9}.calendar-grid button.is-today{box-shadow:inset 0 0 0 1px #16a34a}.calendar-grid button.selected{background:#159447;color:#fff}.calendar-today{width:100%;margin-top:14px;padding:10px;border:0;border-radius:10px;background:#eaf8ed;color:#49805b;font-weight:600}.calendar button:focus-visible,.calendar-trigger:focus-visible{outline:2px solid #159447;outline-offset:2px}`]
})
export class DatePickerComponent {
  @Input() value = today();
  @Output() valueChange = new EventEmitter<string>();
  private host = inject(ElementRef<HTMLElement>);
  open=false; calendarMonth=1; calendarYear=2000; weekdays=['T2','T3','T4','T5','T6','T7','CN'];
  get year(){return Number(this.value.slice(0,4))} get month(){return Number(this.value.slice(5,7))} get day(){return Number(this.value.slice(8,10))}
  get calendarDays():(number|null)[]{const offset=(new Date(this.calendarYear,this.calendarMonth-1,1).getDay()+6)%7;const length=new Date(this.calendarYear,this.calendarMonth,0).getDate();return [...Array(offset).fill(null),...Array.from({length},(_,i)=>i+1)]}
  alignRight=false;
  toggle(){this.open=!this.open;if(this.open){this.calendarMonth=this.month;this.calendarYear=this.year;this.alignRight=this.host.nativeElement.getBoundingClientRect().left+300>window.innerWidth-16}}
  moveMonth(offset:number){const d=new Date(this.calendarYear,this.calendarMonth-1+offset,1);this.calendarMonth=d.getMonth()+1;this.calendarYear=d.getFullYear()}
  isToday(day:number){const d=new Date();return day===d.getDate()&&this.calendarMonth===d.getMonth()+1&&this.calendarYear===d.getFullYear()}
  pick(day:number){this.open=false;this.valueChange.emit(`${this.calendarYear}-${String(this.calendarMonth).padStart(2,'0')}-${String(day).padStart(2,'0')}`)}
  selectToday(){this.open=false;this.valueChange.emit(today())}
  @HostListener('document:click',['$event']) onDocumentClick(event:MouseEvent){if(!this.host.nativeElement.contains(event.target as Node))this.open=false}
  @HostListener('document:keydown.escape') onEscape(){this.open=false}
}
