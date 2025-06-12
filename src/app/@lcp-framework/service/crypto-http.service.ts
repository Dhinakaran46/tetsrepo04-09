// crypto-http.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EncryptionService } from './encryption.service';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class CryptoHttpService {
  constructor(private http: HttpClient, private encryptService: EncryptionService) {}

  encryptedPost<T>(url: string, body: any): Observable<T> {
    const encryptedBody = { payload: this.encryptService.encrypt(body) };
    return this.http.post<T>(url, encryptedBody);
  }

  encryptedPut<T>(url: string, body: any, options?: any): Observable<HttpEvent<T>> {
    const encryptedBody = { payload: this.encryptService.encrypt(body) };
    return this.http.put<T>(url, encryptedBody, options);
  }

  encryptedGet<T>(url: string): Observable<T> {
    return this.http.get<T>(url);
  }

  encryptedDelete<T>(url: string): Observable<T> {
    return this.http.delete<T>(url);
  }
}
