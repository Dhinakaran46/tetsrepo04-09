import { appConfig } from './app/app.config';
import { lcpAppConfig } from './app/@lcp-framework/lcp.config';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';

const combinedConfig = {
  providers: [...lcpAppConfig.providers, ...appConfig.providers],
};

bootstrapApplication(AppComponent, combinedConfig).catch((err) => console.error(err));
