import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { from, Observable, of, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { commonConfig } from '../../config/common.config';
import { map, catchError, switchMap } from 'rxjs/operators';
import { CryptoHttpService } from '../crypto-http.service';
import * as CryptoJS from 'crypto-js';
export interface ApiResponce {
  code: number;
  status: boolean;
  message: string;
  data?: any;
}

interface ExportResponse {
  blob: Blob;
  fileName: string;
}

@Injectable({
  providedIn: 'root',
})
export class GridApiService {
  private get apiUrl() {
    return localStorage.getItem('lcp_api_base_url') || environment.apiUrl;
  }
  constructor(private http: HttpClient, private cryptoHttp: CryptoHttpService) {}

  private getScopedKey(key: string): string {
    const scope = (window.location.hostname.replace('/', '') + '_' + (window.location.port || window.location.pathname)).replace('/', '');
    return `${scope}_${key}`;
  }

  private parseJsonSafe(value: any, fallback: any = null): any {
    try {
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  private readUserData(): any {
    const rawValue = localStorage.getItem(this.getScopedKey('user_data'));
    if (!rawValue) return null;

    const rawJson = this.parseJsonSafe(rawValue);
    if (rawJson) return rawJson;

    try {
      const decrypted = CryptoJS.AES.decrypt(rawValue, 'user_data').toString(CryptoJS.enc.Utf8);
      return this.parseJsonSafe(decrypted);
    } catch {
      return null;
    }
  }

  private getActiveCompanyId(): number {
    const selectedCompanyId = Number(localStorage.getItem(this.getScopedKey('selected_company_id')) || 0);
    if (selectedCompanyId) return selectedCompanyId;

    const userData = this.readUserData();
    return Number(
      userData?.main?.company_id ||
        userData?.company?.id ||
        userData?.main?.company?.id ||
        userData?.main?.selected_company_id ||
        0,
    );
  }

  private withActiveCompany(data: any): any {
    if (!data || typeof data !== 'object' || data instanceof FormData) return data;

    const activeCompanyId = this.getActiveCompanyId();
    if (!activeCompanyId) return data;

    const payloadCompanyId = Number(data.company_id || 0);
    if (payloadCompanyId === 0 && Object.prototype.hasOwnProperty.call(data, 'company_id')) {
      return data;
    }

    if (!payloadCompanyId || payloadCompanyId === 1) {
      return {
        ...data,
        company_id: activeCompanyId,
      };
    }

    return data;
  }

  processImportJob(uuid: any): Observable<any> {
    return this.cryptoHttp.encryptedGet<any>(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.processImportJob}/${uuid}`);
  }

  getAllList(data: any): Observable<any> {
    return this.cryptoHttp.encryptedPost(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.listdata}`, this.withActiveCompany(data));
  }

  getAllListConfiguration(data: any): Observable<any> {
    return this.cryptoHttp.encryptedPost(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.listdataconfig}`, this.withActiveCompany(data));
  }

  getAllUnAuthList(data: any): Observable<any> {
    return this.cryptoHttp.encryptedPost(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.unauthcommonlistdata}`, data);
  }

  getLovValues(data: any): Observable<any> {
    return this.cryptoHttp.encryptedPost(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.tenantRegistrationLovValues}`, data);
  }

  createTenantRegistration(data: FormData): Observable<any> {
    return this.cryptoHttp.encryptedPost(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.tenantRegistrationRegister}`, data);
  }

  getAllColumns(data: any): Observable<any> {
    return this.cryptoHttp.encryptedGet<any>(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.commongriddata}/${data.entity_name}`);
  }

  updateUserProfile(formData: any): Observable<any> {
    return this.cryptoHttp.encryptedPut<any>(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.updateprofile}`, formData);
  }

  getAllRecords(data: any): Observable<any> {
    return this.cryptoHttp.encryptedPost(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.commongriddata}`, this.withActiveCompany(data));
  }

  exportIndividualRecordsAlone(menuItemId: any, item: any): Observable<ExportResponse> {
    return this.http
      .post(
        `${this.apiUrl}${environment.apiAddress}${commonConfig.API.commonindividualdataexportalone}`,
        { grid_params: item, menu_item_id: menuItemId },
        {
          responseType: 'blob',
          observe: 'response',
        }
      )
      .pipe(
        map((response) => {
          if (!response.body) {
            throw new Error('No data received from server');
          }

          const blob = response.body; // response.body is already a Blob due to responseType: 'blob'
          const contentDisposition = response.headers.get('Content-Disposition');
          const fileName = contentDisposition ? contentDisposition.split('filename=')[1].replace(/"/g, '') : `export_excel_${new Date().getTime()}.xlsx`;

          return {
            blob, // This is guaranteed to be a Blob
            fileName,
          } as ExportResponse;
        }),
        catchError((error) => {
          console.error('Export error:', error);
          throw error;
        })
      );
  }

  exportIndividualRecords(menuItemId: any, id: any, filter: any): Observable<ExportResponse> {
    return this.http
      .post(
        `${this.apiUrl}${environment.apiAddress}${commonConfig.API.commonindividualdataexport}`,
        { id: id, menu_item_id: menuItemId, filter: filter },
        {
          responseType: 'blob',
          observe: 'response',
        }
      )
      .pipe(
        map((response) => {
          if (!response.body) {
            throw new Error('No data received from server');
          }

          const blob = response.body; // response.body is already a Blob due to responseType: 'blob'
          const contentDisposition = response.headers.get('Content-Disposition');
          const fileName = contentDisposition ? contentDisposition.split('filename=')[1].replace(/"/g, '') : `export_excel_${new Date().getTime()}.xlsx`;

          return {
            blob, // This is guaranteed to be a Blob
            fileName,
          } as ExportResponse;
        }),
        catchError((error) => {
          console.error('Export error:', error);
          throw error;
        })
      );
  }
  // grid.service.ts
  exportAllRecords(menuItemId: any, filter: any): Observable<ExportResponse> {
    return this.cryptoHttp
      .encryptedPost(
        `${this.apiUrl}${environment.apiAddress}${commonConfig.API.commongriddataexport}`,
        { menu_item_id: menuItemId, filter },
        { responseType: 'blob', observe: 'response' }
      )
      .pipe(
        map((response: any) => {
          if (!response.body) {
            throw new Error('No data received from server');
          }
          const contentType = response.headers.get('Content-Type') || '';
          if (contentType.includes('application/json')) {
            throw new Error('Server returned JSON instead of file.');
          }

          const blob = response.body; // Use directly
          const contentDisposition = response.headers.get('Content-Disposition');
          const fileName = contentDisposition
            ? contentDisposition.split('filename=')[1].replace(/"/g, '')
            : `export_${Date.now()}.${contentType.includes('pdf') ? 'pdf' : 'xlsx'}`;

          return { blob, fileName } as ExportResponse;
        }),
        catchError((error) => {
          console.error('Export error:', error);
          throw error;
        })
      );
  }

  getListData(data: any): Observable<any> {
    return this.cryptoHttp.encryptedPost(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.commonlistdata}`, this.withActiveCompany(data));
  }

  getImportTemplateDetail(data: any): Observable<any> {
    return this.cryptoHttp.encryptedPost(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.importtemplatedetails}`, data);
  }
  getImportTemplateDataScheduled(data: any, template_uuid: string, file_uuid: string): Observable<any> {
    return this.cryptoHttp.encryptedPost(
      `${this.apiUrl}${environment.apiAddress}${commonConfig.API.importtemplatevalidatescheduled}${template_uuid}/${file_uuid}`,
      data
    );
  }

  getImportTemplateData(data: any, template_uuid: string, file_uuid: string): Observable<any> {
    return this.cryptoHttp.encryptedPost(
      `${this.apiUrl}${environment.apiAddress}${commonConfig.API.importtemplatevalidate}${template_uuid}/${file_uuid}`,
      data
    );
  }

  executeTransaction(data: any): Observable<any> {
    return this.cryptoHttp.encryptedPost(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.commonexecutetransaction}`, this.withActiveCompany(data));
  }

  executeRecords(data: any): Observable<any> {
    return this.cryptoHttp.encryptedPost(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.executeRecords}`, this.withActiveCompany(data));
  }

  executeRecordsConfig(data: any): Observable<any> {
    return this.cryptoHttp.encryptedPost(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.executeRecordsConfig}`, this.withActiveCompany(data));
  }

  executeRecordsCase(data: any): Observable<any> {
    return this.cryptoHttp.encryptedPost(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.executeRecordsCase}`, this.withActiveCompany(data));
  }

  getAllTables(): Observable<any> {
    return this.cryptoHttp.encryptedGet<any>(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.getTablesList}`);
  }

  uploadImageAndGetName(data: any): Observable<any> {
    return this.cryptoHttp.encryptedPost(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.uploadImageAndGetName}`, data, {
      reportProgress: true,
      observe: 'events',
    });
  }

  deleteImageByName(data: any): Observable<any> {
    return this.cryptoHttp.encryptedPost(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.deleteImageByName}`, data);
  }

  uploadConfigPicture(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('pic', file, file.name);

    return this.cryptoHttp.encryptedPut(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.configpicture}`, formData, {
      reportProgress: true,
      observe: 'events',
    });
  }

  getExcelHeaders(data: any): Observable<any> {
    return this.cryptoHttp.encryptedPost(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.getExcelHeaders}`, data);
  }
  uploadExcelFile(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('exportfile', file, file.name);

    return this.cryptoHttp.encryptedPut(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.excelUpdate}`, formData, {
      reportProgress: true,
      observe: 'events',
    });
  }

  deleteFileByUuid(uuid: any): Observable<any> {
    return this.cryptoHttp.encryptedDelete(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.importtemplatedeletefile}/${uuid}`);
  }

  importTemplateDetail(template_uuid: any, file_uuid: any, data: any): Observable<any> {
    return this.cryptoHttp.encryptedPut(
      `${this.apiUrl}${environment.apiAddress}${commonConfig.API.importtemplateuploaddata}/${template_uuid}/${file_uuid}`,
      data
    );
  }

  getIndividualImportFields(uuid: any): Observable<any> {
    return this.cryptoHttp.encryptedGet(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.importtemplatedetails}/${uuid}`);
  }

  getAttachedPolicies(data: any): Observable<any> {
    return this.cryptoHttp.encryptedGet<any>(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.attachedpolicies}/${data.entity_name}`);
  }

  createCronJobs(data: any): Observable<any> {
    return this.cryptoHttp.encryptedPost<any>(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.create_cron_jobs}`, data);
  }
  getCronJobs(): Observable<any> {
    return this.cryptoHttp.encryptedGet<any>(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.get_cron_jobs}`);
  }

  stopCronJobs(): Observable<any> {
    return this.cryptoHttp.encryptedGet<any>(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.stop_cron_jobs}`);
  }

  stopCronJob(id: number): Observable<any> {
    return this.cryptoHttp.encryptedGet<any>(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.stop_cron_job}/${id}`);
  }

  startCronJob(id: number): Observable<any> {
    return this.cryptoHttp.encryptedGet<any>(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.start_cron_job}/${id}`);
  }

  restartCronJobs(): Observable<any> {
    return this.cryptoHttp.encryptedGet<any>(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.restart_cron_jobs}`);
  }

  editCronJob(id: number, postData: any): Observable<any> {
    return this.cryptoHttp.encryptedPut<any>(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.edit_cron_job}/${id}`, postData);
  }

  deleteCronJob(id: number): Observable<any> {
    return this.cryptoHttp.encryptedDelete<any>(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.delete_cron_jobs}/${id}`);
  }

  executeChildProcess(id: number): Observable<any> {
    return this.cryptoHttp.encryptedPost<any>(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.execute_child_process}/${id}`, {});
  }

  getEntityDetails(entity_name: string): Observable<any> {
    return this.cryptoHttp.encryptedGet<any>(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.entitydetails}/${entity_name}`);
  }

  exportEntity(params: any, exportType: 'download' | 'save' = 'save'): Observable<ExportResponse | any> {
    if (exportType === 'download') {
      return this.cryptoHttp
        .encryptedPost<any>(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.migrate_entity_export}?export=true`, params, {
          responseType: 'blob',
          observe: 'response',
        })
        .pipe(
          switchMap((response: HttpResponse<Blob>): Observable<ExportResponse> => {
            if (!response.body) {
              return throwError(() => new Error('No file received'));
            }

            const contentType = response.headers.get('Content-Type');

            // 🔥 Handle JSON error inside blob
            if (contentType && contentType.includes('application/json')) {
              return from(response.body.text()).pipe(
                switchMap((text) => {
                  try {
                    const json = JSON.parse(text);
                    return throwError(() => new Error(json.message || 'Server error'));
                  } catch {
                    return throwError(() => new Error('Invalid error response from server'));
                  }
                })
              );
            }

            // ✅ Normal file response
            const blob = response.body;
            const contentDisposition = response.headers.get('Content-Disposition');

            let fileName = `entity-${Date.now()}.zip`;

            if (contentDisposition) {
              const match = contentDisposition.match(/filename="?([^"]+)"?/);
              if (match?.[1]) {
                fileName = match[1];
              }
            }

            return of({ blob, fileName });
          }),
          catchError((error) => {
            console.error('Export master entity error:', error);
            return throwError(() => error);
          })
        );
    } else {
      return this.cryptoHttp.encryptedPost<any>(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.migrate_entity_export}`, params);
    }
  }

  exportEntityAsZip(uuid: string): Observable<ExportResponse> {
    return this.cryptoHttp
      .encryptedGet<any>(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.migrate_master_entity}/${uuid}`, {
        responseType: 'blob',
        observe: 'response',
      })
      .pipe(
        switchMap((response: HttpResponse<Blob>): Observable<ExportResponse> => {
          if (!response.body) {
            return throwError(() => new Error('No file received'));
          }

          const contentType = response.headers.get('Content-Type');

          // 🔥 Handle JSON error inside blob
          if (contentType && contentType.includes('application/json')) {
            return from(response.body.text()).pipe(
              switchMap((text) => {
                try {
                  const json = JSON.parse(text);
                  return throwError(() => new Error(json.message || 'Server error'));
                } catch {
                  return throwError(() => new Error('Invalid error response from server'));
                }
              })
            );
          }

          // ✅ Normal file response
          const blob = response.body;
          const contentDisposition = response.headers.get('Content-Disposition');

          let fileName = `master-entity-${Date.now()}.zip`;

          if (contentDisposition) {
            const match = contentDisposition.match(/filename="?([^"]+)"?/);
            if (match?.[1]) {
              fileName = match[1];
            }
          }

          return of({ blob, fileName });
        }),
        catchError((error) => {
          console.error('Export master entity error:', error);
          return throwError(() => error);
        })
      );
  }

  importEntity(formData: FormData, preview: boolean = true): Observable<any> {
    if (preview) {
      return this.cryptoHttp.encryptedPost<any>(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.migrate_entity_import}?preview=true`, formData);
    } else {
      return this.cryptoHttp.encryptedPost<any>(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.migrate_entity_import}?preview=false`, formData, {
        reportProgress: true,
        observe: 'events',
      });
    }
  }
}
