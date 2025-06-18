import { Component, TemplateRef, ViewChild, AfterViewInit, ChangeDetectorRef, Input } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { animate, style, transition, trigger } from '@angular/animations';
import { ActivatedRoute, Router } from '@angular/router';

import { GridApiService } from '../../service/common/grid.service';
import { ToastrService } from 'ngx-toastr';
import { TranslateService } from '@ngx-translate/core';
import { CommonSharedModule } from '../../shared/common/common.module';
import { Store } from '@ngrx/store';
import Swal from 'sweetalert2';
import { ExportService } from '../../service/common/export.service';
import { commonConfig } from '../../config/common.config';
import { LocalStorageService } from '../../service/common/local-storage.service';
import { lastValueFrom } from 'rxjs';
import { MenuMapService } from '../../service/common/menu-map.service';
import { Title } from '@angular/platform-browser';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { LoaderComponent } from '../../components/loader/loader.component';
import { ProfileApiService } from '../../service/user/profile-api.service';
import { environment } from '../../../../environments/environment';
import { OpenaiService } from '../../service/common/openai.service';
import { RouteUpdateService } from '../../service/common/route-update.service';
import { DataTableChildrenComponent } from '../../components/datatable-children/datatable-children.component';

export interface ExportResponse {
  blob: Blob;
  fileName: string;
}

interface FetchDataParams {
  entity_name: any;
  start_index: number;
  limit_range: number;
  sort_columns: any;
  search_any: any;
  search_all: any;
  having_conditions: any;
  having_any_conditions: any;
  group_by: any;
  includes: any;
}

@Component({
  standalone: true,
  selector: 'master-list-children',
  imports: [CommonSharedModule, HttpClientModule, DataTableChildrenComponent, LoaderComponent, ReactiveFormsModule],

  templateUrl: './master-list-children.component.html',
  animations: [
    trigger('toggleAnimation', [
      transition(':enter', [style({ opacity: 0, transform: 'scale(0.95)' }), animate('100ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))]),
      transition(':leave', [animate('75ms', style({ opacity: 0, transform: 'scale(0.95)' }))]),
    ]),
  ],
  providers: [DatePipe],
})
export class MasterListChildrenComponent implements AfterViewInit {
  @Input() uuid: any = null; // Receive UUID from child component
  @Input() entity_name: any = ''; // Receive entity_name from child component

  store: any;
  @ViewChild('actionTemplate') actionTemplate!: TemplateRef<any>;
  @ViewChild('statusTemplate') statusTemplate!: TemplateRef<any>;
  @ViewChild('processStatusTemplate') processStatusTemplate!: TemplateRef<any>;
  @ViewChild('linkDownloadVideoURLTemplate') linkDownloadVideoURLTemplate!: TemplateRef<any>;
  @ViewChild('linkDownloadPdfURLTemplate') linkDownloadPdfURLTemplate!: TemplateRef<any>;
  @ViewChild('linkDownloadWordURLTemplate') linkDownloadWordURLTemplate!: TemplateRef<any>;

  customTemplates: { [key: string]: TemplateRef<any> } = {};

  user_id: any;
  isItemModalOpen = false;
  changePasswordForm: FormGroup;
  column: any = '';
  query: any = '';

  allowPasswordModal: any = false;
  selectcolumns: any[] = [];
  headercolumns: any[] = [];
  items: any[] = [];
  totalItems: number = 0;
  currentPage: number = 1;
  resultsPerPage: number = 10;
  enableCheckBox: boolean = false;
  masterInfo: any;
  policyData: any = null;
  loading: boolean = false;
  gridloading: boolean = true;

  title: any = '';
  listQuery: any = '';
  defaultQuery: any = '';
  user_info: any;
  grid_records_delete: any;
  config: any;
  attachedPolicies: any[] = [];
  apiUrl = environment.apiUrl;
  statuses: any = {
    1: {
      value: 'table_status_val_0',
      border_color: 'badge-outline-success',
    },
    2: {
      value: 'table_status_val_1',
      border_color: 'badge-outline-danger',
    },
    3: {
      value: 'table_status_val_2',
      border_color: 'badge-outline-secondary',
    },
  };

  processStatuses: any = {
    submitted: {
      value: 'table_process_status_val_0',
      border_color: 'badge-outline-primary',
    },
    approved: {
      value: 'table_process_status_val_1',
      border_color: 'badge-outline-success',
    },
    rejected: {
      value: 'table_process_status_val_2',
      border_color: 'badge-outline-danger',
    },
    under_approval: {
      value: 'table_process_status_val_3',
      border_color: 'badge-outline-warning',
    },
    created: {
      value: 'table_process_status_val_4',
      border_color: 'badge-outline-success',
    },
    not_appear: {
      value: 'table_process_status_val_5',
      border_color: 'badge-outline-danger',
    },
  };
  uniqueId!: string | null;

  constructor(
    private toastr: ToastrService,
    private gridApiService: GridApiService,
    private apiService: ProfileApiService,
    private http: HttpClient,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private datepipe: DatePipe,
    private router: Router,
    public storeData: Store<any>,
    private exportService: ExportService,
    private datePipe: DatePipe,
    private translate: TranslateService,
    private localStorageService: LocalStorageService,
    private commonService: MenuMapService,
    private titleService: Title,
    private formBuilder: FormBuilder,
    private openaiService: OpenaiService,
    private routeUpdateService: RouteUpdateService
  ) {
    this.initStore();
    this.route.paramMap.subscribe((params) => {
      this.uniqueId = params.get('uuid');
    });

    this.changePasswordForm = this.formBuilder.group(
      {
        new_password: ['', [Validators.required, Validators.minLength(8), this.passwordValidator]],
        confirm_new_password: ['', Validators.required],
      },
      { validators: this.passwordMatchValidator }
    );
  }

  passwordValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) {
      return null;
    }
    const hasUpperCase = /[A-Z]/.test(value);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);
    const isValid = hasUpperCase && hasSpecialChar;
    return !isValid ? { passwordInvalid: true } : null;
  }

  passwordMatchValidator(group: FormGroup): ValidationErrors | null {
    const newPassword = group.get('new_password')?.value;
    const confirmNewPassword = group.get('confirm_new_password')?.value;
    return newPassword === confirmNewPassword ? null : { passwordsMismatch: true };
  }

  ngAfterViewInit() {
    this.config = JSON.parse(this.localStorageService.getData('config'));

    let pageInfo: any;
    console.log(this.uuid);
    console.log(this.entity_name);
    if (this.uuid && this.entity_name) {
      const val = this.routeUpdateService.getPageInfo(this.entity_name);
      console.log(val);
      pageInfo = val[0].data.pageInfo;
      /*this.routeUpdateService.getPageInfo(this.entity_name).subscribe((val: any) => {
        pageInfo = val;
        console.log('Fetched PageInfo:', pageInfo);
      });*/
    } else {
      pageInfo = this.route.snapshot.data['pageInfo'] || '';
      console.log(pageInfo);
    }

    this.user_info = JSON.parse(this.localStorageService.getData('user_data'));
    this.resultsPerPage = parseInt(this.config.grid_pagination_default);
    this.grid_records_delete = this.config.grid_enable_associated_records_deletion;
    if (pageInfo && this.resultsPerPage) {
      if (this.user_info.main?.policies) {
        this.policyData = this.user_info.main?.policies || null;
      }
      this.masterInfo = pageInfo;
      if (this.masterInfo.ListQuery.entity_name == 'user') {
        this.allowPasswordModal = true;
      }

      const masterListConfig = pageInfo;

      const translateTitle = this.translate.instant(masterListConfig.fullEntity);
      this.titleService.setTitle(translateTitle);

      this.enableCheckBox = masterListConfig.enable_row_checkbox;

      this.title = masterListConfig.fullEntity;
      this.defaultQuery = masterListConfig.ListQuery;
      this.listQuery = JSON.parse(JSON.stringify(this.defaultQuery));
      this.listQuery.start_index = 0;
      this.fetchAttachedPolicies(this.listQuery);
    } else {
      this.title = 'Default Title';
      this.headercolumns = [];
      this.items = [];
    }
    this.cdr.detectChanges();
  }

  async initStore() {
    this.storeData
      .select((d) => d.index)
      .subscribe((d) => {
        this.store = d;
      });
  }

  onChangePassword() {
    if (this.changePasswordForm && this.changePasswordForm.errors && this.changePasswordForm.errors['passwordsMismatch']) {
      const key = 'passwords_do_not_match';
      const errorMessage = this.translate.instant(key);
      this.toastr.error(errorMessage, 'Error');
      return;
    }

    if (this.changePasswordForm.invalid) {
      this.markAllAsTouched();
      return;
    }

    const formData = {
      uuid: this.user_id,
      password: this.changePasswordForm.get('new_password')?.value,
    };

    this.apiService.resetPasswordAnyUser(formData).subscribe(
      (response) => {
        const key = 'password_resetted_successfully';
        const successMessage = this.translate.instant(key);
        this.toastr.success(successMessage);
        this.changePasswordForm.reset();
        this.isItemModalOpen = false;
        this.fetchData(this.listQuery);
      },
      (error) => {
        const key = 'error_resetting_password';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage + error, 'Error');
        this.isItemModalOpen = false;
        // Handle error response
      }
    );
  }

  private markAllAsTouched() {
    Object.values(this.changePasswordForm.controls).forEach((control) => {
      control.markAsTouched();
    });
  }

  sortColumn(column: any) {
    this.column = column;

    //this.listQuery.start_index = this.currentPage;
    this.listQuery.limit_range = this.resultsPerPage;
    this.listQuery.sort_columns = [[this.column.header, this.column.sortDirection]];
    this.fetchData(this.listQuery);
  }

  passwordModal(item: any) {
    //return;
    this.isItemModalOpen = true;
    this.user_id = item.uuid;
  }
  cancelResetPwd() {
    this.changePasswordForm.reset();
    this.isItemModalOpen = false;
  }
  advancedSearchData(data: any) {
    interface QueryItem {
      isAggregate: boolean;
      [key: string]: any;
    }

    const query = data.data;
    //isAggregate
    const uncleanedwhereConditions = query.filter((d: any) => !d.isAggregate);
    const whereConditions = uncleanedwhereConditions.map(({ isAggregate, ...rest }: QueryItem) => rest);
    const uncleanedhavingConditions = query.filter((d: any) => d.isAggregate);
    const havingConditions = uncleanedhavingConditions.map(({ isAggregate, ...rest }: QueryItem) => rest);

    const condition = data.condition;

    //const clonedListQuery = JSON.parse(JSON.stringify(this.masterInfo.ListQuery));
    const clonedListQuery = this.listQuery;
    const orgListQuery = this.defaultQuery;
    if (whereConditions.length == 0 && havingConditions.length == 0) {
      if (condition == 'AND') {
        clonedListQuery.search_all = [...orgListQuery.search_all];
      } else {
        clonedListQuery.search_any = [...orgListQuery.search_any];
      }
      this.fetchData(clonedListQuery);
      return;
    }
    if (havingConditions.length > 0) {
      if (condition == 'AND') {
        clonedListQuery.having_conditions = [...havingConditions];
      } else {
        clonedListQuery.having_any_conditions = [...havingConditions];
      }
    }
    if (condition == 'AND') {
      if (whereConditions.length === 1 && whereConditions[0].column_name === '') {
        clonedListQuery.search_all = [];
        clonedListQuery.search_all = [...orgListQuery.search_all];
      } else {
        clonedListQuery.search_all = [];
        clonedListQuery.search_all = [...orgListQuery.search_all, ...whereConditions];
      }
      clonedListQuery.start_index = 0;
      this.currentPage = 1;

      this.fetchData(clonedListQuery);
    } else {
      if (whereConditions.length === 1 && whereConditions[0].column_name === '') {
        clonedListQuery.search_any = [...clonedListQuery.search_any];
      } else {
        clonedListQuery.search_any = [...clonedListQuery.search_any, ...whereConditions];
      }
      clonedListQuery.start_index = 0;
      this.currentPage = 1;

      this.fetchData(clonedListQuery);
    }
  }
  searchData(input: any) {
    const clonedListQuery = this.listQuery;
    if (input.where.data.length) {
      const query = input.where.data;
      const search = input.where.search;
      if (search == '') {
        const orgListQuery = this.defaultQuery;

        clonedListQuery.search_any = [];
        clonedListQuery.search_any = [...orgListQuery.search_any];
        this.fetchData(clonedListQuery);
        return;
      }

      if (query.length === 1 && query[0].column_name === '') {
        clonedListQuery.search_any = [...clonedListQuery.search_any];
      } else {
        clonedListQuery.search_any = [...query];
      }
    }

    if (input.having.data.length) {
      const query = input.having.data;
      const search = input.having.search;
      if (search.length) clonedListQuery.having_any_conditions = [...query];
    }
    clonedListQuery.start_index = 0;
    this.currentPage = 1;
    this.fetchData(clonedListQuery);
  }

  exportTable(item: any) {
    if (this.masterInfo.permissions.export_excel) {
      this.loading = true;
      if (this.masterInfo.children.export_excel && this.masterInfo.children.export_excel.component_class_name == 'export_module') {
        this.exportItem(item);
      } else {
        const query = { ...this.listQuery };
        query.limit_range = 1000000;
        const export_download = this.masterInfo?.Listname.replace('_grid', '') + '_table_data';
        let listParams = this.localStorageService.replaceUniqueId(
          this.localStorageService.formatPayloadWithPolicyConditions(query, this.policyData, this.attachedPolicies),
          '$session_user_id',
          this.user_info.main.id
        );
        listParams = this.localStorageService.replaceUniqueId(listParams, '$unique_id', this.uniqueId || '');
        this.gridApiService.getAllRecords(listParams).subscribe(
          (response) => {
            if (response.status && response.code === 200) {
              if (response.data.records && response.data.headers) {
                const filteredData = this.filterAndTransformData(response.data.headers, response.data.records);
                if (item.type == 'pdf') {
                  this.exportService.exportToPDF(filteredData, export_download);
                } else {
                  this.exportService.exportToExcel(filteredData, export_download);
                }
                this.loading = false;
              }
            } else {
              this.loading = false;
              this.items = [];
              this.totalItems = 0;

              const key = response.message;
              const errorMessage = this.translate.instant(key);
              this.toastr.error(errorMessage, 'Error');
            }
          },
          (error) => {
            this.loading = false;
            const key = 'error';
            const errorMessage = this.translate.instant(key);
            this.toastr.error(errorMessage, 'Error');
          }
        );
      }
    }
  }

  private filterAndTransformData(headers: any[], records: any[]): any[] {
    const filteredHeaders = headers.filter((header) => header.header !== 'id' && header.header !== 'uuid');

    const transformedRecords = records.map((record) => {
      const transformedRecord: any = {};

      filteredHeaders.forEach((header) => {
        const translationKey = `${header.header}`;

        const translatedHeader = this.translate.instant(translationKey);

        if (header.field_type_id == '5') {
          transformedRecord[translatedHeader] = this.datePipe.transform(record[header.header], 'yyyy-MM-dd');
        } else if (header.field_type_id == '7') {
          transformedRecord[translatedHeader] = this.datePipe.transform(record[header.header], 'yyyy-MM-ddTHH:mm:ss');
        } else if (header.header == 'status') {
          transformedRecord[translatedHeader] = this.getStatusTranslation(record[header.header]);
        } else if (header.header == 'process_status') {
          transformedRecord[translatedHeader] = this.getProcessStatusTranslation(record[header.header]);
        } else {
          transformedRecord[translatedHeader] = record[header.header];
        }
      });

      return transformedRecord;
    });

    return transformedRecords;
  }

  private getStatusTranslation(status: string): string {
    return this.translate.instant(this.statuses[status].value);
  }

  private getProcessStatusTranslation(status: string): string {
    return this.translate.instant(this.processStatuses[status].value);
  }

  fetchAttachedPolicies(params: FetchDataParams) {
    this.gridApiService.getAttachedPolicies({ entity_name: params.entity_name }).subscribe(
      (response) => {
        if (response.status && response.code === 200) {
          this.attachedPolicies = response.data.attached_policies || [];
        }
      },
      (error) => {
        const key = 'error';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
      },
      () => {
        this.fetchColumns(this.listQuery);
        this.fetchData(this.listQuery);
      }
    );
  }

  fetchColumns(params: FetchDataParams) {
    this.gridApiService.getAllColumns({ entity_name: params.entity_name }).subscribe(
      (response) => {
        if (response.status && response.code === 200) {
          const data = response.data.records.map((key: any, index: any) => {
            return {
              field: key.field_name,
              title: this.translate.instant(key.display_name),
              sorting: key.is_sortable,
              searchable: key.is_searchable,
              enable: true,
              ...key,
            };
          });

          this.selectcolumns = [
            {
              field: 'S.No',
              title: 'S.No',
              sorting: false,
              searchable: false,
              enable: false,
              field_type_id: 1,
            },
            ...data,
            {
              field: 'Status',
              title: 'Status',
              sorting: false,
              searchable: false,
              enable: false,
              field_type_id: 1,
            },
            {
              field: 'Action',
              title: 'Action',
              sorting: false,
              searchable: false,
              enable: false,
              field_type_id: 0,
            },
          ];
        }
      },
      (error) => {
        const key = 'error';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
      }
    );
  }

  fetchData(params: FetchDataParams) {
    params.limit_range = this.resultsPerPage;
    let payload = this.localStorageService.replaceUniqueId(
      this.localStorageService.formatPayloadWithPolicyConditions(params, this.policyData, this.attachedPolicies),
      '$session_user_id',
      this.user_info.main.id
    );
    console.log(this.uniqueId);
    if (this.uniqueId) {
      payload.unique_id = this.uniqueId;
    }
    if (this.uuid) {
      payload.unique_id = this.uuid;
    }

    payload = this.localStorageService.replaceUniqueId(payload, '$unique_id', this.uniqueId || '');
    console.log(payload);
    this.gridApiService.getAllRecords(payload).subscribe(
      (response) => {
        if (response.status && response.code === 200) {
          if (response.data.headers) {
            if (this.headercolumns.length == 0) {
              const data = response.data.headers
                .filter((key: any) => key.is_grid_column == 'true')
                .map((key: any) => ({
                  ...key,
                  column_width: '40px',
                }));

              // Check if only 'view' or 'view' + 'export_excel' are enabled
              const isOnlyViewOrViewExport =
                (!this.masterInfo.permissions.export_excel || this.masterInfo.permissions.export_excel === true) &&
                (!this.masterInfo.permissions.create || this.masterInfo.permissions.create === true) &&
                Object.keys(this.masterInfo.permissions).every(
                  (key) => key === 'export_excel' || key === 'create' || this.masterInfo.permissions[key] === false
                );

              // Include serial number column if enabled in config
              if (this.config.grid_show_serial_number == 'true') {
                this.headercolumns = [
                  {
                    header: 'table_column_sno',
                    field_value: 'S.No',
                    is_sortable: 'false',
                    column_order: '0.00',
                    column_width: '40px',
                    is_searchable: 'false',
                    is_grid_column: 'true',
                  },
                  ...data,
                ];

                // Add 'Action' column if permissions are not limited to view/export
                if (!isOnlyViewOrViewExport) {
                  this.headercolumns.push({
                    header: 'table_column_action',
                    field_value: 'Action',
                    is_sortable: 'false',
                    column_order: '0.00',
                    column_width: '50px',
                    is_searchable: 'false',
                    is_grid_column: 'true',
                  });
                }
              } else {
                this.headercolumns = [...data];

                if (!isOnlyViewOrViewExport) {
                  this.headercolumns.push({
                    header: 'table_column_action',
                    field_value: 'Action',
                    is_sortable: 'false',
                    column_order: '0.00',
                    column_width: '50px',
                    is_searchable: 'false',
                    is_grid_column: 'true',
                  });
                }
              }
            }

            // Adding custom templates
            this.headercolumns = this.headercolumns.map((item: any) => {
              if (item.header === 'status') {
                return {
                  ...item,
                  customTemplate: this.statusTemplate,
                };
              } else if (item.header === 'process_status') {
                return {
                  ...item,
                  customTemplate: this.processStatusTemplate,
                };
              } else if (item.header === 'table_column_action') {
                return {
                  ...item,
                  customTemplate: this.actionTemplate,
                };
              } else if (item.header === 'documentation_video_url') {
                return {
                  ...item,
                  customTemplate: this.linkDownloadVideoURLTemplate,
                };
              } else if (item.header === 'documentation_pdf') {
                return {
                  ...item,
                  customTemplate: this.linkDownloadPdfURLTemplate,
                };
              } else if (item.header === 'documentation_word') {
                return {
                  ...item,
                  customTemplate: this.linkDownloadWordURLTemplate,
                };
              } else {
                return { ...item };
              }
            });
          }

          // Processing records
          if (response.data.records) {
            this.items = response.data.records.map((item: any, index: any) => {
              const formattedItem = { ...item };
              for (const key in formattedItem) {
                if (
                  formattedItem.hasOwnProperty(key) &&
                  (key.toLowerCase().includes('date') || key.toLowerCase().includes('created_at') || key.toLowerCase().includes('updated_at')) &&
                  this.isDate(formattedItem[key])
                ) {
                  const transformedDate = this.datepipe.transform(new Date(formattedItem[key]), 'yyyy-MM-dd HH:mm:ss');
                  if (transformedDate) {
                    formattedItem[key] = transformedDate;
                  }
                }
              }

              if (this.config.grid_show_serial_number == 'true') {
                return {
                  table_column_sno: this.listQuery.start_index + index + 1,
                  ...formattedItem,
                  Action: index + 1,
                };
              }
              return {
                ...formattedItem,
                Action: index + 1,
              };
            });
            this.totalItems = response.data.total_records;
            this.gridloading = false;
          } else {
            this.items = [];
            this.totalItems = 0;
            this.gridloading = false;
          }
        } else {
          this.items = [];
          this.totalItems = 0;
          this.gridloading = false;
          const key = response.message;
          const errorMessage = this.translate.instant(key);
          this.toastr.error(errorMessage, 'Error');
        }
      },
      (error) => {
        const key = 'error';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
        this.gridloading = false;
      }
    );
  }

  private async executeJob(inputObject: any): Promise<void> {
    if (inputObject.record_info.id) {
      const job_query_information = this.localStorageService.replaceUniqueId(inputObject.query_information, '$unique_id', inputObject.record_info.id);
      try {
        const response = await lastValueFrom(this.gridApiService.executeTransaction(job_query_information));
        if (!response.status) {
          throw new Error(response.message);
        }
      } catch (error: any) {
        throw error;
      }
    }
  }

  isDate(value: any): boolean {
    // Check if the value is a valid date
    return !isNaN(Date.parse(value));
  }

  formatDate(value: string): string | null {
    return this.datepipe.transform(value, 'yyyy-MM-dd');
  }

  capitalizeFirstLetter(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  deleteItems(items: any[]) {
    this.items = this.items.filter((item) => !items.includes(item));
  }

  handleCustomAction(action: string) {
    if (action === 'addNew' && this.masterInfo.children.add) {
      this.router.navigate([`${this.masterInfo.children.add.target}`]);
    }
  }

  editItem(item: any) {
    if (this.masterInfo.children.edit) {
      const targetRoute = this.masterInfo.children.edit.target.replace(':id', item.uuid);
      this.router.navigate([targetRoute]);
    }
  }

  exportItem(item: any) {
    if (this.masterInfo.children.export_excel) {
      this.gridApiService.exportAllRecords(this.masterInfo.children.export_excel.id).subscribe({
        next: (response: ExportResponse) => {
          try {
            const blob = new Blob([response.blob], {
              type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });

            if (item.type === 'excel') {
              // Excel case
              const url = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = response.fileName;

              // Trigger download
              document.body.appendChild(link);
              link.click();

              // Cleanup
              document.body.removeChild(link);
              window.URL.revokeObjectURL(url);
              this.loading = false;
            } else if (item.type === 'pdf') {
              // Convert Excel to PDF
              this.convertExcelToPDF(blob, response.fileName.replace('.xlsx', '.pdf'));
              this.loading = false;
            }
          } catch (err) {
            this.loading = false;
            console.error('Download error:', err);
            this.toastr.error('Error downloading file');
          }
        },
        error: (error) => {
          this.loading = false;
          console.error('Export error:', error);
          this.toastr.error('Error exporting data');
        },
      });
    }
  }

  convertExcelToPDF(blob: Blob, pdfFileName: string) {
    const reader = new FileReader();

    // Read the Excel file
    reader.onload = (event: any) => {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: 'array' });

      // Extract the first sheet
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      // Convert the sheet to JSON
      const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Generate a PDF
      const doc = new jsPDF();
      let y = 10; // Start at y=10 for the first line

      // Loop through the sheetData and add it to the PDF
      sheetData.forEach((row: any) => {
        const rowText = row.join('  '); // Join columns with a space
        doc.text(rowText, 10, y);
        y += 10; // Move down for the next row
      });

      // Save the PDF
      doc.save(pdfFileName);
    };

    // Read the Blob as an ArrayBuffer
    reader.readAsArrayBuffer(blob);
  }

  assignItem(item: any) {
    if (this.masterInfo.children.assign) {
      const targetRoute = this.masterInfo.children.assign.target.replace(':id', item.uuid);
      this.router.navigate([targetRoute]);
    }
  }

  recordExport(item: any) {
    this.loading = true;

    if (this.masterInfo.children.record_export) {
      this.gridApiService.exportIndividualRecords(this.masterInfo.children.record_export.id, item.id).subscribe({
        next: (response: ExportResponse) => {
          try {
            const blob = new Blob([response.blob], {
              type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });

            // Excel case
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = response.fileName;

            // Trigger download
            document.body.appendChild(link);
            link.click();

            // Cleanup
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            this.loading = false;
          } catch (err) {
            console.error('Download error:', err);
            this.toastr.error('Error downloading file');
            this.loading = false;
          }
        },
        error: (error) => {
          console.error('Export error:', error);
          this.toastr.error('Error exporting data');
          this.loading = false;
        },
      });
    }
  }
  commonTranslate(msg: any) {
    return this.translate.instant(msg);
  }

  printItem(item: any) {
    if (this.masterInfo.children.print) {
      const targetRoute = this.masterInfo.children.print.target.replace(':id', item.uuid);
      this.router.navigate([targetRoute]);
    }
  }

  directDeleteItem(item: any) {
    Swal.fire({
      icon: 'warning',
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      showCancelButton: true,
      confirmButtonText: 'Delete',
      padding: '2em',
    }).then(async (result) => {
      if (result.value) {
        try {
          const jobResponse = await this.localStorageService.getMasterEntity({
            record_info: item,
            entity_name: this.masterInfo.children.delete.entity_name,
            entity_type: this.masterInfo.children.delete.component_class_name,
          });

          if (jobResponse) {
            await this.executeJob({ ...jobResponse, record_info: item });
            Swal.fire({ title: 'Deleted!', text: 'Your file has been deleted.', icon: 'success' });
            this.fetchData(this.listQuery);
          }
        } catch (error: any) {
          const key = 'error';
          const errorMessage = this.translate.instant(key);
          this.toastr.error(errorMessage, error.message);
        }
      }
    });
  }

  generateVector(item: any) {
    if (this.masterInfo.permissions.generate_vector) {
      Swal.fire({
        icon: 'info',
        title: 'Generate Vector?',
        text: 'are you sure, you want to generate vector?',
        showCancelButton: true,
        confirmButtonText: 'Generate',
        padding: '2em',
      }).then(async (result) => {
        if (result.value) {
          this.loading = true;
          this.openaiService.generateVectorForTable({ uuid: item.uuid }).subscribe((res) => {
            this.loading = false;
            if (res.status) {
              this.toastr.success('Vector generated successfully', 'Success');
              this.setPageReload();
            } else {
              this.toastr.error('Failed to generate vector', 'Error');
            }
          });
        }
      });
    }
  }

  setPageReload() {
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }

  emailResendItem(item: any) {
    if (this.masterInfo.children.email_resend && this.masterInfo.children.email_resend.component_class_name === commonConfig.ENTITY_TYPES.JOB_BUILDER_MODULE) {
      Swal.fire({
        icon: 'info',
        title: 'Resend Mail?',
        text: 'are you sure, you want to resend mail?',
        showCancelButton: true,
        confirmButtonText: 'Resend',
        padding: '2em',
      }).then(async (result) => {
        if (result.value) {
          try {
            const jobResponse = await this.localStorageService.getMasterEntity({
              record_info: item,
              entity_name: this.masterInfo.children.email_resend.entity_name,
              entity_type: this.masterInfo.children.email_resend.component_class_name,
            });

            if (jobResponse) {
              await this.executeJob({ ...jobResponse, record_info: item });
              Swal.fire({ title: 'Mail resent request initiated!', text: 'Mail resent request has been initiated.', icon: 'success' });
              this.fetchData(this.listQuery);
            }
          } catch (error: any) {
            const key = 'error';
            const errorMessage = this.translate.instant(key);
            this.toastr.error(errorMessage, error.message);
          }
        }
      });
    }
  }

  deleteItem(item: any) {
    if (this.masterInfo.children.delete && this.masterInfo.children.delete.component_class_name === commonConfig.ENTITY_TYPES.JOB_BUILDER_MODULE) {
      if (this.grid_records_delete == 'true') {
        const procedureParams = { proc_name: 'check_for_related_records', params: { entity_name: this.listQuery.entity_name, record_id: item.id } };
        this.commonService.procedureCall(procedureParams).subscribe({
          next: (response: { code: number; status: boolean; data: any; message: string }) => {
            if (response.code === 200 && response.status && response.data) {
              const res = response.data?.[0]?.result || [];

              if (Object.keys(res).length > 0) {
                let htmlInput =
                  `
  <span>` +
                  this.commonTranslate('config_delete_msg_0') +
                  `</span><br><br>
  <table style="width: 100%; text-align: center; border-collapse: collapse;">
  <thead>
    <tr>
      <th style="border: 1px solid #ddd; padding: 8px;">` +
                  this.commonTranslate('config_delete_msg_1') +
                  `</th>
      <th style="border: 1px solid #ddd; padding: 8px;">` +
                  this.commonTranslate('config_delete_msg_2') +
                  `</th>
    </tr> </thead><tbody>
`;

                Object.entries(res).forEach(([key, value]) => {
                  htmlInput += `
    <tr>
      <td style="border: 1px solid #ddd; padding: 8px;">${key}</td>
      <td style="border: 1px solid #ddd; padding: 8px;">${value}</td>
    </tr>
  `;
                });

                htmlInput += `</tbody></table>`;

                Swal.fire({
                  title: `<span style="color: orange;">` + this.commonTranslate('config_delete_msg_3') + `!</span>`,
                  html: htmlInput,
                  customClass: {
                    title: 'swal-title',
                  },
                });
              } else {
                this.directDeleteItem(item);
              }
            } else {
              const key = 'error';
              const errorMessage = this.translate.instant(key);
              this.toastr.error(errorMessage, 'Error');
            }
          },
          error: (error) => {
            console.error('Error fetching data:', error);
            //this.loading = false;
          },
          complete: () => {
            //this.loading = false;
          },
        });
      } else {
        this.directDeleteItem(item);
      }
    }
  }

  viewItem(item: any) {
    if (this.masterInfo.children.details) {
      const targetRoute = this.masterInfo.children.details.target.replace(':uuid', item.uuid);
      this.router.navigate([targetRoute]);
    }
  }

  onPageChange(event: { page: number; start_index: number }) {
    this.currentPage = event.page;
    this.listQuery.start_index = event.start_index;
    this.listQuery.limit_range = this.resultsPerPage;
    this.fetchData(this.listQuery);
  }

  onResultsPerPageChange(event: { resultsPerPage: number; start_index: number }) {
    this.currentPage = 1;
    this.resultsPerPage = event.resultsPerPage;
    this.listQuery.start_index = event.start_index;
    this.listQuery.limit_range = event.resultsPerPage;
    this.fetchData(this.listQuery);
  }
}
