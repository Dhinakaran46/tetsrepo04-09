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
    console.log(this.id);
    if (this.id) {
      console.log(this.id);
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

  loadData(id: any) {
    this.loading = true;
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
          value: id,
          operator: '=',
        },
      ],
      select_columns: [['import_jobs.*'], ['import_job_line_items.*']],
      includes: [
        {
          join_type: 'LEFT',
          table_name: 'import_job_line_items',
          join_condition: 'import_jobs.id = import_job_line_items.import_job_id',
        },
      ],
      group_by: ['import_jobs.id', 'import_job_line_items.id'],
    };

    this.gridApiService.getAllList(params).subscribe(
      (response) => {
        if (response.status && response.code === 200) {
          const data = response.data.records[0];

          console.log(data);
          this.commonData = data;
          if (Object.keys(data.row_object_validated.ind_row_datas.columns).length > 0) {
            this.sheet_data = data.row_object_validated;
          }

          this.commonItems = data.row_object;
          this.commonItemsConfig = data.row_object_config;
          this.commonItemsConfig.columns.filter((item: any) => (item.label = item.label.replace(`<span class="text-danger">*</span>`, '')));
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
          this.loading = false;
          //this.commonData.items = data.items.sort((a: any, b: any) => a.mtr_sequence_number - b.mtr_sequence_number);
          //this._originalItems = data.items.sort((a: any, b: any) => a.mtr_sequence_number - b.mtr_sequence_number);
        } else {
          this.loading = false;
        }
      },
      (error) => {
        const key = 'error';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
        this.loading = false;
      }
    );
  }
}
