import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { commonConfig } from '../../config/common.config';
import { environment } from '../../../../environments/environment';
import { HttpService } from './http.service';
import { LocalStorageService } from './local-storage.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(private http: HttpClient, private localstore: LocalStorageService) {}

  login(credentials: { email: string; password: string }): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}${environment.apiAddress}${commonConfig.API.login}`, credentials);
  }

  logout(): Observable<any> {
    const authToken = this.localstore.getData('user_data') && JSON.parse(this.localstore.getData('user_data')).main.token;
    const headers = new HttpHeaders({
      Authorization: 'Bearer ' + authToken,
      Accept: 'application/json',
    });

    return this.http.get<any>(`${environment.apiUrl}${environment.apiAddress}${commonConfig.API.logout}`, { headers });
  }

  languageList(data: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}${environment.apiAddress}${commonConfig.API.getLanguageContent}`, data);
  }
}
