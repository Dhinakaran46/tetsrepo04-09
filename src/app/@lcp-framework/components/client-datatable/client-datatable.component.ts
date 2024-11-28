import { Component, Input, Output, EventEmitter, OnInit, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormArray } from '@angular/forms';
import { CommonSharedModule } from '../../shared/common/common.module';
import { NgMultiSelectDropDownModule } from 'ng-multiselect-dropdown';
import { BooleanStatusPipe } from '../../pipes/boolean/boolean-status.pipe';
import { animate, style, transition, trigger } from '@angular/animations';
import jsPDF from 'jspdf'; // For PDF export
import * as XLSX from 'xlsx'; // For Excel export

export interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  isHtmlHeader?: boolean;
  isHtmlValue?: boolean;
  searchable?: boolean;
  type?: 'text' | 'button' | 'icon' | 'number' | 'date';
  placeholder?: string;
  min?: number;
  max?: number;
  pattern?: string;
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
  headerConfig?: {
    title?: string;
    showHeader?: boolean;
    addButton?: {
      show?: boolean;
      label?: string;
      icon?: string;
      onClick?: () => void;
      disabled?: boolean;
      class?: string;
    };
    enableFilter?: boolean;
    enableColumnSelector?: boolean;
    enableExport?: boolean;
  };
}

export interface FilterCondition {
  field: string;
  operator: string;
  value: any;
}

@Component({
  selector: 'app-client-datatable',
  standalone: true,
  imports: [CommonModule, FormsModule, NgMultiSelectDropDownModule, BooleanStatusPipe, ReactiveFormsModule, CommonSharedModule],
  templateUrl: './client-datatable.component.html',
  styleUrls: ['./client-datatable.component.scss'],
  animations: [
    trigger('toggleAnimation', [
      transition(':enter', [style({ opacity: 0, transform: 'scale(0.95)' }), animate('100ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))]),
      transition(':leave', [animate('75ms', style({ opacity: 0, transform: 'scale(0.95)' }))]),
    ]),
  ],
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
  @Output() addButtonClick = new EventEmitter<void>();

  operatorsByType = {
    text: [
      { value: 'equals', label: 'Equals' },
      { value: 'contains', label: 'Contains' },
      { value: 'startsWith', label: 'Starts With' },
      { value: 'endsWith', label: 'Ends With' },
    ],
    number: [
      { value: 'equals', label: 'Equals' },
      { value: 'greaterThan', label: 'Greater Than' },
      { value: 'lessThan', label: 'Less Than' },
      { value: 'between', label: 'Between' },
    ],
    date: [
      { value: 'equals', label: 'Equals' },
      { value: 'before', label: 'Before' },
      { value: 'after', label: 'After' },
      { value: 'between', label: 'Between' },
    ],
  };

  searchQuery: string = '';
  currentPage: number = 1;
  pageSize: number = 10;
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  private _originalData: any[] = [];
  isMenuOpen = false;
  filterCondition = false;
  filterConditions: FilterCondition[] = [];

  // Column visibility
  visibleColumns: Set<string> = new Set();

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.pageSize = this.config.defaultPageSize || 10;
    if (!this.config.pageSizes) {
      this.config.pageSizes = [10, 25, 50, 100];
    }
    if (this.data) {
      this._originalData = [...this.data];
    }
    this.config.columns.forEach((col) => this.visibleColumns.add(col.key));
  }

  onAddClick(): void {
    if (this.config.headerConfig?.addButton?.onClick) {
      this.config.headerConfig.addButton.onClick();
    } else {
      this.addButtonClick.emit();
    }
  }

  // Dropdown toggle
  toggleMenu(event: Event) {
    event.stopPropagation();
    this.isMenuOpen = !this.isMenuOpen;
  }

  // Column-related helper methods
  getNonEmptyFilterCount(): number {
    return this.filterConditions.filter((condition) => condition.value).length;
  }

  get selectColumns(): Column[] {
    return this.config.columns.filter((column) => column.sortable);
  }
  get filteredColumns(): Column[] {
    //return this.config.columns;
    return this.config.columns.filter((column) => column.searchable);
  }

  getPlaceholderForColumn(field: string): string {
    const column = this.config.columns.find((col) => col.key === field);
    return column ? column.placeholder || '' : '';
  }

  getMinValueForColumn(field: string): number | null {
    const column = this.config.columns.find((col) => col.key === field);
    return column?.min || null;
  }

  getMaxValueForColumn(field: string): number | null {
    const column = this.config.columns.find((col) => col.key === field);
    return column?.max || null;
  }

  getPatternForColumn(field: string): string | null {
    const column = this.config.columns.find((col) => col.key === field);
    return column?.pattern || null;
  }

  getInputTypeForColumn(field: string): string {
    const column = this.config.columns.find((col) => col.key === field);
    return column?.type === 'number' ? 'number' : column?.type === 'date' ? 'date' : 'text';
  }

  // Filter handling methods
  addCondition() {
    this.filterConditions.push({ field: '', operator: '', value: '' });
  }

  removeCondition(index: number) {
    this.filterConditions.splice(index, 1);
  }

  clearFilters() {
    this.filterConditions = [];
    this.applyFilters();
  }

  applyFilters() {
    this.isMenuOpen = false;
    this.updateData();
  }

  cancelFilters() {
    this.filterConditions = [];
    this.isMenuOpen = false;
  }

  // Column visibility methods
  toggleColumn(columnKey: string) {
    if (this.visibleColumns.has(columnKey)) {
      this.visibleColumns.delete(columnKey);
    } else {
      this.visibleColumns.add(columnKey);
    }
    this.updateVisibleColumns();
  }

  selectAllColumns() {
    // this.config.columns.filter((column) => column.sortable).forEach((col) => this.visibleColumns.add(col.key));
    // this.config.columns.forEach((col) => this.visibleColumns.add(col.key));
    this.updateVisibleColumns();
  }

  clearAllColumns() {
    this.visibleColumns.clear();
    this.updateVisibleColumns();
  }

  isColumnVisible(columnKey: string): boolean {
    return this.visibleColumns.has(columnKey);
  }

  private updateVisibleColumns() {
    this.config.columns = this.config.columns.filter((col) => this.visibleColumns.has(col.key));
  }

  isBoolean(value: any): boolean {
    return typeof value === 'boolean';
  }

  getMessages(rowData: any, key: string): string {
    const errorMessages = rowData.errors ? rowData.errors[key]?.map((err: any) => err.message) || [] : [];
    const warningMessages = rowData.warnings ? rowData.warnings[key]?.map((warn: any) => warn.message) || [] : [];
    return [...errorMessages, ...warningMessages].join('\n');
  }

  // Filtering data
  get filteredData(): any[] {
    let filtered = [...this.data];

    if (this.searchQuery?.trim()) {
      const query = this.searchQuery.toLowerCase().trim();
      filtered = filtered.filter((item) => Array.from(this.visibleColumns).some((key) => item[key]?.toString().toLowerCase().includes(query)));
    }

    if (this.filterConditions.length > 0) {
      filtered = filtered.filter((item) => {
        const results = this.filterConditions.map((condition) => this.evaluateCondition(condition, item[condition.field]));
        return this.filterCondition ? results.every((res) => res) : results.some((res) => res);
      });
    }

    if (this.sortColumn) {
      filtered.sort((a, b) => {
        const aVal = a[this.sortColumn];
        const bVal = b[this.sortColumn];

        if (aVal == null) return this.sortDirection === 'asc' ? -1 : 1;
        if (bVal == null) return this.sortDirection === 'asc' ? 1 : -1;

        if (typeof aVal === 'string') {
          return this.sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }

        return this.sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      });
    }

    // After filtering, check if current page is valid
    const totalPages = Math.ceil(filtered.length / this.pageSize);
    if (this.currentPage > totalPages && totalPages > 0) {
      this.currentPage = totalPages;
      this.pageChange.emit(this.currentPage);
    }

    return filtered;
  }

  private evaluateCondition(condition: FilterCondition, value: any): boolean {
    if (!value) return false;

    const itemValue = value.toString().toLowerCase();
    const filterValue = condition.value.toString().toLowerCase();

    switch (condition.operator) {
      case 'equals':
        return itemValue === filterValue;
      case 'contains':
        return itemValue.includes(filterValue);
      case 'startsWith':
        return itemValue.startsWith(filterValue);
      case 'endsWith':
        return itemValue.endsWith(filterValue);
      case 'greaterThan':
        return parseFloat(itemValue) > parseFloat(filterValue);
      case 'lessThan':
        return parseFloat(itemValue) < parseFloat(filterValue);
      default:
        return true;
    }
  }

  private updateData() {
    this.dataChange.emit(this.filteredData);
  }
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
    Promise.resolve().then(() => {
      this.currentPage = page;
      this.pageChange.emit(page);
      this.cdr.detectChanges();
    });
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

  onSearch(query: string): void {
    this.searchQuery = query;

    Promise.resolve().then(() => {
      this.currentPage = 1;
      if (!query?.trim()) {
        this.dataChange.emit(this._originalData);
      } else {
        this.updateDataAndPagination(this.data);
      }
      this.cdr.detectChanges();
    });
  }

  // Update method to handle data updates
  updateDataAndPagination(newData: any[]) {
    this.data = newData;
    this._originalData = [...newData];

    // Calculate new total pages
    const newTotalPages = Math.ceil(this.filteredData.length / this.pageSize);

    // Use Promise.resolve to push the pagination update to the next change detection cycle
    Promise.resolve().then(() => {
      if (this.currentPage > newTotalPages && newTotalPages > 0) {
        this.currentPage = newTotalPages;
        this.pageChange.emit(this.currentPage);
      } else if (newTotalPages === 0) {
        this.currentPage = 1;
        this.pageChange.emit(this.currentPage);
      }

      this.dataChange.emit(this.filteredData);
      this.cdr.detectChanges();
    });
  }

  // Update get paginatedData to handle empty pages better
  get paginatedData(): any[] {
    const filteredResults = this.filteredData;
    const totalPages = Math.ceil(filteredResults.length / this.pageSize);

    // Ensure current page is valid
    if (this.currentPage > totalPages && totalPages > 0) {
      Promise.resolve().then(() => {
        this.currentPage = totalPages;
        this.pageChange.emit(this.currentPage);
        this.cdr.detectChanges();
      });
    }

    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;

    return filteredResults.slice(start, end);
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

  // Triggered when a column is selected for a filter condition
  onColumnChange(event: any, index: number) {
    const field = event.target.value;
    this.filterConditions[index] = {
      ...this.filterConditions[index],
      field,
      operator: '',
      value: '',
    };
  }

  // Returns a list of operators based on the selected column's data type
  getOperatorsForColumn(field: string) {
    const column = this.config.columns.find((col) => col.key === field);
    if (!column) return this.operatorsByType.text; // Default to text operators

    return this.operatorsByType[column.type as keyof typeof this.operatorsByType] || this.operatorsByType.text;
  }

  // Determines if the "Apply" button should be enabled
  isApplyButtonEnabled(): boolean {
    return this.filterConditions.every(
      (condition) => condition.field && condition.operator && condition.value !== null && condition.value !== undefined && condition.value !== ''
    );
  }

  // Export table data to PDF
  exportToPDF() {
    const doc = new jsPDF();
    const exportData = this.data.map((item) => {
      const rowData: any = {};
      this.config.columns.forEach((col) => {
        rowData[col.label] = item[col.key];
      });
      return rowData;
    });

    let rowIndex = 10;
    exportData.forEach((row) => {
      let colIndex = 10;
      Object.values(row).forEach((cell) => {
        doc.text(`${cell}`, colIndex, rowIndex);
        colIndex += 30;
      });
      rowIndex += 10;
    });

    doc.save('table_data.pdf');
  }

  // Export table data to Excel
  exportToExcel() {
    const worksheet = XLSX.utils.json_to_sheet(
      this.data.map((item) => {
        const rowData: any = {};
        this.config.columns.forEach((col) => {
          rowData[col.label] = item[col.key];
        });
        return rowData;
      })
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Table Data');
    XLSX.writeFile(workbook, 'table_data.xlsx');
  }
}
