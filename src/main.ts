import { appConfig } from './app/app.config';
import { lcpAppConfig } from './app/@lcp-framework/lcp.config';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideServiceWorker } from '@angular/service-worker';
import { isDevMode } from '@angular/core';
import { Capacitor } from '@capacitor/core';

// Service workers and Capacitor WebViews don't mix well (the native shell already
// controls its own asset caching), so only register it for the plain web build.
const combinedConfig = {
  providers: [
    ...lcpAppConfig.providers,
    ...appConfig.providers,
    ...(Capacitor.isNativePlatform()
      ? []
      : [
          provideServiceWorker('ngsw-worker.js', {
            enabled: !isDevMode(),
            registrationStrategy: 'registerWhenStable:30000',
          }),
        ]),
  ],
};

bootstrapApplication(AppComponent, combinedConfig).catch((err) => console.error(err));
