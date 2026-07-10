import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { commonConfig } from '../../config/common.config';
import { Observable } from 'rxjs';
import { CryptoHttpService } from '../crypto-http.service';
import * as CryptoJS from 'crypto-js';

@Injectable({
  providedIn: 'root',
})
export class MenuMapService {
  private get apiUrl() {
    return localStorage.getItem('lcp_api_base_url') || environment.apiUrl;
  }
  constructor(private http: HttpClient, private cryptoHttp: CryptoHttpService) {}

  private getScopedKey(key: string): string {
    const scope = (window.location.hostname.replace('/', '') + '_' + (window.location.port || window.location.pathname)).replace('/', '');
    return `${scope}_${key}`;
  }

  private parseJsonSafe(value: any, fallback: any = null): any {
    try {
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  private readUserData(): any {
    const rawValue = localStorage.getItem(this.getScopedKey('user_data'));
    if (!rawValue) return null;

    const rawJson = this.parseJsonSafe(rawValue);
    if (rawJson) return rawJson;

    try {
      const decrypted = CryptoJS.AES.decrypt(rawValue, 'user_data').toString(CryptoJS.enc.Utf8);
      return this.parseJsonSafe(decrypted);
    } catch {
      return null;
    }
  }

  private getActiveCompanyId(): number {
    const selectedCompanyId = Number(localStorage.getItem(this.getScopedKey('selected_company_id')) || 0);
    if (selectedCompanyId) return selectedCompanyId;

    const userData = this.readUserData();
    return Number(
      userData?.main?.company_id ||
        userData?.company?.id ||
        userData?.main?.company?.id ||
        userData?.main?.selected_company_id ||
        0,
    );
  }

  private withActiveCompany(data: any): any {
    if (!data || typeof data !== 'object' || data instanceof FormData) return data;

    const activeCompanyId = this.getActiveCompanyId();
    if (!activeCompanyId) return data;

    const payloadCompanyId = Number(data.company_id || 0);
    if (payloadCompanyId === 0 && Object.prototype.hasOwnProperty.call(data, 'company_id')) {
      return data;
    }

    if (!payloadCompanyId || payloadCompanyId === 1) {
      return {
        ...data,
        company_id: activeCompanyId,
      };
    }

    return data;
  }

  getAllMenus(): Observable<any> {
    return this.cryptoHttp.encryptedGet<any>(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.getAllMenu}`);
  }

  getCommonList(data: any) {
    return this.cryptoHttp.encryptedPost<any>(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.getCommnList}`, this.withActiveCompany(data));
  }
  getCommnListConfiguration(data: any) {
    return this.cryptoHttp.encryptedPost<any>(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.getCommnListConfiguration}`, this.withActiveCompany(data));
  }

  postCommnList(data: any) {
    return this.cryptoHttp.encryptedPost<any>(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.postCommnList}`, this.withActiveCompany(data));
  }

  executeRecords(data: any) {
    return this.cryptoHttp.encryptedPost(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.executeRecords}`, this.withActiveCompany(data));
  }

  procedureCall(data: any) {
    return this.cryptoHttp.encryptedPost<any>(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.procedureCall}${data.proc_name}`, this.withActiveCompany(data.params));
  }

  getAllListConfiguration(data: any): Observable<any> {
    return this.cryptoHttp.encryptedPost(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.listdataconfig}`, this.withActiveCompany(data));
  }

  unAuthProcedureCall(data: any) {
    return this.cryptoHttp.encryptedPost<any>(
      `${this.apiUrl}${environment.apiAddress}${commonConfig.API.unauthprocedureCall}${data.proc_name}`,
      data.params
    );
  }

  getThemeInfo(data: any){
    return this.cryptoHttp.encryptedPost<any>(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.getThemeInfo}`, data);
  }
}
