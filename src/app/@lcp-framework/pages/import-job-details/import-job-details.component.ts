import { ChangeDetectorRef, Component, ComponentRef, OnDestroy, OnInit, QueryList, ViewChild, ViewChildren, ViewContainerRef } from '@angular/core';
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
import * as XLSX from 'xlsx';
import { MasterListComponent } from '../master-list/master-list.component';

@Component({
  selector: 'app-import-job-details',
  standalone: true,
  imports: [CommonSharedModule, ClientDatatableComponent, LoaderComponent, MasterListComponent],
  templateUrl: './import-job-details.component.html',
  styleUrl: './import-job-details.component.scss',
})
export class ImportJobDetailsComponent implements OnInit, OnDestroy {
  @ViewChild('gridContainer', { read: ViewContainerRef })
  gridContainer!: ViewContainerRef;

  private gridComponentRef?: ComponentRef<MasterListComponent>;
  private gridInitialized = false;

  sheet_data: any = null;
  loading: boolean = false;
  store: any;
  isProcessing: boolean = false;
  id: any | null = null;
  commonData: any = {
    items: [],
  };
  private _originalItems: any[] = [];

  commonItems: any;
  commonItemsConfig: any;
  // Track counts
  validCount: number = 0;
  invalidCount: number = 0;

  constructor(
    private gridApiService: GridApiService,
    private toastr: ToastrService,
    private router: Router,
    private route: ActivatedRoute,
    public localStorageService: LocalStorageService,
    public storeData: Store<any>,
    public location: Location,
    private translate: TranslateService,
    private titleService: Title,
    private cdr: ChangeDetectorRef
  ) {
    this.initStore();
  }

  ngOnInit() {
    this.id = this.route.snapshot.params['uuid'] || null;

    if (this.id) {
      this.loadData(this.id);
    }
  }
  ngAfterViewInit() {
    // Grid will be created after data loads in loadImportJobLineItems
    this.cdr.detectChanges();
  }
  ngOnDestroy() {
    if (this.gridComponentRef) {
      this.gridComponentRef.destroy();
      this.gridComponentRef = undefined;
    }
  }

  private createGridComponent() {
    // Safety check - prevent multiple initializations
    if (this.gridInitialized) {
      console.log('Grid already initialized, skipping...');
      return;
    }

    if (!this.gridContainer) {
      console.error('Grid container not found');
      return;
    }

    // Mark as initialized before creating
    this.gridInitialized = true;

    // Clear and destroy existing component if any
    this.gridContainer.clear();
    if (this.gridComponentRef) {
      this.gridComponentRef.destroy();
      this.gridComponentRef = undefined;
    }

    // Create new component
    this.gridComponentRef = this.gridContainer.createComponent(MasterListComponent);

    // Set properties
    this.gridComponentRef.instance.entity_name = 'import_job_line_items';
    this.gridComponentRef.instance.uuid = this.id;
    this.gridComponentRef.instance.nonGridPage = false;
    this.gridComponentRef.instance.enableCheckBox = false;

    // Set grid params if needed (similar to your reference code)
    const gridParams: any = {};
    // Add any grid params if required
    // Object.keys(this.commonData).forEach((key) => {
    //   if (key.startsWith('gparam_')) {
    //     let temp_key = '$' + key;
    //     gridParams[temp_key] = this.commonData[key];
    //   }
    // });
    this.gridComponentRef.instance.grid_params = gridParams;

    // Trigger change detection
    this.cdr.detectChanges();

    console.log('Grid component created successfully');
  }

  async initStore() {
    this.storeData
      .select((d) => d.index)
      .subscribe((d) => {
        this.store = d;
      });
  }

  // Check if job can be processed
  canProcess(): boolean {
    return this.commonData?.job_status === 'validated' && this.validCount > 0 && this.invalidCount == 0;
  }

  canProcessWithErrors(): boolean {
    return this.commonData?.ignore_error_rows && this.commonData?.job_status === 'validated' && this.validCount > 0 && this.invalidCount > 0;
  }

  // Check if there are errors
  hasErrors(): boolean {
    return this.invalidCount > 0;
  }

  // Get valid count
  getValidCount(): number {
    return this.validCount;
  }

  // Process job
  processJob(ignoreErrors: boolean) {
    if (!this.id) {
      this.toastr.error('Job ID not found', 'Error');
      return;
    }

    if (this.isProcessing) {
      return;
    }

    const message = ignoreErrors ? 'This will process valid items and skip invalid ones. Continue?' : 'This will process all valid items. Continue?';

    if (!confirm(message)) {
      return;
    }

    this.isProcessing = true;
    this.loading = true;

    this.gridApiService.processImportJob(this.id).subscribe({
      next: (response) => {
        if (response.status && response.code === 200) {
          const successMessage = ignoreErrors
            ? 'Processing started (ignoring errors). Please refresh to see progress.'
            : 'Processing started. Please refresh to see progress.';
          this.toastr.success(successMessage, 'Success');

          // Reload data after a short delay
          setTimeout(() => {
            this.loadData(this.id);
          }, 2000);
        } else {
          this.toastr.error(response.message || 'Failed to start processing', 'Error');
        }
        this.isProcessing = false;
        this.loading = false;
      },
      error: (error) => {
        console.error('Process job error:', error);
        this.toastr.error('Failed to start processing', 'Error');
        this.isProcessing = false;
        this.loading = false;
      },
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

  private stripHtml(input: any): string {
    if (input == null) return '';
    const s = typeof input === 'string' ? input : String(input);
    return s.replace(/<[^>]+>/g, '').trim();
  }

  private toCellValue(value: any): any {
    if (value == null) return '';
    // stringify objects/arrays to preserve content
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }
    return value;
  }

  exportToExcel() {
    if (!this.commonItems || !this.commonItems.length) {
      this.toastr.info('No rows to export', 'Info');
      return;
    }

    // Build column list from your table config when available
    const cols =
      Array.isArray(this.commonItemsConfig?.columns) && this.commonItemsConfig.columns.length
        ? this.commonItemsConfig.columns
            .filter((c: any) => !!c.field && c.field !== 'errorstatus' && c.field !== 'errorMessages') // ignore non-data columns
            .map((c: any) => ({
              key: c.field,
              label: this.stripHtml(c.label || c.field)
                .replace('*', '')
                .trim(),
            }))
        : Object.keys(this.commonItems[0])
            .filter((k) => k !== 'errorstatus' && k !== 'errorMessages' && k !== 'errors' && k !== 'warnings')
            .map((k) => ({ key: k, label: k }));

    console.log('Columns to export:', cols);
    console.log('Sample row:', this.commonItems[0]);

    // Header row
    const header = cols.map((c: any) => c.label);

    // Data rows aligned to the columns above
    const rows = this.commonItems.map((row: any) => {
      return cols.map((c: any) => {
        const value = row[c.key];

        // Handle null/undefined
        if (value == null) return '';

        // Handle objects/arrays
        if (typeof value === 'object') {
          try {
            return JSON.stringify(value);
          } catch {
            return String(value);
          }
        }

        // Strip HTML and return
        return this.stripHtml(value);
      });
    });

    console.log('Header:', header);
    console.log('First row data:', rows[0]);

    // Check if we have data
    if (rows.length === 0 || rows[0].length === 0) {
      this.toastr.error('No data to export', 'Error');
      return;
    }

    // Assemble the sheet (AOA = array of arrays)
    const aoa = [header, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Optional: autosize columns based on content
    const colWidths = header.map((h: any, i: any) => {
      const maxLen = Math.max((h || '').length, ...rows.map((r: any) => (r[i] ? String(r[i]).length : 0)));
      return { wch: Math.min(Math.max(10, maxLen + 2), 60) }; // clamp 10..60
    });
    (ws as any)['!cols'] = colWidths;

    // Workbook and file name
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Line Items');

    const safeName = (this.commonData?.name || 'import_job')
      .toString()
      .replace(/[\\/:*?"<>|]+/g, '')
      .slice(0, 40);
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const fileName = `${safeName || 'export'}-${stamp}.xlsx`;

    console.log('Exporting to file:', fileName);

    // Trigger download
    XLSX.writeFile(wb, fileName);

    this.toastr.success(`Exported ${rows.length} rows`, 'Success');
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

      // Determine status based on job_status first, then fall back to row_object
      let errorstatus = '';
      let finalMessage = '';

      if (row.job_status === 'processed') {
        errorstatus = '<span class="badge text-xs badge-outline-success">Processed</span>';
        finalMessage = 'This item has been processed successfully';
      } else if (row.job_status === 'created') {
        errorstatus = '<span class="badge text-xs badge-outline-secondary">Created</span>';
        finalMessage = 'Ready to validate';
      } else if (row.job_status === 'valid') {
        errorstatus = '<span class="badge text-xs badge-outline-success">Valid</span>';
        finalMessage = warnMessages || 'Ready to import';
      } else if (row.job_status === 'invalid') {
        errorstatus = '<span class="badge text-xs badge-outline-danger">Invalid</span>';
        finalMessage = errorMessages || 'Validation failed';
      } else {
        // Fallback to row_object if job_status is not set or unknown
        if (row.row_object.error) {
          errorstatus = '<span class="badge text-xs badge-outline-danger">Invalid</span>';
          finalMessage = errorMessages || 'Validation failed';
        } else if (row.row_object.warning) {
          errorstatus = '<span class="badge text-xs badge-outline-warning">Warning</span>';
          finalMessage = warnMessages || 'Has warnings';
        } else {
          errorstatus = '<span class="badge text-xs badge-outline-success">Valid</span>';
          finalMessage = 'Ready to import';
        }
      }

      return {
        ...row.row_object.columns,
        errors: row.job_status === 'processed' ? {} : row.row_object.errors,
        warnings: row.job_status === 'processed' ? {} : row.row_object.warnings,
        errorstatus: errorstatus,
        errorMessages: finalMessage,
      };
    });
  }

  loadData(id: any) {
    this.loading = true;
    this.loadImportJob(id).then((jobData) => {
      if (jobData) {
        this.loadImportJobLineItems(jobData.id);
        // Create grid component after data is loaded and view is updated
        setTimeout(() => {
          this.createGridComponent();
        }, 100);
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
          // Calculate valid and invalid counts
          this.validCount = allItems.filter((item: any) => item.job_status === 'valid').length;
          this.invalidCount = allItems.filter((item: any) => item.job_status === 'invalid').length;
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
      enableExport: true,
    };
  }
}
