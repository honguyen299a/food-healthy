import { NgModule } from '@angular/core';
import { MAT_SELECT_CONFIG, MatSelectModule } from '@angular/material/select';

@NgModule({
  imports: [MatSelectModule],
  exports: [MatSelectModule],
  providers: [
    {
      provide: MAT_SELECT_CONFIG,
      useValue: {
        canSelectNullableOptions: true,
        disableOptionCentering: true,
        typeaheadDebounceInterval: 200,
        overlayPanelClass: 'app-select-overlay',
      },
    },
  ],
})
export class StyledSelectModule {}
