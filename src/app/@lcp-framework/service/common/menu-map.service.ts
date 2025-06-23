import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { commonConfig } from '../../config/common.config';
import { Observable } from 'rxjs';
import { CryptoHttpService } from '../crypto-http.service';

@Injectable({
  providedIn: 'root',
})
export class MenuMapService {
  constructor(private http: HttpClient, private cryptoHttp: CryptoHttpService) {}

  getAllMenus(): Observable<any> {
    return this.cryptoHttp.encryptedGet<any>(`${environment.apiUrl}${environment.apiAddress}${commonConfig.API.getAllMenu}`);
  }

  getCommonList(data: any) {
    return this.cryptoHttp.encryptedPost<any>(`${environment.apiUrl}${environment.apiAddress}${commonConfig.API.getCommnList}`, data);
  }

  postCommnList(data: any) {
    return this.cryptoHttp.encryptedPost<any>(`${environment.apiUrl}${environment.apiAddress}${commonConfig.API.postCommnList}`, data);
  }

  executeRecords(data: any) {
    return this.cryptoHttp.encryptedPost(`${environment.apiUrl}${environment.apiAddress}${commonConfig.API.executeRecords}`, data);
  }

  procedureCall(data: any) {
    return this.cryptoHttp.encryptedPost<any>(`${environment.apiUrl}${environment.apiAddress}${commonConfig.API.procedureCall}${data.proc_name}`, data.params);
  }

  unAuthProcedureCall(data: any) {
    return this.cryptoHttp.encryptedPost<any>(
      `${environment.apiUrl}${environment.apiAddress}${commonConfig.API.unauthprocedureCall}${data.proc_name}`,
      data.params
    );
  }
}
