import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CryptoHttpService } from '../crypto-http.service';

export interface UserCompanyMapUser {
  id: number;
  tenant_id: number;
  username: string;
  email: string;
  first_name: string;
  last_name?: string;
  full_name: string;
  role: string;
  mapped_company_count: number;
}

export interface UserCompanyRoleOption {
  id: number;
  name: string;
}

export interface UserCompanyMapCompany {
  company_id: number;
  name: string;
  code: string;
  tenant_id: number;
  is_primary: boolean;
  mapped: boolean;
  membership_user_id?: number | null;
  roles: UserCompanyRoleOption[];
  selected_role_ids: number[];
}

export interface SaveUserCompanyMapPayload {
  mappings: Array<{
    company_id: number;
    role_ids: number[];
  }>;
}

@Injectable({
  providedIn: 'root',
})
export class UserCompanyMapService {
  private readonly endpoint = 'user-company-map/users';

  private get apiUrl() {
    return localStorage.getItem('lcp_api_base_url') || environment.apiUrl;
  }

  private get baseUrl() {
    return `${this.apiUrl}${environment.apiAddress}${this.endpoint}`;
  }

  constructor(private cryptoHttp: CryptoHttpService) {}

  getUsers(): Observable<any> {
    return this.cryptoHttp.encryptedGet<any>(this.baseUrl);
  }

  getCompanies(tenantUserId: number): Observable<any> {
    return this.cryptoHttp.encryptedGet<any>(
      `${this.baseUrl}/${tenantUserId}/companies`,
    );
  }

  saveCompanies(tenantUserId: number, payload: SaveUserCompanyMapPayload): Observable<any> {
    return this.cryptoHttp.encryptedPost<any>(
      `${this.baseUrl}/${tenantUserId}/companies`,
      payload,
    );
  }
}
