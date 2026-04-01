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

export interface IGetResponseFromQuery {
  sql: string;
  is_query_tool?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class OpenaiService {
  private get apiUrl() {
    return localStorage.getItem('lcp_api_base_url') || environment.apiUrl;
  }
  constructor(private http: HttpClient) {}

  syncTableSchema(): Observable<ApiResponce> {
    return this.http.get<ApiResponce>(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.syncTableSchema}`);
  }

  generateAiQuery(data: IAiQuery): Observable<ApiResponce> {
    return this.http.post<ApiResponce>(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.generateAiQuery}`, data);
  }

  getResultFromQuery(data: IGetResponseFromQuery): Observable<ApiResponce> {
    return this.http.post<ApiResponce>(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.getResultFromQuery}`, data);
  }

  generateVectorForTable(data: IGenerateVectorForTable): Observable<ApiResponce> {
    return this.http.post<ApiResponce>(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.generateVectorForTable}`, data);
  }

  generateVectorForAllTable(): Observable<ApiResponce> {
    return this.http.get<ApiResponce>(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.generateVector}`);
  }

  generateAiContent(data: any): Observable<ApiResponce> {
    return this.http.post<ApiResponce>(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.generateAiContent}`, data);
  }

  transcribeAudio(data: any): Observable<ApiResponce> {
    return this.http.post<ApiResponce>(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.transcribe_audio}`, data);
  }

  searchMenuTargetEmbeddings(data: any): Observable<ApiResponce> {
    return this.http.post<ApiResponce>(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.search_menu_target_embeddings}`, data);
  }

  generateMenuEmbeddings(data: any): Observable<ApiResponce> {
    return this.http.post<ApiResponce>(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.generate_menu_embeddings}`, data);
  }
}
