import { Component, TemplateRef, ViewChild, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { initialState } from '../../../store/index.reducer';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { DataTableComponent } from '../../components/datatable/datatable.component';
import { animate, style, transition, trigger } from '@angular/animations';
import { ActivatedRoute, Router } from '@angular/router';

import { GridApiService } from '../../service/common/grid.service';
import { ToastrService } from 'ngx-toastr';
import { TranslateService } from '@ngx-translate/core';
import { CommonSharedModule } from '../../shared/common/common.module';
import { Store } from '@ngrx/store';
import Swal from 'sweetalert2';
import { ExportService } from '../../service/common/export.service';
import { LocalStorageService } from '../../service/common/local-storage.service';
import { MenuMapService } from '../../service/common/menu-map.service';
import { Title } from '@angular/platform-browser';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { LoaderComponent } from '../../components/loader/loader.component';
import { lastValueFrom, Subscription } from 'rxjs';
import { commonConfig } from '../../config/common.config';
import { TimezoneService } from '../../service/common/timezone.service';

export interface ExportResponse {
  blob: Blob;
  fileName: string;
}

interface FetchDataParams {
  entity_name: any;
  primary_table: any;
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
  selector: 'app-child-process-setting',
  standalone: true,
  imports: [CommonSharedModule, DataTableComponent, LoaderComponent, ReactiveFormsModule],
  templateUrl: './child-process-setting.component.html',
  styleUrl: './child-process-setting.component.scss',
  animations: [
    trigger('toggleAnimation', [
      transition(':enter', [style({ opacity: 0, transform: 'scale(0.95)' }), animate('100ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))]),
      transition(':leave', [animate('75ms', style({ opacity: 0, transform: 'scale(0.95)' }))]),
    ]),
  ],
  providers: [DatePipe],
})
export class ChildProcessSettingComponent implements OnInit, OnDestroy {
  store: any = initialState;
  @ViewChild('actionTemplate') actionTemplate!: TemplateRef<any>;
  @ViewChild('statusTemplate') statusTemplate!: TemplateRef<any>;
  customTemplates: { [key: string]: TemplateRef<any> } = {};

  user_id: any;
  column: any = '';
  query: any = '';
  selectcolumns: any[] = [];
  headercolumns: any[] = [];
  headerColumnData: any[] = [];
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
  submitted = false;
  selectedProcess: any = null;

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

  commonSearchQuery: any = {};

  constructor(
    private toastr: ToastrService,
    private gridApiService: GridApiService,
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
    private fb: FormBuilder,
    private timezoneService: TimezoneService,
  ) {}

  ngOnInit() {
    this.initStore();

    setTimeout(() => {
      this.config = JSON.parse(this.localStorageService.getData('config'));
      const pageInfo = this.route.snapshot.data['pageInfo'] || '';

      this.user_info = JSON.parse(this.localStorageService.getData('user_data'));
      this.resultsPerPage = parseInt(this.config.grid_pagination_default);
      this.grid_records_delete = this.config.grid_enable_associated_records_deletion;

      this.user_id = this.user_info.main?.id;
      if (pageInfo && this.resultsPerPage) {
        if (this.user_info.main?.policies) {
          this.policyData = this.user_info.main?.policies || null;
        }
        this.masterInfo = pageInfo;

        const masterListConfig = pageInfo;

        const translateTitle = this.translate.instant(masterListConfig.fullEntity);
        this.titleService.setTitle(translateTitle);

        this.enableCheckBox = masterListConfig.enable_row_checkbox;

        this.title = masterListConfig.fullEntity;
        this.setHeader();
        this.setDefaultQuery();
        this.listQuery.start_index = 0;
        this.fetchAttachedPolicies(this.listQuery);
      } else {
        this.title = 'Default Title';
        this.headercolumns = [];
        this.items = [];
      }
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {}

  setHeader() {
    this.headerColumnData = [
      {
        header: 'id',
        clause_type: 'where',
        field_value: 'child_processes.id',
        is_sortable: 'false',
        column_order: '0.00',
        column_width: '1.00',
        is_searchable: 'false',
        is_grid_column: 'false',
      },
      {
        header: 'uuid',
        clause_type: 'where',
        field_value: 'child_processes.uuid',
        is_sortable: 'false',
        column_order: '0.00',
        column_width: '1.00',
        is_searchable: 'false',
        is_grid_column: 'false',
      },
      {
        header: 'name',
        clause_type: 'where',
        field_value: 'child_processes.name',
        is_sortable: 'true',
        column_order: '1.00',
        column_width: '1.00',
        is_searchable: 'true',
        is_grid_column: 'true',
      },
      {
        header: 'slug',
        clause_type: 'where',
        field_value: 'child_processes.slug',
        is_sortable: 'true',
        column_order: '2.00',
        column_width: '2.00',
        is_searchable: 'true',
        is_grid_column: 'true',
      },
      {
        header: 'description',
        clause_type: 'where',
        field_value: 'child_processes.description',
        is_sortable: 'true',
        column_order: '3.00',
        column_width: '1.00',
        is_searchable: 'true',
        is_grid_column: 'true',
      },
      {
        header: 'command',
        clause_type: 'where',
        field_value: 'child_processes.command',
        is_sortable: 'true',
        column_order: '4.00',
        column_width: '1.00',
        is_searchable: 'true',
        is_grid_column: 'true',
      },
      {
        header: 'status',
        clause_type: 'where',
        field_value: 'child_processes.status_id',
        is_sortable: 'true',
        column_order: '5.00',
        column_width: '1.00',
        is_searchable: 'false',
        is_grid_column: 'true',
      },
      {
        header: 'created_at',
        clause_type: 'where',
        field_value: 'child_processes.created_at',
        is_sortable: 'true',
        column_order: '6.00',
        column_width: '1.00',
        is_searchable: 'false',
        is_grid_column: 'true',
      },
      {
        header: 'gparam_1',
        clause_type: 'where',
        field_value: 'child_processes.uuid',
        is_sortable: 'false',
        column_order: '0.00',
        column_width: '1.00',
        is_searchable: 'false',
        is_grid_column: 'false',
      },
    ];
  }

  setDefaultQuery() {
    this.defaultQuery = {
      cte: 'WITH active_users AS ( SELECT username, status_id FROM users WHERE status_id = 3 )',
      print_query: true,
      company_id: 1,
      primary_table: 'child_processes',
      start_index: 0,
      limit_range: 10,
      sort_columns: [['child_processes.id', 'desc']],
      group_by: [
        'child_processes.name',
        'child_processes.slug',
        'child_processes.description',
        'child_processes.command',
        'child_processes.id',
        'child_processes.created_at',
      ],
      includes: [],
      // having_conditions: null,
      // having_any_conditions: null,
      search_all: [
        {
          column_name: 'child_processes.status_id',
          value: 3,
          operator: '!=',
        },
      ],
      search_any: [],
      select_columns: [...this.headerColumnData.map((column: { field_value: any; header: any }) => [column.field_value, column.header])],
    };
    this.listQuery = JSON.parse(JSON.stringify(this.defaultQuery));
  }

  async setActiveTab() {
    this.query = '';
    this.setHeader();
    this.setDefaultQuery();
    this.fetchData(this.listQuery);
    this.cdr.detectChanges();
  }

  async initStore() {
    this.storeData
      .select((d) => d.index)
      .subscribe((d) => {
        this.store = d;
      });
  }

  sortColumn(column: any) {
    this.column = column;

    //this.listQuery.start_index = this.currentPage;
    this.listQuery.limit_range = this.resultsPerPage;
    const sortColumns = Array.isArray(column?.sortColumns) ? column.sortColumns : [this.column];
    this.listQuery.sort_columns = sortColumns.filter((col: any) => col?.sortDirection).map((col: any) => [col.field_value, col.sortDirection]);
    if (column?.skipFetch) return;
    this.fetchData(this.listQuery);
  }

  advancedSearchData(data: any) {
    this.commonSearchQuery.having_conditions = [];
    this.commonSearchQuery.having_any_conditions = [];
    this.commonSearchQuery.search_any = [];
    this.commonSearchQuery.search_all = [];
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
      if (!data?.skipFetch) {
        this.fetchData(clonedListQuery);
      }
      return;
    }
    if (havingConditions.length > 0) {
      if (condition == 'AND') {
        clonedListQuery.having_conditions = [...havingConditions];
        this.commonSearchQuery.having_conditions = [...havingConditions];
        this.commonSearchQuery.having_any_conditions = [];
      } else {
        clonedListQuery.having_any_conditions = [...havingConditions];
        this.commonSearchQuery.having_any_conditions = [...havingConditions];
        this.commonSearchQuery.having_conditions = [];
      }
    }
    if (condition == 'AND') {
      if (whereConditions.length === 1 && whereConditions[0].column_name === '') {
        clonedListQuery.search_all = [];
        clonedListQuery.search_all = [...orgListQuery.search_all];
        this.commonSearchQuery.search_all = [];
      } else {
        clonedListQuery.search_all = [];
        clonedListQuery.search_all = [...orgListQuery.search_all, ...whereConditions];
        this.commonSearchQuery.search_any = [];
        this.commonSearchQuery.search_all = [...whereConditions];
      }
      clonedListQuery.start_index = 0;
      this.currentPage = 1;

      if (!data?.skipFetch) {
        this.fetchData(clonedListQuery);
      }
    } else {
      if (whereConditions.length === 1 && whereConditions[0].column_name === '') {
        clonedListQuery.search_any = [...clonedListQuery.search_any];
        this.commonSearchQuery.search_any = [];
      } else {
        clonedListQuery.search_any = [...clonedListQuery.search_any, ...whereConditions];
        this.commonSearchQuery.search_all = [];
        this.commonSearchQuery.search_any = [...whereConditions];
      }
      clonedListQuery.start_index = 0;
      this.currentPage = 1;

      if (!data?.skipFetch) {
        this.fetchData(clonedListQuery);
      }
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
        if (!input?.skipFetch) {
          this.fetchData(clonedListQuery);
        }
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
    if (!input?.skipFetch) {
      this.fetchData(clonedListQuery);
    }
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
        this.gridApiService
          .getAllList(
            this.localStorageService.replaceUniqueId(
              this.localStorageService.formatPayloadWithPolicyConditions(query, this.policyData, this.attachedPolicies),
              '$session_user_id',
              this.user_info.main.id,
            ),
          )
          .subscribe(
            (response) => {
              if (response.status && response.code === 200) {
                if (response.data.records) {
                  const filteredData = this.filterAndTransformData(this.headercolumns, response.data.records);
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
            },
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
          transformedRecord[translatedHeader] = this.timezoneService.transformDateOnly(record[header.header]);
        } else if (header.field_type_id == '7') {
          transformedRecord[translatedHeader] = this.timezoneService.transformDateTime(record[header.header]);
        } else if (header.header == 'status') {
          transformedRecord[translatedHeader] = this.getStatusTranslation(record[header.header]);
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

  fetchAttachedPolicies(params: FetchDataParams) {
    this.gridApiService.getAttachedPolicies({ entity_name: params.primary_table }).subscribe(
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
        this.fetchColumns();
        this.fetchData(this.listQuery);
      },
    );
  }

  fetchColumns() {
    const data = [
      {
        order_no: 1,
        status_id: 1,
        company_id: 1,
        field: 'child_processes.name',
        clause_type: 'where',
        sorting: true,
        title: this.translate.instant('name'),
        field_type_id: 3,
        searchable: true,
        is_grid_column: true,
        enable: true,
      },
      {
        order_no: 2,
        status_id: 1,
        company_id: 1,
        field: 'child_processes.description',
        clause_type: 'where',
        sorting: true,
        title: this.translate.instant('description'),
        field_type_id: 3,
        searchable: true,
        is_grid_column: true,
        enable: true,
      },
      {
        order_no: 3,
        status_id: 1,
        company_id: 1,
        field: 'child_processes.command',
        clause_type: 'where',
        sorting: true,
        title: this.translate.instant('command'),
        field_type_id: 3,
        searchable: true,
        is_grid_column: true,
        enable: true,
      },
    ];

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

  fetchData(params: FetchDataParams) {
    params.limit_range = this.resultsPerPage;
    const payload = this.localStorageService.replaceUniqueId(
      this.localStorageService.formatPayloadWithPolicyConditions(params, this.policyData, this.attachedPolicies),
      '$session_user_id',
      this.user_info.main.id,
    );
    this.commonService.getCommonList(payload).subscribe(
      (response) => {
        if (response.status && response.code === 200) {
          const data = this.headerColumnData
            .filter((key: any) => key.is_grid_column == 'true')
            .map((key: any) => ({
              ...key,
              column_width: '40px',
            }));
          // Check if only 'view' or 'view' + 'export_excel' are enabled
          const isOnlyViewOrViewExport =
            (!this.masterInfo.permissions.export_excel || this.masterInfo.permissions.export_excel === true) &&
            (!this.masterInfo.permissions.create || this.masterInfo.permissions.create === true) &&
            Object.keys(this.masterInfo.permissions).every((key) => key === 'export_excel' || key === 'create' || this.masterInfo.permissions[key] === false);

          // Include serial number column if enabled in config
          if (this.masterInfo.entity_configurations?.show_serial_number === 'yes') {
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

            this.headercolumns.push({
              header: 'table_column_action',
              field_value: 'Action',
              is_sortable: 'false',
              column_order: '0.00',
              column_width: '50px',
              is_searchable: 'false',
              is_grid_column: 'true',
            });
            // if (!isOnlyViewOrViewExport) {
            // }
          }

          // Adding custom templates
          this.headercolumns = this.headercolumns.map((item: any) => {
            if (item.header === 'status') {
              return {
                ...item,
                customTemplate: this.statusTemplate,
              };
            } else if (item.header === 'table_column_action') {
              return {
                ...item,
                customTemplate: this.actionTemplate,
              };
            } else {
              return { ...item };
            }
          });

          // Processing records
          if (response.data.records) {
            this.items = response.data.records.map((item: any, index: any) => {
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
                  const transformedDate = this.timezoneService.transformDateTime(formattedItem[key]);
                  if (transformedDate) {
                    formattedItem[key] = transformedDate;
                  }
                }
              }

              if (this.masterInfo.entity_configurations?.show_serial_number === 'yes') {
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
            this.cdr.markForCheck();
          } else {
            this.items = [];
            this.totalItems = 0;
            this.gridloading = false;
            this.cdr.markForCheck();
          }
        } else {
          this.items = [];
          this.totalItems = 0;
          this.gridloading = false;
          this.cdr.markForCheck();
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
        this.cdr.markForCheck();
      },
    );
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

  handleCustomAction(action: string) {
    if (action === 'addNew' && this.masterInfo.children.add) {
      this.router.navigate([`${this.masterInfo.children.add.target}`]);
    }
  }

  exportItem(item: any) {
    if (this.masterInfo.children.export_excel) {
      this.gridApiService.exportAllRecords(this.masterInfo.children.export_excel.id, this.commonSearchQuery).subscribe({
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

  commonTranslate(msg: any) {
    return this.translate.instant(msg);
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

  viewItem(item: any) {
    if (this.masterInfo.children.details) {
      const targetRoute = this.masterInfo.children.details.target.replace(':uuid', item.uuid);
      this.router.navigate([targetRoute]);
    }
  }

  editItem(item: any) {
    if (this.masterInfo.children.edit) {
      const targetRoute = this.masterInfo.children.edit.target.replace(':uuid', item.uuid);
      this.router.navigate([targetRoute]);
    }
  }

  navigateToDetailPage(item: any) {
    const fullUrl = `${item.url}${item.screen_id}`;
    window.open(fullUrl, '_blank');
  }

  onPageChange(event: { page: number; start_index: number; skipFetch?: boolean }) {
    this.currentPage = event.page;
    this.listQuery.start_index = event.start_index;
    this.listQuery.limit_range = this.resultsPerPage;
    if (event?.skipFetch) return;
    this.fetchData(this.listQuery);
  }

  onResultsPerPageChange(event: { resultsPerPage: number; start_index: number; skipFetch?: boolean }) {
    this.currentPage = 1;
    this.resultsPerPage = event.resultsPerPage;
    this.listQuery.start_index = event.start_index;
    this.listQuery.limit_range = event.resultsPerPage;
    if (event?.skipFetch) return;
    this.fetchData(this.listQuery);
  }

  executeChildProcess(item: any) {
    Swal.fire({
      icon: 'question',
      title: 'Execute process?',
      text: 'Do you want to proceed with this action?',
      showCancelButton: true,
      confirmButtonText: 'Proceed',
      cancelButtonText: 'Cancel',
      padding: '2em',
    }).then((result) => {
      if (result.isConfirmed || result.value) {
        this.loading = true;
        this.gridApiService.executeChildProcess(item.id).subscribe(
          (response: any) => {
            this.loading = false;
            if (response.status) {
              this.toastr.success(response.message, 'Success');
              // Refresh policies and grid after successful execution
              this.fetchAttachedPolicies(this.listQuery);
            } else {
              console.error('Error: Operation failed with response:', response);
              this.toastr.error(response.message, 'Error');
            }
          },
          (error) => {
            this.loading = false;
            console.error('Error executing child process:', error);
            const key = 'error';
            const errorMessage = this.translate.instant(key);
            this.toastr.error(errorMessage, 'Error');
          },
        );
      }
    });
  }
}
