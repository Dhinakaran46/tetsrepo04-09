import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { commonConfig } from '../../config/common.config';
import { CryptoHttpService } from '../crypto-http.service';

@Injectable({
  providedIn: 'root',
})
export class ProfileApiService {
  private get apiUrl() {
    return localStorage.getItem('lcp_api_base_url') || environment.apiUrl;
  }
  constructor(private http: HttpClient, private cryptoHttp: CryptoHttpService) { }

  getUserProfile(): Observable<any> {
    return this.cryptoHttp.encryptedGet<any>(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.getallprofile}`);
  }

  uploadProfilePicture(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('profile_pic', file, file.name);

    return this.cryptoHttp.encryptedPut(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.updateprofileimage}`, formData, {
      reportProgress: true,
      observe: 'events',
    });
  }

  updateUserProfile(formData: any): Observable<any> {
    return this.cryptoHttp.encryptedPut<any>(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.updateprofile}`, formData);
  }

  changePassword(data: { old_password: string; new_password: string }): Observable<any> {
    return this.cryptoHttp.encryptedPost(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.updateprofilepwd}`, data);
  }
  resetPasswordAnyUser(data: { uuid: any; password: string }): Observable<any> {
    return this.cryptoHttp.encryptedPost(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.resetuserpwd}`, data);
  }

  forgetPasswordMail(data: any): Observable<any> {
    return this.cryptoHttp.encryptedGet(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.forgetpasswordEmail}${data}`);
  }

  resetPasswordMail(data: any): Observable<any> {
    return this.cryptoHttp.encryptedPost(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.resetpasswordEmail}`, data);
  }

  validateDateRange(data: any): Observable<any> {
    return this.cryptoHttp.encryptedPost(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.validate_date_range}`, data);
  }
}
