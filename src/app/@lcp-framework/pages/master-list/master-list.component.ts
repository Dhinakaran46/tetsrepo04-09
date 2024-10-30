import { Component, TemplateRef, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
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

interface FetchDataParams {
  entity_name: any;
  start_index: number;
  limit_range: number;
  sort_columns: any;
  search_any: any;
  search_all: any;
}

@Component({
  standalone: true,
  imports: [CommonSharedModule, HttpClientModule, DataTableComponent],

  templateUrl: './master-list.component.html',
  animations: [
    trigger('toggleAnimation', [
      transition(':enter', [style({ opacity: 0, transform: 'scale(0.95)' }), animate('100ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))]),
      transition(':leave', [animate('75ms', style({ opacity: 0, transform: 'scale(0.95)' }))]),
    ]),
  ],
  providers: [DatePipe],
})
export class MasterListComponent implements AfterViewInit {
  store: any;
  @ViewChild('actionTemplate') actionTemplate!: TemplateRef<any>;
  @ViewChild('statusTemplate') statusTemplate!: TemplateRef<any>;
  customTemplates: { [key: string]: TemplateRef<any> } = {};

  column: any = '';
  query: any = '';

  selectcolumns: any[] = [];
  headercolumns: any[] = [];
  items: any[] = [];
  totalItems: number = 0;
  currentPage: number = 1;
  resultsPerPage: number = 10;
  enableCheckBox: boolean = false;
  masterInfo: any;

  title: any = '';
  listQuery: any = '';
  defaultQuery: any = '';
  user_info: any;
  grid_records_delete: any;
  config: any;

  constructor(
    private toastr: ToastrService,
    private gridApiService: GridApiService,
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
    private titleService: Title
  ) {
    this.initStore();
  }

  ngAfterViewInit() {
    this.config = JSON.parse(this.localStorageService.getData('config'));
    const pageInfo = this.route.snapshot.data['pageInfo'] || '';
    this.user_info = JSON.parse(this.localStorageService.getData('user_data'));
    this.resultsPerPage = parseInt(this.config.grid_pagination_default);
    this.grid_records_delete = this.config.grid_enable_associated_records_deletion;

    if (pageInfo && this.resultsPerPage) {
      this.masterInfo = pageInfo;

      const masterListConfig = pageInfo;

      const translateTitle = this.translate.instant(masterListConfig.fullEntity);
      this.titleService.setTitle(translateTitle);

      this.enableCheckBox = masterListConfig.enable_row_checkbox;

      this.title = masterListConfig.fullEntity;
      this.defaultQuery = masterListConfig.ListQuery;
      this.listQuery = JSON.parse(JSON.stringify(this.defaultQuery));
      this.listQuery.start_index = 0;
      this.fetchColumns(this.listQuery);
      this.fetchData(this.listQuery);
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

  sortColumn(column: any) {
    this.column = column;

    //this.listQuery.start_index = this.currentPage;
    this.listQuery.limit_range = this.resultsPerPage;
    this.listQuery.sort_columns = [[this.column.field_value, this.column.sortDirection]];
    this.fetchData(this.listQuery);
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
      clonedListQuery.having_conditions = [...havingConditions];
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
  searchData(data: any) {
    const query = data.data;
    const search = data.search;

    const clonedListQuery = this.listQuery;
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
    clonedListQuery.start_index = 0;
    this.currentPage = 1;

    this.fetchData(clonedListQuery);
  }

  exportTable(item: any) {
    const query = { ...this.listQuery };
    query.limit_range = 100000;

    this.gridApiService.getAllRecords(query).subscribe(
      (response) => {
        if (response.status && response.code === 200) {
          if (response.data.records && response.data.headers) {
            const filteredData = this.filterAndTransformData(response.data.headers, response.data.records);
            if (item.type == 'pdf') {
              this.exportService.exportToPDF(filteredData, 'TableData');
            } else {
              this.exportService.exportToExcel(filteredData, 'TableData');
            }
          }
        } else {
          this.items = [];
          this.totalItems = 0;

          const key = response.message;
          const errorMessage = this.translate.instant(key);
          this.toastr.error(errorMessage, 'Error');
        }
      },
      (error) => {
        const key = 'error';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
      }
    );
  }

  private filterAndTransformData(headers: any[], records: any[]): any[] {
    const filteredHeaders = headers.filter((header) => header.header !== 'id' && header.header !== 'uuid');

    const transformedRecords = records.map((record) => {
      const transformedRecord: any = {};
      filteredHeaders.forEach((header) => {
        const translationKey = `${header.header}`;
        const translatedHeader = this.translate.instant(translationKey);
        if (header.field_type_id == '7') {
          transformedRecord[translatedHeader] = this.datePipe.transform(record[header.header], 'yyyy-MM-dd');
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
    if (status == '1') {
      return this.translate.instant('table_status_val_0');
    } else if (status == '2') {
      return this.translate.instant('table_status_val_1');
    } else {
      return this.translate.instant('table_status_val_2');
    }
  }

  fetchColumns(params: FetchDataParams) {
    this.gridApiService.getAllColumns({ entity_name: params.entity_name }).subscribe(
      (response) => {
        if (response.status && response.code === 200) {
          const data = response.data.records.map((key: any, index: any) => {
            return {
              field: key.field_name,
              title: key.display_name,
              sorting: key.is_shortable,
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

    this.gridApiService.getAllRecords(params).subscribe(
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

              // Check if only 'view' or 'view' + 'export' are enabled
              const isOnlyViewOrViewExport =
                (!this.masterInfo.permissions.export || this.masterInfo.permissions.export === true) &&
                (!this.masterInfo.permissions.create || this.masterInfo.permissions.create === true) &&
                Object.keys(this.masterInfo.permissions).every((key) => key === 'export' || key === 'create' || this.masterInfo.permissions[key] === false);

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
              } else if (item.header === 'table_column_action') {
                return {
                  ...item,
                  customTemplate: this.actionTemplate,
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
                if (formattedItem.hasOwnProperty(key) && key.toLowerCase().includes('date') && this.isDate(formattedItem[key])) {
                  const transformedDate = this.datepipe.transform(new Date(formattedItem[key]), 'yyyy-MM-dd');
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
          } else {
            this.items = [];
            this.totalItems = 0;
          }
        } else {
          this.items = [];
          this.totalItems = 0;
          const key = response.message;
          const errorMessage = this.translate.instant(key);
          this.toastr.error(errorMessage, 'Error');
        }
      },
      (error) => {
        const key = 'error';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
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

  assignItem(item: any) {
    if (this.masterInfo.children.assign) {
      const targetRoute = this.masterInfo.children.assign.target.replace(':id', item.uuid);
      this.router.navigate([targetRoute]);
    }
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
              console.log(response.message);
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
