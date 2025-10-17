import { Component, OnInit } from '@angular/core';
import { CommonSharedModule } from '../../../@lcp-framework/shared/common/common.module';
import { GridApiService } from '../../../@lcp-framework/service/common/grid.service';
import { ToastrService } from 'ngx-toastr';
import { Store } from '@ngrx/store';
import { commonConfig } from '../../../@lcp-framework/config/common.config';
import { LocalStorageService } from '../../../@lcp-framework/service/common/local-storage.service';
import { Location } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { ClientDatatableComponent, TableConfig } from '../../../@lcp-framework/components/client-datatable/client-datatable.component';
import { LoaderComponent } from '../../components/loader/loader.component';

@Component({
  selector: 'app-import-job-details',
  standalone: true,
  imports: [CommonSharedModule, ClientDatatableComponent, LoaderComponent],
  templateUrl: './import-job-details.component.html',
  styleUrl: './import-job-details.component.scss',
})
export class ImportJobDetailsComponent implements OnInit {
  sheet_data: any = null;
  loading: boolean = false;
  store: any;
  id: any | null = null;
  commonData: any = {
    items: [],
  };
  private _originalItems: any[] = [];

  commonItems: any;
  commonItemsConfig: any;

  constructor(
    private gridApiService: GridApiService,
    private toastr: ToastrService,
    private router: Router,
    private route: ActivatedRoute,
    public localStorageService: LocalStorageService,
    public storeData: Store<any>,
    public location: Location,
    private translate: TranslateService,
    private titleService: Title
  ) {
    this.initStore();
  }

  ngOnInit() {
    this.id = this.route.snapshot.params['uuid'] || null;
    
    if (this.id) {
    
      this.loadData(this.id);
    }
  }
  async initStore() {
    this.storeData
      .select((d) => d.index)
      .subscribe((d) => {
        this.store = d;
      });
  }

  // Update onItemsDataChange to handle data updates like export template
  onItemsDataChange(data: any[]) {
    // If data is empty or undefined, restore from original items
    if (!data || data.length === 0) {
      this.commonData.items = [...this._originalItems];
    } else {
      this.commonData.items = data;
    }
  }

  // Update onItemsSortChange to be consistent with export template
  onItemsSortChange(sort: { column: string; direction: 'asc' | 'desc' }) {
    if (sort?.column && sort?.direction) {
      const items = [...this.commonData.items];
      items.sort((a, b) => {
        const aVal = a[sort.column] ?? '';
        const bVal = b[sort.column] ?? '';

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sort.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }

        const numA = Number(aVal);
        const numB = Number(bVal);
        return sort.direction === 'asc' ? numA - numB : numB - numA;
      });

      // Use onItemsDataChange to update the data
      this.onItemsDataChange(items);
    }
  }

  getIndividualFieldKeys() {
    return this.sheet_data ? Object.keys(this.sheet_data.ind_row_datas.columns) : [];
  }

  getSheetDatas(cdata: any): any {
   
    return cdata?.map((row: any) => {
      // Extract error messages and combine them into a single string
      const errorMessages = Object.values(row.row_object.errors)
        .flat()
        .map((error: any) => error.message)
        .join(', ');
      const warnMessages = Object.values(row.row_object.warnings)
        .flat()
        .map((warning: any) => warning.message)
        .join(', ');

      // Determine the error status
      const status = row.row_object.warning
        ? '<span class="badge text-xs badge-outline-warning">warning</span>'
        : '<span class="badge text-xs badge-outline-success">valid</span>';
      const errorstatus = row.row_object.error ? `<span class="badge text-xs badge-outline-danger">invalid</span>` : status;
      const fStatusMesg = errorMessages ? errorMessages : warnMessages;
      const final_status = row.job_status == 'processed' ? '<span class="badge text-xs badge-outline-success">Processed</span>' : errorstatus;
      const final_message = row.job_status == 'processed' ? 'This item has been processed successfully' : fStatusMesg;

      return {
        ...row.row_object.columns,
        errors: row.job_status == 'processed' ? {} : row.row_object.errors,
        warnings: row.job_status == 'processed' ? {} : row.row_object.warnings,
        errorstatus: final_status, // Add error status
        errorMessages: final_message, // Add combined error messages
      };
    });
  }
  

  loadData(id: any) {
    this.loading = true;
    this.loadImportJob(id).then((jobData) => {
      if (jobData) {
        this.loadImportJobLineItems(jobData.id);
      }
    });
  }

  private loadImportJob(uuid: string) {
    const params = {
      company_id: 1,
      print_query: true,
      primary_table: 'import_jobs',
      start_index: 0,
      limit_range: 1,
      sort_columns: [['import_jobs.id', 'asc']],
      search_all: [
        {
          column_name: 'import_jobs.uuid',
          value: uuid,
          operator: '=',
        },
      ],
      select_columns: [['import_jobs.*']],
    };

    return new Promise<any>((resolve) => {
      this.gridApiService.getAllList(params).subscribe({
        next: (response) => {
          if (response.status && response.code === 200) {
            const data = response.data.records[0];
            this.commonData = data;
            if (Object.keys(data.header_details.ind_row_datas.columns).length > 0) {
              this.sheet_data = data.header_details;
            }
            this.commonItemsConfig = data.table_config;
            resolve(data);
          } else {
            this.loading = false;
            resolve(null);
          }
        },
        error: (error) => {
          const errorMessage = this.translate.instant('error');
          this.toastr.error(errorMessage, 'Error');
          this.loading = false;
          resolve(null);
        },
      });
    });
  }

  private loadImportJobLineItems(jobId: number) {
    this.setupGridConfig();
    const params = {
      company_id: 1,
      print_query: true,
      primary_table: 'import_job_line_items',

      search_all: [
        {
          column_name: 'import_job_line_items.import_job_id',
          value: jobId,
          operator: '=',
        },
      ],
      select_columns: [['import_job_line_items.*']],
      group_by: ['import_job_line_items.id order by import_job_line_items.id asc'],
    };

    this.gridApiService.getAllList(params).subscribe({
      next: (response) => {
        if (response.status && response.code === 200) {
          const allItems = response.data.records;
          this.commonItems = this.getSheetDatas(allItems);
        }
        this.loading = false;
      },
      error: (error) => {
        const errorMessage = this.translate.instant('error');
        this.toastr.error(errorMessage, 'Error');
        this.loading = false;
      },
    });
  }

  private setupGridConfig() {
    this.commonItemsConfig.columns.forEach((item: any) => {
      item.label = item.label.replace(`<span class="text-danger">*</span>`, '');
    });
    this.commonItemsConfig.pageSizes = [5, 10, 25, 50];
    this.commonItemsConfig.defaultPageSize = 10;
    this.commonItemsConfig.searchable = true;
    this.commonItemsConfig.headerConfig = {
      title: 'Line Items',
      showHeader: true,
      enableFilter: true,
      enableColumnSelector: true,
      enableExport: false,
    };
  }
}
