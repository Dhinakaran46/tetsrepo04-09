import { Injectable, OnInit } from '@angular/core';
import { HttpService } from './http.service';
import * as CryptoJS from 'crypto-js';
import { environment } from '../../../../environments/environment';
import { Router } from '@angular/router';
import { commonConfig } from '../../config/common.config';
import { lastValueFrom } from 'rxjs';
import { GridApiService } from './grid.service';

@Injectable({ providedIn: 'root' })
export class LocalStorageService implements OnInit {
  returnData: any;

  constructor(private http: HttpService, private router: Router, private gridApiService: GridApiService) {}

  ngOnInit() {}

  public storeData(key: string, value: string | any): void {
    localStorage.setItem(key, value);
  }

  public getData(key: string): any {
    const conf: any = localStorage.getItem('config');
    const config: any = JSON.parse(conf);

    if (localStorage.getItem('user_data') && key == 'user_data' && config?.encrypt_local_storage == 'true') {
      return this.getDataDecrypted(key);
    }
    this.returnData = localStorage.getItem(key);
    return this.returnData;
  }

  public storeDataEncrypted(key: string, value: string | any): void {
    const encryptedInfo: string = CryptoJS.AES.encrypt(value, key).toString();
    localStorage.setItem(key, encryptedInfo);
  }

  public getDataDecrypted(key: string): any {
    const value: any = localStorage.getItem(key);

    const bytes = CryptoJS.AES.decrypt(value, key);

    return bytes.toString(CryptoJS.enc.Utf8);
  }

  static isAccessible(key: string): any {
    const data = JSON.parse(localStorage.getItem('user_data') || '{}');
    return data?.permissions && data.permissions[key] ? data.permissions[key] : false;
  }

  public logout(): void {
    localStorage.removeItem('user_data');
    localStorage.removeItem('config');
    localStorage.removeItem('menu_id');
  }

  public removeData(key: string): void {
    localStorage.removeItem(key);
  }

  public clearStorage(): void {
    localStorage.setItem('logout-event', 'logout' + Math.random());
    localStorage.clear();
  }

  public storeUser(user: any): void {
    const encryptCurrentuser: string = this.encryptkey(JSON.stringify(user));
    localStorage.setItem('currentUser', encryptCurrentuser);

    this.storeLanguageContent();
  }

  encryptkey(data: any): string {
    try {
      let key = environment.ENCRYPTION_KEY;
      return CryptoJS.AES.encrypt(data, key).toString();
    } catch (error: any) {
      throw error;
    }
  }

  decryptkey(data: any) {
    try {
      let key = environment.ENCRYPTION_KEY;
      const bytes = CryptoJS.AES.decrypt(data, key);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      localStorage.clear();
      this.router.navigate(['login']);
      return false;
    }
  }

  public getUser() {
    const localStorageUser = this.decryptkey(this.getData('currentUser'));
    let user;
    if (localStorageUser) {
      user = JSON.parse(localStorageUser);
    }
    return user;
  }

  public async storeLanguageContent() {
    let enLanguageContent = await this.http.getLanguageContent('en');
    let arLanguageContent = await this.http.getLanguageContent('ar');
    localStorage.setItem('enLanguageContent', JSON.stringify(enLanguageContent));
    localStorage.setItem('arLanguageContent', JSON.stringify(arLanguageContent));
  }

  public getAppLanguage(): Promise<any> {
    return new Promise((resolve, reject) => {
      const appLanguage = this.getData('appLanguage');
      if (appLanguage) {
        resolve(appLanguage);
      } else {
        localStorage.setItem('appLanguage', 'en');
        resolve('en');
      }
    });
  }

  public setAppLanguage(lang: any): Promise<any> {
    return new Promise(async (resolve, reject) => {
      localStorage.setItem('appLanguage', lang);
      setTimeout(() => {
        resolve(lang);
      }, 1000);
    });
  }

  public getDateInDBFormat(dateObject: any) {
    return `${dateObject.year}-${dateObject.month.toString().padStart(2, '0')}-${dateObject.day.toString().padStart(2, '0')} 00:00:00`;
  }

  async getLanguageContent(lang: string = 'en'): Promise<any> {
    return await this.http.getLanguageContent(lang);
  }

  sanitizeTitle(title: string): string {
    return title
      .toLowerCase() // Convert to lowercase
      .replace(/[^a-z0-9]+|(^-|-$)/g, '') // Replace non-alphanumeric characters and remove leading or trailing hyphens
      .substring(0, 50); // Truncate to 50 characters
  }

  generateSlugWithTimestamp(title: string): string {
    const sanitizedTitle = this.sanitizeTitle(title);
    const timestamp = Date.now().toString(36); // Convert timestamp to base-36

    return `${sanitizedTitle}${timestamp}`;
  }

  handleKeyPress(event: KeyboardEvent, configObject: any) {
    if (configObject.type === commonConfig.keypress_config.allow_only_lowercase_alphanumeric) {
      const allowedChars = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '_', 'Backspace'];
      const lowercaseAlphabet = 'abcdefghijklmnopqrstuvwxyz';

      // Allow lowercase alphabetic characters
      allowedChars.push(...lowercaseAlphabet.split(''));

      if (event.key && allowedChars.indexOf(event.key) === -1) {
        event.preventDefault();
      }
    }
  }

  public async getMasterEntity(inputObject: any): Promise<any> {
    const listParams = {
      company_id: 1,
      print_query: false,
      primary_table: 'master_entities',
      start_index: 0,
      limit_range: 1,
      sort_columns: [['master_entities.id', 'desc']],
      select_columns: [['master_entities.*']],
      search_all: [
        { column_name: 'master_entities.entity_name', operator: '=', value: inputObject.entity_name },
        { column_name: 'master_entities.entity_type', operator: '=', value: inputObject.entity_type },
        { column_name: 'master_entities.status_id', operator: '=', value: '1' },
      ],
    };
    try {
      const response = await lastValueFrom(this.gridApiService.getAllList(listParams));
      if (response.status && response.data?.records?.length > 0) {
        return response.data.records[0];
      }
      return null;
    } catch (error: any) {
      throw error;
    }
  }

  replaceUniqueId(jsonObject: any, uniqueIdPlaceholder: string, uniqueIdValue: string): any {
    // Create a regular expression that matches the exact placeholder string
    const placeholderRegex = new RegExp(uniqueIdPlaceholder.replace(/\$/g, '\\$'), 'g');

    // Base case: if the jsonObject is a string, replace the placeholder with the value
    if (typeof jsonObject === 'string') {
      const replacedString = jsonObject.replace(placeholderRegex, uniqueIdValue);
      console.log('Replaced:', jsonObject, 'with:', replacedString);
      return replacedString;
    }

    // Recursive case: if the jsonObject is an array, process each element
    if (Array.isArray(jsonObject)) {
      return jsonObject.map((item) => this.replaceUniqueId(item, uniqueIdPlaceholder, uniqueIdValue));
    }

    // Recursive case: if the jsonObject is an object, process each key-value pair
    if (typeof jsonObject === 'object' && jsonObject !== null) {
      const newObject: any = {};
      for (const key in jsonObject) {
        if (jsonObject.hasOwnProperty(key)) {
          newObject[key] = this.replaceUniqueId(jsonObject[key], uniqueIdPlaceholder, uniqueIdValue);
        }
      }
      return newObject;
    }

    // If it's neither a string, array, or object, return it as is
    return jsonObject;
  }
}
