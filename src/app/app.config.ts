import { ApplicationConfig, ErrorHandler } from '@angular/core';
import { routes } from './app.routes';

import { provideRouter } from '@angular/router';
import { BrowserModule, Title } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { importProvidersFrom } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { DatePipe } from '@angular/common';

// headlessui
import { MenuModule } from 'headlessui-angular';

// perfect-scrollbar
import { NgScrollbarModule } from 'ngx-scrollbar';
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
    provideRouter(routes),
    provideAnimations(),
    importProvidersFrom(
      BrowserModule,
      BrowserAnimationsModule,
      CommonModule,
      FormsModule,
      ReactiveFormsModule,
      HttpClientModule,
      MenuModule,
      ToastrModule.forRoot(),
      MonacoEditorModule.forRoot(),
      QuillModule.forRoot(),
      NgMultiSelectDropDownModule.forRoot(),
      NgScrollbarModule.withConfig({
        visibility: 'hover',
        appearance: 'standard',
      })
    ),
    Title,
    { provide: LocationStrategy, useClass: HashLocationStrategy },
    DatePipe,
  ],
};
