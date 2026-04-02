import { Component, TemplateRef, ViewChild, AfterViewInit, ChangeDetectorRef, Input, SimpleChanges, OnChanges, Output, EventEmitter } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { DataTableComponent } from '../../components/datatable/datatable.component';
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
import { StaticPageComponent } from '../static-page/static-page.component';
import { FormBuilderComponent } from '../form-builder/form-builder.component';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { TimezoneService } from '../../service/common/timezone.service';
import { saveAs } from 'file-saver';

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
  cte: any;
  having_conditions: any;
  hnditions: any;
  group_by: any;
  includes: any;
}

interface AcceptedParentParamRule {
  parentColumnToken: string;
  currentColumnName: string;
  condition?: string;
  applyBasedOnParent?: boolean;
}

@Component({
  standalone: true,
  selector: 'master-list',
  imports: [
    CommonSharedModule,
    HttpClientModule,
    DataTableComponent,
    LoaderComponent,
    ReactiveFormsModule,
    StaticPageComponent,
    FormBuilderComponent,
    MonacoEditorModule,
  ],

  templateUrl: './master-list.component.html',
  animations: [
    trigger('toggleAnimation', [
      transition(':enter', [style({ opacity: 0, transform: 'scale(0.95)' }), animate('100ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))]),
      transition(':leave', [animate('75ms', style({ opacity: 0, transform: 'scale(0.95)' }))]),
    ]),
  ],
  providers: [DatePipe],
})
export class MasterListComponent implements OnChanges {
  @Input() uuid: any = null;
  @Input() entity_name: any = '';
  @Input() popupName: any = '';
  @Input() isViewPopupOpen: boolean = false;
  @Input() popupEntityName: any = '';
  @Input() selectedItemUuid: string | null = null;
  @Input() grid_params: any = null;
  @Input() parentGridFilters: {
    search_all?: any[];
    search_any?: any[];
    having_conditions?: any[];
    having_any_conditions?: any[];
    having_all?: any[];
    having_any?: any[];
    columns?: any[];
    grid_params?: any;
  } | null = null;
  @Input() set popupConfig(config: { popupName: string; selectedItemUuid: string | null; popupEntityName: string; isViewPopupOpen: boolean } | null) {
    if (config) {
      this.processPopup(config.popupName, config.selectedItemUuid, config.popupEntityName, config.isViewPopupOpen);
    }
  }
  private _nonGridPage = false;

  @Input()
  set nonGridPage(value: boolean) {
    this._nonGridPage = value;
    this.cdr.detectChanges();
  }

  @Output() selectionChange = new EventEmitter<any[]>();
  @Output() deleteTriggred = new EventEmitter<any>();
  @Input() selectedItems: any[] = [];

  get nonGridPage() {
    return this._nonGridPage;
  }

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
  isGetCodeModalOpen = false;
  getCodeForm: FormGroup;
  modalJsonEditorOptions = { theme: 'vs-dark', language: 'json', readOnly: true, minimap: { enabled: false } };
  column: any = '';
  previewColumn: any = '';
  query: any = '';

  allowPasswordModal: any = false;
  selectcolumns: any[] = [];
  previewSelectColumns: any[] = [];
  headercolumns: any[] = [];
  previewHeaderColumns: any[] = [];
  items: any[] = [];
  previewItems: any[] = [];
  totalItems: number = 0;
  previewTotalItems: number = 0;
  currentPage: number = 1;
  previewCurrentPage: number = 1;
  resultsPerPage: number = 10;
  previewResultsPerPage: number = 10;
  enableCheckBox: boolean = false;
  masterInfo: any;
  policyData: any = null;
  loading: boolean = false;
  loadingpopup: boolean = false;
  gridloading: boolean = true;
  selectedItemEntityType: string | null = null;
  EntityName: string | null = null;

  title: any = '';
  previewTitle: any = '';
  listQuery: any = '';
  previewListQuery: any = '';
  defaultQuery: any = '';
  previewDefaultQuery: any = '';
  user_info: any;
  grid_records_delete: any;
  config: any;
  attachedPolicies: any[] = [];
  accepted_parent_params: any = [];
  apiUrl = localStorage.getItem('lcp_api_base_url') || environment.apiUrl;
  adminUrl: any = '/#';
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
  noPopupPermission: boolean = false;
  previewPopupPermission: boolean = false;
  noPermission: boolean = false;
  isUUid: boolean = true;
  commonSearchQuery: any = {};
  grid_unique_id: any;
  popupComponentGridParams: any;
  popupParentGridFilters: any = null;
  entities: any[] = [];
  headerStaticEntityName: string = '';
  footerStaticEntityName: string = '';
  private isGridBootstrapReady: boolean = false;
  private pendingGridFetchRequest: boolean = false;
  private queuedInitialFetchParams: FetchDataParams | null = null;
  private hasInitialGridFetchStarted: boolean = false;
  private savedViewInitialFallbackTimer: ReturnType<typeof setTimeout> | null = null;
  private ignoreNextSavedViewPageChange: boolean = false;
  private readonly USER_SEARCH_CONFIGURATIONS_TEMP_KEY = 'user_search_confgurations_temp';
  private save_grid_latest_state: boolean = false;

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
    private routeUpdateService: RouteUpdateService,
    private timezoneService: TimezoneService
  ) {
    this.initStore();
    const url = this.localStorageService?.getData('base_app_url');
    this.adminUrl = url && url !== 'undefined' ? JSON.parse(url) : '/#';
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      const uuid = params.get('uuid');
      if (id) {
        this.isUUid = false;
      } else {
        this.isUUid = true;
      }
      const value = id || uuid;
      this.uniqueId = value;
    });

    this.changePasswordForm = this.formBuilder.group(
      {
        new_password: ['', [Validators.required, Validators.minLength(8), this.passwordValidator]],
        confirm_new_password: ['', Validators.required],
      },
      { validators: this.passwordMatchValidator }
    );

    this.getCodeForm = this.formBuilder.group({
      codeContent: [''],
    });
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

  async ngAfterContentInit() {
    this.config = JSON.parse(this.localStorageService.getData('config'));
    this.save_grid_latest_state = this.config?.save_grid_latest_state == 'true' && this.config?.save_grid_latest_state;
    let pageInfo: any;
    if (this.entity_name) {
      const routes = await this.routeUpdateService.getPageInfo(this.entity_name);

      pageInfo = routes && routes.length ? routes[0].data.pageInfo : null;
      const defaultPermission = routes && routes.length ? routes[0].data.defaultPermission : null;
      this.setupPageInfo(pageInfo, defaultPermission);
    } else {
      pageInfo = this.route.snapshot.data['pageInfo'] || '';
      const defaultPermission = this.route.snapshot.data['defaultPermission'] || '';
      this.setupPageInfo(pageInfo, defaultPermission);
    }
  }

  setupPageInfo(pageInfo: any, defaultPermission: any) {
    this.user_info = JSON.parse(this.localStorageService.getData('user_data'));
    this.resultsPerPage = parseInt(this.config.grid_pagination_default);
    this.grid_records_delete = this.config.grid_enable_associated_records_deletion;

    if (defaultPermission !== true) {
      this.noPermission = true;
      return;
    }

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

      if (masterListConfig.fullEntity === 'unmapped_delivery_notes') {
        this.enableCheckBox = true;
      } else {
        this.enableCheckBox = masterListConfig.enable_row_checkbox;
      }

      if (this.entity_name) {
        this.title = this.entity_name;
      } else {
        this.title = masterListConfig.fullEntity;
      }

      this.defaultQuery = masterListConfig.ListQuery;
      this.listQuery = JSON.parse(JSON.stringify(this.defaultQuery));
      this.listQuery.start_index = 0;

      if (this.entity_name) {
        this.listQuery.entity_name = this.entity_name;
      }

      this.fetchAttachedPolicies(this.listQuery);
    } else {
      this.title = 'Default Title';
      this.headercolumns = [];
      this.items = [];
    }
  }

  async initStore() {
    this.storeData
      .select((d) => d.index)
      .subscribe((d) => {
        this.store = d;
      });
  }

  private applyAcceptedParentFiltersToListQuery(): void {
    if (!this.listQuery) {
      return;
    }

    const matchedFilters = this.getAcceptedParentFilterMatches();

    if (matchedFilters.search_all.length > 0) {
      this.listQuery.search_all = this.mergeUniqueFilters(this.listQuery.search_all, matchedFilters.search_all);
    }

    if (matchedFilters.search_any.length > 0) {
      this.listQuery.search_any = this.mergeUniqueFilters(this.listQuery.search_any, matchedFilters.search_any);
    }

    if (matchedFilters.having_conditions.length > 0) {
      this.listQuery.having_conditions = this.mergeUniqueFilters(this.listQuery.having_conditions, matchedFilters.having_conditions);
    }

    if (matchedFilters.having_any_conditions.length > 0) {
      this.listQuery.having_any_conditions = this.mergeUniqueFilters(this.listQuery.having_any_conditions, matchedFilters.having_any_conditions);
    }
  }

  private getAcceptedParentFilterMatches(): {
    search_all: any[];
    search_any: any[];
    having_conditions: any[];
    having_any_conditions: any[];
  } {
    const empty = {
      search_all: [],
      search_any: [],
      having_conditions: [],
      having_any_conditions: [],
    };

    const acceptedParams = this.normalizeAcceptedParentParams(this.accepted_parent_params);
    const hasAcceptedParams = Object.values(acceptedParams).some((params) => params.length > 0);
    if (!hasAcceptedParams || !this.parentGridFilters) {
      return empty;
    }

    const parentConditionPool = [
      ...(Array.isArray(this.parentGridFilters.search_all) ? this.parentGridFilters.search_all : []),
      ...(Array.isArray(this.parentGridFilters.search_any) ? this.parentGridFilters.search_any : []),
      ...(Array.isArray(this.parentGridFilters.having_conditions) ? this.parentGridFilters.having_conditions : []),
      ...(Array.isArray(this.parentGridFilters.having_all) ? this.parentGridFilters.having_all : []),
      ...(Array.isArray(this.parentGridFilters.having_any_conditions) ? this.parentGridFilters.having_any_conditions : []),
      ...(Array.isArray(this.parentGridFilters.having_any) ? this.parentGridFilters.having_any : []),
    ];

    return {
      search_all: this.filterBucketWithSource(
        acceptedParams.search_all,
        parentConditionPool,
        Array.isArray(this.parentGridFilters.search_all) ? this.parentGridFilters.search_all : []
      ),
      search_any: this.filterBucketWithSource(
        acceptedParams.search_any,
        parentConditionPool,
        Array.isArray(this.parentGridFilters.search_any) ? this.parentGridFilters.search_any : []
      ),
      having_conditions: this.filterBucketWithSource(
        acceptedParams.having_conditions,
        parentConditionPool,
        Array.isArray(this.parentGridFilters.having_conditions) ? this.parentGridFilters.having_conditions : []
      ),
      having_any_conditions: this.filterBucketWithSource(
        acceptedParams.having_any_conditions,
        parentConditionPool,
        Array.isArray(this.parentGridFilters.having_any_conditions) ? this.parentGridFilters.having_any_conditions : []
      ),
    };
  }

  private filterBucketWithSource(rules: AcceptedParentParamRule[], parentConditionPool: any[], parentBucketConditions: any[]): any[] {
    const poolRules = rules.filter((r) => !r.applyBasedOnParent);
    const bucketRules = rules.filter((r) => r.applyBasedOnParent);
    const fromPool = this.filterAcceptedParentConditions(parentConditionPool, poolRules);
    const fromBucket = this.filterAcceptedParentConditions(parentBucketConditions, bucketRules);
    return this.mergeUniqueFilters(fromPool, fromBucket);
  }

  private mergeAcceptedParentFiltersIntoParams(params: any): any {
    const matchedFilters = this.getAcceptedParentFilterMatches();
    if (
      matchedFilters.search_all.length === 0 &&
      matchedFilters.search_any.length === 0 &&
      matchedFilters.having_conditions.length === 0 &&
      matchedFilters.having_any_conditions.length === 0
    ) {
      return params;
    }

    const mergedParams: any = {
      ...(params || {}),
    };

    if (matchedFilters.search_all.length > 0) {
      mergedParams.search_all = this.mergeUniqueFilters(params?.search_all, matchedFilters.search_all);
    }

    if (matchedFilters.search_any.length > 0) {
      mergedParams.search_any = this.mergeUniqueFilters(params?.search_any, matchedFilters.search_any);
    }

    if (matchedFilters.having_conditions.length > 0) {
      mergedParams.having_conditions = this.mergeUniqueFilters(params?.having_conditions, matchedFilters.having_conditions);
    }

    if (matchedFilters.having_any_conditions.length > 0) {
      mergedParams.having_any_conditions = this.mergeUniqueFilters(params?.having_any_conditions, matchedFilters.having_any_conditions);
    }

    return mergedParams;
  }

  private filterAcceptedParentConditions(parentConditions: any, acceptedRules: AcceptedParentParamRule[]): any[] {
    const conditions = Array.isArray(parentConditions) ? parentConditions : [];
    if (!acceptedRules.length) {
      return [];
    }

    const mappedConditions: any[] = [];
    const seenSignatures = new Set<string>();

    for (const condition of conditions) {
      if (!condition || typeof condition !== 'object' || Array.isArray(condition)) {
        continue;
      }

      const parentColumnToken = this.normalizeFilterToken(condition?.column_name);
      if (!parentColumnToken) {
        continue;
      }

      const matchedRules = acceptedRules.filter((rule) => rule.parentColumnToken === parentColumnToken);
      if (!matchedRules.length) {
        continue;
      }

      for (const rule of matchedRules) {
        const mappedCondition = JSON.parse(JSON.stringify(condition));
        mappedCondition.column_name = rule.currentColumnName;

        if (rule.condition) {
          mappedCondition.operator = rule.condition;
        }

        const signature = this.getFilterSignature(mappedCondition);
        if (seenSignatures.has(signature)) {
          continue;
        }

        seenSignatures.add(signature);
        mappedConditions.push(mappedCondition);
      }
    }

    return mappedConditions;
  }

  private parseAcceptedParentParamRule(value: any): AcceptedParentParamRule | null {
    let parentColumnRaw: any;
    let currentColumnRaw: any;
    let conditionRaw: any;

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      parentColumnRaw =
        value.parent_column_name ??
        value.parentColumnName ??
        value.column_name ??
        value.columnName ??
        value.field ??
        value.name ??
        value.value ??
        value.key ??
        value.current_column_name ??
        value.currentColumnName;

      currentColumnRaw =
        value.current_column_name ??
        value.currentColumnName ??
        value.column_name ??
        value.columnName ??
        value.field ??
        value.name ??
        value.value ??
        value.key ??
        value.parent_column_name ??
        value.parentColumnName;

      conditionRaw = value.condition ?? value.operator;
    } else {
      parentColumnRaw = value;
      currentColumnRaw = value;
    }

    const parentColumnToken = this.normalizeFilterToken(parentColumnRaw);
    const currentColumnName = String(currentColumnRaw || '').trim();

    if (!parentColumnToken || !currentColumnName) {
      return null;
    }

    const condition = String(conditionRaw || '').trim();
    const applyBasedOnParent = value && typeof value === 'object' ? (value.apply_based_on_parent ?? value.applyBasedOnParent) === true : false;
    return {
      parentColumnToken,
      currentColumnName,
      ...(condition ? { condition } : {}),
      ...(applyBasedOnParent ? { applyBasedOnParent: true } : {}),
    };
  }

  private normalizeAcceptedParentParams(value: any): {
    search_all: AcceptedParentParamRule[];
    search_any: AcceptedParentParamRule[];
    having_conditions: AcceptedParentParamRule[];
    having_any_conditions: AcceptedParentParamRule[];
  } {
    const empty = {
      search_all: [] as AcceptedParentParamRule[],
      search_any: [] as AcceptedParentParamRule[],
      having_conditions: [] as AcceptedParentParamRule[],
      having_any_conditions: [] as AcceptedParentParamRule[],
    };

    if (Array.isArray(value)) {
      const rules = this.createAcceptedParamRuleList(value);
      return {
        search_all: [...rules],
        search_any: [...rules],
        having_conditions: [...rules],
        having_any_conditions: [...rules],
      };
    }

    if (!value || typeof value !== 'object') {
      return empty;
    }

    return {
      search_all: this.createAcceptedParamRuleList(value.search_all),
      search_any: this.createAcceptedParamRuleList(value.search_any),
      having_conditions: this.createAcceptedParamRuleList(value.having_conditions),
      having_any_conditions: this.createAcceptedParamRuleList(value.having_any_conditions),
    };
  }

  private createAcceptedParamRuleList(values: any): AcceptedParentParamRule[] {
    if (!Array.isArray(values)) {
      return [];
    }

    const rules: AcceptedParentParamRule[] = [];
    const seen = new Set<string>();

    for (const param of values) {
      const parsedRule = this.parseAcceptedParentParamRule(param);
      if (!parsedRule) {
        continue;
      }

      const signature = `${parsedRule.parentColumnToken}|${this.normalizeFilterToken(parsedRule.currentColumnName)}|${this.normalizeFilterToken(
        parsedRule.condition || ''
      )}`;
      if (seen.has(signature)) {
        continue;
      }

      seen.add(signature);
      rules.push(parsedRule);
    }

    return rules;
  }

  private mergeUniqueFilters(existingFilters: any, newFilters: any[]): any[] {
    const existing = Array.isArray(existingFilters) ? [...existingFilters] : [];
    const seen = new Set(existing.map((item: any) => this.getFilterSignature(item)));

    for (const filter of newFilters) {
      const signature = this.getFilterSignature(filter);
      if (seen.has(signature)) continue;
      existing.push(JSON.parse(JSON.stringify(filter)));
      seen.add(signature);
    }

    return existing;
  }

  private getFilterSignature(filter: any): string {
    return JSON.stringify({
      column_name: String(filter?.column_name || ''),
      operator: String(filter?.operator || ''),
      value: filter?.value,
      clause_type: String(filter?.clause_type || ''),
    });
  }

  private normalizeFilterToken(value: any): string {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '');
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
    if (column?.skipFetch) return;
    this.column = column;

    //this.listQuery.start_index = this.currentPage;
    this.listQuery.limit_range = this.resultsPerPage;
    const sortColumns = Array.isArray(column?.sortColumns) ? column.sortColumns : [this.column];
    this.listQuery.sort_columns = sortColumns.filter((col: any) => col?.sortDirection).map((col: any) => [col.header, col.sortDirection]);
    this.requestGridFetch(this.listQuery);
  }

  previewSortColumn(previewColumn: any) {
    this.previewColumn = previewColumn;
    this.previewListQuery.limit_range = this.previewResultsPerPage;
    const sortColumns = Array.isArray(previewColumn?.sortColumns) ? previewColumn.sortColumns : [this.previewColumn];
    this.previewListQuery.sort_columns = sortColumns.filter((col: any) => col?.sortDirection).map((col: any) => [col.header, col.sortDirection]);
    if (previewColumn?.skipFetch) return;
    this.previewFetchData(this.previewListQuery);
  }

  passwordModal(item: any, event?: MouseEvent) {
    //return;
    this.isItemModalOpen = true;
    this.user_id = item.uuid;
  }

  exportEntityAsZip(item: any, event?: MouseEvent) {
    this.gridApiService.exportEntityAsZip(item.uuid).subscribe({
      next: (res: any) => {
        const url = window.URL.createObjectURL(res.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = res.fileName;
        a.click();

        window.URL.revokeObjectURL(url); // ✅ important cleanup

        this.toastr.success('Export successful');
      },
      error: (e: any) => {
        this.toastr.error(e.message || 'Export failed');
      },
    });
  }

  cancelResetPwd() {
    this.changePasswordForm.reset();
    this.isItemModalOpen = false;
  }
  advancedSearchData(data: any) {
    // Reset common search query holders
    this.commonSearchQuery.having_conditions = [];
    this.commonSearchQuery.having_any_conditions = [];
    this.commonSearchQuery.search_any = [];
    this.commonSearchQuery.search_all = [];

    interface QueryItem {
      isAggregate: boolean;
      column_name?: string;
      [key: string]: any;
    }

    const query: QueryItem[] = data?.data || [];
    const condition: 'AND' | 'OR' = data?.condition || 'AND';

    // --- Separate WHERE and HAVING ---
    const whereConditions = query.filter((d) => !d.isAggregate).map(({ isAggregate, ...rest }) => rest);

    const havingConditions = query.filter((d) => d.isAggregate).map(({ isAggregate, ...rest }) => rest);

    // DO NOT DEEP CLONE – matches your existing working behaviour
    const clonedListQuery = this.listQuery;
    const orgListQuery = this.defaultQuery;

    // --- NO CONDITIONS → RESTORE DEFAULT ---
    if (whereConditions.length === 0 && havingConditions.length === 0) {
      if (condition === 'AND') {
        clonedListQuery.search_all = [...orgListQuery.search_all];
      } else {
        clonedListQuery.search_any = [...orgListQuery.search_any];
      }
      if (!data?.skipFetch) {
        this.requestGridFetch(clonedListQuery);
      }
      return;
    }

    // --- HANDLE HAVING CONDITIONS ---
    if (havingConditions.length > 0) {
      if (condition === 'AND') {
        clonedListQuery.having_conditions = [...havingConditions];
        this.commonSearchQuery.having_conditions = [...havingConditions];
        this.commonSearchQuery.having_any_conditions = [];
      } else {
        clonedListQuery.having_any_conditions = [...havingConditions];
        this.commonSearchQuery.having_any_conditions = [...havingConditions];
        this.commonSearchQuery.having_conditions = [];
      }
    }

    // --- HANDLE WHERE CONDITIONS ---
    if (condition === 'AND') {
      // Case: empty single condition → restore default
      if (whereConditions.length === 1 && (!whereConditions[0].column_name || whereConditions[0].column_name === '')) {
        clonedListQuery.search_all = [...orgListQuery.search_all];
        this.commonSearchQuery.search_all = [];
      } else {
        clonedListQuery.search_all = [...orgListQuery.search_all, ...whereConditions];
        this.commonSearchQuery.search_all = [...whereConditions];
        this.commonSearchQuery.search_any = [];
      }
    } else {
      // OR conditions
      if (whereConditions.length === 1 && (!whereConditions[0].column_name || whereConditions[0].column_name === '')) {
        clonedListQuery.search_any = [...orgListQuery.search_any];
        this.commonSearchQuery.search_any = [];
      } else {
        clonedListQuery.search_any = [...orgListQuery.search_any, ...whereConditions];
        this.commonSearchQuery.search_any = [...whereConditions];
        this.commonSearchQuery.search_all = [];
      }
    }

    // Reset pagination
    clonedListQuery.start_index = 0;
    this.currentPage = 1;

    if (!data?.skipFetch) {
      this.requestGridFetch(clonedListQuery);
    }
  }

  previewAdvancedSearchData(data: any) {
    interface previewQueryItem {
      isAggregate: boolean;
      [key: string]: any;
    }

    const query = data.data;
    //isAggregate
    const uncleanedwhereConditions = query.filter((d: any) => !d.isAggregate);
    const whereConditions = uncleanedwhereConditions.map(({ isAggregate, ...rest }: previewQueryItem) => rest);
    const uncleanedhavingConditions = query.filter((d: any) => d.isAggregate);
    const havingConditions = uncleanedhavingConditions.map(({ isAggregate, ...rest }: previewQueryItem) => rest);

    const condition = data.condition;

    //const previewClonedListQuery = JSON.parse(JSON.stringify(this.masterInfo.ListQuery));
    const previewClonedListQuery = this.previewListQuery;
    const orgListQuery = this.previewDefaultQuery;
    if (whereConditions.length == 0 && havingConditions.length == 0) {
      if (condition == 'AND') {
        previewClonedListQuery.search_all = [...orgListQuery.search_all];
      } else {
        previewClonedListQuery.search_any = [...orgListQuery.search_any];
      }
      if (!data?.skipFetch) {
        this.previewFetchData(previewClonedListQuery);
      }
      return;
    }
    if (havingConditions.length > 0) {
      if (condition == 'AND') {
        previewClonedListQuery.having_conditions = [...havingConditions];
      } else {
        previewClonedListQuery.having_any_conditions = [...havingConditions];
      }
    }
    if (condition == 'AND') {
      if (whereConditions.length === 1 && whereConditions[0].column_name === '') {
        previewClonedListQuery.search_all = [];
        previewClonedListQuery.search_all = [...orgListQuery.search_all];
      } else {
        previewClonedListQuery.search_all = [];
        previewClonedListQuery.search_all = [...orgListQuery.search_all, ...whereConditions];
      }
      previewClonedListQuery.start_index = 0;
      this.previewCurrentPage = 1;

      if (!data?.skipFetch) {
        this.previewFetchData(previewClonedListQuery);
      }
    } else {
      if (whereConditions.length === 1 && whereConditions[0].column_name === '') {
        previewClonedListQuery.search_any = [...previewClonedListQuery.search_any];
      } else {
        previewClonedListQuery.search_any = [...previewClonedListQuery.search_any, ...whereConditions];
      }
      previewClonedListQuery.start_index = 0;
      this.previewCurrentPage = 1;

      if (!data?.skipFetch) {
        this.previewFetchData(previewClonedListQuery);
      }
    }
  }

  searchData(input: any) {
    this.commonSearchQuery.having_any_conditions = [];
    this.commonSearchQuery.search_any = [];

    const clonedListQuery = this.listQuery;
    const orgListQuery = this.defaultQuery;

    // Handling search in "where" conditions
    if (input.where.data.length) {
      const query = input.where.data;
      let search = input.where.search;

      // If search is cleared, ensure it's an empty string
      if (search === null || search === undefined || search.trim() === '') {
        search = ''; // Reset search to empty string if it's cleared
      }

      if (search === '') {
        clonedListQuery.search_any = [...orgListQuery.search_any];
      } else {
        clonedListQuery.search_any = query.length === 1 && query[0].column_name === '' ? [] : [...query];
        this.commonSearchQuery.search_any = query.length === 1 && query[0].column_name === '' ? [] : [...query];
      }
    } else {
      clonedListQuery.search_any = [...(orgListQuery.search_any || [])];
      this.commonSearchQuery.search_any = [];
    }

    // Handling search in "having" conditions
    if (input.having.data.length) {
      const query = input.having.data;
      let search = input.having.search;

      // If search is cleared, ensure it's an empty string
      if (search === null || search === undefined || search.trim() === '') {
        search = ''; // Reset search to empty string if it's cleared
      }

      // Only update having_any_conditions if there's a non-empty search value
      if (search && search.length) {
        clonedListQuery.having_any_conditions = [...query];
        this.commonSearchQuery.having_any_conditions = [...query];
      } else {
        delete this.commonSearchQuery.having_any_conditions;
        delete clonedListQuery.having_any_conditions;
      }
    } else {
      if (Array.isArray(orgListQuery?.having_any_conditions)) {
        clonedListQuery.having_any_conditions = [...orgListQuery.having_any_conditions];
      } else {
        delete clonedListQuery.having_any_conditions;
      }
      this.commonSearchQuery.having_any_conditions = [];
    }

    clonedListQuery.start_index = 0;
    this.currentPage = 1;
    this.previewCurrentPage = 1;

    if (!input?.skipFetch) {
      this.requestGridFetch(clonedListQuery);
    }
  }

  previewSearchData(input: any) {
    const clonedPreviewListQuery = this.previewListQuery;

    // Handling search in "where" conditions
    if (input.where.data.length) {
      const query = input.where.data;
      let search = input.where.search;

      // If search is cleared, ensure it's an empty string
      if (search === null || search === undefined || search.trim() === '') {
        search = ''; // Reset search to empty string if it's cleared
      }

      if (search === '') {
        const orgListQuery = this.defaultQuery;
        clonedPreviewListQuery.search_any = [...orgListQuery.search_any];
      } else {
        clonedPreviewListQuery.search_any = query.length === 1 && query[0].column_name === '' ? [] : [...query];
      }
    }

    // Handling search in "having" conditions
    if (input.having.data.length) {
      const query = input.having.data;
      let search = input.having.search;

      // If search is cleared, ensure it's an empty string
      if (search === null || search === undefined || search.trim() === '') {
        search = ''; // Reset search to empty string if it's cleared
      }

      // Only update having_any_conditions if there's a non-empty search value
      if (search && search.length) {
        clonedPreviewListQuery.having_any_conditions = [...query];
      } else {
        delete clonedPreviewListQuery.having_any_conditions;
      }
    }

    clonedPreviewListQuery.start_index = 0;
    this.currentPage = 1;
    this.previewCurrentPage = 1;
    if (!input?.skipFetch) {
      this.previewFetchData(clonedPreviewListQuery);
    }
  }

  private normalizeBoolean(value: any): boolean {
    return value === true || value === 'true' || value === 1 || value === '1';
  }

  private buildGridBuilderLineItems(items: any[], companyId: number): any[] {
    if (!Array.isArray(items)) {
      return [];
    }

    return items
      .filter((item: any) => {
        const displayName = String(item?.display_name || '')
          .trim()
          .toLowerCase();
        const fieldName = String(item?.field_name || '')
          .trim()
          .toLowerCase()
          .split('.')
          .pop();

        return !['id', 'uuid', 'status_id'].includes(displayName) && !['id', 'uuid', 'status_id'].includes(String(fieldName || ''));
      })
      .map((item: any) => {
        const lineItem: any = {
          master_grid_id: 0,
          field_name: item?.field_name || '',
          display_name: item?.display_name || '',
          order_no: item?.order_no ?? 0,
          is_grid_column: this.normalizeBoolean(item?.is_grid_column),
          is_searchable: this.normalizeBoolean(item?.is_searchable),
          is_sortable: this.normalizeBoolean(item?.is_sortable),
          field_type_id: Number(item?.field_type_id ?? 1),
          company_id: companyId,
        };

        if (item?.clause_type) {
          lineItem.clause_type = item.clause_type;
        }

        if (item?.enum_values !== undefined) {
          lineItem.enum_values = item.enum_values;
        }

        if (item?.link_type) {
          lineItem.link_type = item.link_type;
        }

        if (item?.link_action) {
          lineItem.link_action = item.link_action;
        }

        if (item?.link_mode) {
          lineItem.link_mode = item.link_mode;
        }

        return lineItem;
      });
  }

  private buildGridBuilderModuleJson(record: any): any {
    const companyId = Number(record?.company_id ?? 1);
    return {
      entity_name: record?.entity_name || '',
      entity_type: record?.entity_type || '',
      report_type: record?.report_type || 'lcp',
      primary_table: record?.primary_table || '',
      is_admin_module: this.normalizeBoolean(record?.is_admin_module),
      draft_mode: this.normalizeBoolean(record?.draft_mode),
      associated_tables: Array.isArray(record?.associated_tables) ? record.associated_tables : [],
      associated_entity_name: record?.associated_entity_name ?? null,
      associated_entity: record?.associated_entity ?? null,
      children: Array.isArray(record?.children) ? record.children : [],
      query_information: record?.query_information && typeof record.query_information === 'object' ? record.query_information : {},
      form_information: record?.form_information && typeof record.form_information === 'object' ? record.form_information : null,
      report_information: record?.report_information && typeof record.report_information === 'object' ? record.report_information : null,
      add_query_information: record?.add_query_information && typeof record.add_query_information === 'object' ? record.add_query_information : null,
      edit_query_information: record?.edit_query_information && typeof record.edit_query_information === 'object' ? record.edit_query_information : null,
      preset_query_information:
        record?.preset_query_information && typeof record.preset_query_information === 'object' ? record.preset_query_information : null,
      static_page_content: record?.static_page_content ?? null,
      header_entity_id: record?.header_entity_id ?? null,
      footer_entity_id: record?.footer_entity_id ?? null,
      export_template_id: record?.export_template_id ?? null,
      export_template_file_name: record?.export_template_file_name ?? null,
      dashboard_wizard_group_id: record?.dashboard_wizard_group_id ?? null,
      dashboard_wizard_type: record?.dashboard_wizard_type ?? null,
      dashboard_wizard_rows: record?.dashboard_wizard_rows ?? null,
      dashboard_wizard_columns: record?.dashboard_wizard_columns ?? null,
      dashboard_wizard_order_no: record?.dashboard_wizard_order_no ?? 0,
      dashboard_wizard_options:
        record?.dashboard_wizard_options && typeof record.dashboard_wizard_options === 'object' ? record.dashboard_wizard_options : null,
      dashboard_grid: record?.dashboard_grid ?? null,
      reload_timeout: record?.reload_timeout ?? null,
      name: record?.name || '',
      company_id: companyId,
      lineitems: this.buildGridBuilderLineItems(record?.items, companyId),
    };
  }

  private buildFormBuilderModuleJson(record: any): any {
    // For form_builder_module and similar types:
    // form_builder_module, email_template_assignment_module, ai_playground_module,
    // query_builder_module, whatsapp_template_assignment_module,
    // approval_workflow_assignment_module, static_page_builder_module
    return {
      name: record?.name || '',
      entity_name: record?.entity_name || '',
      entity_type: record?.entity_type || '',
      primary_table: record?.primary_table || '',
      form_information:
        record?.form_information && typeof record.form_information === 'object'
          ? record.form_information
          : {
              model: {},
              fields: [],
              options: {},
            },
      query_information: record?.query_information && typeof record.query_information === 'object' ? record.query_information : {},
      add_query_information: record?.add_query_information && typeof record.add_query_information === 'object' ? record.add_query_information : null,
      edit_query_information: record?.edit_query_information && typeof record.edit_query_information === 'object' ? record.edit_query_information : null,
      preset_query_information:
        record?.preset_query_information && typeof record.preset_query_information === 'object' ? record.preset_query_information : null,
    };
  }

  private buildJobBuilderModuleJson(record: any): any {
    // For job_builder_module type:
    // Simpler structure focused on query_information for job execution
    const jobJson: any = {
      name: record?.name || '',
      entity_name: record?.entity_name || '',
      entity_type: record?.entity_type || '',
      query_information: record?.query_information && typeof record.query_information === 'object' ? record.query_information : {},
    };

    // Include optional fields if they exist
    if (record?.primary_table !== undefined && record?.primary_table !== null) {
      jobJson.primary_table = record.primary_table;
    }

    if (record?.static_page_content !== undefined && record?.static_page_content !== null) {
      jobJson.static_page_content = record.static_page_content;
    }

    return jobJson;
  }

  private buildTreeBuilderLineItems(items: any[], companyId: number): any[] {
    // Tree builder includes all lineitems (no filtering like grid_builder)
    if (!Array.isArray(items)) {
      return [];
    }

    return items.map((item: any) => {
      const lineItem: any = {
        master_grid_id: 0,
        field_name: item?.field_name || '',
        display_name: item?.display_name || '',
        order_no: item?.order_no ?? 0,
        is_grid_column: this.normalizeBoolean(item?.is_grid_column),
        is_searchable: this.normalizeBoolean(item?.is_searchable),
        is_sortable: this.normalizeBoolean(item?.is_sortable),
        field_type_id: Number(item?.field_type_id ?? 1),
        company_id: companyId,
      };

      if (item?.clause_type) {
        lineItem.clause_type = item.clause_type;
      }

      if (item?.enum_values !== undefined) {
        lineItem.enum_values = item.enum_values;
      }

      if (item?.link_type) {
        lineItem.link_type = item.link_type;
      }

      if (item?.link_action) {
        lineItem.link_action = item.link_action;
      }

      if (item?.link_mode) {
        lineItem.link_mode = item.link_mode;
      }

      return lineItem;
    });
  }

  private buildTreeBuilderModuleJson(record: any): any {
    // For tree_builder_module type: includes all lineitems and status_id
    const companyId = Number(record?.company_id ?? 1);
    return {
      name: record?.name || '',
      entity_name: record?.entity_name || '',
      entity_type: record?.entity_type || '',
      primary_table: record?.primary_table || '',
      query_information: record?.query_information && typeof record.query_information === 'object' ? record.query_information : {},
      company_id: companyId,
      status_id: record?.status_id ?? 1,
      associated_tables: Array.isArray(record?.associated_tables) ? record.associated_tables : [],
      lineitems: this.buildTreeBuilderLineItems(record?.items, companyId),
    };
  }

  private buildGenericModuleJson(record: any): any {
    // Generic handler for all remaining module types
    // Includes optional fields conditionally based on existence
    const companyId = Number(record?.company_id ?? 1);
    const genericJson: any = {
      name: record?.name || '',
      entity_name: record?.entity_name || '',
      entity_type: record?.entity_type || '',
      company_id: companyId,
      lineitems: Array.isArray(record?.items) ? this.buildTreeBuilderLineItems(record.items, companyId) : [],
    };

    // Add optional fields if they exist
    if (record?.is_admin_module !== undefined && record?.is_admin_module !== null) {
      genericJson.is_admin_module = this.normalizeBoolean(record.is_admin_module);
    }

    if (record?.primary_table !== undefined && record?.primary_table !== null) {
      genericJson.primary_table = record.primary_table;
    }

    if (record?.static_page_content !== undefined && record?.static_page_content !== null) {
      genericJson.static_page_content = record.static_page_content;
    }

    if (record?.query_information !== undefined && record?.query_information !== null && typeof record.query_information === 'object') {
      genericJson.query_information = record.query_information;
    }

    if (record?.form_information !== undefined && record?.form_information !== null && typeof record.form_information === 'object') {
      genericJson.form_information = record.form_information;
    }

    if (record?.add_query_information !== undefined && record?.add_query_information !== null && typeof record.add_query_information === 'object') {
      genericJson.add_query_information = record.add_query_information;
    }

    if (record?.edit_query_information !== undefined && record?.edit_query_information !== null && typeof record.edit_query_information === 'object') {
      genericJson.edit_query_information = record.edit_query_information;
    }

    if (record?.preset_query_information !== undefined && record?.preset_query_information !== null && typeof record.preset_query_information === 'object') {
      genericJson.preset_query_information = record.preset_query_information;
    }

    if (record?.associated_tables !== undefined && record?.associated_tables !== null) {
      genericJson.associated_tables = Array.isArray(record.associated_tables) ? record.associated_tables : [];
    }

    if (record?.export_template_id !== undefined && record?.export_template_id !== null) {
      genericJson.export_template_id = record.export_template_id;
    }

    if (record?.export_template_file_name !== undefined && record?.export_template_file_name !== null) {
      genericJson.export_template_file_name = record.export_template_file_name;
    }

    return genericJson;
  }

  private buildDashboardWizardBuilderModuleJson(record: any): any {
    // For dashboard_wizard_builder_module type
    // Focused on dashboard configuration with query and static content
    return {
      name: record?.name || '',
      entity_name: record?.entity_name || '',
      entity_type: record?.entity_type || '',
      query_information: record?.query_information && typeof record.query_information === 'object' ? record.query_information : {},
      static_page_content: record?.static_page_content ?? null,
      dashboard_wizard_type: record?.dashboard_wizard_type || 'static',
      dashboard_wizard_rows: record?.dashboard_wizard_rows ?? 1,
      dashboard_wizard_columns: record?.dashboard_wizard_columns ?? 1,
      dashboard_wizard_order_no: record?.dashboard_wizard_order_no ?? 0,
      dashboard_wizard_options: record?.dashboard_wizard_options ?? null,
    };
  }

  private transformGetCodeRecords(records: any[]): any {
    if (!Array.isArray(records) || records.length === 0) {
      return [];
    }

    const formBuilderTypes = [
      'form_builder_module',
      'email_template_assignment_module',
      'ai_playground_module',
      'query_builder_module',
      'whatsapp_template_assignment_module',
      'approval_workflow_assignment_module',
      'static_page_builder_module',
    ];

    const genericModuleTypes = [
      'common_permission_module',
      'export_module',
      'transfer_data_module',
      'user_role_policy_module',
      'policy_add_edit_module',
      'import_module',
      'approval_requests_module',
      'approval_requests_tracking_module',
      'about_lcp_form_module',
      'cron_setting_module',
      'child_process_setting_module',
      'carousel_module',
      'barcode_print_module',
      'target_keywords_embeddings_module',
      'export_template_module',
      'menu_module',
      'entity_user_role_map_module',
      'entity_form_module',
      'language_contents_module',
      'help_page_module',
      'configurations_module',
      'user_configurations_module',
    ];

    const transformed = records.map((record: any) => {
      const entityType = record?.entity_type || '';

      if (entityType === 'dashboard_wizard_builder_module') {
        return this.buildDashboardWizardBuilderModuleJson(record);
      }

      if (entityType === 'tree_builder_module') {
        return this.buildTreeBuilderModuleJson(record);
      }

      if (entityType === 'job_builder_module') {
        return this.buildJobBuilderModuleJson(record);
      }

      if (formBuilderTypes.includes(entityType)) {
        return this.buildFormBuilderModuleJson(record);
      }

      if (genericModuleTypes.includes(entityType)) {
        return this.buildGenericModuleJson(record);
      }

      // Default to grid_builder_module style for other types
      return this.buildGridBuilderModuleJson(record);
    });

    return transformed.length === 1 ? transformed[0] : transformed;
  }

  getCode(item: any, event?: MouseEvent) {
    if (item) {
      const listParams = {
        company_id: 1,
        print_query: true,
        primary_table: 'master_entities',
        start_index: 0,
        limit_range: 1,
        sort_columns: [['master_entities.id', 'desc']],
        search_all: [
          {
            value: item.id,
            operator: '=',
            column_name: 'master_entities.id',
          },
        ],
        select_columns: [
          ['master_entities.*'],

          [
            "CASE WHEN COUNT(master_entity_line_items.id) = 0 THEN null ELSE COALESCE(Json_agg(DISTINCT jsonb_build_object('id', master_entity_line_items.id,'field_name', master_entity_line_items.field_name,'display_name', master_entity_line_items.display_name,'field_html_content', master_entity_line_items.field_html_content,'order_no', master_entity_line_items.order_no,'link_type', master_entity_line_items.link_type,'link_action', master_entity_line_items.link_action,'link_mode', master_entity_line_items.link_mode,'is_grid_column', master_entity_line_items.is_grid_column,'is_searchable', master_entity_line_items.is_searchable,'is_sortable', master_entity_line_items.is_sortable,'field_type_id', master_entity_line_items.field_type_id, 'clause_type', master_entity_line_items.clause_type, 'enum_values', master_entity_line_items.enum_values))) END",
            'items',
          ],
        ],
        includes: [
          {
            table_name: 'master_entity_line_items',
            join_type: 'LEFT',
            join_condition: `master_entities.id = master_entity_line_items.master_grid_id`,
          },
        ],
        group_by: ['master_entities.id'],
      };

      this.gridApiService.getAllList(listParams).subscribe((response) => {
        if (response.status && response.code === 200) {
          const records = response?.data?.records || [];
          const transformedData = this.transformGetCodeRecords(records);
          this.getCodeForm.patchValue({ codeContent: JSON.stringify(transformedData, null, 2) });
          this.isGetCodeModalOpen = true;
        }
      });
    }
  }

  closeGetCodeModal() {
    this.isGetCodeModalOpen = false;
    this.getCodeForm.reset({ codeContent: '' });
  }

  copyGetCodeContent(): void {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();

    if (selectedText) {
      navigator.clipboard
        .writeText(selectedText)
        .then(() => {
          this.toastr.success('Selection copied to clipboard!', 'Success');
        })
        .catch((err) => {
          console.error('Failed to copy selection:', err);
          this.toastr.error('Failed to copy selection', 'Error');
        });
      return;
    }

    const content = this.getCodeForm.get('codeContent')?.value;

    if (!content || String(content).trim() === '') {
      this.toastr.warning('No content to copy', 'Warning');
      return;
    }

    navigator.clipboard
      .writeText(content)
      .then(() => {
        this.toastr.success('Content copied to clipboard!', 'Success');
      })
      .catch((err) => {
        console.error('Failed to copy:', err);
        this.toastr.error('Failed to copy content', 'Error');
      });
  }

  exportTable(item: any) {
    if (this.masterInfo.permissions.export_excel || this.masterInfo.permissions.export_pdf) {
      this.loading = true;
      if (
        (this.masterInfo.permissions.export_excel && this.masterInfo.children.export_excel.component_class_name == 'export_module') ||
        (this.masterInfo.permissions.export_pdf && this.masterInfo.children.export_pdf.component_class_name == 'export_module')
      ) {
        //const filteredHeaders = headers.filter((header) => header.header !== 'id' && header.header !== 'uuid');

        this.exportItem(item);
      } else {
        const query = { ...this.listQuery };
        query.limit_range = 1000000;
        query.start_index = 0;
        let listParams = this.localStorageService.replaceUniqueId(
          this.localStorageService.formatPayloadWithPolicyConditions(query, this.policyData, this.attachedPolicies),
          '$session_user_id',
          this.user_info.main.id
        );
        const gridParams: any = {};
        Object.keys(item).forEach((key) => {
          if (key.startsWith('gparam_')) {
            let temp_key = '$' + key;
            gridParams[temp_key] = item[key];
          }
        });
        if (this.grid_params || gridParams) {
          listParams.grid_params = this.grid_params || gridParams;
        }
        listParams = this.localStorageService.replaceUniqueId(listParams, '$unique_id', this.uniqueId || '');
        this.gridApiService.getAllRecords(listParams).subscribe(
          (response) => {
            if (response.status && response.code === 200) {
              if (response.data.records && response.data.headers) {
                const filteredData = this.filterAndTransformData(response.data.headers, response.data.records);
                if (item.type == 'pdf') {
                  const export_download =
                    this.masterInfo?.children?.export_pdf?.export_template_file_name &&
                    this.masterInfo?.children?.export_pdf?.export_template_file_name?.trim() !== ''
                      ? this.masterInfo?.children?.export_pdf?.export_template_file_name
                      : this.masterInfo?.Listname.replace('_grid', '') + '_table_data';

                  this.exportService.exportToPDF(filteredData, export_download);
                } else {
                  const export_download =
                    this.masterInfo?.children?.export_excel?.export_template_file_name &&
                    this.masterInfo?.children?.export_excel?.export_template_file_name?.trim() !== ''
                      ? this.masterInfo?.children?.export_excel?.export_template_file_name
                      : this.masterInfo?.Listname.replace('_grid', '') + '_table_data';
                  this.exportService.exportToExcel(filteredData, export_download);
                }
                this.loading = false;
              }
            } else {
              this.loading = false;
              this.items = [];
              this.totalItems = 0;
              this.previewTotalItems = 0;

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
    const filteredHeaders = headers.filter(
      (header) =>
        header.header !== 'id' &&
        header.header !== 'uuid' &&
        !String(header.header || '').startsWith('gparam_') &&
        header.is_grid_column !== false &&
        header.is_grid_column !== 'false'
    );

    const transformedRecords = records.map((record) => {
      const transformedRecord: any = {};

      filteredHeaders.forEach((header) => {
        const translationKey = `${header.header}`;

        const translatedHeader = this.translate.instant(translationKey);
        if (header.field_type_id == '5') {
          transformedRecord[translatedHeader] = this.timezoneService.transformDateOnly(record[header.header]);
        } else if (header.field_type_id == '6') {
          transformedRecord[translatedHeader] = this.timezoneService.transformTimeOnly(record[header.header]);
        } else if (header.field_type_id == '7') {
          transformedRecord[translatedHeader] = this.timezoneService.transformDateTime(record[header.header]);
        } else if (header.header == 'status' && header.enum_values == null) {
          transformedRecord[translatedHeader] = this.getStatusTranslation(record[header.header]);
        } else if (header.header == 'process_status' && header.enum_values == null) {
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
    this.isGridBootstrapReady = false;
    this.pendingGridFetchRequest = false;
    this.queuedInitialFetchParams = null;
    this.hasInitialGridFetchStarted = false;
    if (this.savedViewInitialFallbackTimer) {
      clearTimeout(this.savedViewInitialFallbackTimer);
      this.savedViewInitialFallbackTimer = null;
    }
    this.gridApiService.getAttachedPolicies({ entity_name: params.entity_name }).subscribe(
      (response) => {
        if (response.status && response.code === 200) {
          this.EntityName = params.entity_name;
          this.attachedPolicies = response.data.attached_policies || [];
          this.accepted_parent_params = response.data.accepted_parent_params || {};
        }
      },
      (error) => {
        const key = 'error';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
      },
      () => {
        this.fetchColumns(this.listQuery).finally(() => {
          this.isGridBootstrapReady = true;
          const savedState = this.getSavedViewStateForCurrentEntity();
          if (savedState) {
            const normalizedSavedState = this.parseSavedViewState(savedState);
            this.applySavedViewStateToListQuery(normalizedSavedState);
            this.ignoreNextSavedViewPageChange = true;
          } else {
            this.ignoreNextSavedViewPageChange = false;
          }

          this.applyAcceptedParentFiltersToListQuery();

          this.pendingGridFetchRequest = false;
          this.queuedInitialFetchParams = null;
          this.fetchData(this.listQuery);
        });
      }
    );
  }

  private requestGridFetch(params: FetchDataParams): void {
    if (!this.isGridBootstrapReady) {
      this.pendingGridFetchRequest = true;
      this.queuedInitialFetchParams = params;
      return;
    }

    this.fetchData(params);
  }

  private flushPendingGridFetchRequest(): void {
    if (!this.isGridBootstrapReady || !this.pendingGridFetchRequest) return;
    const params = this.queuedInitialFetchParams || this.listQuery;
    this.pendingGridFetchRequest = false;
    this.queuedInitialFetchParams = null;
    this.fetchData(params);
  }

  private hasSavedViewForCurrentEntity(): boolean {
    try {
      const isSaveFilterEnabled = this.config?.save_grid_views == 'true' && this.config?.save_grid_views;
      if (!isSaveFilterEnabled) return false;

      const userDataRaw = this.localStorageService.getData('user_data');
      const userData = typeof userDataRaw === 'string' ? JSON.parse(userDataRaw || '{}') : userDataRaw || {};
      const configurations = userData?.main?.user_search_configurations;
      if (!Array.isArray(configurations) || configurations.length === 0) return false;

      const entitySlug = String(this.listQuery?.entity_name || this.masterInfo?.ListQuery?.entity_name || this.masterInfo?.entity_name || this.title || '');
      if (!entitySlug) return false;

      return configurations.some((item: any) => String(item?.entity_slug || item?.key || '') === entitySlug);
    } catch {
      return false;
    }
  }

  private getSavedViewStateForCurrentEntity(): any | null {
    try {
      const isSaveFilterEnabled = this.config?.save_grid_views == 'true' && this.config?.save_grid_views;
      const isLatestStateEnabled = this.save_grid_latest_state;
      if (!isSaveFilterEnabled && !isLatestStateEnabled) return null;

      const entitySlug = String(this.listQuery?.entity_name || this.masterInfo?.ListQuery?.entity_name || this.masterInfo?.entity_name || this.title || '');
      if (!entitySlug) return null;

      const tempState = this.getTempViewStateForEntity(entitySlug);

      if (!isSaveFilterEnabled) {
        return tempState;
      }

      const userDataRaw = this.localStorageService.getData('user_data');
      const userData = typeof userDataRaw === 'string' ? JSON.parse(userDataRaw || '{}') : userDataRaw || {};
      const configurations = Array.isArray(userData?.main?.user_search_configurations) ? userData.main.user_search_configurations : [];
      if (!configurations.length) return tempState;

      const entityViews = configurations.filter((item: any) => String(item?.entity_slug || item?.key || '') === entitySlug);
      if (!entityViews.length) return tempState;

      const selectedView = entityViews.find((item: any) => !!item?.is_default) || entityViews[0];
      const selectedViewName = String(selectedView?.view_name || 'Default View')
        .trim()
        .toLowerCase();
      const tempConfig = this.getTempViewConfigForEntity(entitySlug);
      const tempViewName = String(tempConfig?.view_name || '')
        .trim()
        .toLowerCase();

      if (tempState && tempViewName && tempViewName === selectedViewName) {
        return tempState;
      }

      return this.parseSavedViewState(selectedView?.search_values || selectedView?.state || null);
    } catch {
      return null;
    }
  }

  private getTempViewConfigForEntity(entitySlug: string): any | null {
    if (!this.save_grid_latest_state) return null;
    const rawTemp = this.localStorageService.getData(this.USER_SEARCH_CONFIGURATIONS_TEMP_KEY);
    const parsedTemp = typeof rawTemp === 'string' ? this.parseSavedViewState(rawTemp) : rawTemp;
    if (!Array.isArray(parsedTemp)) return null;

    return parsedTemp.find((item: any) => String(item?.entity_slug || '') === entitySlug && !!item?.localstoreOnly) || null;
  }

  private getTempViewStateForEntity(entitySlug: string): any | null {
    const tempConfig = this.getTempViewConfigForEntity(entitySlug);
    return this.parseSavedViewState(tempConfig?.search_values || null);
  }

  private parseSavedViewState(state: any): any | null {
    if (!state) return null;
    if (typeof state === 'string') {
      try {
        return JSON.parse(state);
      } catch {
        return null;
      }
    }
    return state;
  }

  private mapSearchOperator(condition: string): string {
    switch ((condition || '').toLowerCase()) {
      case 'contains':
        return 'ILIKE';
      case 'not_contains':
        return 'NOT ILIKE';
      case 'starts_with':
      case 'ends_with':
        return 'ILIKE';
      case 'is_empty':
        return '=';
      case 'is_not_empty':
        return '<>';
      case 'in':
        return 'IN';
      case 'not_in':
        return 'NOT IN';
      case 'is_null':
        return 'IS NULL';
      case 'is_not_null':
        return 'IS NOT NULL';
      case 'between':
        return 'BETWEEN';
      default:
        return condition || '=';
    }
  }

  private getNoValueOperatorSQL(operator: string): string {
    switch ((operator || '').toLowerCase()) {
      case 'is_null':
        return 'IS NULL';
      case 'is_empty':
        return 'IS_EMPTY';
      case 'is_not_null':
        return 'IS NOT NULL';
      case 'is_not_empty':
        return 'IS_NOT_EMPTY';
      default:
        return '';
    }
  }

  private addSearchWildcards(condition: string, value: any): any {
    const normalized = (condition || '').toLowerCase();
    const text = String(value ?? '');
    switch ((condition || '').toLowerCase()) {
      case 'contains':
      case 'not_contains':
        return `%${text}%`;
      case 'starts_with':
        return `${text}%`;
      case 'ends_with':
        return `%${text}`;
      case 'in':
      case 'not_in': {
        if (Array.isArray(value)) {
          return value;
        }
        return String(value || '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
      }
      default:
        return value;
    }
  }

  private getInputTypeForSavedFilter(columnName: string): string {
    const fieldTypeId = this.selectcolumns.find((column: any) => String(column?.field || column?.field_name || '') === String(columnName || ''))?.field_type_id;
    switch (Number(fieldTypeId)) {
      case 5:
      case 10:
        return 'date';
      case 6:
        return 'time';
      case 7:
        return 'datetime-local';
      default:
        return 'text';
    }
  }

  private normalizeSavedFilterValue(columnName: string, operator: string, value: any): any {
    if ((operator || '').toLowerCase() === 'between') {
      if (Array.isArray(value)) return value;
      if (value && typeof value === 'object' && 'start' in value && 'end' in value) {
        return [value.start, value.end];
      }
      return value;
    }

    let normalizedValue = value;
    const inputType = this.getInputTypeForSavedFilter(columnName);

    if (typeof normalizedValue === 'string') {
      if (inputType === 'datetime-local' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(normalizedValue)) {
        normalizedValue = this.timezoneService.transformDisplayDateTimeToUTC(normalizedValue, 'yyyy-MM-dd HH:mm') || normalizedValue;
      } else if (inputType === 'time' && /^\d{2}:\d{2}(:\d{2})?$/.test(normalizedValue)) {
        normalizedValue = this.timezoneService.transformDisplayDateTimeToUTC(normalizedValue, 'HH:mm') || normalizedValue;
      } else if (inputType === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) {
        normalizedValue = this.timezoneService.transformDateOnly(normalizedValue) || normalizedValue;
      }
    }

    return this.addSearchWildcards(operator, normalizedValue);
  }

  private applySavedViewStateToListQuery(state: any): void {
    state = this.parseSavedViewState(state);
    if (!state || !this.listQuery || !this.defaultQuery) return;

    const baseQuery = JSON.parse(JSON.stringify(this.defaultQuery));
    this.listQuery = {
      ...baseQuery,
      entity_name: this.listQuery.entity_name || baseQuery.entity_name,
    };

    const searchCondition = String(state?.searchCondition || 'contains');
    const commonSearch = String(state?.commonSearch || '').trim();
    const selectedSearchColumns = Array.isArray(state?.selectedSearchColumns) ? state.selectedSearchColumns.map((c: any) => String(c)) : [];

    const defaultWhereColumns = Array.isArray(baseQuery?.search_any)
      ? baseQuery.search_any.map((item: any) => String(item?.column_name || '')).filter(Boolean)
      : [];

    const selectableWhereColumns = Array.isArray(this.selectcolumns)
      ? this.selectcolumns
          .filter((column: any) => column?.searchable && Number(column?.field_type_id) >= 3 && Number(column?.field_type_id) <= 4)
          .map((column: any) => String(column?.field || column?.field_name || ''))
          .filter(Boolean)
      : [];

    const whereColumns = selectedSearchColumns.length ? selectedSearchColumns : defaultWhereColumns.length ? defaultWhereColumns : selectableWhereColumns;
    if (commonSearch && whereColumns.length) {
      const operator = this.mapSearchOperator(searchCondition);
      const value = this.addSearchWildcards(searchCondition, commonSearch);
      this.listQuery.search_any = whereColumns.map((column_name: string) => ({ column_name, operator, value }));
    }

    const savedFilters = Array.isArray(state?.appliedFilterConditions) ? state.appliedFilterConditions : [];
    if (savedFilters.length) {
      const whereFilters = savedFilters
        .filter((item: any) => (item?.clause_type || 'where') !== 'having')
        .map((item: any) => ({
          column_name: item?.field,
          operator: this.mapSearchOperator(item?.operator),
          value: ['is_empty', 'is_not_empty', 'is_null', 'is_not_null'].includes(String(item?.operator || '').toLowerCase())
            ? this.getNoValueOperatorSQL(item?.operator)
            : Array.isArray(item?.enum_values) && item.enum_values.length
            ? item.enum_values
            : this.normalizeSavedFilterValue(item?.field, item?.operator, item?.value),
        }))
        .filter((item: any) => !!item.column_name);

      const havingFilters = savedFilters
        .filter((item: any) => (item?.clause_type || 'where') === 'having')
        .map((item: any) => ({
          column_name: item?.field,
          operator: this.mapSearchOperator(item?.operator),
          value: ['is_empty', 'is_not_empty', 'is_null', 'is_not_null'].includes(String(item?.operator || '').toLowerCase())
            ? this.getNoValueOperatorSQL(item?.operator)
            : Array.isArray(item?.enum_values) && item.enum_values.length
            ? item.enum_values
            : this.normalizeSavedFilterValue(item?.field, item?.operator, item?.value),
        }))
        .filter((item: any) => !!item.column_name);

      const useAnd = state?.filterCondition !== undefined ? !!state.filterCondition : true;
      if (whereFilters.length) {
        if (useAnd) {
          this.listQuery.search_all = [...(Array.isArray(baseQuery?.search_all) ? baseQuery.search_all : []), ...whereFilters];
        } else {
          this.listQuery.search_any = [...(Array.isArray(baseQuery?.search_any) ? baseQuery.search_any : []), ...whereFilters];
        }
      }

      if (havingFilters.length) {
        if (useAnd) {
          this.listQuery.having_conditions = havingFilters;
          this.listQuery.having_any_conditions = [];
        } else {
          this.listQuery.having_any_conditions = havingFilters;
          this.listQuery.having_conditions = [];
        }
      }
    }

    const savedSortColumns = Array.isArray(state?.sortColumns) ? state.sortColumns : [];
    if (savedSortColumns.length) {
      this.listQuery.sort_columns = savedSortColumns.map((item: any) => [item?.key, item?.direction]).filter((item: any[]) => !!item[0] && !!item[1]);
    }

    const savedResultsPerPage = Number(state?.resultsPerPage);
    if (savedResultsPerPage > 0) {
      this.resultsPerPage = savedResultsPerPage;
      this.listQuery.limit_range = savedResultsPerPage;
    }

    const savedCurrentPage = Number(state?.currentPage);
    this.currentPage = savedCurrentPage > 0 ? savedCurrentPage : 1;
    this.listQuery.start_index = (this.currentPage - 1) * Number(this.resultsPerPage || 10);
  }

  fetchColumns(params: FetchDataParams): Promise<void> {
    return new Promise((resolve) => {
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
          resolve();
        },
        () => resolve()
      );
    });
  }

  fetchData(params: FetchDataParams) {
    this.hasInitialGridFetchStarted = true;
    if (this.savedViewInitialFallbackTimer) {
      clearTimeout(this.savedViewInitialFallbackTimer);
      this.savedViewInitialFallbackTimer = null;
    }
    this.gridloading = true;
    const effectiveParams = this.mergeAcceptedParentFiltersIntoParams(params);
    effectiveParams.limit_range = this.resultsPerPage;
    const effectiveUniqueId = this.selectedItemUuid || this.uniqueId || this.uuid || null;
    let payload = this.localStorageService.replaceUniqueId(
      this.localStorageService.formatPayloadWithPolicyConditions(effectiveParams, this.policyData, this.attachedPolicies),
      '$session_user_id',
      this.user_info.main.id
    );

    if (this.uniqueId) {
      payload.unique_id = this.uniqueId;
    }

    if (this.uuid) {
      payload.unique_id = this.uuid;
    }
    this.grid_unique_id = payload.unique_id;

    if (this.grid_params) {
      payload.grid_params = this.grid_params;
    }
    if (this.attachedPolicies) {
      payload.attached_policies = this.attachedPolicies;
    }
    payload = this.localStorageService.replaceUniqueId(payload, '$unique_id', this.uniqueId || '');

    this.gridApiService.getAllRecords(payload).subscribe(
      (response) => {
        if (response.status && response.code === 200) {
          this.entities = response.data?.entities || [];
          this.headerStaticEntityName = response.data?.entities?.header_entity_id;
          this.footerStaticEntityName = response.data?.entities?.footer_entity_id;

          if (response.data.headers) {
            if (this.headercolumns.length == 0) {
              const data = response.data.headers
                .filter((key: any) => key.is_grid_column == 'true')
                .map((key: any) => ({
                  ...key,
                  column_width: '40px',
                }));

              // Action menu will be only enabled if any one of the permission except 'child_details' & 'create' is true
              const enableActionMenu = Object.entries(this.masterInfo.permissions).some(
                ([key, value]) => !['child_details', 'create', 'export_excel', 'export_pdf'].includes(key) && value === true
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
                    field_html_content: false,
                  },
                  ...data,
                ];

                // Add 'Action' column if permissions are not limited to view/export
                if (enableActionMenu) {
                  this.headercolumns.push({
                    header: 'table_column_action',
                    field_value: 'Action',
                    is_sortable: 'false',
                    column_order: '0.00',
                    column_width: '50px',
                    is_searchable: 'false',
                    is_grid_column: 'true',
                    field_html_content: false,
                  });
                }
              } else {
                this.headercolumns = [...data];

                if (enableActionMenu) {
                  this.headercolumns.push({
                    header: 'table_column_action',
                    field_value: 'Action',
                    is_sortable: 'false',
                    column_order: '0.00',
                    column_width: '50px',
                    is_searchable: 'false',
                    is_grid_column: 'true',
                    field_html_content: false,
                  });
                }
              }
            }

            // Adding custom templates
            this.headercolumns = this.headercolumns.map((item: any) => {
              if (item.header === 'status' && item.enum_values == null) {
                return {
                  ...item,
                  customTemplate: this.statusTemplate,
                };
              } else if (item.header === 'process_status' && item.enum_values == null) {
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
                if (formattedItem.hasOwnProperty(key) && this.isDate(formattedItem[key])) {
                  this.headercolumns = this.headercolumns.map((headerItem: any) => {
                    if (headerItem.header === key) {
                      if (headerItem.field_type_id == 5) {
                        const transformedDate = this.timezoneService.transformDateOnly(formattedItem[key]);
                        if (transformedDate) {
                          formattedItem[key] = transformedDate;
                        }
                      } else if (headerItem.field_type_id == 6) {
                        const transformedDate = this.timezoneService.transformTimeOnly(formattedItem[key]);
                        if (transformedDate) {
                          formattedItem[key] = transformedDate;
                        }
                      } else if (headerItem.field_type_id == 7) {
                        const transformedDate = this.timezoneService.transformDateTime(formattedItem[key]);
                        if (transformedDate) {
                          formattedItem[key] = transformedDate;
                        }
                      }
                    }
                    return headerItem;
                  });
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

            const selectedRecord = this.resolveRecordForStaticPageContext(response.data.records);
            if (selectedRecord) {
              if (!this.selectedItemUuid && selectedRecord.uuid) {
                this.selectedItemUuid = selectedRecord.uuid;
              }
              this.popupComponentGridParams = this.extractGridParamsFromRecord(selectedRecord);
            }

            this.totalItems = response.data.total_records;
            this.gridloading = false;
          } else {
            this.items = [];
            this.totalItems = 0;
            this.gridloading = false;
          }
        } else {
          this.entities = [];
          this.headerStaticEntityName = '';
          this.footerStaticEntityName = '';
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
        this.entities = [];
        this.headerStaticEntityName = '';
        this.footerStaticEntityName = '';
      }
    );
  }

  private resolveRecordForStaticPageContext(records: any[]): any | null {
    if (!Array.isArray(records) || records.length === 0) {
      return null;
    }

    if (this.selectedItemUuid) {
      const selectedByState = records.find((record: any) => record?.uuid === this.selectedItemUuid);
      if (selectedByState) {
        return selectedByState;
      }
    }

    const routeBasedUniqueId = this.uniqueId || this.uuid;
    if (routeBasedUniqueId) {
      const selectedByRoute = records.find((record: any) => record?.uuid === routeBasedUniqueId || record?.id == routeBasedUniqueId);
      if (selectedByRoute) {
        return selectedByRoute;
      }
    }

    if (records.length === 1) {
      return records[0];
    }

    return null;
  }

  private extractGridParamsFromRecord(record: any): any {
    if (!record || typeof record !== 'object') {
      return null;
    }

    const gridParams: any = {};
    Object.keys(record).forEach((key) => {
      if (key.startsWith('gparam_') && record[key] !== undefined && record[key] !== null) {
        gridParams[`$${key}`] = record[key];
      }
    });

    return Object.keys(gridParams).length ? gridParams : null;
  }

  private resolveStaticPageEntities(entities: any[]) {
    if (!Array.isArray(entities) || entities.length === 0) {
      this.headerStaticEntityName = '';
      this.footerStaticEntityName = '';
      return;
    }

    const currentEntityName = this.listQuery?.entity_name || this.entity_name || this.masterInfo?.ListQuery?.entity_name;
    const currentEntity = entities.find(
      (entity: any) =>
        entity?.entity_name === currentEntityName ||
        entity?.value === currentEntityName ||
        entity?.name === currentEntityName ||
        entity?.slug === currentEntityName
    );

    if (!currentEntity) {
      this.headerStaticEntityName = '';
      this.footerStaticEntityName = '';
      return;
    }

    this.headerStaticEntityName = this.resolveEntityNameByIdentifier(entities, currentEntity?.header_entity_id);

    this.footerStaticEntityName = this.resolveEntityNameByIdentifier(entities, currentEntity?.footer_entity_id);
  }

  private resolveEntityNameByIdentifier(entities: any[], identifier: any): string {
    if (!identifier) {
      return '';
    }

    const entity = entities.find(
      (item: any) =>
        item?.id == identifier || item?.uuid == identifier || item?.entity_name == identifier || item?.value == identifier || item?.slug == identifier
    );

    return entity?.entity_name || entity?.value || '';
  }

  private async executeJob(inputObject: any): Promise<void> {
    if (inputObject.record_info.id) {
      let job_query_information = this.localStorageService.replaceUniqueId(inputObject.query_information, '$unique_id', inputObject.record_info.id);

      const gparams = this.collectRecordGParams(inputObject.record_info);
      Object.keys(gparams).forEach((key) => {
        job_query_information = this.localStorageService.replaceUniqueId(job_query_information, `$${key}`, gparams[key]);
      });

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

  private collectRecordGParams(recordInfo: any): Record<string, any> {
    const gparams: Record<string, any> = {};

    if (!recordInfo || typeof recordInfo !== 'object') {
      return gparams;
    }

    Object.keys(recordInfo).forEach((key) => {
      if (key.startsWith('gparam_') && recordInfo[key] !== undefined && recordInfo[key] !== null) {
        gparams[key] = recordInfo[key];
      }
    });

    const aggregated = recordInfo.gparam;
    if (typeof aggregated === 'string' && aggregated.trim()) {
      try {
        const decoded = decodeURIComponent(aggregated);
        const parsed = JSON.parse(decoded);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          Object.keys(parsed).forEach((key) => {
            if (key.startsWith('gparam_') && parsed[key] !== undefined && parsed[key] !== null) {
              gparams[key] = parsed[key];
            }
          });
        }
      } catch {
        try {
          const parsed = JSON.parse(aggregated);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            Object.keys(parsed).forEach((key) => {
              if (key.startsWith('gparam_') && parsed[key] !== undefined && parsed[key] !== null) {
                gparams[key] = parsed[key];
              }
            });
          }
        } catch {}
      }
    }

    return gparams;
  }

  isDate(value: any): boolean {
    // Check if the value is a valid date
    return !isNaN(Date.parse(value));
  }

  formatDate(value: string): string | null {
    return this.timezoneService.transformDateOnly(value);
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

    if (action === 'addNew' && this.masterInfo.children.popup_add) {
      // Permission check for popup_add
      if (!this.masterInfo.permissions.popup_create && !this.masterInfo.permissions.create) {
        this.noPopupPermission = true;
        this.isViewPopupOpen = true;
        return;
      }
      this.loadingpopup = true;
      this.popupName = 'popup_add';
      this.selectedItemUuid = null;
      this.popupEntityName = this.masterInfo.children.popup_add.entity_name;
      this.isViewPopupOpen = true;
      setTimeout(() => {
        this.loadingpopup = false;
      }, 500);
    }
  }
  editPopupItem(item: any) {
    // Permission check for popup_edit
    if (!this.masterInfo.permissions.popup_edit && !this.masterInfo.permissions.edit) {
      this.noPopupPermission = true;
      this.isViewPopupOpen = true;
      return;
    }
    this.loadingpopup = true;
    this.popupName = 'popup_edit';
    this.selectedItemUuid = item.uuid;
    this.popupEntityName = this.masterInfo.children.popup_edit.entity_name;
    this.isViewPopupOpen = true;

    // Extract gparams from item
    const gridParams: any = {};
    Object.keys(item).forEach((key) => {
      if (key.startsWith('gparam_')) {
        let temp_key = '$' + key;
        gridParams[temp_key] = item[key];
      }
    });
    this.popupComponentGridParams = gridParams;

    setTimeout(() => {
      this.loadingpopup = false;
    }, 500);
  }

  previewPopupItem(item: any) {
    this.noPopupPermission = true;
    this.previewPopupPermission = true;
    let name = item.entity_name;
    this.previewTitle = item.entity_name;
    this.selectedItemEntityType = item.entity_type;
    this.selectedItemUuid = item.uuid;
    this.popupEntityName = name;
    this.isViewPopupOpen = true;

    if (this.selectedItemEntityType == 'grid_builder_module') {
      this.loadingpopup = true;
      this.gridApiService.getEntityDetails(name).subscribe((response) => {
        if (response.status && response.code === 200) {
          this.previewDefaultQuery = response.data.query_information;
          this.previewListQuery = response.data.query_information;
          this.previewFetchColumns(this.previewListQuery);
          this.previewFetchData(this.previewListQuery);
        }
      });
      setTimeout(() => {
        this.loadingpopup = false;
      }, 500);
    } else {
      this.previewHeaderColumns = [];
      this.previewTotalItems = 0;
      this.previewItems = [];
      this.previewCurrentPage = 1;
      this.previewResultsPerPage = 10;
    }
  }

  previewFetchColumns(params: any) {
    this.gridApiService.getAllColumns({ entity_name: params.entity_name }).subscribe(
      (response) => {
        if (response.status && response.code === 200) {
          const data = response.data.records.map((key: any, index: any) => {
            return {
              field: key.field_name,
              previewTitle: this.translate.instant(key.display_name),
              sorting: key.is_sortable,
              searchable: key.is_searchable,
              enable: true,
              ...key,
            };
          });

          this.previewSelectColumns = [
            {
              field: 'S.No',
              previewTitle: 'S.No',
              sorting: false,
              searchable: false,
              enable: false,
              field_type_id: 1,
            },
            ...data,
            {
              field: 'Status',
              previewTitle: 'Status',
              sorting: false,
              searchable: false,
              enable: false,
              field_type_id: 1,
            },
            {
              field: 'Action',
              previewTitle: 'Action',
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

  previewFetchData(params: any) {
    delete params.group_by;
    delete params.sort_columns;
    delete params.includes;
    params.limit_range = this.previewResultsPerPage;
    this.gridApiService.getAllRecords(params).subscribe((response) => {
      if (response.status && response.code === 200) {
        if (response.data.headers) {
          const data = response.data.headers
            .filter((key: any) => key.is_grid_column == 'true')
            .map((key: any) => ({
              ...key,
              column_width: '40px',
            }));

          // Include serial number column if enabled in config
          if (this.config.grid_show_serial_number == 'true') {
            this.previewHeaderColumns = [
              {
                header: 'table_column_sno',
                field_value: 'S.No',
                is_sortable: 'false',
                column_order: '0.00',
                column_width: '40px',
                is_searchable: 'false',
                is_grid_column: 'true',
                field_html_content: false,
              },
              ...data,
            ];
          } else {
            this.previewHeaderColumns = [...data];
          }
          // }

          // Adding custom templates
          this.previewHeaderColumns = this.previewHeaderColumns.map((item: any) => {
            if (item.header === 'status' && item.enum_values == null) {
              return {
                ...item,
                customTemplate: this.statusTemplate,
              };
            } else if (item.header === 'process_status' && item.enum_values == null) {
              return {
                ...item,
                customTemplate: this.processStatusTemplate,
              };
            } else {
              return { ...item };
            }
          });
        }

        // Processing records
        if (response.data.records) {
          this.previewItems = response.data.records.map((item: any, index: any) => {
            const formattedItem = { ...item };
            for (const key in formattedItem) {
              if (
                formattedItem.hasOwnProperty(key) &&
                (key.toLowerCase().includes('date') ||
                  key.toLowerCase().includes('deleted_at') ||
                  key.toLowerCase().includes('created_at') ||
                  key.toLowerCase().includes('updated_at')) &&
                this.isDate(formattedItem[key])
              ) {
                this.previewHeaderColumns = this.previewHeaderColumns.map((headerItem: any) => {
                  if (headerItem.header === key) {
                    if (headerItem.field_type_id == 5) {
                      const transformedDate = this.timezoneService.transformDateOnly(formattedItem[key]);
                      if (transformedDate) {
                        formattedItem[key] = transformedDate;
                      }
                    } else if (headerItem.field_type_id == 6) {
                      const transformedDate = this.timezoneService.transformTimeOnly(formattedItem[key]);
                      if (transformedDate) {
                        formattedItem[key] = transformedDate;
                      }
                    } else if (headerItem.field_type_id == 7) {
                      const transformedDate = this.timezoneService.transformDateTime(formattedItem[key]);
                      if (transformedDate) {
                        formattedItem[key] = transformedDate;
                      }
                    }
                  }
                  return headerItem;
                });
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
          this.previewTotalItems = response.data.total_records;
          this.gridloading = false;
        } else {
          this.previewItems = [];
          this.previewTotalItems = 0;
          this.gridloading = false;
        }
      } else {
        const key = response.message;
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
        this.previewItems = [];
        this.previewHeaderColumns = [];
        this.previewTotalItems = 0;
        this.gridloading = false;
      }
    });
  }

  viewPopupItem(item: any) {
    // Permission check for popup_details
    if (this.masterInfo.permissions.popup_details || this.masterInfo.permissions.details) {
      this.loadingpopup = true;
      this.popupName = 'popup_details';
      this.selectedItemUuid = item.uuid;
      this.popupEntityName = this.masterInfo.children.popup_details.entity_name;
      this.isViewPopupOpen = true;

      // Extract gparams from item
      const gridParams: any = {};
      Object.keys(item).forEach((key) => {
        if (key.startsWith('gparam_')) {
          let temp_key = '$' + key;
          gridParams[temp_key] = item[key];
        }
      });
      this.popupComponentGridParams = gridParams;

      setTimeout(() => {
        this.loadingpopup = false;
      }, 500);
    } else {
      this.noPopupPermission = true;
      this.isViewPopupOpen = true;
      return;
    }
  }
  closeViewPopup() {
    this.isViewPopupOpen = false;
    this.selectedItemUuid = null;
    this.noPopupPermission = false;
    this.previewPopupPermission = false;
    this.selectedItemEntityType = null;
  }

  editItem(item: any, event?: MouseEvent) {
    if (this.masterInfo.children.edit) {
      let targetRoute = this.masterInfo.children.edit.target;
      if (targetRoute.includes(':uuid') && item.uuid) {
        targetRoute = targetRoute.replace(':uuid', item.uuid);
      } else if (targetRoute.includes(':id') && item.id) {
        targetRoute = targetRoute.replace(':id', item.uuid);
      }

      const gparamObject: Record<string, any> = {};
      Object.keys(item).forEach((key) => {
        if (key.startsWith('gparam_') && item[key] !== undefined && item[key] !== null) {
          gparamObject[key] = item[key];
        }
      });

      if (targetRoute.includes(':gparam')) {
        const gparamString = encodeURIComponent(JSON.stringify(gparamObject));
        targetRoute = targetRoute.replace(':gparam', gparamString);
      }

      if (event && (event.ctrlKey || event.metaKey)) {
        const url = this.adminUrl + this.router.serializeUrl(this.router.createUrlTree([targetRoute]));
        window.open(url, '_blank');
      } else {
        this.router.navigate([targetRoute]);
      }
    }
  }

  adjustHours(item: any) {
    if (this.masterInfo.children.adjust_hours) {
      let targetRoute = this.masterInfo.children.adjust_hours.target;
      if (targetRoute.includes(':uuid') && item.uuid) {
        targetRoute = targetRoute.replace(':uuid', item.uuid);
      } else if (targetRoute.includes(':id') && item.id) {
        targetRoute = targetRoute.replace(':id', item.uuid);
      }
      this.router.navigate([targetRoute]);
    }
  }

  private downloadBlob(blob: Blob, fileName: string) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  exportItem(item: any) {
    //grid_unique_id
    if (this.grid_unique_id) {
      this.gridApiService.exportIndividualRecords(this.masterInfo.children.export_excel.id, this.grid_unique_id, this.commonSearchQuery).subscribe({
        next: (response: ExportResponse) => {
          try {
            if (response.blob) {
              const blob = new Blob([response.blob], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              });

              this.downloadBlob(blob, response.fileName);
              this.loading = false;
            } else {
              this.loading = false;
              this.toastr.error('Error downloading file');
            }
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
      return;
    }

    if ((item.type === 'excel' && this.masterInfo.children.export_excel) || (item.type === 'pdf' && this.masterInfo.children.export_pdf)) {
      const id = item.type === 'excel' ? this.masterInfo.children.export_excel.id : item.type === 'pdf' ? this.masterInfo.children.export_pdf.id : null;
      if (id) {
        this.gridApiService.exportAllRecords(id, this.commonSearchQuery).subscribe({
          next: (response: ExportResponse) => {
            try {
              if (response.blob) {
                const type =
                  item.type === 'excel'
                    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    : item.type === 'pdf'
                    ? 'application/pdf'
                    : 'application/octet-stream';
                const blob = new Blob([response.blob], {
                  type,
                });
                this.downloadBlob(blob, response.fileName);
                this.loading = false;
              } else {
                this.loading = false;
                this.toastr.error('Error downloading file');
              }
              // if (item.type === 'excel') {
              //   // Excel case
              //   const url = window.URL.createObjectURL(blob);
              //   const link = document.createElement('a');
              //   link.href = url;
              //   link.download = response.fileName;

              //   // Trigger download
              //   document.body.appendChild(link);
              //   link.click();

              //   // Cleanup
              //   document.body.removeChild(link);
              //   window.URL.revokeObjectURL(url);
              //   this.loading = false;
              // } else if (item.type === 'pdf') {
              //   // Convert Excel to PDF
              //   this.convertExcelToPDF(blob, response.fileName.replace('.xlsx', '.pdf'));
              //   this.loading = false;
              // }
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
      } else {
        console.warn('No export id found');
        return;
      }
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

  assignItem(item: any, event?: MouseEvent) {
    if (this.masterInfo.children.assign) {
      let targetRoute = this.masterInfo.children.assign.target;
      if (targetRoute.includes(':uuid') && item.uuid) {
        targetRoute = targetRoute.replace(':uuid', item.uuid);
      } else if (targetRoute.includes(':id') && item.id) {
        targetRoute = targetRoute.replace(':id', item.uuid);
      }

      if (event && (event.ctrlKey || event.metaKey)) {
        const url = this.adminUrl + this.router.serializeUrl(this.router.createUrlTree([targetRoute]));
        window.open(url, '_blank');
      } else {
        this.router.navigate([targetRoute]);
      }
    }
  }

  downloadExcel(filePath: string): void {
    const apiUrl = localStorage.getItem('lcp_api_base_url') || environment.apiUrl;

    // Remove "./public/" from the start of the path if it exists
    const cleanPath = filePath.replace(/^\.?\/?public\//, '');

    const fileUrl = `${apiUrl}/${cleanPath}`;

    this.http.get(fileUrl, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const filename = this.extractFilename(cleanPath) || 'downloaded_file.csv';
        saveAs(blob, filename);
      },
      error: (err) => {
        console.error('Error downloading the file', err);
      },
    });
  }

  private extractFilename(filePath: string): string | null {
    return filePath?.split('/').pop() || null;
  }

  recordExport(item: any, event?: MouseEvent) {
    if (item.downloadables) {
      this.downloadExcel(item.downloadables);
      return;
    }
    this.loading = true;

    if (this.masterInfo.children.record_export) {
      let targetRoute = this.masterInfo.children.record_export.target;
      /*let recordID = item.id;
      if (targetRoute.includes(':uuid') && item.uuid) {
        recordID = item.uuid;
      } else if (targetRoute.includes(':id') && item.id) {
        recordID = item.id;
      }*/
      const gridParams: any = {};
      Object.keys(item).forEach((key) => {
        if (key.startsWith('gparam_')) {
          let temp_key = '$' + key;
          gridParams[temp_key] = item[key];
        }
      });

      const grid_params = gridParams;

      this.gridApiService.exportIndividualRecordsAlone(this.masterInfo.children.record_export.id, grid_params).subscribe({
        //this.gridApiService.exportIndividualRecords(this.masterInfo.children.record_export.id, recordID).subscribe({
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

  printItem(item: any, event?: MouseEvent) {
    if (this.masterInfo.children.print) {
      let targetRoute = this.masterInfo.children.print.target;
      if (targetRoute.includes(':uuid') && item.uuid) {
        targetRoute = targetRoute.replace(':uuid', item.uuid);
      } else if (targetRoute.includes(':id') && item.id) {
        targetRoute = targetRoute.replace(':id', item.uuid);
      }
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
            this.deleteTriggred.emit();
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

  generateVector(item: any, event?: MouseEvent) {
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

  emailResendItem(item: any, event?: MouseEvent) {
    if (this.masterInfo.children.email_resend && this.masterInfo.children.email_resend.component_class_name === commonConfig.ENTITY_TYPES.JOB_BUILDER_MODULE) {
      Swal.fire({
        icon: 'info',
        title: 'Resend Notification?',
        text: 'are you sure, you want to resend notification?',
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
              Swal.fire({ title: 'Notification resent request initiated!', text: 'Notification resent request has been initiated.', icon: 'success' });
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

  deleteItem(item: any, event?: MouseEvent) {
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
  public getCurrentGridFilters() {
    return {
      search_all: this.listQuery?.search_all || [],
      search_any: this.listQuery?.search_any || [],
      having_conditions: this.listQuery?.having_conditions || [],
      having_any_conditions: this.listQuery?.having_any_conditions || [],
      grid_params: this.grid_params,
    };
  }

  viewItem(item: any, event?: MouseEvent) {
    if (this.masterInfo.children.details) {
      let targetRoute = this.masterInfo.children.details.target;
      if (targetRoute.includes(':uuid') && item.uuid) {
        targetRoute = targetRoute.replace(':uuid', item.uuid);
      } else if (targetRoute.includes(':id') && item.id) {
        targetRoute = targetRoute.replace(':id', item.uuid);
      }
      const gparamObject: Record<string, any> = {};
      Object.keys(item).forEach((key) => {
        if (key.startsWith('gparam_') && item[key] !== undefined && item[key] !== null) {
          gparamObject[key] = item[key];
        }
      });

      if (targetRoute.includes(':gparam')) {
        const gparamString = encodeURIComponent(JSON.stringify(gparamObject));
        targetRoute = targetRoute.replace(':gparam', gparamString);
      }

      let queryParams: any = {};
      const currentFilters = this.getCurrentGridFilters();
      if (currentFilters && Object.keys(currentFilters).length > 0) {
        queryParams['parentGridFilters'] = JSON.stringify(currentFilters);
      }

      if (event && (event.ctrlKey || event.metaKey)) {
        const url = this.adminUrl + this.router.serializeUrl(this.router.createUrlTree([targetRoute], { queryParams }));
        window.open(url, '_blank');
      } else {
        this.router.navigate([targetRoute], { queryParams });
      }
    }
  }

  onPageChange(event: { page: number; start_index: number; skipFetch?: boolean; source?: string }) {
    if (event?.source === 'default-initial') {
      if (this.savedViewInitialFallbackTimer) {
        clearTimeout(this.savedViewInitialFallbackTimer);
        this.savedViewInitialFallbackTimer = null;
      }
      return;
    }

    if (event?.source === 'saved-view' && this.ignoreNextSavedViewPageChange) {
      this.ignoreNextSavedViewPageChange = false;
      return;
    }

    this.currentPage = event.page;
    this.listQuery.start_index = event.start_index;
    this.listQuery.limit_range = this.resultsPerPage;
    if (event?.skipFetch) return;
    this.requestGridFetch(this.listQuery);
  }

  previewOnPageChange(event: { page: number; start_index: number; skipFetch?: boolean }) {
    this.previewCurrentPage = event.page;
    this.previewListQuery.start_index = event.start_index;
    this.previewListQuery.limit_range = this.previewResultsPerPage;
    if (event?.skipFetch) return;
    this.previewFetchData(this.previewListQuery);
  }

  onResultsPerPageChange(event: { resultsPerPage: number; start_index: number; skipFetch?: boolean }) {
    const limit = Number(event?.resultsPerPage) > 0 ? Number(event.resultsPerPage) : 10;
    const startIndex = Number(event?.start_index) >= 0 ? Number(event.start_index) : 0;
    this.currentPage = Math.floor(startIndex / limit) + 1;
    this.resultsPerPage = event.resultsPerPage;
    this.listQuery.start_index = event.start_index;
    this.listQuery.limit_range = event.resultsPerPage;
    if (event?.skipFetch) return;
    this.requestGridFetch(this.listQuery);
  }

  previewOnResultsPerPageChange(event: { resultsPerPage: number; start_index: number; skipFetch?: boolean }) {
    this.previewCurrentPage = 1;
    this.previewResultsPerPage = event.resultsPerPage;
    this.previewListQuery.start_index = event.start_index;
    this.previewListQuery.limit_range = event.resultsPerPage;
    if (event?.skipFetch) return;
    this.previewFetchData(this.previewListQuery);
  }

  openFormBuilderPopup(entityName: string, item: any) {
    this.loadingpopup = true;
    this.popupName = 'popup_details';
    this.selectedItemUuid = item.uuid;
    this.popupEntityName = entityName;
    this.isViewPopupOpen = true;
    setTimeout(() => {
      this.loadingpopup = false;
    }, 500);
  }

  onLinkComponentClick(event: { col: any; item: any }) {
    if (event.col.link_type === 'component' || event.col.link_type === 'child_component' || event.col.link_type === 'popup_grid') {
      const mode = event.col.link_mode || 'popup_details';
      if (mode == 'popup_details' && !this.masterInfo.permissions.popup_details && !this.masterInfo.permissions.details) {
        this.noPopupPermission = true;
        this.isViewPopupOpen = true;
        return;
      } else if (mode == 'popup_add' && !this.masterInfo.permissions.popup_create && !this.masterInfo.permissions.create) {
        this.noPopupPermission = true;
        this.isViewPopupOpen = true;
        return;
      } else if (mode == 'popup_edit' && !this.masterInfo.permissions.popup_edit && !this.masterInfo.permissions.edit) {
        this.noPopupPermission = true;
        this.isViewPopupOpen = true;
        return;
      }

      const gridParams: any = {};
      Object.keys(event.item).forEach((key) => {
        if (key.startsWith('gparam_')) {
          let temp_key = '$' + key;
          gridParams[temp_key] = event.item[key];
        }
      });
      this.popupComponentGridParams = gridParams;
      this.popupParentGridFilters = this.getCurrentGridFilters();

      this.popupName = mode;
      this.selectedItemUuid = event.item.uuid;
      if (mode === 'popup_add') {
        this.selectedItemUuid = null;
      }
      this.popupEntityName = event.col.link_action;
      this.isViewPopupOpen = true;
      this.loadingpopup = true;
      setTimeout(() => {
        this.loadingpopup = false;
      }, 500);
    }
  }

  processPopup(popupName: string, selectedItemUuid: string | null, popupEntityName: string, isViewPopupOpen: boolean) {
    this.popupName = popupName;
    // Enhanced permission check using unorgmenuList and permissions
    const userData = this.user_info || JSON.parse(this.localStorageService.getData('user_data'));
    const unorgmenuList = userData?.unorgmenuList || [];
    const permissions = userData?.permissions || {};
    let menuPermissionId = null;
    if (unorgmenuList && Array.isArray(unorgmenuList)) {
      let menuItem = null;
      if (popupName === 'popup_add') {
        menuItem = unorgmenuList.find((item: any) => item.entity_name === popupEntityName && (item.action_slug === 'add' || item.action_slug === 'popup_add'));
      } else if (popupName === 'popup_edit') {
        menuItem = unorgmenuList.find(
          (item: any) => item.entity_name === popupEntityName && (item.action_slug === 'edit' || item.action_slug === 'popup_edit')
        );
      } else if (popupName === 'popup_details') {
        menuItem = unorgmenuList.find(
          (item: any) => item.entity_name === popupEntityName && (item.action_slug === 'details' || item.action_slug === 'popup_details')
        );
      } else if (popupName === 'popup_grid') {
        menuItem = unorgmenuList.find((item: any) => item.entity_name === popupEntityName);
      }
      if (menuItem) {
        menuPermissionId = menuItem.permission_id;
      }
    }
    let hasPermission = true;
    if (menuPermissionId && userData?.main?.permissions && Array.isArray(userData.main.permissions)) {
      const permObj = userData.main.permissions.find((perm: any) => perm.id == menuPermissionId);
      hasPermission = !!(permObj && permObj.accessible);
    }
    if (!hasPermission) {
      this.noPopupPermission = true;
      this.isViewPopupOpen = true;
      return;
    }
    this.selectedItemUuid = selectedItemUuid;
    this.popupEntityName = popupEntityName;
    this.isViewPopupOpen = isViewPopupOpen;
    this.loadingpopup = true;
    setTimeout(() => {
      this.loadingpopup = false;
    }, 500);
  }

  ngOnChanges(changes: SimpleChanges) {
    // Optionally handle other input changes if needed
  }

  onSelectionChange(data: any) {
    this.selectionChange.emit(data);
  }
}
