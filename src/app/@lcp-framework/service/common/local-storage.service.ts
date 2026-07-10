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

  getScopedKey(key: string): string {
    //const scope = window.location.port || window.location.hostname;
    const scope = (window.location.hostname.replace('/', '') + '_' + (window.location.port || window.location.pathname)).replace('/', '');
    return `${scope}_${key}`;
  }

  public storeData(key: string, value: string | any): void {
    localStorage.setItem(this.getScopedKey(key), value);
  }

  public getData(key: string): any {
    const scopedKey = this.getScopedKey(key);
    const conf: any = localStorage.getItem(this.getScopedKey('config'));
    //const config: any = JSON.parse(conf);
    let config: any = null;
    try {
      config = conf ? JSON.parse(conf) : null;
    } catch {
      config = null;
    }

    const rawValue = localStorage.getItem(scopedKey);

    if (!rawValue) {
      this.returnData = null;
      return null;
    }
    // Special handling for user_data
    if (key === 'user_data') {
      // Prefer config flag *if* it exists, but don't rely on it
      const encryptLocalStorage = config?.encrypt_local_storage === 'true';

      let finalValue = rawValue;

      // 1) If config says encrypted, try decrypt
      if (encryptLocalStorage) {
        const decrypted = this.tryDecryptToJsonString(rawValue, key);
        if (decrypted !== null) {
          this.returnData = decrypted;
          return decrypted;
        }
      }

      // 2) Even if config doesn't say encrypted, still *attempt* decrypt.
      const maybeDecrypted = this.tryDecryptToJsonString(rawValue, key);
      if (maybeDecrypted !== null) {
        this.returnData = maybeDecrypted;
        return maybeDecrypted;
      }

      // 3) Fall back to raw string (plain JSON stored)
      this.returnData = rawValue;
      return rawValue;
    }

    this.returnData = localStorage.getItem(this.getScopedKey(key));
    return this.returnData;
  }

  private tryDecryptToJsonString(value: string, key: string): string | null {
    try {
      const bytes = CryptoJS.AES.decrypt(value, key);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);

      // If decryption fails or wrong key, decrypted will usually be empty
      if (!decrypted) return null;

      // Make sure it’s valid JSON
      JSON.parse(decrypted);

      return decrypted;
    } catch {
      return null;
    }
  }

  public storeDataEncrypted(key: string, value: string | any): void {
    const encryptedInfo: string = CryptoJS.AES.encrypt(value, key).toString();
    localStorage.setItem(this.getScopedKey(key), encryptedInfo);
  }

  public getDataDecrypted(key: string): any {
    const value: any = localStorage.getItem(this.getScopedKey(key));

    const bytes = CryptoJS.AES.decrypt(value, key);

    return bytes.toString(CryptoJS.enc.Utf8);
  }

  isAccessible(key: string): any {
    //const scope = window.location.port || window.location.hostname;
    // const scope = (window.location.port || window.location.hostname + '' + window.location.pathname).replace('/', '-');
    const scopedKey = this.getScopedKey('user_data');
    const data = JSON.parse(localStorage.getItem(scopedKey) || '{}');
    return data?.permissions && data.permissions[key] ? data.permissions[key] : false;
  }

  public logout(): void {
    try {
      localStorage.removeItem(this.getScopedKey('user_data'));
      localStorage.removeItem(this.getScopedKey('config'));
      localStorage.removeItem(this.getScopedKey('menu_id'));
      localStorage.removeItem(this.getScopedKey('company_selection_pending'));
      localStorage.removeItem(this.getScopedKey('selected_company_id'));
    } catch (error: any) {
      console.warn('Logout Error: ', error);
    }
  }

  public removeData(key: string): void {
    localStorage.removeItem(this.getScopedKey(key));
  }

  public clearStorage(): void {
    localStorage.setItem(this.getScopedKey('logout-event'), 'logout' + Math.random());

    const scope = (window.location.port || window.location.hostname + '' + window.location.pathname).replace('/', '-');
    for (let key in localStorage) {
      if (key.startsWith(`${scope}_`)) {
        localStorage.removeItem(key);
      }
    }
  }

  public storeUser(user: any): void {
    const encryptCurrentuser: string = this.encryptkey(JSON.stringify(user));
    localStorage.setItem(this.getScopedKey('currentUser'), encryptCurrentuser);

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
      //localStorage.clear();
      this.clearStorage();
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
    //localStorage.setItem('enLanguageContent', JSON.stringify(enLanguageContent));
    //localStorage.setItem('arLanguageContent', JSON.stringify(arLanguageContent));
    localStorage.setItem(this.getScopedKey('enLanguageContent'), JSON.stringify(enLanguageContent));
    localStorage.setItem(this.getScopedKey('arLanguageContent'), JSON.stringify(arLanguageContent));
  }

  public getAppLanguage(): Promise<any> {
    return new Promise((resolve, reject) => {
      const appLanguage = this.getData('appLanguage');
      if (appLanguage) {
        resolve(appLanguage);
      } else {
        localStorage.setItem(this.getScopedKey('appLanguage'), 'en');
        resolve('en');
      }
    });
  }

  public setAppLanguage(lang: any): Promise<any> {
    return new Promise(async (resolve, reject) => {
      localStorage.setItem(this.getScopedKey('appLanguage'), lang);
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

  removeDuplicateObjects(conditions: any[]) {
    const seen = new Set<string>();
    return conditions.filter((condition) => {
      // Handle primitive values or null/undefined
      if (typeof condition !== 'object' || condition === null) {
        const key = String(condition);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }
      // Handle objects by stringifying them
      const key = JSON.stringify(condition);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  removeDuplicateStringsOrNumbers(conditions: any[]) {
    return [...new Set(conditions)];
  }

  removeDuplicateData(conditions: any[]) {
    const seen = new Set<string>();
    return conditions.filter((condition) => !seen.has(JSON.stringify(condition)) && seen.add(JSON.stringify(condition)));
  }

  formatPayloadWithPolicyConditions(payload: any, data: any, attachedPolicies: any[]) {
    if (!data || !attachedPolicies.length) return payload;

    for (let policy of attachedPolicies) {
      if (!data[policy]) continue;
      const fields = ['includes', 'search_all', 'search_any', 'having_any_conditions', 'having_conditions', 'group_by', 'sort_columns', 'filtered_columns'];

      for (const field of fields) {
        if (data[policy]?.query_information[field]) {
          payload[field] = [...(payload[field] || []), ...data[policy]?.query_information[field]];
        }
      }
    }
    const objectFields = ['includes', 'search_all', 'search_any', 'having_any_conditions', 'having_conditions', 'filtered_columns'];
    objectFields.forEach((field) => (payload[field] &&= this.removeDuplicateObjects(payload[field])));

    if (payload.group_by) {
      payload.group_by = this.removeDuplicateStringsOrNumbers(payload.group_by);
    }
    if (payload.sort_columns) {
      payload.sort_columns = this.removeDuplicateData(payload.sort_columns);
    }
    return payload;
  }

  formatEnumColumnFilters(payload: any, data: any) {
    if (!data) return payload;
    const fields = ['includes', 'search_all', 'search_any', 'having_any_conditions', 'having_conditions', 'group_by', 'sort_columns', 'filtered_columns'];

    for (const field of fields) {
      if (data[field]) payload[field] = [...(payload[field] || []), ...data[field]];
    }
    const objectFields = ['includes', 'search_all', 'search_any', 'having_any_conditions', 'having_conditions', 'filtered_columns'];
    objectFields.forEach((field) => (payload[field] &&= this.removeDuplicateObjects(payload[field])));

    if (payload.group_by) {
      payload.group_by = this.removeDuplicateStringsOrNumbers(payload.group_by);
    }
    if (payload.sort_columns) {
      payload.sort_columns = this.removeDuplicateData(payload.sort_columns);
    }

    return payload;
  }
}
