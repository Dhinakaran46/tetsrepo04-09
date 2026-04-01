import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { CommonSharedModule } from '../../shared/common/common.module';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { OpenaiService } from '../../service/common/openai.service';
import { ClientDatatableComponent, TableConfig } from '../../components/client-datatable/client-datatable.component';
import { LoaderComponent } from '../../components/loader/loader.component';
import { MenuMapService } from '../../service/common/menu-map.service';
import { AutocompleteComponent } from '../../components/autocomplete/autocomplete.component';
import { GridApiService } from '../../service/common/grid.service';
import { LocalStorageService } from '../../service/common/local-storage.service';
import Swal from 'sweetalert2';
@Component({
  selector: 'app-ai-playground',
  standalone: true,
  imports: [CommonModule, CommonSharedModule, FormsModule, ReactiveFormsModule, ClientDatatableComponent, LoaderComponent, AutocompleteComponent],
  templateUrl: './ai-playground.component.html',
  styleUrl: './ai-playground.component.scss',
  providers: [DatePipe],
})
export class AiPlaygroundComponent implements OnInit {
  form: FormGroup;
  tableResponse: any[] = [];
  tempTableResponse: any[] = [];
  title: string = 'Query Result';
  aiResultTableConfig: TableConfig = {
    columns: [],
    pageSizes: [5, 10, 25, 50],
    defaultPageSize: 5,
    searchable: true,
    headerConfig: {
      showHeader: true,
      addButton: undefined,
      enableFilter: true,
      enableColumnSelector: true,
      enableExport: true,
    },
  };
  column: String = '';
  masterInfo: any;
  loading: boolean = false;
  isTableShow: boolean = false;
  userId: number = 0;
  queryHistory: { id: number; prompt: string; generated_sql: string }[] = [];
  queryList: { id: number; name: string }[] = [];
  idQueryMapping: { [key: number]: string } = {};
  selectedPrompt: string | null = null;

  constructor(
    private toastr: ToastrService,
    private fb: FormBuilder,
    private openaiService: OpenaiService,
    private route: ActivatedRoute,
    public translate: TranslateService,
    public commonService: MenuMapService,
    private gridApiService: GridApiService,
    private localStorageService: LocalStorageService
  ) {
    this.form = this.fb.group({
      query_id: [null],
      prompt: [null, Validators.required],
    });
  }

  ngOnInit(): void {
    this.getLogHistory();
    this.userId = this.localStorageService.getData('user_data') && JSON.parse(this.localStorageService.getData('user_data')).main.id;
  }

  getLogHistory() {
    let payload: any = {
      company_id: 1,
      search_all: [
        {
          value: '3',
          operator: '!=',
          column_name: 'openai_usage_logs.status_id',
        },
      ],
      search_any: [],
      limit_range: 1,
      print_query: true,
      start_index: 0,
      primary_table: 'openai_usage_logs',
      select_columns: [['openai_usage_logs.id'], ['openai_usage_logs.prompt'], ['openai_usage_logs.generated_sql']],
    };
    this.commonService.getCommonList(payload).subscribe({
      next: (res) => {
        if (res.status && res.data.records.length) {
          this.queryHistory = [];
          this.queryList = [];
          this.idQueryMapping = {};
          this.queryHistory = res.data.records;
          for (const each of this.queryHistory) {
            this.queryList.push({
              id: each.id,
              name: each.prompt,
            });
            this.idQueryMapping[each.id] = each.generated_sql;
          }
        }
      },
      error: (err) => {
        console.warn('err', err);
      },
    });
  }

  onQuerySelected(event: any) {
    this.form.patchValue({
      query_id: event.id,
    });
    this.selectedPrompt = event.name;
  }

  deleteQuery() {
    Swal.fire({
      icon: 'info',
      title: 'Are you sure you want to delete this query?',
      text: 'once deleted, this query will be deleted from the history',
      showCancelButton: true,
      confirmButtonText: 'Submit',
      padding: '2em',
    }).then(async (result: any) => {
      if (result.value) {
        this.loading = true;
        const payload: any = {
          data: {
            table2: [
              {
                status_id: 3,
                deleted_at: new Date(),
                deleted_by: this.userId,
              },
            ],
          },
          table: ['openai_usage_logs', 'openai_usage_logs'],
          action: ['select', 'update'],
          columns: {
            table1: ['id'],
          },
          conditions: {
            table1: [
              {
                id: this.form.value.query_id,
              },
            ],
            table2: [
              {
                id: '@table1.id',
              },
            ],
          },
          table_mapping: ['table1', 'table2'],
        };
        this.gridApiService.executeRecords(payload).subscribe({
          next: (response: any) => {
            this.loading = false;
            if (response.code === 200 && response.status) {
              this.toastr.success('Query deleted successfully', 'Success');
              this.getLogHistory();
              this.selectedPrompt = null;
              this.form.patchValue({
                query_id: null,
              });
            }
          },
          error: (err) => {
            this.loading = false;
            this.toastr.error('Failed to delete query', 'Error');
          },
        });
      }
    });
  }

  editQuery() {
    this.form.patchValue({
      prompt: this.selectedPrompt,
    });
  }

  executeQuery() {
    this.loading = true;
    this.openaiService.getResultFromQuery({ sql: this.idQueryMapping[this.form.value.query_id] }).subscribe({
      next: (res) => {
        this.loading = false;
        this.populateTableSchema(res.data);
      },
      error: (err) => {
        this.loading = false;
        this.toastr.error('Failed to execute query', 'Error');
      },
    });
  }

  submit() {
    this.form.markAllAsTouched();
    if (this.form.valid) {
      this.loading = true;
      this.openaiService.generateAiQuery({ prompt: this.form.value.prompt }).subscribe({
        next: (res) => {
          this.loading = false;
          this.populateTableSchema(res.data.result);
        },
        error: (err) => {
          this.loading = false;
          this.toastr.error('Failed to generate query', 'Error');
        },
      });
    } else {
      this.loading = false;
      this.toastr.error('Please enter a prompt', 'Error');
    }
  }

  populateTableSchema(result: any[]) {
    if (result.length) {
      let firstColumn = result[0];
      this.aiResultTableConfig.columns = Object.keys(firstColumn).map((key) => ({
        key: key,
        label: key,
        sortable: true,
        searchable: true,
      }));
      this.getLogHistory();
    }
    this.tableResponse = [];
    this.tableResponse = result;
    this.tempTableResponse = this.tableResponse;
    this.isTableShow = true;
  }

  onQueryDataChange(data: any[]) {
    const itemsToUse = !data || data.length === 0 ? this.tableResponse : data;
    this.tempTableResponse = [...itemsToUse];
  }

  onQuerySortChange(sort: { column: string; direction: 'asc' | 'desc' }) {
    const items = [...this.tempTableResponse];
    items.sort((a, b) => {
      const aVal = a[sort.column];
      const bVal = b[sort.column];
      return sort.direction === 'asc' ? (aVal > bVal ? 1 : -1) : aVal < bVal ? 1 : -1;
    });
    this.onQueryDataChange(items);
  }
}
