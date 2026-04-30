import { ApplicationConfig, ErrorHandler } from '@angular/core';

import { Title } from '@angular/platform-browser';
import { importProvidersFrom } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { DatePipe } from '@angular/common';

// headlessui-angular removed: package is experimental (0.0.x), MenuModule was never used
// in any template — all menu toggling uses plain Angular (isMenuOpen boolean + toggleMenu()).
// Decision: removed headlessui-angular dependency entirely (Angular 21 upgrade, task 11.5).

// ngx-scrollbar
import { NgScrollbarModule, provideScrollbarOptions } from 'ngx-scrollbar';
import { CommonModule, HashLocationStrategy, LocationStrategy } from '@angular/common';
import { ToastrModule } from 'ngx-toastr';
import { NgMultiSelectDropDownModule } from 'ng-multiselect-dropdown';

import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { QuillModule } from 'ngx-quill';
import { provideHighlightOptions } from 'ngx-highlightjs';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHighlightOptions({
      lineNumbersLoader: () => import('ngx-highlightjs/line-numbers'),
      coreLibraryLoader: () => import('highlight.js/lib/core'),
      languages: {
        json: () => import('highlight.js/lib/languages/json'),
        typescript: () => import('highlight.js/lib/languages/typescript'),
        css: () => import('highlight.js/lib/languages/css'),
        xml: () => import('highlight.js/lib/languages/xml'),
      },
      themePath: 'assets/styles/androidstudio.css',
    }),
    provideAnimations(),
    provideHttpClient(),
    importProvidersFrom(
      CommonModule,
      FormsModule,
      ReactiveFormsModule,
      ToastrModule.forRoot(),
      MonacoEditorModule.forRoot(),
      QuillModule.forRoot(),
      NgMultiSelectDropDownModule.forRoot(),
      NgScrollbarModule,
    ),
    provideScrollbarOptions({
      visibility: 'hover',
      appearance: 'native',
    }),
    Title,
    { provide: LocationStrategy, useClass: HashLocationStrategy },
    DatePipe,
  ],
};
