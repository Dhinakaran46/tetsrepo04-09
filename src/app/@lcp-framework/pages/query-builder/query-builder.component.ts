import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { CommonSharedModule } from '../../shared/common/common.module';
import { OpenaiService } from '../../service/common/openai.service';
import { ClientDatatableComponent, TableConfig } from '../../components/client-datatable/client-datatable.component';
import { LoaderComponent } from '../../components/loader/loader.component';
import { MenuMapService } from '../../service/common/menu-map.service';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { GridApiService } from '../../service/common/grid.service';
import { ToastrService } from 'ngx-toastr';
import { getQueryType, EQueryTypes } from '../../helpers/common/query-helpers';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-query-builder',
  standalone: true,
  imports: [CommonModule, CommonSharedModule, FormsModule, ReactiveFormsModule, ClientDatatableComponent, LoaderComponent],
  templateUrl: './query-builder.component.html',
  styleUrl: './query-builder.component.scss',
  providers: [DatePipe],
})
export class QueryBuilderComponent implements OnInit {
  form: FormGroup;
  tableResponse: any[] = [];
  tempTableResponse: any[] = [];
  loading: boolean = false;
  isTableShow: boolean = false;
  responseMessage: string | null = null;
  isTableError: boolean = false;
  queryType: EQueryTypes = EQueryTypes.unknown;
  aiResultTableConfig: TableConfig = {
    columns: [],
    pageSizes: [5, 10, 25],
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
  tableList: string[] = [];
  filteredTableList: string[] = [];

  constructor(
    private fb: FormBuilder,
    private openaiService: OpenaiService,
    public translate: TranslateService,
    public commonService: MenuMapService,
    private gridApiService: GridApiService,
    private toastr: ToastrService
  ) {
    this.form = this.fb.group({
      query: [null, Validators.required],
      search: [null],
    });
  }

  ngOnInit() {
    this.gridApiService.getAllTables().subscribe({
      next: (res: any) => {
        if (res.data.length) {
          this.tableList = res.data;
          this.filteredTableList = this.tableList;
        }
      },
    });
  }

  searchTable() {
    this.filteredTableList = this.tableList.filter((tname) => tname.toLowerCase().includes(this.form.controls['search'].value));
  }

  setQuery(tableName: string) {
    this.form.controls['query'].setValue('select * from ' + tableName + ';');
    this.validateQuery();
  }

  validateQuery() {
    this.queryType = getQueryType(this.form.controls['query'].value);
    if (this.queryType === EQueryTypes.unknown) {
      this.toastr.error('Enter a valid Query', 'Error');
    } else if (this.queryType === EQueryTypes.select) {
      this.submit();
    } else {
      Swal.fire({
        icon: 'info',
        title: 'Are you sure you want to perform this ' + this.queryType + ' operation?',
        text: 'click on confirm to continue',
        showCancelButton: true,
        confirmButtonText: 'Confirm',
        padding: '2em',
      }).then(async (result: any) => {
        if (result.value) {
          this.submit();
        }
      });
    }
  }

  insertTextAtCursor(textarea: HTMLTextAreaElement, textToInsert: string) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    let queryText = this.form.controls['query'].value ?? '';
    const originalText = queryText;

    if (start !== null && end !== null) {
      queryText = originalText.substring(0, start) + textToInsert + originalText.substring(end);

      // After inserting, move the cursor to just after the inserted text
      setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + textToInsert.length;
      });
    } else {
      // If for some reason cursor is not found, append at the end
      queryText += textToInsert;
    }
    this.form.controls['query'].setValue(queryText);
  }

  submit() {
    this.loading = true;
    if (this.form.valid) {
      this.openaiService.getResultFromQuery({ sql: this.form.controls['query'].value, is_query_tool: true }).subscribe({
        next: (res) => {
          this.loading = false;
          if (res.code === 200) {
            this.responseMessage = null;
            this.isTableError = false;
            this.populateTableSchema(res.data);
          } else {
            this.responseMessage = res.data;
            this.isTableError = true;
          }
        },
        error: (err) => {
          this.loading = false;
          this.toastr.error('Failed to execute query', 'Error');
        },
      });
    } else {
      this.loading = false;
      this.toastr.error('Enter Query', 'Error');
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
    }

    this.tableResponse = [];
    this.tableResponse = result;
    this.tempTableResponse = this.tableResponse;
    if (this.queryType === EQueryTypes.select) {
      this.isTableShow = true;
    } else {
      this.isTableShow = false;
      this.responseMessage = '✔️ Query executed successfully';
    }
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
