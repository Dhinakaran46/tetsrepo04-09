import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { commonConfig } from '../../config/common.config';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class MenuMapService {
  constructor(private http: HttpClient) {}

  getAllMenus(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}${environment.apiAddress}${commonConfig.API.getAllMenu}`);
  }

  getCommonList(data: any) {
    return this.http.post<any>(`${environment.apiUrl}${environment.apiAddress}${commonConfig.API.getCommnList}`, data);
  }

  postCommnList(data: any) {
    return this.http.post<any>(`${environment.apiUrl}${environment.apiAddress}${commonConfig.API.postCommnList}`, data);
  }

  updatedDate(data: any) {
    return this.http.post<any>(`${environment.apiUrl}${environment.apiAddress}${commonConfig.API.updatedData}`, data);
  }

  procedureCall(data: any) {
    return this.http.post<any>(`${environment.apiUrl}${environment.apiAddress}${commonConfig.API.procedureCall}${data.proc_name}`, data.params);
  }
}
