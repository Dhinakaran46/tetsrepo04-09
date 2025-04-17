import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { commonConfig } from '../../config/common.config';
export interface ApiResponce {
  code: number;
  status: boolean;
  message: string;
  data?: any;
}

export interface IAiQuery {
  prompt: string;
}

export interface IGenerateVectorForTable {
  uuid: string;
}

@Injectable({
  providedIn: 'root',
})
export class OpenaiService {
  constructor(private http: HttpClient) {}

  syncTableSchema(): Observable<ApiResponce> {
    return this.http.get<ApiResponce>(`${environment.apiUrl}${environment.apiAddress}${commonConfig.API.syncTableSchema}`);
  }

  generateAiQuery(data: IAiQuery): Observable<ApiResponce> {
    return this.http.post<ApiResponce>(`${environment.apiUrl}${environment.apiAddress}${commonConfig.API.generateAiQuery}`, data);
  }

  getResultFromQuery(data: any): Observable<ApiResponce> {
    return this.http.post<ApiResponce>(`${environment.apiUrl}${environment.apiAddress}${commonConfig.API.getResultFromQuery}`, data);
  }

  generateVectorForTable(data: IGenerateVectorForTable): Observable<ApiResponce> {
    return this.http.post<ApiResponce>(`${environment.apiUrl}${environment.apiAddress}${commonConfig.API.generateVectorForTable}`, data);
  }

  generateVectorForAllTable(): Observable<ApiResponce> {
    return this.http.get<ApiResponce>(`${environment.apiUrl}${environment.apiAddress}${commonConfig.API.generateVector}`);
  }
}
