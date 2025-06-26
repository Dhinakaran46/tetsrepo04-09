import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import { MenuModule } from 'headlessui-angular';
import { NgxTippyModule } from 'ngx-tippy-wrapper';
import { NgSelectModule } from '@ng-select/ng-select';
import { OrderByPipe } from '../../pipes/order-by/order-by.pipe';
import { DynamicFontSizeDirective } from '../../directives/page-specific-font-size.directive';
import { DatetimePipe } from '../../pipes/datetime/datetime.pipe';
import { DatePipe } from '../../pipes/date/date.pipe';

@NgModule({
  imports: [
    CommonModule,
    NgScrollbarModule,
    FormsModule,
    TranslateModule,
    RouterModule,
    MenuModule,
    NgxTippyModule,
    NgSelectModule,
    OrderByPipe,
    DynamicFontSizeDirective,
    DatetimePipe,
    DatePipe,
  ],
  exports: [
    CommonModule,
    NgScrollbarModule,
    FormsModule,
    TranslateModule,
    RouterModule,
    MenuModule,
    NgxTippyModule,
    NgSelectModule,
    OrderByPipe,
    DynamicFontSizeDirective,
    DatetimePipe,
    DatePipe,
  ],
})
export class CommonSharedModule {}
