import { Injectable } from '@angular/core';
import { TranslateLoader } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LocalStorageTranslateLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<any> {
    const languageContent = JSON.parse(localStorage.getItem('lang_contents') || '{}');
    return of(languageContent);
  }
}
