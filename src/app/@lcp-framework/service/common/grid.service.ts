import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { commonConfig } from '../../config/common.config';
import { map, catchError } from 'rxjs/operators';
import { CryptoHttpService } from '../crypto-http.service';
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

  getAllList(data: any): Observable<any> {
    return this.cryptoHttp.encryptedPost(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.listdata}`, data);
  }

  getAllUnAuthList(data: any): Observable<any> {
    return this.cryptoHttp.encryptedPost(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.unauthcommonlistdata}`, data);
  }

  getAllColumns(data: any): Observable<any> {
    return this.cryptoHttp.encryptedGet<any>(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.commongriddata}/${data.entity_name}`);
  }

  updateUserProfile(formData: any): Observable<any> {
    return this.cryptoHttp.encryptedPut<any>(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.updateprofile}`, formData);
  }

  getAllRecords(data: any): Observable<any> {
    return this.cryptoHttp.encryptedPost(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.commongriddata}`, data);
  }

  exportIndividualRecords(menuItemId: any, id: any, filter:any): Observable<ExportResponse> {
    return this.http
      .post(
        `${this.apiUrl}${environment.apiAddress}${commonConfig.API.commonindividualdataexport}`,
        { id: id, menu_item_id: menuItemId, filter:filter },
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
  exportAllRecords(menuItemId: any,filter:any): Observable<ExportResponse> {
    return this.cryptoHttp
      .encryptedPost(
        `${this.apiUrl}${environment.apiAddress}${commonConfig.API.commongriddataexport}`,
        { menu_item_id: menuItemId,filter:filter },
        {
          responseType: 'blob',
          observe: 'response',
        }
      )
      .pipe(
        map((response: any) => {
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

  getListData(data: any): Observable<any> {
    return this.cryptoHttp.encryptedPost(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.commonlistdata}`, data);
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
    return this.cryptoHttp.encryptedPost(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.commonexecutetransaction}`, data);
  }

  executeRecords(data: any): Observable<any> {
    return this.cryptoHttp.encryptedPost(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.executeRecords}`, data);
  }

  executeRecordsCase(data: any): Observable<any> {
    return this.cryptoHttp.encryptedPost(`${this.apiUrl}${environment.apiAddress}${commonConfig.API.executeRecordsCase}`, data);
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
}
