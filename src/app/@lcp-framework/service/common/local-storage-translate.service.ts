import { Injectable } from '@angular/core';
import { TranslateLoader } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { LocalStorageService } from './local-storage.service';

@Injectable({
  providedIn: 'root',
})
export class LocalStorageTranslateLoader implements TranslateLoader {
  //private localstore:any = LocalStorageService;
  //constructor(private localstore: LocalStorageService) {}
  getTranslation(lang: string): Observable<any> {
    const scope = window.location.port || window.location.hostname + '' + window.location.pathname;
    const key = `${scope}_lang_contents`;
    const languageContent = JSON.parse(localStorage.getItem(key) || '{}');
    //const languageContent = JSON.parse(localStorage.getItem('lang_contents') || '{}');
    //const languageContent = JSON.parse(this.localstore.getData('lang_contents') || '{}');
    return of(languageContent);
  }
}
