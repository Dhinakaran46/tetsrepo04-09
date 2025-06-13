import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class HttpService {
  user: any;
  headers: any;
  constructor(private http: HttpClient) {}

  post(url: string, body: any, options?: any): Promise<any> {
    return this.http.post(url, body, { headers: options }).toPromise();
  }

  get(url: string, options?: any): Promise<any> {
    return this.http.get(url, { headers: options }).toPromise();
  }
  put(url: string, body: any, options?: any): Promise<any> {
    return this.http.put(url, body, { headers: options }).toPromise();
  }
  delete(url: string, options?: any): Promise<any> {
    return this.http.delete(url, { headers: options }).toPromise();
  }
  patch(url: string, body: any, options?: any): Promise<any> {
    return this.http.patch(url, body, { headers: options }).toPromise();
  }
  request(url: string): Promise<any> {
    return this.http
      .get(url, {
        responseType: 'blob',
        reportProgress: true,
        observe: 'events',
      })
      .toPromise();
  }

  getLanguageContent(lang: string = 'en'): Promise<any> {
    // Load the Arabic translation file
    return this.http.get(`../../../assets/i18n/${lang}.json`).toPromise();
  }
}
