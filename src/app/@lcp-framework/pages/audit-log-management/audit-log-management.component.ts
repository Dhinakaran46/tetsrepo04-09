import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { GridApiService } from '../../service/common/grid.service';
import { TranslateService } from '@ngx-translate/core';
import { Title } from '@angular/platform-browser';

interface AuditLogRecord {
  id: number;
  table_name: string;
  enable_audit: boolean;
}

@Component({
  selector: 'app-audit-log-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './audit-log-management.component.html',
  styleUrl: './audit-log-management.component.scss',
})
export class AuditLogManagementComponent implements OnInit {
  form: FormGroup;
  loading = false;
  submitting = false;
  existingRecords: AuditLogRecord[] = [];
  private readonly auditSourceTables = ['audit_log_management', 'audit_log_managment'];
  searchQuery = '';
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 1;
  pagedRows: { index: number; control: AbstractControl }[] = [];

  constructor(
    private fb: FormBuilder,
    private gridApiService: GridApiService,
    private toastr: ToastrService,
    private translate: TranslateService,
    private titleService: Title,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      tables: this.fb.array([]),
    });
  }

  ngOnInit(): void {
    this.titleService.setTitle(this.translate.instant('audit_log_management'));
    this.fetchAuditLogTables();
  }

  get tableControls(): FormArray {
    return this.form.get('tables') as FormArray;
  }

  areAllTablesEnabled(): boolean {
    const controls = this.tableControls.controls;
    return controls.length > 0 && controls.every((control) => this.normalizeBoolean(control.get('enable_audit')?.value));
  }

  toggleAllTables(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.tableControls.controls.forEach((control) => {
      control.get('enable_audit')?.setValue(checked);
    });
  }

  onSearch(): void {
    this.currentPage = 1;
    this.updatePaginationState();
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.updatePaginationState();
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePaginationState();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePaginationState();
    }
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) {
      return;
    }
    this.currentPage = page;
    this.updatePaginationState();
  }

  getDisplayedItemCount(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalItems);
  }

  getPageNumbers(): (number | string)[] {
    if (this.totalPages <= 7) {
      return Array.from({ length: this.totalPages }, (_, i) => i + 1);
    }

    if (this.currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', this.totalPages];
    }

    if (this.currentPage >= this.totalPages - 3) {
      return [1, '...', this.totalPages - 4, this.totalPages - 3, this.totalPages - 2, this.totalPages - 1, this.totalPages];
    }

    return [1, '...', this.currentPage - 1, this.currentPage, this.currentPage + 1, '...', this.totalPages];
  }

  private fetchAuditLogTables(): void {
    this.loading = true;

    this.gridApiService.getAllTables().subscribe({
      next: (tableResponse: any) => {
        const allTables = Array.isArray(tableResponse?.data) ? tableResponse.data : [];
        this.fetchExistingAuditSettings(allTables, 0);
      },
      error: () => {
        this.loading = false;
        this.toastr.error(this.translate.instant('failed_to_load'), 'Error');
      },
    });
  }

  private fetchExistingAuditSettings(allTables: string[], sourceIndex: number): void {
    const sourceTable = this.auditSourceTables[sourceIndex];

    if (!sourceTable) {
      this.loading = false;
      this.existingRecords = [];
      this.buildTableForm(allTables, []);
      return;
    }

    const params = {
      company_id: 1,
      print_query: false,
      primary_table: sourceTable,
      start_index: 0,
      limit_range: 5000,
      sort_columns: [[`${sourceTable}.table_name`, 'asc']],
      select_columns: [[`${sourceTable}.id`], [`${sourceTable}.table_name`], [`${sourceTable}.enable_audit`]],
    };

    this.gridApiService.getAllList(params).subscribe({
      next: (response: any) => {
        if (!response?.status && sourceIndex < this.auditSourceTables.length - 1) {
          this.fetchExistingAuditSettings(allTables, sourceIndex + 1);
          return;
        }

        this.loading = false;
        this.existingRecords = response?.status ? response?.data?.records || [] : [];
        this.buildTableForm(allTables, this.existingRecords);
        this.cdr.markForCheck();
      },
      error: () => {
        if (sourceIndex < this.auditSourceTables.length - 1) {
          this.fetchExistingAuditSettings(allTables, sourceIndex + 1);
          return;
        }

        this.loading = false;
        this.existingRecords = [];
        this.buildTableForm(allTables, []);
        this.cdr.markForCheck();
      },
    });
  }

  private buildTableForm(allTables: string[], records: AuditLogRecord[]): void {
    this.tableControls.clear();
    const existingByTable = new Map(records.map((record) => [record.table_name, record]));

    allTables
      .filter((tableName) => !!tableName)
      .sort((a, b) => a.localeCompare(b))
      .forEach((tableName) => {
        const row = existingByTable.get(tableName);
        this.tableControls.push(
          this.fb.group({
            id: [row?.id ?? null],
            table_name: [tableName],
            enable_audit: [this.normalizeBoolean(row?.enable_audit)],
          })
        );
      });

    this.updatePaginationState();
  }

  private updatePaginationState(): void {
    const normalizedSearch = this.searchQuery.trim().toLowerCase();
    const sourceRows = this.tableControls.controls
      .map((control, index) => ({ index, control, tableName: `${control.get('table_name')?.value || ''}` }))
      .filter((row) => row.tableName.toLowerCase().includes(normalizedSearch));

    this.totalItems = sourceRows.length;
    this.totalPages = Math.max(1, Math.ceil(this.totalItems / this.pageSize));

    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.pagedRows = sourceRows.slice(startIndex, endIndex).map((row) => ({ index: row.index, control: row.control }));
  }

  private normalizeBoolean(value: unknown): boolean {
    return value === true || value === 'true' || value === 1 || value === '1';
  }

  onSubmit(): void {
    const rows = this.tableControls.getRawValue();
    if (!rows.length) {
      this.toastr.warning(this.translate.instant('failed_to_load'));
      return;
    }

    const dataRows = rows.map((row: any) => ({
      table_name: row.table_name,
      enable_audit: this.normalizeBoolean(row.enable_audit),
    }));

    const payload =
      this.existingRecords.length === 0
        ? {
            action: ['insert'],
            table: ['audit_log_management'],
            table_mapping: ['table1'],
            data: {
              table1: dataRows,
            },
          }
        : {
            action: ['hard_delete', 'insert'],
            table: ['audit_log_management', 'audit_log_management'],
            table_mapping: ['table1', 'table2'],
            conditions: {
              table1: [{}],
            },
            data: {
              table2: dataRows,
            },
          };

    this.submitting = true;
    this.gridApiService.executeTransaction(payload).subscribe({
      next: (response: any) => {
        this.submitting = false;
        if (response?.status) {
          this.toastr.success(this.translate.instant('record_updated_successfully'));
          this.fetchAuditLogTables();
          return;
        }
        this.toastr.error(this.translate.instant(response?.message || 'error'), 'Error');
      },
      error: () => {
        this.submitting = false;
        this.toastr.error(this.translate.instant('error'), 'Error');
      },
    });
  }
}
