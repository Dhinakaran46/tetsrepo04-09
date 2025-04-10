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

@Component({
  selector: 'app-ai-playground',
  standalone: true,
  imports: [CommonModule, CommonSharedModule, FormsModule, ReactiveFormsModule, ClientDatatableComponent, LoaderComponent],
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
  constructor(
    private toastr: ToastrService,
    private fb: FormBuilder,
    private openaiService: OpenaiService,
    private route: ActivatedRoute,
    public translate: TranslateService
  ) {
    this.form = this.fb.group({
      prompt: [null, Validators.required],
    });
  }

  ngOnInit(): void {}

  submit() {
    this.form.markAllAsTouched();
    if (this.form.valid) {
      this.loading = true;
      this.openaiService.generateAiQuery({ prompt: this.form.value.prompt }).subscribe((res) => {
        this.loading = false;
        if (res.status && res.data.result.length) {
          let firstColumn = res.data.result[0];
          this.aiResultTableConfig.columns = Object.keys(firstColumn).map((key) => ({
            key: key,
            label: key,
            sortable: true,
            searchable: true,
          }));

          const pageInfo = this.route.snapshot.data['pageInfo'] || '';
          this.toastr.success('Result fetched successfully', 'Success');
          if (pageInfo) {
            this.masterInfo = pageInfo;
          }
        }
        this.tableResponse = [];
        this.tableResponse = res.data.result;
        this.tempTableResponse = this.tableResponse;
        this.isTableShow = true;
      });
    } else {
      this.loading = false;
      this.toastr.error('Please enter a prompt', 'Error');
    }
  }

  syncTableSchema() {
    this.toastr.info('Syncing table schema..., it may take few minutes', 'Info');
    this.loading = true;
    this.openaiService.syncTableSchema().subscribe((res) => {
      this.loading = false;
      if (res.status) {
        this.toastr.success('Table schema synced successfully', 'Success');
      } else {
        this.toastr.error('Failed to sync table schema', 'Error');
      }
    });
  }

  onQueryDataChange(data: any[]) {
    console.log('data', data);
    const itemsToUse = !data || data.length === 0 ? this.tableResponse : data;
    this.tempTableResponse = [...itemsToUse];
  }

  onQuerySortChange(sort: { column: string; direction: 'asc' | 'desc' }) {
    console.log('sort', sort);
    const items = [...this.tempTableResponse];
    items.sort((a, b) => {
      const aVal = a[sort.column];
      const bVal = b[sort.column];
      return sort.direction === 'asc' ? (aVal > bVal ? 1 : -1) : aVal < bVal ? 1 : -1;
    });
    this.onQueryDataChange(items);
  }
}
