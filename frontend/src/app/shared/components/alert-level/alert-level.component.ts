import { Component, Input } from '@angular/core';
export const alertLevelNames: Record<string, string> = {
  HIGH: 'Cao',
  MEDIUM: 'Trung bình',
  LOW: 'Thấp',
};
@Component({
  selector: 'app-alert-level',
  template: `@if (severity && names[severity]) {
    <span
      class="alert-level"
      [class.high]="severity === 'HIGH'"
      [class.medium]="severity === 'MEDIUM'"
      [class.low]="severity === 'LOW'"
      >Mức {{ names[severity].toLowerCase() }}</span
    >
  }`,
  styles: [
    `
      :host {
        display: inline-block;
      }
      .alert-level {
        display: inline-flex;
        align-items: center;
        padding: 5px 10px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 700;
        line-height: 1.6;
        white-space: nowrap;
      }
      .high {
        background: #fecaca;
        color: #991b1b;
      }
      .medium {
        background: #fff3d8;
        color: #8b601d;
      }
      .low {
        background: #eaf5eb;
        color: #347343;
      }
    `,
  ],
})
export class AlertLevelComponent {
  @Input() severity: string | null | undefined = null;
  names = alertLevelNames;
}
