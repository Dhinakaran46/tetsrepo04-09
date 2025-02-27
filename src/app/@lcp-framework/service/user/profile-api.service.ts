import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { commonConfig } from '../../config/common.config';

@Injectable({
  providedIn: 'root',
})
export class ProfileApiService {
  constructor(private http: HttpClient) {}

  getUserProfile(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}${environment.apiAddress}${commonConfig.API.getallprofile}`);
  }

  uploadProfilePicture(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('profile_pic', file, file.name);

    return this.http.put(`${environment.apiUrl}${environment.apiAddress}${commonConfig.API.updateprofileimage}`, formData, {
      reportProgress: true,
      observe: 'events',
    });
  }

  updateUserProfile(formData: any): Observable<any> {
    return this.http.put<any>(`${environment.apiUrl}${environment.apiAddress}${commonConfig.API.updateprofile}`, formData);
  }

  changePassword(data: { old_password: string; new_password: string }): Observable<any> {
    return this.http.post(`${environment.apiUrl}${environment.apiAddress}${commonConfig.API.updateprofilepwd}`, data);
  }
  resetPasswordAnyUser(data: { uuid: any; password: string }): Observable<any> {
    return this.http.post(`${environment.apiUrl}${environment.apiAddress}${commonConfig.API.resetuserpwd}`, data);
  }

  forgetPasswordMail(data: any): Observable<any> {
    return this.http.get(`${environment.apiUrl}${environment.apiAddress}${commonConfig.API.forgetpasswordEmail}${data}`);
  }

  resetPasswordMail(data: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}${environment.apiAddress}${commonConfig.API.resetpasswordEmail}`, data);
  }
}
