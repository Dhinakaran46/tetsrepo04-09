import { Injectable } from '@angular/core';
import { TranslateLoader } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { LocalStorageService } from './local-storage.service';

@Injectable({
  providedIn: 'root',
})
export class LocalStorageTranslateLoader implements TranslateLoader {
  constructor(private localstore: LocalStorageService) {}
  getTranslation(lang: string): Observable<any> {
    const key = this.localstore.getScopedKey('lang_contents');
    const languageContent = JSON.parse(localStorage.getItem(key) || '{}');
    return of(languageContent);
  }
}
