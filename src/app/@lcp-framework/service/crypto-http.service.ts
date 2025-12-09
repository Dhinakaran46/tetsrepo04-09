import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EncryptionService } from './encryption.service';

// Define specific option types
type HttpBodyOptions = {
  headers?: HttpHeaders | { [header: string]: string | string[] | any };
  params?: HttpParams | { [param: string]: string | string[] };
  reportProgress?: boolean;
  responseType?: any;
  withCredentials?: boolean;
  observe: any;
};

type HttpEventOptions = HttpBodyOptions & { observe: 'events' };
type HttpResponseOptions = HttpBodyOptions & { observe: 'response' };

@Injectable({
  providedIn: 'root',
})
export class CryptoHttpService {
  private encPayload: boolean;

  constructor(private http: HttpClient, private encryptService: EncryptionService) {
    // Check if encryption is enabled from the configuration
    const conf: any = JSON.parse(this.getData('config'));
    this.encPayload = conf?.encrypt_payload === 'true'; // Set `encPayload` to true or false
  }

  private getScopedKey(key: string): string {
    const scope = (window.location.port || window.location.hostname + '' + window.location.pathname).replace('/', '-');
    return `${scope}_${key}`;
  }

  public getData(key: string): any {
    const conf: any = localStorage.getItem(this.getScopedKey('config'));
    const config: any = JSON.parse(conf);

    if (localStorage.getItem(this.getScopedKey('user_data')) && key === 'user_data' && config?.encrypt_local_storage === 'true') {
      return this.getDataDecrypted(key);
    }

    return localStorage.getItem(this.getScopedKey(key));
  }

  public storeData(key: string, value: string | any): void {
    localStorage.setItem(this.getScopedKey(key), value);
  }

  public getDataDecrypted(key: string): any {
    const value: any = localStorage.getItem(this.getScopedKey(key));
    const bytes = CryptoJS.AES.decrypt(value, key);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  // Main methods - always return body
  encryptedPost<T>(url: string, body: any, options?: HttpBodyOptions): Observable<T> {
    // Encrypt the body only if encPayload is true
    // Don't encrypt if it's FormData (e.g., file uploads)
    if (body instanceof FormData || !this.encPayload) {
      return this.http.post<T>(url, body, {
        ...options,
        headers: new HttpHeaders(),
      });
    }

    const encryptedBody = this.encPayload ? { payload: this.encryptService.encrypt(body) } : body;
    return this.http.post<T>(url, encryptedBody, options);
  }

  encryptedPut<T>(url: string, body: any, options?: HttpBodyOptions): Observable<T> {
    const encryptedBody = this.encPayload ? { payload: this.encryptService.encrypt(body) } : body;
    return this.http.put<T>(url, encryptedBody, options);
  }

  encryptedPatch<T>(url: string, body: any, options?: HttpBodyOptions): Observable<T> {
    const encryptedBody = this.encPayload ? { payload: this.encryptService.encrypt(body) } : body;
    return this.http.patch<T>(url, encryptedBody, options);
  }

  encryptedGet<T>(url: string, options?: HttpBodyOptions): Observable<T> {
    return this.http.get<T>(url, options);
  }

  encryptedGetAlone<T>(url: string): Observable<T> {
    return this.http.get<T>(url);
  }

  encryptedDelete<T>(url: string, options?: HttpBodyOptions): Observable<T> {
    return this.http.delete<T>(url, options);
  }

  // Specialized methods for events
  encryptedPostEvents<T>(url: string, body: any, options?: HttpBodyOptions): Observable<HttpEvent<T>> {
    const encryptedBody = this.encPayload ? { payload: this.encryptService.encrypt(body) } : body;
    return this.http.post<T>(url, encryptedBody, { ...options, observe: 'events' });
  }

  encryptedGetEvents<T>(url: string, options?: HttpBodyOptions): Observable<HttpEvent<T>> {
    return this.http.get<T>(url, { ...options, observe: 'events' });
  }

  // Specialized methods for full response
  encryptedPostResponse<T>(url: string, body: any, options?: HttpBodyOptions): Observable<HttpResponse<T>> {
    const encryptedBody = this.encPayload ? { payload: this.encryptService.encrypt(body) } : body;
    return this.http.post<T>(url, encryptedBody, { ...options, observe: 'response' });
  }

  encryptedGetResponse<T>(url: string, options?: HttpBodyOptions): Observable<HttpResponse<T>> {
    return this.http.get<T>(url, { ...options, observe: 'response' });
  }

  // Generic method with proper overloads (advanced usage)
  request<T>(method: 'POST' | 'PUT' | 'PATCH', url: string, body: any, options: HttpEventOptions): Observable<HttpEvent<T>>;
  request<T>(method: 'POST' | 'PUT' | 'PATCH', url: string, body: any, options: HttpResponseOptions): Observable<HttpResponse<T>>;
  request<T>(method: 'POST' | 'PUT' | 'PATCH', url: string, body: any, options?: HttpBodyOptions): Observable<T>;
  request<T>(method: 'GET' | 'DELETE', url: string, body: null, options: HttpEventOptions): Observable<HttpEvent<T>>;
  request<T>(method: 'GET' | 'DELETE', url: string, body: null, options: HttpResponseOptions): Observable<HttpResponse<T>>;
  request<T>(method: 'GET' | 'DELETE', url: string, body?: null, options?: HttpBodyOptions): Observable<T>;
  request<T>(method: 'POST' | 'PUT' | 'PATCH' | 'GET' | 'DELETE', url: string, body?: any, options?: any): Observable<T | HttpEvent<T> | HttpResponse<T>> {
    const hasBody = ['POST', 'PUT', 'PATCH'].includes(method);
    const requestBody = hasBody ? (this.encPayload ? { payload: this.encryptService.encrypt(body) } : body) : undefined;

    switch (method) {
      case 'POST':
        return options?.observe === 'events'
          ? this.http.post<T>(url, requestBody, options)
          : options?.observe === 'response'
          ? this.http.post<T>(url, requestBody, options)
          : this.http.post<T>(url, requestBody, options);
      case 'PUT':
        return options?.observe === 'events'
          ? this.http.put<T>(url, requestBody, options)
          : options?.observe === 'response'
          ? this.http.put<T>(url, requestBody, options)
          : this.http.put<T>(url, requestBody, options);
      case 'PATCH':
        return options?.observe === 'events'
          ? this.http.patch<T>(url, requestBody, options)
          : options?.observe === 'response'
          ? this.http.patch<T>(url, requestBody, options)
          : this.http.patch<T>(url, requestBody, options);
      case 'GET':
        return options?.observe === 'events'
          ? this.http.get<T>(url, options)
          : options?.observe === 'response'
          ? this.http.get<T>(url, options)
          : this.http.get<T>(url, options);
      case 'DELETE':
        return options?.observe === 'events'
          ? this.http.delete<T>(url, options)
          : options?.observe === 'response'
          ? this.http.delete<T>(url, options)
          : this.http.delete<T>(url, options);
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
  }
}
