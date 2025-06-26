import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DatetimePipe } from '../../pipes/datetime/datetime.pipe';
import { DatePipe } from '../../pipes/date/date.pipe';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    DatetimePipe,
    DatePipe
  ],
  exports: [
    DatetimePipe,
    DatePipe
  ]
})
export class DatetimeModule { } 