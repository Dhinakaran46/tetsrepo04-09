import { NgModule } from '@angular/core';
import { FlatpickrDirective } from './flatpickr.directive';

@NgModule({
  imports: [FlatpickrDirective],
  exports: [FlatpickrDirective],
})
export class FlatpickrModule {}
