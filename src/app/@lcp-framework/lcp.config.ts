import { APP_INITIALIZER, ApplicationConfig, ErrorHandler } from '@angular/core';
import { routes } from './lcp.routes';
import { provideRouter, Router, RouterConfigOptions, Routes, withRouterConfig } from '@angular/router';
import { BrowserModule, Title } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { importProvidersFrom } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { AppService } from './service/common/app.service';

// store
import { StoreModule } from '@ngrx/store';
import { indexReducer } from '../store/index.reducer';

// i18n
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';

// headlessui
import { MenuModule } from 'headlessui-angular';

// perfect-scrollbar
import { NgScrollbarModule } from 'ngx-scrollbar';
import { CommonModule, HashLocationStrategy, LocationStrategy } from '@angular/common';
import { authInterceptor } from './interceptors/auth/auth.interceptor';
import { GlobalErrorHandlerService } from './service/errorhandler/global-error-handler.service';
import { HttpErrorInterceptor } from './interceptors/httperror/http-error.interceptor';
import { ToastrModule } from 'ngx-toastr';
import { NgMultiSelectDropDownModule } from 'ng-multiselect-dropdown';
import { RouteUpdateService } from './service/common/route-update.service';
import { LocalStorageTranslateLoader } from './service/common/local-storage-translate.service';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { QuillModule } from 'ngx-quill';
import { provideHighlightOptions } from 'ngx-highlightjs';
import { BnNgIdleService } from 'bn-ng-idle';

export function initializeApp(routeUpdateService: RouteUpdateService): () => Promise<void> {
  return () =>
    new Promise<void>((resolve) => {
      routeUpdateService.addDynamicRoutes();
      resolve();
    });
}

export const lcpAppConfig: ApplicationConfig = {
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
    RouteUpdateService,
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [RouteUpdateService],
      multi: true,
    },
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
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: httpTranslateLoader,
          deps: [HttpClient],
        },
      }),
      StoreModule.forRoot({ index: indexReducer }),
      NgMultiSelectDropDownModule.forRoot(),
      NgScrollbarModule.withConfig({
        visibility: 'hover',
        appearance: 'standard',
      })
    ),
    AppService,
    Title,
    BnNgIdleService,
    { provide: ErrorHandler, useClass: GlobalErrorHandlerService },
    provideHttpClient(withInterceptors([authInterceptor, HttpErrorInterceptor])),
    { provide: LocationStrategy, useClass: HashLocationStrategy }, // Add this line
  ],
};

// AOT compilation support
export function httpTranslateLoader(http: HttpClient) {
  return new LocalStorageTranslateLoader();
}
