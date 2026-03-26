import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { LocalStorageService } from './local-storage.service';
import { Subject } from 'rxjs';
@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private languageDataUpdated = new Subject<any>();

  constructor(private authservice: AuthService, private localstore: LocalStorageService, private http: HttpClient) {}

  private getLanguageIdFromCode(code: string): any {
    switch (code) {
      case 'en':
        return 'en-GB';
      case 'ae':
        return 'ar-QA';
      default:
        return 'en-GB'; // Default to en
    }
  }

  public getLanguageId(code: string): any {
    return this.getLanguageIdFromCode(code);
  }

  public serviceChangeLanguage(companyId: number, languageCode: string) {
    this.localstore.storeData('languageCode', languageCode);
    const languageId = this.getLanguageId(languageCode);
    this.fetchLanguageData(companyId, languageId);
    if (!this.localstore.getData('languageReload')) {
      this.localstore.storeData('languageReload', 'true');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
  }

  public fetchLanguageData(companyId: number, languageId: number) {
    const stLangCode = this.localstore.getData('languageCode');
    const languageIdSt = this.getLanguageId(stLangCode);
    const payload = { company_id: companyId, language_id: languageIdSt ? languageIdSt : languageId };

    this.authservice.languageList(payload).subscribe({
      next: (response: any) => {
        if (response.code === 200 && response.status) {
          this.localstore.removeData('lang_contents');
          const lang_contents = response.data;
          this.localstore.storeData('lang_contents', JSON.stringify(lang_contents));
          this.languageDataUpdated.next(lang_contents);
        }
      },
      error: (error) => {
        console.error('Error fetching language data:', error);
      },
    });
  }

  public getLanguageDataUpdates() {
    return this.languageDataUpdated.asObservable();
  }

  public checkReloadFlag() {
    //const languageReload = localStorage.getItem('languageReload');
    const languageReload = this.localstore.getData('languageReload');
    if (languageReload === 'true') {
      //localStorage.removeItem('languageReload');
      this.localstore.removeData('languageReload');
      return true;
    }
    return false;
  }

  public getSavedLanguageCode(): string {
    return this.localstore.getData('languageReload') || 'en'; // Default to 'en'
    //return localStorage.getItem('languageCode') || 'en'; // Default to 'en'
  }
}
