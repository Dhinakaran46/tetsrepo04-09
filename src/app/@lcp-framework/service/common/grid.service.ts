import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { commonConfig } from '../../config/common.config';

export interface ApiResponce {
  code: number;
  status: boolean;
  message: string;
  data?: any;
}

@Injectable({
  providedIn: 'root',
})
export class GridApiService {
  constructor(private http: HttpClient) {}

  getAllList(data: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}${environment.apiAddress}${commonConfig.API.listdata}`, data);
  }

  getAllColumns(data: any): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}${environment.apiAddress}${commonConfig.API.commongriddata}/${data.entity_name}`);
  }

  updateUserProfile(formData: any): Observable<any> {
    return this.http.put<any>(`${environment.apiUrl}${environment.apiAddress}${commonConfig.API.updateprofile}`, formData);
  }

  getAllRecords(data: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}${environment.apiAddress}${commonConfig.API.commongriddata}`, data);
  }

  getListData(data: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}${environment.apiAddress}${commonConfig.API.commonlistdata}`, data);
  }

  getImportTemplateDetail(data: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}${environment.apiAddress}${commonConfig.API.importtemplatedetails}`, data);
  }

  getImportTemplateData(data: any, template_uuid: string, file_uuid: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}${environment.apiAddress}${commonConfig.API.importtemplatevalidate}${template_uuid}/${file_uuid}`, data);
  }

  executeTransaction(data: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}${environment.apiAddress}${commonConfig.API.commonexecutetransaction}`, data);
  }

  executeRecords(data: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}${environment.apiAddress}${commonConfig.API.executeRecords}`, data);
  }

  getAllTables(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}${environment.apiAddress}${commonConfig.API.getTablesList}`);
  }

  uploadImageAndGetName(data: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}${environment.apiAddress}${commonConfig.API.uploadImageAndGetName}`, data, {
      reportProgress: true,
      observe: 'events',
    });
  }

  deleteImageByName(data: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}${environment.apiAddress}${commonConfig.API.deleteImageByName}`, data);
  }
}
