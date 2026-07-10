import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, TemplateRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { catchError, map, of } from 'rxjs';
import { GridApiService } from '../../service/common/grid.service';

export interface TransferBoxFilterOption {
  value: number | string;
  label: string;
}

export interface TransferBoxFilterConfig {
  key: string;
  label: string;
  column_name: string;
  table?: string;
  primary_table?: string;
  valueColumn: string;
  labelColumn: string;
  filterType?: string;
  valueType?: 'number' | 'string';
  start_index?: number;
  limit_range?: number;
  print_query?: boolean;
  includes?: any[];
  search_all?: any[];
  search_any?: any[];
  group_by?: string[];
  having_conditions?: any[];
  having_any_conditions?: any[];
  filtered_columns?: any[];
  sort_columns?: any[];
  select_columns?: any[];
  list_includes?: any[];
  listIncludes?: any[];
  list_group_by?: string[];
  listGroupBy?: string[];
  options?: TransferBoxFilterOption[];
  isLoading?: boolean;
}

export interface TransferBoxFilterCondition {
  key: string;
  label: string;
  column_name: string;
  operator: 'IN';
  operatorLabel: string;
  value: Array<number | string>;
  displayValue: string;
  filterType?: string;
  list_includes?: any[];
  listIncludes?: any[];
  list_group_by?: string[];
  listGroupBy?: string[];
}

export type TransferBoxFilterPopupSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';
export type TransferBoxFilterPopupAlign = 'left' | 'right';

@Component({
  selector: 'app-transfer-box-filter',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule],
  templateUrl: './transfer-box-filter.component.html',
  styleUrls: ['./transfer-box-filter.component.scss'],
})
export class TransferBoxFilterComponent implements OnInit, OnChanges {
  @ViewChild('appliedFiltersTemplate', { static: true }) appliedFiltersTemplate?: TemplateRef<unknown>;

  @Input() activeConditions: TransferBoxFilterCondition[] = [];
  @Input({ required: true }) filterConfigs: TransferBoxFilterConfig[] = [];
  @Input() buttonLabel = 'Filter';
  @Input() title = 'Filters';
  @Input() popupSize: TransferBoxFilterPopupSize = 'lg';
  @Input() popupWidth = '';
  @Input() popupAlign: TransferBoxFilterPopupAlign = 'right';
  @Input() columnCount = 2;
  @Input() tabletColumnCount = 2;
  @Input() mobileColumnCount = 1;
  @Input() maxBodyHeight = '';
  @Input() showClearButton = true;
  @Output() filtersChange = new EventEmitter<TransferBoxFilterCondition[]>();

  isOpen = false;
  appliedValues: Record<string, Array<number | string>> = {};
  draftValues: Record<string, Array<number | string>> = {};
  private initialized = false;

  constructor(private gridApiService: GridApiService) {}

  ngOnInit(): void {
    this.initialized = true;
    this.initializeFilters();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filterConfigs'] && this.initialized) {
      this.initializeFilters();
      return;
    }

    if (changes['activeConditions']) {
      this.syncValuesFromConditions(changes['activeConditions'].currentValue || []);
    }
  }

  get activeFilterCount(): number {
    return Object.values(this.appliedValues).filter((values) => values.length > 0).length;
  }

  get popupStyle(): Record<string, string> {
    const width = this.popupWidth || this.popupWidthBySize(this.popupSize);
    return { width };
  }

  get menuClass(): Record<string, boolean> {
    return {
      'align-left': this.popupAlign === 'left',
      'align-right': this.popupAlign === 'right',
    };
  }

  get bodyStyle(): Record<string, string> {
    const columns = Math.max(1, Math.min(Number(this.columnCount) || 1, 4));
    const tabletColumns = Math.max(1, Math.min(Number(this.tabletColumnCount) || Math.min(columns, 2), 4));
    const mobileColumns = Math.max(1, Math.min(Number(this.mobileColumnCount) || 1, 4));
    const styles: Record<string, string> = {
      '--filter-columns': String(columns),
      '--filter-tablet-columns': String(Math.min(tabletColumns, columns)),
      '--filter-mobile-columns': String(Math.min(mobileColumns, tabletColumns, columns)),
    };
    if (this.maxBodyHeight) {
      styles['max-height'] = this.maxBodyHeight;
      styles['overflow-y'] = 'auto';
    }
    return styles;
  }

  toggleMenu(event: Event): void {
    event.stopPropagation();
    if (this.isOpen) {
      this.isOpen = false;
      return;
    }
    this.openMenu();
  }

  openMenu(): void {
    this.draftValues = this.cloneValues(this.appliedValues);
    this.isOpen = true;
  }

  applyFilters(): void {
    this.appliedValues = this.cloneValues(this.draftValues);
    this.isOpen = false;
    this.filtersChange.emit(this.buildFilterConditions());
  }

  clearFilters(): void {
    this.filterConfigs.forEach((filter) => {
      this.draftValues[filter.key] = [];
      this.appliedValues[filter.key] = [];
    });
    this.isOpen = false;
    this.filtersChange.emit([]);
  }

  removeCondition(condition: TransferBoxFilterCondition): void {
    this.appliedValues[condition.key] = [];
    this.draftValues[condition.key] = [];
    this.filtersChange.emit(this.buildFilterConditions());
  }

  cancelFilters(): void {
    this.draftValues = this.cloneValues(this.appliedValues);
    this.isOpen = false;
  }

  clearDraftFilter(filter: TransferBoxFilterConfig): void {
    this.draftValues[filter.key] = [];
  }

  private initializeFilters(): void {
    this.filterConfigs = this.cloneFilterConfigs(this.filterConfigs || []);
    this.filterConfigs.forEach((filter) => {
      this.appliedValues[filter.key] = this.appliedValues[filter.key] || [];
      this.draftValues[filter.key] = this.draftValues[filter.key] || [];
      this.loadFilterOptions(filter);
    });
    this.syncValuesFromConditions(this.activeConditions);
  }

  private buildFilterConditions(): TransferBoxFilterCondition[] {
    return this.filterConfigs
      .filter((filter) => this.appliedValues[filter.key]?.length > 0)
      .map((filter) => {
        const values = this.appliedValues[filter.key].map((value) => (filter.valueType === 'string' ? String(value) : Number(value)));
        const labels = values
          .map((value) => filter.options?.find((option) => option.value === value)?.label)
          .filter((label): label is string => !!label);
        return {
          key: filter.key,
          label: filter.label,
          column_name: filter.column_name,
          operator: 'IN',
          operatorLabel: 'IN',
          value: values,
          displayValue: labels.length ? labels.join(', ') : values.join(', '),
          filterType: filter.filterType,
          list_includes: filter.list_includes || filter.listIncludes,
          listIncludes: filter.listIncludes || filter.list_includes,
          list_group_by: filter.list_group_by || filter.listGroupBy,
          listGroupBy: filter.listGroupBy || filter.list_group_by,
        };
      });
  }

  private syncValuesFromConditions(conditions: TransferBoxFilterCondition[]): void {
    this.filterConfigs.forEach((filter) => {
      const condition = conditions.find((item) => item.key === filter.key);
      this.appliedValues[filter.key] = condition ? condition.value.map((value) => (filter.valueType === 'string' ? String(value) : Number(value))) : [];
    });

    if (!this.isOpen) {
      this.draftValues = this.cloneValues(this.appliedValues);
    }
  }

  private cloneValues(values: Record<string, Array<number | string>>): Record<string, Array<number | string>> {
    return Object.keys(values).reduce((result, key) => {
      result[key] = [...values[key]];
      return result;
    }, {} as Record<string, Array<number | string>>);
  }

  private loadFilterOptions(filter: TransferBoxFilterConfig): void {
    filter.isLoading = true;
    const tableName = filter.primary_table || filter.table;
    if (!tableName) {
      filter.options = [];
      filter.isLoading = false;
      return;
    }

    const params: any = {
      company_id: this.companyId,
      primary_table: tableName,
      start_index: filter.start_index ?? 0,
      limit_range: filter.limit_range ?? 1000,
      print_query: filter.print_query ?? false,
      sort_columns: filter.sort_columns || [[filter.labelColumn, 'asc']],
      select_columns: filter.select_columns || [
        [filter.valueColumn, 'value'],
        [filter.labelColumn, 'label'],
      ],
      search_all: filter.search_all || [{ column_name: `${tableName}.status_id`, operator: '=', value: 1 }],
      search_any: filter.search_any || [],
    };
    this.assignQueryOption(params, 'includes', filter.includes);
    this.assignQueryOption(params, 'group_by', filter.group_by);
    this.assignQueryOption(params, 'having_conditions', filter.having_conditions);
    this.assignQueryOption(params, 'having_any_conditions', filter.having_any_conditions);
    this.assignQueryOption(params, 'filtered_columns', filter.filtered_columns);

    this.gridApiService
      .getAllList(params)
      .pipe(
        map((response: any) => (response?.status && response.data?.records ? response.data.records : [])),
        catchError(() => of([]))
      )
      .subscribe((records) => {
        filter.options = records
          .filter((record: any) => record.value !== null && record.value !== undefined && record.value !== '')
          .map((record: any) => ({
            value: filter.valueType === 'string' ? String(record.value) : Number(record.value),
            label: record.label || String(record.value),
          }));
        filter.isLoading = false;
      });
  }

  private assignQueryOption(params: any, key: string, value: any[] | undefined): void {
    if (Array.isArray(value) && value.length) {
      params[key] = value;
    }
  }

  private cloneFilterConfigs(configs: TransferBoxFilterConfig[]): TransferBoxFilterConfig[] {
    return (configs || []).map((config) => ({
      ...config,
      options: [...(config.options || [])],
      includes: config.includes ? JSON.parse(JSON.stringify(config.includes)) : undefined,
      search_all: config.search_all ? JSON.parse(JSON.stringify(config.search_all)) : undefined,
      search_any: config.search_any ? JSON.parse(JSON.stringify(config.search_any)) : undefined,
      group_by: config.group_by ? [...config.group_by] : undefined,
      having_conditions: config.having_conditions ? JSON.parse(JSON.stringify(config.having_conditions)) : undefined,
      having_any_conditions: config.having_any_conditions ? JSON.parse(JSON.stringify(config.having_any_conditions)) : undefined,
      filtered_columns: config.filtered_columns ? JSON.parse(JSON.stringify(config.filtered_columns)) : undefined,
      sort_columns: config.sort_columns ? JSON.parse(JSON.stringify(config.sort_columns)) : undefined,
      select_columns: config.select_columns ? JSON.parse(JSON.stringify(config.select_columns)) : undefined,
      list_includes: config.list_includes ? JSON.parse(JSON.stringify(config.list_includes)) : undefined,
      listIncludes: config.listIncludes ? JSON.parse(JSON.stringify(config.listIncludes)) : undefined,
      list_group_by: config.list_group_by ? [...config.list_group_by] : undefined,
      listGroupBy: config.listGroupBy ? [...config.listGroupBy] : undefined,
      isLoading: false,
    }));
  }

  private popupWidthBySize(size: TransferBoxFilterPopupSize): string {
    const widths: Record<TransferBoxFilterPopupSize, string> = {
      sm: 'min(420px, calc(100vw - 36px))',
      md: 'min(620px, calc(100vw - 36px))',
      lg: 'min(820px, calc(100vw - 36px))',
      xl: 'min(1040px, calc(100vw - 36px))',
      full: 'calc(100vw - 36px)',
    };
    return widths[size] || widths.lg;
  }

  private get companyId(): number {
    try {
      const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
      return userData?.main?.company_id || 1;
    } catch {
      return 1;
    }
  }
}
