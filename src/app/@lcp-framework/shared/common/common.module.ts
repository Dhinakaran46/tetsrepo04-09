import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
// headlessui-angular (MenuModule) removed: experimental package (0.0.x), never used in templates.
// All menu toggling uses plain Angular (isMenuOpen boolean + toggleMenu()). Removed in Angular 21 upgrade (task 11.5).
import { NgxTippyModule } from 'ngx-tippy-wrapper';
import { NgSelectModule } from '@ng-select/ng-select';
import { OrderByPipe } from '../../pipes/order-by/order-by.pipe';
import { DynamicFontSizeDirective } from '../../directives/page-specific-font-size.directive';
import { DatetimePipe } from '../../pipes/datetime/datetime.pipe';
import { DatePipe } from '../../pipes/date/date.pipe';
import { JsonValidatorDirective } from '../../directives/json-validator.directive';

@NgModule({
  imports: [
    CommonModule,
    NgScrollbarModule,
    FormsModule,
    TranslateModule,
    RouterModule,
    NgxTippyModule,
    NgSelectModule,
    OrderByPipe,
    DynamicFontSizeDirective,
    JsonValidatorDirective,
    DatetimePipe,
    DatePipe,
  ],
  exports: [
    CommonModule,
    NgScrollbarModule,
    FormsModule,
    TranslateModule,
    RouterModule,
    NgxTippyModule,
    NgSelectModule,
    OrderByPipe,
    DynamicFontSizeDirective,
    JsonValidatorDirective,
    DatetimePipe,
    DatePipe,
  ],
})
export class CommonSharedModule {}
