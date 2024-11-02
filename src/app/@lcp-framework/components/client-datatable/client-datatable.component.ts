// client-datatable.component.ts
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormArray } from '@angular/forms';

export interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  type?: 'text' | 'button' | 'icon';
  actions?: {
    icon: string;
    onClick: (item: any) => void;
    class?: string;
    tooltip?: string;
  }[];
}

export interface TableConfig {
  columns: Column[];
  pageSizes?: number[];
  defaultPageSize?: number;
  searchable?: boolean;
}

@Component({
  selector: 'app-client-datatable',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './client-datatable.component.html',
  styleUrls: ['./client-datatable.component.scss'],
})
export class ClientDatatableComponent implements OnInit {
  @Input() data: any[] = [];
  @Input() config!: TableConfig;
  @Input() formGroup?: FormGroup;
  @Input() formArrayName?: string;

  @Output() dataChange = new EventEmitter<any[]>();
  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();
  @Output() sortChange = new EventEmitter<{ column: string; direction: 'asc' | 'desc' }>();

  searchQuery: string = '';
  currentPage: number = 1;
  pageSize: number = 10;
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  private _formArray: FormArray | null = null;
  private _originalData: any[] = [];

  constructor() {}

  ngOnInit() {
    this.pageSize = this.config.defaultPageSize || 10;
    if (!this.config.pageSizes) {
      this.config.pageSizes = [10, 25, 50, 100];
    }

    if (!this.config.columns || this.config.columns.length === 0) {
      throw new Error('Datatable configuration must include at least one column');
    }

    // Store original data
    if (this.data) {
      this._originalData = [...this.data];
      //console.log(this._originalData);
    }
  }

  get filteredData(): any[] {
    let filtered = [...this.data];

    if (this.searchQuery?.trim()) {
      const query = this.searchQuery.toLowerCase().trim();
      filtered = filtered.filter((item) =>
        Object.values(item).some((val) => val !== null && val !== undefined && val.toString().toLowerCase().includes(query))
      );
    }

    if (this.sortColumn) {
      filtered.sort((a, b) => {
        const aVal = a[this.sortColumn];
        const bVal = b[this.sortColumn];

        if (aVal === undefined || aVal === null) return this.sortDirection === 'asc' ? -1 : 1;
        if (bVal === undefined || bVal === null) return this.sortDirection === 'asc' ? 1 : -1;

        if (typeof aVal === 'string') {
          return this.sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }

        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return this.sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return filtered;
  }

  onSearch(query: string): void {
    this.searchQuery = query;
    this.currentPage = 1;

    // When search is cleared, emit the original data
    if (!query?.trim()) {
      this.dataChange.emit(this._originalData);
    } else {
      this.dataChange.emit(this.filteredData);
    }
  }

  get paginatedData(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredData.slice(start, end);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredData.length / this.pageSize));
  }

  get startIndex(): number {
    return this.filteredData.length === 0 ? 0 : (this.currentPage - 1) * this.pageSize;
  }

  get endIndex(): number {
    return this.filteredData.length === 0 ? 0 : Math.min(this.startIndex + this.pageSize, this.filteredData.length);
  }

  /*onSearch(query: string): void {
    this.searchQuery = query;
    this.currentPage = 1;
    this.dataChange.emit(this.filteredData);
  }*/

  /*onSearch(query: string): void {
    this.searchQuery = query;
    this.currentPage = 1;
    console.log(query);
    // When search is cleared, emit the original data
    if (!query?.trim()) {
      this.dataChange.emit([]);
    }
    // Otherwise, emit the filtered data
    else {
      this.dataChange.emit(this.filteredData);
    }
  }*/

  onSort(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.sortChange.emit({ column: this.sortColumn, direction: this.sortDirection });
  }

  onPageChange(page: any): void {
    this.currentPage = page;
    this.pageChange.emit(page);
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.pageSizeChange.emit(this.pageSize);
  }

  getFormGroupIndex(index: number): number {
    return index + this.startIndex;
  }

  getPageNumbers(): (number | string)[] {
    const pageNumbers: (number | string)[] = [];
    const totalPages = this.totalPages;
    const currentPage = this.currentPage;

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      pageNumbers.push(1);

      if (currentPage > 3) {
        pageNumbers.push('...');
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pageNumbers.push(i);
      }

      if (currentPage < totalPages - 2) {
        pageNumbers.push('...');
      }

      pageNumbers.push(totalPages);
    }

    return pageNumbers;
  }

  handleEllipsisClick(index: number): void {
    const pageNumbers = this.getPageNumbers();
    if (index === 1) {
      // Clicked on the first ellipsis
      this.onPageChange(Math.floor((1 + this.currentPage) / 2));
    } else if (index === pageNumbers.length - 2) {
      // Clicked on the last ellipsis
      this.onPageChange(Math.floor((this.totalPages + this.currentPage) / 2));
    }
  }
}
