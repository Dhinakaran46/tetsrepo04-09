import { Component, Input, Output, EventEmitter, OnInit, TemplateRef, OnChanges, SimpleChanges, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';

import { NgMultiSelectDropDownModule } from 'ng-multiselect-dropdown';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { BooleanStatusPipe } from '../../pipes/boolean/boolean-status.pipe';
import { animate, style, transition, trigger } from '@angular/animations';
import { CommonSharedModule } from '../../shared/common/common.module';
import { Store } from '@ngrx/store';
import { commonConfig } from '../../config/common.config';

import { DatePipe, Location } from '@angular/common';
import { LocalStorageService } from '../../service/common/local-storage.service';
import { OpenaiService } from '../../service/common/openai.service';
import { ChildDatatableComponent } from '../child-datatable/child-datatable.component';
import { TimezoneService } from '../../service/common/timezone.service';

interface SearchCondition {
  id: string;
  label: string;
  value: string;
}
interface SearchConditions {
  [key: number]: SearchCondition[];
}

interface InputTypes {
  [key: number]: string;
}

@Component({
  selector: 'app-datatable',
  standalone: true,
  imports: [CommonSharedModule, NgMultiSelectDropDownModule, BooleanStatusPipe, ChildDatatableComponent],
  templateUrl: './datatable.component.html',
  styleUrl: './datatable.component.scss',
  animations: [
    trigger('toggleAnimation', [
      transition(':enter', [style({ opacity: 0, transform: 'scale(0.95)' }), animate('100ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))]),
      transition(':leave', [animate('75ms', style({ opacity: 0, transform: 'scale(0.95)' }))]),
    ]),
  ],
})
export class DataTableComponent implements OnInit, OnChanges {
  expandedItem: any = null;
  expandedColumnChildGrid: { uuid: string, colHeader: string } | null = null;
  @Input() unique_id: any;
  @Input() loading: boolean = false;
  @ViewChild('searchInput') searchInput!: ElementRef;
  store: any;
  @Input() customTemplates: { [key: string]: TemplateRef<any> } = {};
  @Input() title: any = '';
  @Input() enableCheckBox: boolean = false;

  @Input() masterInfo: any = [];
  @Input() selectcolumns: any[] = [];
  @Input() headercolumns: any[] = [];
  @Input() items: any[] = [];
  @Input() totalItems: number = 0;
  @Input() currentPage: number = 1;
  @Input() resultsPerPage: any = 10;
  @Input() column: any = '';
  @Input() query: any = '';
  @Output() delete = new EventEmitter<any>();
  @Output() edit = new EventEmitter<any>();
  @Output() view = new EventEmitter<any>();
  @Output() customAction = new EventEmitter<any>();
  @Output() pageChange = new EventEmitter<{ page: number; start_index: number }>();
  @Output() exportType = new EventEmitter<{ type: string }>();
  @Output() resultsPerPageChange = new EventEmitter<{ resultsPerPage: number; start_index: number }>();
  @Output() columnSort = new EventEmitter<any>();
  @Output() searchQuery = new EventEmitter<any>();
  @Output() advancedSearchQuery = new EventEmitter<any>();
  @Output() linkComponentClick = new EventEmitter<{ col: any, item: any }>();

  search:any = '';
  selectedColumns: any[] = [];
  selectedColumn = '';
  searchCondition: string = 'contains';
  selectedItems: any[] = [];

  totalPages: number = 1;
  filteredItems: any[] = [];
  filteredColumns: any[] = [];

  textClass: string = '';

  isMenuOpen = false;
  filterCondition: any = true;
  filterConditions: Array<{ field: string; operator: string; value: string; clause_type: string }> = [];
  selectedColumnType: any = 1;
  currentSearchConditions: any = [];
  field_types = commonConfig.field_types;
  inputTypes: InputTypes = commonConfig.field_type;
  searchConditions: SearchConditions = commonConfig.search_conditions;
  isSchemaChunks: boolean = false;

  mapConditionToSQL = (condition: any) => {
    switch (condition) {
      case 'contains':
        return 'ILIKE';
      case 'not_contains':
        return 'NOT ILIKE';
      case 'starts_with':
        return 'ILIKE';
      case 'ends_with':
        return 'ILIKE';
      case 'is_empty':
        return '=';
      case 'is_not_empty':
        return '<>';
      case 'is_null':
        return 'IS NULL';
      case 'is_not_null':
        return 'IS NOT NULL';
      default:
        return condition;
    }
  };

  addWildcards = (condition: any, value: any) => {
    switch (condition) {
      case 'contains':
        return `%${value}%`;
      case 'not_contains':
        return `%${value}%`;
      case 'starts_with':
        return `${value}%`;
      case 'ends_with':
        return `%${value}`;
      default:
        return value;
    }
  };

  dropdownSettings = {
    singleSelection: false,
    idField: 'field',
    textField: 'title',
    selectAllText: 'Select All',
    unSelectAllText: 'UnSelect All',
    itemsShowLimit: 3,
    allowSearchFilter: true,
    searchPlaceholderText: 'Search',
  };

  paginationOptions: any[] = [];

  user_info: any;
  config: any;

  constructor(
    private translate: TranslateService,
    private toastr: ToastrService,
    public storeData: Store<any>,
    public datePipe: DatePipe,
    private localstore: LocalStorageService,
    private openaiService: OpenaiService,
    public location: Location,
    private timezoneService: TimezoneService
  ) {
    this.config = JSON.parse(this.localstore.getData('config'));
    this.user_info = JSON.parse(this.localstore.getData('user_data'));
    this.paginationOptions = this.config.grid_pagination_dropdown.split(',').map((item: any) => +item);
    this.initStore();
  }

  toggleRow(item: any) {
    if (this.expandedItem === item) {
      this.expandedItem = null;
      // Also collapse column child grid for this row if open
      if (this.expandedColumnChildGrid && this.expandedColumnChildGrid.uuid === item) {
        this.expandedColumnChildGrid = null;
      }
    } else {
      // Collapse any previously expanded row's column child grid if open
      if (this.expandedItem !== null && this.expandedColumnChildGrid && this.expandedColumnChildGrid.uuid === this.expandedItem) {
        this.expandedColumnChildGrid = null;
      }
      this.expandedItem = item;
      // Also collapse column child grid for this row if open
      if (this.expandedColumnChildGrid && this.expandedColumnChildGrid.uuid === item) {
        this.expandedColumnChildGrid = null;
      }
    }
  }

  ngOnInit() {
    console.log(this.unique_id);
    this.headercolumns.forEach((col) => {
      col.sortDirection = '';
      col.colFilterHide = false;
    });

    console.log(this.items);

    this.filteredItems = [...this.items];

    this.translate.get(['table_multiselect_0', 'table_multiselect_3']).subscribe((translations) => {
      this.dropdownSettings = {
        singleSelection: false,
        idField: 'field',
        textField: 'title',
        selectAllText: translations['table_multiselect_0'],
        unSelectAllText: translations['table_multiselect_0'],
        itemsShowLimit: 3,
        allowSearchFilter: true,
        searchPlaceholderText: translations['table_multiselect_3'],
      };
    });
  }

  /* advanced search filter functions */
  updateFilterConditions() {
    this.currentSearchConditions = this.searchConditions[this.selectedColumnType] || [];
  }
  getOperatorsForColumn(column: string): SearchCondition[] {
    const columnType = this.filteredColumns.find((col) => col.field === column)?.field_type_id;
    return this.searchConditions[columnType] || [];
  }

  getInputTypeForColumn(column: string): string {
    const columnType = this.filteredColumns.find((col) => col.field === column)?.field_type_id;
    return this.inputTypes[columnType] || 'text';
  }

  onColumnChange(event: Event, index: number) {
    const target = event.target as HTMLSelectElement;
    const column = target.value;
    this.filterConditions[index].field = column;
    const data = this.filteredColumns.find((col) => col.field === column);
    const columnType = data?.field_type_id;
    this.filterConditions[index].clause_type = data?.clause_type || 'where';
    this.filterConditions[index].operator = this.searchConditions[columnType][0].value;
    this.filterConditions[index].value = '';
    this.currentSearchConditions = this.searchConditions[columnType] || [];
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
    if (this.isMenuOpen && this.filterConditions.length == 0) {
      this.addCondition();
    }
  }

  addCondition() {
    this.filterConditions.push({
      field: '',
      operator: '',
      value: '',
      clause_type: '',
    });
  }

  removeCondition(index: number) {
    this.filterConditions.splice(index, 1);
  }

  clearFilters() {
    this.filterConditions = [];
    this.applyFilters();
  }
  formatDateTime(dateTime: any) {
    return this.timezoneService.transformDateTime(dateTime);
  }
  formatDate(dateTime: any) {
    return this.timezoneService.transformDateOnly(dateTime);
  }

  getConditionValue(index: number): string | null {
    const value = this.filterConditions[index].value;
    if (value) {
      const type = this.getInputTypeForColumn(this.filterConditions[index].field);
      if (type === 'datetime-local') {
        return this.timezoneService.transformDate(value, 'yyyy-MM-ddTHH:mm:ss');
      } else if (type === 'date') {
        return this.timezoneService.transformDateOnly(value);
      }
    }
    return value;
  }

  setConditionValue(index: number, value: string): void {
    const type = this.getInputTypeForColumn(this.filterConditions[index].field);
    if (type === 'datetime-local' || type === 'date') {
      this.filterConditions[index].value = value;
    } else {
      this.filterConditions[index].value = value;
    }
  }
  applyFilters() {
    this.removeEmptyFilters();
    this.isMenuOpen = false;

    const condition = this.filterCondition ? 'AND' : 'OR';
    const data = this.filterConditions.map((key: any, index: any) => {
      const type = this.getInputTypeForColumn(key.field);
      if (type == 'datetime-local') {
        const formattedDate: any = this.formatDateTime(key.value);

        key.value = formattedDate;
      } else if (type == 'date') {
        const formattedDate: any = this.formatDate(key.value);

        key.value = formattedDate;
      }

      return {
        column_name: key.field,
        operator: key.operator ? this.mapConditionToSQL(key.operator) : '=',
        value: this.addWildcards(key.operator, key.value).trim(),
        isAggregate: key?.clause_type === 'having',
      };
    });
    const fdata = { data: data, condition: condition };

    this.advancedSearchQuery.emit(fdata);
  }

  isApplyButtonEnabled(): boolean {
    return this.filterConditions.some((condition) => condition.field && condition.operator && condition.value.trim() !== '');
  }
  getPlaceholderForColumn(column: string): string {
    const columnType = this.getInputTypeForColumn(column);
    switch (columnType) {
      case 'number':
        return 'Enter a number';
      case 'date':
      case 'datetime-local':
        return 'YYYY-MM-DD';
      default:
        return 'Enter a value';
    }
  }

  getMinValueForColumn(column: string): string | null {
    const columnType = this.getInputTypeForColumn(column);
    if (columnType === 'date' || columnType === 'datetime-local') {
      return '1900-01-01';
    }
    return null;
  }

  getMaxValueForColumn(column: string): string | null {
    const columnType = this.getInputTypeForColumn(column);
    if (columnType === 'date' || columnType === 'datetime-local') {
      return '2099-12-31';
    }
    return null;
  }

  getPatternForColumn(column: string): string | undefined {
    const columnType = this.getInputTypeForColumn(column);
    switch (columnType) {
      case 'email':
        return '[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$';
      case 'tel':
        return '[0-9]{10}';
      default:
        return undefined;
    }
  }

  getNonEmptyFilterCount(): number {
    return this.filterConditions.filter((filter) => filter.value.trim() !== '').length;
  }

  private removeEmptyFilters(): void {
    this.filterConditions = this.filterConditions.filter((filter: any) => filter.value.trim() !== '');
  }

  cancelFilters() {
    this.isMenuOpen = false;
  }

  /* advanced search filter functions */

  capitalizeFirstLetter(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  async initStore() {
    this.storeData
      .select((d) => d.index)
      .subscribe((d) => {
        this.store = d;
      });
  }

  ngOnChanges(changes: SimpleChanges) {
    console.log(this.masterInfo);
    if (this.selectcolumns.length > 0) {
      const translationKeys = this.selectcolumns.filter((col) => col.searchable).map((col: any) => `GRIDS.${this.title}.fields.${col.title}`);
      //const allowedFieldTypes = [3, 4];

      if (this.masterInfo.fullEntity === 'schema_chunks') {
        this.isSchemaChunks = true;
      }

      this.translate.get(translationKeys).subscribe((translations) => {
        this.filteredColumns = this.selectcolumns
          .filter((col) => col.searchable)
          .map((col) => {
            if (translations[`GRIDS.${this.title}.fields.${col.title}`].includes('.')) {
              return {
                // colFilterHide: false,
                colSearchHide: false,
                ...col,
                title: this.capitalizeFirstLetter(col.title),
              };
            } else {
              return {
                //colFilterHide: false,
                colSearchHide: false,
                ...col,
                title: translations[`GRIDS.${this.title}.fields.${col.title}`],
              };
            }
          });
      });
    }
  }

  toggleColumnFilterHide(col: any) {
    col.colFilterHide = !col.colFilterHide;
  }

  toggleColumnSearchHide(col: any) {
    col.colSearchHide = !col.colSearchHide;
  }
  // No need for now to
  updateColumn(col: any) {
    col.hide = !col.hide;
    this.selectedColumns = this.filteredColumns.filter((column) => !column.hide);
  }

  getTranslatedValues(key: any, label: any): Observable<string> {
    return this.translate.get(key).pipe(
      map((translations) => {
        return translations.includes('.') ? label : translations;
      })
    );
  }

  getTranslatedValueTitle(key: any, label: any): Observable<string> {
    return this.translate.get(key).pipe(
      map((translations) => {
        const title = translations.includes('.') ? label : translations;
        return title.split('Table')[0];
      })
    );
  }

  selectAll() {
    this.headercolumns.forEach((col) => {
      if (col.header !== 'table_column_sno') {
        col.colFilterHide = false;
      }
    });
  }

  // Method to clear all checkboxes
  clearAll() {
    this.headercolumns.forEach((col) => {
      if (col.header !== 'table_column_sno') {
        col.colFilterHide = true;
      }
    });
  }

  focusSearchInput() {
    this.searchInput.nativeElement.focus();
  }

  onSearch() {
    this.search = this.search.trim();
    let hereColumns = [...this.filteredColumns];

    let items = [3, 4];
    hereColumns = hereColumns.filter((item) => items.includes(item.field_type_id));
    if (this.selectedColumns.length > 0) {
      const whereData = this.selectedColumns
        .filter((key: any, index: any) => {
          return key.clause_type === 'where';
        })
        .map((key: any, index: any) => {
          return {
            column_name: key.field,
            operator: this.searchCondition ? this.mapConditionToSQL(this.searchCondition) : '=',
            value: this.addWildcards(this.searchCondition, this.search),
          };
        });

      const havingData = hereColumns
        .filter((key: any, index: any) => {
          return key.clause_type === 'having';
        })
        .map((key: any, index: any) => {
          return {
            column_name: key.field,
            operator: this.searchCondition ? this.mapConditionToSQL(this.searchCondition) : '=',
            value: this.addWildcards(this.searchCondition, this.search),
          };
        });
      const fdata = { where: { data: whereData, search: this.search }, having: { data: havingData, search: this.search } };
      this.searchQuery.emit(fdata);
    } else {
      //this.toastr.warning('Please select any column', 'Warning');

      const whereData = hereColumns
        .filter((key: any, index: any) => {
          return key.clause_type === 'where';
        })
        .map((key: any, index: any) => {
          return {
            column_name: key.field,
            operator: this.searchCondition ? this.mapConditionToSQL(this.searchCondition) : '=',
            value: this.addWildcards(this.searchCondition, this.search),
          };
        });

      const havingData = hereColumns
        .filter((key: any, index: any) => {
          return key.clause_type === 'having';
        })
        .map((key: any, index: any) => {
          return {
            column_name: key.field,
            operator: this.searchCondition ? this.mapConditionToSQL(this.searchCondition) : '=',
            value: this.addWildcards(this.searchCondition, this.search),
          };
        });
      const fdata = { where: { data: whereData, search: this.search }, having: { data: havingData, search: this.search } };
      this.searchQuery.emit(fdata);
    }
  }
  applyFilter() {
    if (this.selectedColumn && this.search) {
      this.filteredItems = this.items.filter((item) => item[this.selectedColumn]?.toString().toLowerCase().includes(this.search.toLowerCase()));
    } else {
      this.filteredItems = [...this.items];
    }
    this.totalItems = this.filteredItems.length;
    this.calculateTotalPages();
  }

  toggleSelectItem(item: any) {
    const index = this.selectedItems.indexOf(item);
    if (index === -1) {
      this.selectedItems.push(item);
    } else {
      this.selectedItems.splice(index, 1);
    }
  }

  toggleSelectAll(event: any) {
    if (event.target.checked) {
      this.selectedItems = [...this.items];
    } else {
      this.selectedItems = [];
    }
  }

  get gridColumnCount(): number {
    return this.headercolumns.filter((column) => column.is_grid_column == 'true').length;
  }
  sortColumn(column: any) {
    if (column.is_grid_column == 'true' && column.is_sortable == 'true') {
      // Reset sortDirection for all other columns
      this.headercolumns.forEach((col) => {
        if (col !== column) {
          col.sortDirection = '';
        }
      });

      // Toggle current column sort direction
      column.sortDirection = column.sortDirection === 'asc' ? 'desc' : 'asc';

      this.columnSort.emit(column);
    }
  }

  deleteSelectedItems() {
    this.delete.emit(this.selectedItems);
    this.selectedItems = [];
  }

  exportTable(type: any) {
    this.exportType.emit({ type: type });
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      const start_index = (this.currentPage - 1) * this.resultsPerPage;
      this.pageChange.emit({ page: this.currentPage, start_index });
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      const start_index = (this.currentPage - 1) * this.resultsPerPage;
      this.pageChange.emit({ page: this.currentPage, start_index });
    }
  }

  getDisplayedItemCount(): number {
    return Math.min(this.currentPage * this.resultsPerPage, this.totalItems);
  }

  getPageNumbers(): (number | string)[] {
    const totalPages = this.calculateTotalPages();
    const currentPage = this.currentPage;
    const pageNumbers: (number | string)[] = [];

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

  handleEllipsisClick(index: number) {
    const pageNumbers = this.getPageNumbers();
    if (index === 1) {
      // Clicked on the first ellipsis
      this.goToPage(Math.floor((1 + this.currentPage) / 2));
    } else if (index === pageNumbers.length - 2) {
      // Clicked on the last ellipsis
      this.goToPage(Math.floor((this.totalPages + this.currentPage) / 2));
    }
  }

  goToPage(page: number | string) {
    if (this.items.length > 0 && typeof page === 'number' && page !== this.currentPage) {
      this.currentPage = page;
      const start_index = (page - 1) * this.resultsPerPage;
      this.pageChange.emit({ page: this.currentPage, start_index });
    }
  }

  onResultsPerPageChange() {
    this.currentPage = 1;
    this.calculateTotalPages();
    const start_index = 0;
    this.resultsPerPageChange.emit({ resultsPerPage: parseInt(this.resultsPerPage), start_index });
  }

  searchData(search: any) {
    this.searchQuery.emit(search);
  }

  calculateTotalPages() {
    this.totalPages = Math.ceil(this.totalItems / this.resultsPerPage);

    return this.totalPages;
  }

  syncTableSchema() {
    this.loading = true;
    this.openaiService.syncTableSchema().subscribe((res) => {
      this.loading = false;
      if (res.status) {
        this.toastr.success('Table schema synced successfully', 'Success');
        this.setPageReload();
      } else {
        this.toastr.error('Failed to sync table schema', 'Error');
      }
    });
  }

  generateVectorForAllTable() {
    this.toastr.info('Syncing table schema..., it may take few minutes', 'Info');
    this.loading = true;
    this.openaiService.generateVectorForAllTable().subscribe((res) => {
      this.loading = false;
      if (res.status) {
        this.toastr.success('Table schema synced successfully', 'Success');
        this.setPageReload();
      } else {
        this.toastr.error('Failed to sync table schema', 'Error');
      }
    });
  }

  setPageReload() {
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }

  onLinkComponentClick(col: any, item: any) {
    this.linkComponentClick.emit({ col, item });
  }

  toggleColumnChildGrid(uuid: string, col: any) {
    if (
      this.expandedColumnChildGrid &&
      this.expandedColumnChildGrid.uuid === uuid &&
      this.expandedColumnChildGrid.colHeader === col.header
    ) {
      // Collapse if already open
      this.expandedColumnChildGrid = null;
    } else {
      // Open this column child grid, close any other
      this.expandedColumnChildGrid = { uuid, colHeader: col.header };
    }
  }

  isColumnChildGridExpanded(uuid: string, col: any): boolean {
    return !!this.expandedColumnChildGrid &&
      this.expandedColumnChildGrid.uuid === uuid &&
      this.expandedColumnChildGrid.colHeader === col.header;
  }
}
