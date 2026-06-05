import { Component, Input, Output, EventEmitter, OnInit, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormArray } from '@angular/forms';
import { CommonSharedModule } from '../../shared/common/common.module';
import { NgMultiSelectDropDownModule } from 'ng-multiselect-dropdown';
import { animate, style, transition, trigger } from '@angular/animations';
import jsPDF from 'jspdf'; // For PDF export
import * as XLSX from 'xlsx'; // For Excel export
import { SafeHtmlPipe } from '../../pipes/safehtml/safe-html.pipe';
import { TimezoneService } from '../../service/common/timezone.service';

export interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  isHtmlHeader?: boolean;
  isHtmlValue?: boolean;
  searchable?: boolean;
  colFilterHide?: boolean;
  type?: 'text' | 'button' | 'icon' | 'number' | 'date' | 'separate' | 'checkbox';
  template?: boolean;
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
  detailStatusPopup?: boolean;
  headerConfig?: {
    title?: string;
    showHeader?: boolean;
    summary?: string;
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
  imports: [CommonModule, FormsModule, NgMultiSelectDropDownModule, ReactiveFormsModule, CommonSharedModule, SafeHtmlPipe],
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

  isStatusModalOpen = false;
  selectedRow: any = {};
  errorKeys: any[] = ['warningMessages', 'errorMessages', 'errorstatus'];

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
  selectAll: boolean = false;
  searchQuery: string = '';
  currentPage: number = 1;
  pageSize: any = 10;
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  private _originalData: any[] = [];
  isFilterMenuOpen = false;
  isColumnSelectorOpen = false;
  isExportMenuOpen = false;
  filterCondition = false;
  filterConditions: FilterCondition[] = [];

  // Column visibility

  constructor(private cdr: ChangeDetectorRef, private timezoneService: TimezoneService) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    this.isFilterMenuOpen = false;
    this.isColumnSelectorOpen = false;
    this.isExportMenuOpen = false;
  }

  ngOnInit() {
    this.pageSize = this.config.defaultPageSize || 10;
    if (!this.config.pageSizes) {
      this.config.pageSizes = [10, 25, 50, 100];
    }
    if (this.data) {
      this._originalData = [...this.data];
    }
  }

  onAddClick(): void {
    if (this.config.headerConfig?.addButton?.onClick) {
      this.config.headerConfig.addButton.onClick();
    } else {
      this.addButtonClick.emit();
    }
  }

  toggleFilterMenu(event: Event) {
    event.stopPropagation();
    this.isFilterMenuOpen = !this.isFilterMenuOpen;
    this.isColumnSelectorOpen = false;
    this.isExportMenuOpen = false;
  }

  toggleColumnSelector(event: Event) {
    event.stopPropagation();
    this.isColumnSelectorOpen = !this.isColumnSelectorOpen;
    this.isFilterMenuOpen = false;
    this.isExportMenuOpen = false;
  }

  toggleExportMenu(event: Event) {
    event.stopPropagation();
    this.isExportMenuOpen = !this.isExportMenuOpen;
    this.isFilterMenuOpen = false;
    this.isColumnSelectorOpen = false;
  }

  // Open Status Modal
  openStatusModal(row: any) {
    this.selectedRow = row;
    this.isStatusModalOpen = true;
  }

  // Close Status Modal
  closeStatusModal() {
    this.isStatusModalOpen = false;
    this.selectedRow = {};
  }

  getObjectKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }
  getMessagesUnDot(messages: string): string[] {
    return messages.split(',, ').map((msg) => msg.trim()); // Split by ", " and trim
  }

  // Column-related helper methods
  getNonEmptyFilterCount(): number {
    return this.filterConditions.filter((condition) => condition.value).length;
  }

  get selectColumns(): Column[] {
    return this.config.columns.filter((column) => column.type !== 'checkbox' && column.key !== 'id');
  }

  get filteredColumns(): Column[] {
    return this.config.columns
      .filter((column) => column.searchable || column.type === 'checkbox')
      .map((col) => {
        return {
          ...col,
          colFilterHide: col?.colFilterHide || true,
        };
      });
  }

  toggleColumnFilterHide(col: any) {
    col.colFilterHide = !col.colFilterHide;
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

  getErrorStatusText(errorStatus: string): string {
    return errorStatus.match(/>(.*?)<\/span>/)?.[1] || errorStatus;
  }

  removeCondition(index: number) {
    this.filterConditions.splice(index, 1);
  }

  clearFilters() {
    this.filterConditions = [];

    this.isFilterMenuOpen = false;
    const filteredData = [...this._originalData];
    this.dataChange.emit(filteredData);
  }

  applyFilters() {
    this.isFilterMenuOpen = false;
    this.updateData();
  }

  cancelFilters() {
    this.filterConditions = [];
    this.isFilterMenuOpen = false;
  }

  selectAllColumns() {
    this.selectColumns.forEach((col) => {
      if (col.key !== 'id') {
        col.colFilterHide = false;
      } else {
        col.colFilterHide = true;
      }
    });
  }

  // Method to clear all checkboxes
  clearAllColumns() {
    this.selectColumns.forEach((col) => {
      col.colFilterHide = true;
    });
  }

  isBoolean(value: any): boolean {
    return typeof value === 'boolean';
  }

  getMessages(rowData: any, key: string): string {
    const errorMessages = rowData.errors ? rowData.errors[key]?.map((err: any) => err.message) || [] : [];
    const warningMessages = rowData.warnings ? rowData.warnings[key]?.map((warn: any) => warn.message) || [] : [];
    return [...errorMessages, ...warningMessages].join('\n');
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

  getFormGroupIndex(index: number): number {
    return index + this.startIndex;
  }

  getPageNumbers(): (number | string)[] {
    const pageNumbers: (number | string)[] = [];
    const totalPages = this.totalPages;
    const currentPage = this.currentPage;

    // If less than 8 pages, show all pages
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
      return pageNumbers;
    }

    // Always add first page
    pageNumbers.push(1);

    // Handle different cases for showing ellipsis and page numbers
    if (currentPage <= 4) {
      // Show first 5 pages + ellipsis + last page
      for (let i = 2; i <= 5; i++) {
        pageNumbers.push(i);
      }
      pageNumbers.push('...');
      pageNumbers.push(totalPages);
    } else if (currentPage >= totalPages - 3) {
      // Show first page + ellipsis + last 5 pages
      pageNumbers.push('...');
      for (let i = totalPages - 4; i < totalPages; i++) {
        pageNumbers.push(i);
      }
      pageNumbers.push(totalPages);
    } else {
      // Show first page + ellipsis + current-1,current,current+1 + ellipsis + last page
      pageNumbers.push('...');
      for (let i = currentPage - 1; i <= currentPage + 1; i++) {
        pageNumbers.push(i);
      }
      pageNumbers.push('...');
      pageNumbers.push(totalPages);
    }

    return pageNumbers;
  }

  onPageSizeChange(): void {
    // Calculate current first item index

    this.pageSize = parseInt(this.pageSize);
    const firstItemIndex = (this.currentPage - 1) * this.pageSize;

    // Calculate new current page to maintain position
    const newCurrentPage = Math.floor(firstItemIndex / this.pageSize) + 1;

    // Update current page
    this.currentPage = Math.min(newCurrentPage, this.totalPages);

    // Ensure we don't exceed total pages
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    // Ensure we don't exceed total pages
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    // Reset to page 1 if no data
    if (this.totalPages === 0) {
      this.currentPage = 1;
    }

    // Emit changes
    this.pageSizeChange.emit(this.pageSize);
    this.pageChange.emit(this.currentPage);

    // Update view
    this.cdr.detectChanges();
  }

  // Also update the get paginatedData method:
  get paginatedData(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredData.slice(start, end);
  }

  handleEllipsisClick(index: number): void {
    const pageNumbers = this.getPageNumbers();
    const ellipsisIndex = pageNumbers.indexOf('...');

    if (index === ellipsisIndex) {
      // First ellipsis clicked
      const nextNumber = pageNumbers[index + 1] as number;
      const prevNumber = pageNumbers[index - 1] as number;
      this.onPageChange(Math.floor((prevNumber + nextNumber) / 2));
    } else {
      // Last ellipsis clicked
      const nextNumber = pageNumbers[index + 1] as number;
      const prevNumber = pageNumbers[index - 1] as number;
      this.onPageChange(Math.floor((prevNumber + nextNumber) / 2));
    }
  }

  onSearch(query: string): void {
    this.searchQuery = query;

    Promise.resolve().then(() => {
      this.currentPage = 1;

      // Keep track of filtered data separately
      if (!query?.trim()) {
        // If search is cleared, restore original data
        this.data = [...this._originalData];
      } else {
        // Filter data based on search query
        const filtered = this._originalData.filter((item) =>
          Object.keys(item).some((key) => item[key]?.toString().toLowerCase().includes(query.toLowerCase()))
        );
        this.data = filtered;
      }

      // Emit the filtered data
      this.dataChange.emit(this.data);
      this.cdr.detectChanges();
    });
  }

  // Update method to handle data updates
  private updateDataAndPagination(newData: any[]): void {
    this.data = newData;
    this._originalData = [...newData];

    const newTotalPages = Math.ceil(this.filteredData.length / this.pageSize);

    Promise.resolve().then(() => {
      if (this.currentPage > newTotalPages) {
        this.currentPage = Math.max(1, newTotalPages);
        this.pageChange.emit(this.currentPage);
      }

      this.dataChange.emit(this.filteredData);
      this.cdr.detectChanges();
    });
  }

  // Update filteredData getter
  get filteredData(): any[] {
    let filtered = [...this.data];
    if (this.searchQuery?.trim()) {
      const query = this.searchQuery.toLowerCase().trim();
      filtered = filtered.filter((item) => Object.keys(item).some((key) => item[key]?.toString().toLowerCase().includes(query)));
    }
    if (this.filterConditions.length > 0) {
      // Filter out invalid conditions where field, operator, or value is missing
      const validConditions = this.filterConditions.filter((condition) => condition.field && condition.operator && condition.value);

      if (validConditions.length > 0) {
        filtered = filtered.filter((item) => {
          const results = validConditions.map((condition) => this.evaluateCondition(condition, item[condition.field]));
          return this.filterCondition ? results.every((res) => res) : results.some((res) => res);
        });
      }
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
    this.selectAll = filtered.every((item) => item.isChecked);
    return filtered;
  }

  // Update get paginatedData to handle empty pages better

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredData.length / this.pageSize));
  }

  get startIndex(): number {
    return this.filteredData.length === 0 ? 0 : (this.currentPage - 1) * this.pageSize;
  }

  get endIndex(): number {
    return this.filteredData.length === 0 ? 0 : Math.min(this.startIndex + parseInt(this.pageSize), this.filteredData.length);
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

  selectAllData() {
    this.selectAll = !this.selectAll;
    this.data.forEach((item) => {
      item.isChecked = this.selectAll;
      return item;
    });
    this.dataChange.emit(this.data);
    this.cdr.detectChanges();
  }

  selectData(id: number) {
    this.data.forEach((item) => {
      if (item.id === id) {
        item.isChecked = !item.isChecked;
      }
      return item;
    });
    this.selectAll = this.data.every((item) => item.isChecked);
    this.dataChange.emit(this.data);
    this.cdr.detectChanges();
  }

  isDateLike(value: any): boolean {
    if (!value || typeof value !== 'string') return false;

    // Match only YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss formats
    const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;
    const dateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

    if (dateOnlyRegex.test(value) || dateTimeRegex.test(value)) {
      const parsed = new Date(value);
      return !isNaN(parsed.getTime());
    }

    return false;
  }

  formatDateValue(value: any): string {
    if (this.isDateLike(value)) {
      // Detect time portion
      if (/\d{2}:\d{2}/.test(value)) {
        return this.timezoneService.transformDateTime(value) || value;
      } else {
        return this.timezoneService.transformDateOnly(value) || value;
      }
    }
    return value;
  }

  /*isDateLike(value: any): boolean {
    if (!value || typeof value !== 'string') return false;
    // ISO, yyyy-MM-dd, yyyy-MM-ddTHH:mm:ss, etc.
    return /\d{4}-\d{2}-\d{2}/.test(value) || !isNaN(Date.parse(value));
  }

  formatDateValue(value: any): string {
    if (this.isDateLike(value)) {
      // Use datetime if time is present, else date only
      if (/\d{2}:\d{2}:\d{2}/.test(value)) {
        return this.timezoneService.transformDateTime(value) || value;
      } else {
        return this.timezoneService.transformDateOnly(value) || value;
      }
    }
    return value;
  }*/
}
