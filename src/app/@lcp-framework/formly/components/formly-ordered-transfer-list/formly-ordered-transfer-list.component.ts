import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { FieldType, FieldTypeConfig } from '@ngx-formly/core';
import { Subject, Subscription, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import { GridApiService } from '../../../service/common/grid.service';
import { LocalStorageService } from '../../../service/common/local-storage.service';
import {
  TransferBoxFilterComponent,
  TransferBoxFilterCondition,
  TransferBoxFilterConfig,
  TransferBoxFilterPopupAlign,
  TransferBoxFilterPopupSize,
} from '../../../components/transfer-box-filter/transfer-box-filter.component';

interface TransferOption {
  value: any;
  label: string;
  secondaryLabel?: string;
  [key: string]: any;
}

interface LabelColumnConfig {
  column: string;
  alias: string;
}

@Component({
  standalone: true,
  imports: [CommonModule, DragDropModule, TransferBoxFilterComponent],
  selector: 'app-formly-ordered-transfer-list',
  templateUrl: './formly-ordered-transfer-list.component.html',
  styleUrls: ['./formly-ordered-transfer-list.component.scss'],
})
export class FormlyOrderedTransferListComponent extends FieldType<FieldTypeConfig> implements OnInit, OnDestroy {
  transferOptions: TransferOption[] = [];
  serverAvailableOptions: TransferOption[] = [];
  serverTotalRecords = 0;
  availableSearch = '';
  assignedSearch = '';
  selectedAvailable = new Set<any>();
  selectedAssigned = new Set<any>();
  activeFilterConditions: TransferBoxFilterCondition[] = [];

  private sub = new Subscription();
  private availableSearchChange = new Subject<string>();
  private _fallbackControl = new FormControl([]);

  constructor(
    private gridApiService: GridApiService,
    private localStorageService: LocalStorageService,
    private cdr: ChangeDetectorRef
  ) {
    super();
  }

  ngOnInit(): void {
    if (this.isServerSide) {
      this.sub.add(
        this.availableSearchChange
          .pipe(debounceTime(this.serverSearchDebounce), distinctUntilChanged())
          .subscribe((searchTerm) => this.loadServerOptions(searchTerm))
      );
      this.loadServerOptions('');
      this.loadAssignedOptions();
    } else {
      this.loadOptions();
    }

    const ctrl = this.form?.get(this.field.key as string) as FormControl;
    if (ctrl) {
      this.sub.add(
        ctrl.valueChanges.subscribe(() => {
          this.selectedAvailable.clear();
          this.selectedAssigned.clear();
          this.loadAssignedOptions();
          if (this.isServerSide) this.loadServerOptions(this.availableSearch);
        })
      );
    }

    setTimeout(() => {
      const realCtrl = this.form?.get(this.field.key as string) as FormControl;
      if (realCtrl && realCtrl.value) {
        if (this.isServerSide) {
          this.loadAssignedOptions();
          this.loadServerOptions('');
        } else {
          this.loadOptions();
        }
        this.cdr.detectChanges();
      }
    }, 200);
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  override get formControl(): FormControl {
    const ctrl = this.form?.get(this.field.key as string) as FormControl;
    return ctrl || this._fallbackControl;
  }

  get availableLabel(): string {
    return this.props['availableLabel'] || this.props['leftLabel'] || 'Available';
  }

  get assignedLabel(): string {
    return this.props['assignedLabel'] || this.props['rightLabel'] || 'Assigned';
  }

  get searchPlaceholder(): string {
    return this.props['searchPlaceholder'] || 'Search';
  }

  get returnMode(): string {
    return this.props['returnMode'] || 'values';
  }

  get rowValueKey(): string {
    return this.props['rowValueKey'] || 'value';
  }

  get rowSequenceKey(): string {
    return this.props['rowSequenceKey'] || 'sequence_no';
  }

  get isServerSide(): boolean {
    return !!(this.props['serverSide'] || this.props['serverside'] || this.props['server_side']);
  }

  get serverLimitRange(): number {
    return this.props['serverLimitRange'] || this.props['server_limit_range'] || this.props['limit_range'] || 50;
  }

  get serverSearchDebounce(): number {
    return this.props['serverSearchDebounce'] || this.props['server_search_debounce'] || 300;
  }

  get disabled(): boolean {
    return !!(this.formControl.disabled || this.props['readonly'] || this.props['disabled']);
  }

  get filterFieldConfigs(): TransferBoxFilterConfig[] {
    const config = this.props['filterConfigs'] || this.props['filter_configs'];
    if (Array.isArray(config)) return config;
    if (Array.isArray(config?.fieldConfig)) return config.fieldConfig;
    if (Array.isArray(config?.fieldConfigs)) return config.fieldConfigs;
    if (Array.isArray(config?.fields)) return config.fields;
    return [];
  }

  get hasFilterConfigs(): boolean {
    return this.filterFieldConfigs.length > 0;
  }

  get filterPopupConfig(): Record<string, any> {
    const config = this.props['filterConfigs'] || this.props['filter_configs'];
    return config && !Array.isArray(config) ? config.popupConfig || config.popup || {} : {};
  }

  get filterButtonLabel(): string {
    return this.filterPopupConfig['buttonLabel'] || this.filterPopupConfig['button_label'] || 'Filter';
  }

  get filterTitle(): string {
    return this.filterPopupConfig['title'] || 'Filters';
  }

  get filterPopupSize(): TransferBoxFilterPopupSize {
    return this.filterPopupConfig['popupSize'] || this.filterPopupConfig['popup_size'] || 'lg';
  }

  get filterPopupWidth(): string {
    return this.filterPopupConfig['popupWidth'] || this.filterPopupConfig['popup_width'] || '';
  }

  get filterPopupAlign(): TransferBoxFilterPopupAlign {
    return this.filterPopupConfig['popupAlign'] || this.filterPopupConfig['popup_align'] || 'right';
  }

  get filterColumnCount(): number {
    return this.filterPopupConfig['columnCount'] || this.filterPopupConfig['column_count'] || 2;
  }

  get filterMaxBodyHeight(): string {
    return this.filterPopupConfig['maxBodyHeight'] || this.filterPopupConfig['max_body_height'] || '';
  }

  get filterShowClearButton(): boolean {
    const value = this.filterPopupConfig['showClearButton'] ?? this.filterPopupConfig['show_clear_button'];
    return value === undefined ? true : value !== false;
  }

  get assignedValues(): any[] {
    const value = this.formControl.value;
    if (Array.isArray(value)) return value;
    if (value === null || value === undefined || value === '') return [];
    return [value];
  }

  get assignedOptions(): TransferOption[] {
    const values = this.assignedValues;
    return values.map((value) => this.findOptionByStoredValue(value) || this.fallbackOptionFromStoredValue(value));
  }

  get availableOptions(): TransferOption[] {
    const assignedKeys = new Set(this.assignedValues.map((value) => this.optionKeyFromStoredValue(value)));
    const options = this.isServerSide ? this.serverAvailableOptions : this.transferOptions;
    return options.filter((option) => !assignedKeys.has(this.optionKey(option)));
  }

  get filteredAvailableOptions(): TransferOption[] {
    if (this.isServerSide) return this.availableOptions;
    return this.filterOptions(this.availableOptions, this.availableSearch);
  }

  get filteredAssignedOptions(): TransferOption[] {
    return this.filterOptions(this.assignedOptions, this.assignedSearch);
  }

  get availableCountLabel(): string {
    if (this.isServerSide) {
      return `${this.filteredAvailableOptions.length} of ${this.serverTotalRecords}`;
    }

    return `${this.filteredAvailableOptions.length} of ${this.availableOptions.length}`;
  }

  get assignedCountLabel(): string {
    const count = this.assignedOptions.length;
    return `${count} assigned`;
  }

  loadOptions(): void {
    if (Array.isArray(this.props.options)) {
      this.transferOptions = this.normalizeOptions(this.props.options);
      this.cdr.detectChanges();
      return;
    }

    const tableName = this.props['table'] || this.props['primary_table'];
    const valueColumn = this.props['valueColumn'];
    const labelColumn = this.props['labelColumn'];

    if (!tableName || !valueColumn || !labelColumn) {
      this.transferOptions = [];
      this.cdr.detectChanges();
      return;
    }

    const userData = this.safeParse(this.localStorageService.getData('user_data'));
    const companyId = userData?.main?.company_id || 1;
    const searchAll = this.props['search_all']
      ? JSON.parse(JSON.stringify(this.props['search_all']))
      : [{ column_name: `${tableName}.status_id`, operator: '=', value: 1 }];

    const listParams = {
      company_id: companyId,
      primary_table: tableName,
      start_index: 0,
      limit_range: this.props['limit_range'] || 1000,
      print_query: this.props['print_query'] || false,
      sort_columns: this.props['sort_columns'] || [[labelColumn, 'asc']],
      search_all: searchAll,
      includes: this.props['includes'] || [],
      select_columns: [[valueColumn, 'value'], [labelColumn, 'label'], ...(this.props['additionalColumns'] || [])],
    };

    this.sub.add(
      this.gridApiService
        .getAllList(listParams)
        .pipe(
          map((response: any) => (response.status && response.data?.records ? response.data.records : [])),
          catchError(() => of([]))
        )
        .subscribe((records) => {
          this.transferOptions = this.normalizeOptions(records);
          this.cdr.detectChanges();
        })
    );
  }

  loadServerOptions(searchTerm = ''): void {
    if (!this.isServerSide) return;

    const searchParams = this.getSearchParamsForTerm(searchTerm);
    const listParams = this.buildListParams(searchParams.searchAll, this.serverLimitRange, searchParams.searchAny, true);
    if (!listParams) {
      this.serverAvailableOptions = [];
      this.serverTotalRecords = 0;
      this.cdr.detectChanges();
      return;
    }

    this.sub.add(
      this.gridApiService
        .getAllList(listParams)
        .pipe(
          map((response: any) => ({
            records: response.status && response.data?.records ? response.data.records : [],
            totalRecords: response.data?.total_records ?? response.data?.total_records_count ?? 0,
          })),
          catchError(() => of({ records: [], totalRecords: 0 }))
        )
        .subscribe(({ records, totalRecords }) => {
          const options = this.normalizeOptions(records);
          this.serverAvailableOptions = options;
          this.serverTotalRecords = totalRecords;
          this.mergeTransferOptions(options);
          this.cdr.detectChanges();
        })
    );
  }

  toggleAvailable(option: TransferOption, checked: boolean): void {
    this.toggleSet(this.selectedAvailable, this.optionKey(option), checked);
  }

  toggleAssigned(option: TransferOption, checked: boolean): void {
    this.toggleSet(this.selectedAssigned, this.optionKey(option), checked);
  }

  isAvailableChecked(option: TransferOption): boolean {
    return this.selectedAvailable.has(this.optionKey(option));
  }

  isAssignedChecked(option: TransferOption): boolean {
    return this.selectedAssigned.has(this.optionKey(option));
  }

  selectAllAvailable(): void {
    if (this.disabled) return;
    this.filteredAvailableOptions.forEach((option) => this.selectedAvailable.add(this.optionKey(option)));
  }

  clearAvailableSelection(): void {
    this.selectedAvailable.clear();
  }

  selectAllAssigned(): void {
    if (this.disabled) return;
    this.filteredAssignedOptions.forEach((option) => this.selectedAssigned.add(this.optionKey(option)));
  }

  clearAssignedSelection(): void {
    this.selectedAssigned.clear();
  }

  moveSelectedToAssigned(): void {
    if (this.disabled || this.selectedAvailable.size === 0) return;
    const selected = this.availableOptions.filter((option) => this.selectedAvailable.has(this.optionKey(option)));
    this.updateValue([...this.assignedOptions, ...selected]);
    this.selectedAvailable.clear();
  }

  moveSelectedToAvailable(): void {
    if (this.disabled || this.selectedAssigned.size === 0) return;
    const selectedKeys = this.selectedAssigned;
    this.updateValue(this.assignedOptions.filter((option) => !selectedKeys.has(this.optionKey(option))));
    this.selectedAssigned.clear();
  }

  dropAssigned(event: CdkDragDrop<TransferOption[]>): void {
    if (this.disabled || event.previousIndex === event.currentIndex) return;
    const ordered = [...this.filteredAssignedOptions];
    moveItemInArray(ordered, event.previousIndex, event.currentIndex);

    const hiddenItems = this.assignedOptions.filter((option) => !this.filteredAssignedOptions.some((visible) => this.optionKey(visible) === this.optionKey(option)));
    this.updateValue([...ordered, ...hiddenItems]);
  }

  updateSearch(side: 'available' | 'assigned', event: Event): void {
    const value = (event.target as HTMLInputElement).value || '';
    if (side === 'available') {
      this.availableSearch = value;
      if (this.isServerSide) {
        this.selectedAvailable.clear();
        this.availableSearchChange.next(value);
      }
    } else {
      this.assignedSearch = value;
    }
  }

  trackByOption = (_: number, option: TransferOption) => this.optionKey(option);

  applyFilters(conditions: TransferBoxFilterCondition[]): void {
    this.activeFilterConditions = conditions;
    this.selectedAvailable.clear();
    if (this.isServerSide) {
      this.loadServerOptions(this.availableSearch);
    }
  }

  private updateValue(options: TransferOption[]): void {
    const value =
      this.returnMode === 'sequenceRows'
        ? options.map((option, index) => ({
            [this.rowValueKey]: option.value,
            [this.rowSequenceKey]: index + 1,
          }))
        : this.props['returnObjects']
          ? options
          : options.map((option) => option.value);

    this.formControl.setValue(value);
    this.formControl.markAsDirty();
    this.formControl.updateValueAndValidity();
  }

  private normalizeOptions(options: any[]): TransferOption[] {
    return options.map((option) => {
      if (typeof option !== 'object' || option === null) {
        return { value: option, label: String(option) };
      }

      const bindValue = this.props['bindValue'] || this.props['valueKey'] || 'value';
      const bindLabel = this.props['bindLabel'] || this.props['labelKey'] || 'label';
      const value = option[bindValue] ?? option.value ?? option.id;
      const label = option[bindLabel] ?? option.label ?? option.name ?? String(value ?? '');
      const secondaryLabel = this.getSecondaryLabel(option);
      return { ...option, value, label, secondaryLabel };
    });
  }

  private loadAssignedOptions(): void {
    if (!this.isServerSide || this.assignedValues.length === 0) return;

    const missingValues = this.assignedValues
      .filter((value) => !this.findOptionByStoredValue(value))
      .map((value) => this.storedRawValue(value))
      .filter((value) => value !== null && value !== undefined && value !== '');

    if (missingValues.length === 0) return;

    const valueColumn = this.props['valueColumn'];
    const listParams = this.buildListParams(
      [...this.getBaseSearchAll(), { column_name: valueColumn, operator: 'IN', value: missingValues }],
      Math.max(missingValues.length, this.serverLimitRange)
    );

    if (!listParams) return;

    this.sub.add(
      this.gridApiService
        .getAllList(listParams)
        .pipe(
          map((response: any) => (response.status && response.data?.records ? response.data.records : [])),
          catchError(() => of([]))
        )
        .subscribe((records) => {
          this.mergeTransferOptions(this.normalizeOptions(records));
          this.cdr.detectChanges();
        })
    );
  }

  private buildListParams(searchAll: any[], limitRange: number, searchAny: any[] = [], applyFilters = false): any | null {
    const tableName = this.props['table'] || this.props['primary_table'];
    const valueColumn = this.props['valueColumn'];
    const labelColumn = this.primaryLabelColumn;

    if (!tableName || !valueColumn || !labelColumn) return null;

    const userData = this.safeParse(this.localStorageService.getData('user_data'));
    const companyId = userData?.main?.company_id || 1;

    const params: any = {
      company_id: companyId,
      primary_table: tableName,
      start_index: 0,
      limit_range: limitRange,
      print_query: this.props['print_query'] || false,
      sort_columns: this.props['sort_columns'] || [[labelColumn, 'asc']],
      search_all: this.cloneArray(searchAll),
      search_any: searchAny,
      includes: this.cloneArray(this.props['includes'] || []),
      select_columns: this.getSelectColumns(valueColumn),
    };

    if (applyFilters) {
      this.applyFilterConditionsToListParams(params);
    }

    return params;
  }

  private getBaseSearchAll(): any[] {
    const tableName = this.props['table'] || this.props['primary_table'];
    return this.props['search_all']
      ? JSON.parse(JSON.stringify(this.props['search_all']))
      : [{ column_name: `${tableName}.status_id`, operator: '=', value: 1 }];
  }

  private getSearchParamsForTerm(searchTerm: string): { searchAll: any[]; searchAny: any[] } {
    const searchAll = this.getBaseSearchAll();
    const assignedValues = this.getAssignedRawValues();
    if (assignedValues.length > 0) {
      searchAll.push({
        column_name: this.props['valueColumn'],
        operator: 'NOT IN',
        value: assignedValues,
      });
    }

    const term = searchTerm.trim();
    if (!term) return { searchAll, searchAny: [] };

    const searchAny = this.serverSearchColumns.map((columnName) => ({
      column_name: columnName,
      operator: 'ILIKE',
      value: `%${term}%`,
    }));

    return { searchAll, searchAny };
  }

  private applyFilterConditionsToListParams(params: any): void {
    if (!this.activeFilterConditions.length) return;

    const includeKeys = new Set<string>((params.includes || []).map((include: any) => String(include.table_name)));
    this.activeFilterConditions.forEach((condition) => {
      params.search_all.push({
        column_name: condition.column_name,
        operator: condition.operator || 'IN',
        value: condition.value,
      });

      const listIncludes = condition.list_includes || condition.listIncludes || [];
      listIncludes.forEach((include: any) => this.addIncludeOnce(params, includeKeys, include));

      if (!listIncludes.length && condition.filterType === 'tag') {
        this.addIncludeOnce(params, includeKeys, {
          join_type: 'INNER',
          table_name: 'outlet_tag_mapping',
          join_condition: 'outlet_tag_mapping.outlet_id = outlet.id AND outlet_tag_mapping.company_id = outlet.company_id AND outlet_tag_mapping.status_id = 1',
        });
      }

      if (!listIncludes.length && condition.filterType === 'address') {
        this.addIncludeOnce(params, includeKeys, {
          join_type: 'INNER',
          table_name: 'outlet_address_mapping',
          join_condition: 'outlet_address_mapping.outlet_id = outlet.id AND outlet_address_mapping.company_id = outlet.company_id AND outlet_address_mapping.status_id = 1',
        });
        this.addIncludeOnce(params, includeKeys, {
          join_type: 'INNER',
          table_name: 'outlet_address',
          join_condition:
            'outlet_address.id = outlet_address_mapping.outlet_address_id AND outlet_address.company_id = outlet_address_mapping.company_id AND outlet_address.status_id = 1',
        });
      }

      const listGroupBy = condition.list_group_by || condition.listGroupBy || [];
      if (listGroupBy.length) {
        params.group_by = this.mergeGroupBy(params.group_by, listGroupBy);
      }
    });

    params.group_by = this.getFilteredQueryGroupBy(params.group_by);
  }

  private addIncludeOnce(params: any, includeKeys: Set<string>, include: any): void {
    if (includeKeys.has(include.table_name)) return;
    params.includes = params.includes || [];
    params.includes.push(include);
    includeKeys.add(include.table_name);
  }

  private getFilteredQueryGroupBy(existingGroupBy: any[] | undefined): string[] {
    const groupBy = new Set<string>(this.cloneArray(existingGroupBy || []));
    groupBy.add(this.props['valueColumn']);
    this.getLabelColumns().forEach((column) => groupBy.add(column.column));
    (this.props['additionalColumns'] || []).forEach((column: any) => {
      const columnName = Array.isArray(column) ? column[0] : column?.column || column?.column_name;
      if (columnName) groupBy.add(columnName);
    });
    return Array.from(groupBy);
  }

  private mergeGroupBy(existingGroupBy: any[] | undefined, extraGroupBy: any[]): string[] {
    const groupBy = new Set<string>(this.cloneArray(existingGroupBy || []));
    extraGroupBy.forEach((column) => {
      if (column) groupBy.add(String(column));
    });
    return Array.from(groupBy);
  }

  private mergeTransferOptions(options: TransferOption[]): void {
    const optionMap = new Map<string, TransferOption>();
    this.transferOptions.forEach((option) => optionMap.set(this.optionKey(option), option));
    options.forEach((option) => optionMap.set(this.optionKey(option), option));
    this.transferOptions = Array.from(optionMap.values());
  }

  private findOptionByStoredValue(value: any): TransferOption | undefined {
    const key = this.optionKeyFromStoredValue(value);
    return this.transferOptions.find((option) => this.optionKey(option) === key);
  }

  private fallbackOptionFromStoredValue(value: any): TransferOption {
    const rawValue = this.storedRawValue(value);
    const label = value && typeof value === 'object' ? value.label || value.name || value[this.rowValueKey] || rawValue : rawValue;
    return { value: rawValue, label: String(label ?? '') };
  }

  private get primaryLabelColumn(): string {
    return this.getLabelColumns()[0]?.column || '';
  }

  private get serverSearchColumns(): string[] {
    const configured = this.props['serverSearchColumn'] || this.props['server_search_column'] || this.props['searchColumn'] || this.props['search_column'];
    const columns = this.normalizeColumnList(configured);
    return columns.length > 0 ? columns : this.getLabelColumns().map((column) => column.column);
  }

  private getLabelColumns(): LabelColumnConfig[] {
    const configured = this.props['labelColumns'] || this.props['label_columns'] || this.props['labelColumn'];
    const rawColumns = Array.isArray(configured) ? configured : configured ? [configured] : [];

    return rawColumns
      .map((column: any, index: number) => this.normalizeLabelColumn(column, index))
      .filter((column): column is LabelColumnConfig => !!column);
  }

  private normalizeLabelColumn(column: any, index: number): LabelColumnConfig | null {
    const alias = index === 0 ? 'label' : index === 1 ? 'secondaryLabel' : `secondaryLabel${index}`;

    if (typeof column === 'string') {
      return { column, alias };
    }

    if (Array.isArray(column) && column[0]) {
      return { column: column[0], alias: column[1] || alias };
    }

    if (column && typeof column === 'object') {
      const columnName = column.column || column.column_name || column.field_name || column.value;
      if (!columnName) return null;
      return { column: columnName, alias: column.alias || column.as || alias };
    }

    return null;
  }

  private normalizeColumnList(columns: any): string[] {
    if (!columns) return [];
    const rawColumns = Array.isArray(columns) ? columns : [columns];
    return rawColumns
      .map((column: any) => {
        if (typeof column === 'string') return column;
        if (Array.isArray(column)) return column[0];
        return column?.column || column?.column_name || column?.field_name || column?.value;
      })
      .filter((column): column is string => !!column);
  }

  private getSelectColumns(valueColumn: string): any[] {
    return [[valueColumn, 'value'], ...this.getLabelColumns().map((column) => [column.column, column.alias]), ...(this.props['additionalColumns'] || [])];
  }

  private getSecondaryLabel(option: any): string {
    const secondaryAliases = this.getLabelColumns()
      .map((column) => column.alias)
      .filter((alias) => alias !== 'label');

    return secondaryAliases
      .map((alias) => option[alias])
      .filter((value) => value !== null && value !== undefined && value !== '')
      .map((value) => String(value))
      .join(' | ');
  }

  private optionKey(option: TransferOption): string {
    return String(option.value);
  }

  private optionKeyFromStoredValue(value: any): string {
    if (this.returnMode === 'sequenceRows' && value && typeof value === 'object') {
      return String(value[this.rowValueKey] ?? value.value ?? value.id);
    }

    if (this.props['returnObjects'] && value && typeof value === 'object') {
      return String(value.value ?? value.id);
    }
    return String(value);
  }

  private storedRawValue(value: any): any {
    if (this.returnMode === 'sequenceRows' && value && typeof value === 'object') {
      return value[this.rowValueKey] ?? value.value ?? value.id;
    }

    if (this.props['returnObjects'] && value && typeof value === 'object') {
      return value.value ?? value.id;
    }

    return value;
  }

  private getAssignedRawValues(): any[] {
    return this.assignedValues
      .map((value) => this.storedRawValue(value))
      .filter((value) => value !== null && value !== undefined && value !== '');
  }

  private filterOptions(options: TransferOption[], search: string): TransferOption[] {
    const term = search.trim().toLowerCase();
    if (!term) return options;
    return options.filter((option) => String(option.label).toLowerCase().includes(term) || String(option.value).toLowerCase().includes(term));
  }

  private toggleSet(set: Set<any>, key: any, checked: boolean): void {
    if (checked) set.add(key);
    else set.delete(key);
  }

  private cloneArray<T = any>(value: T[]): T[] {
    return JSON.parse(JSON.stringify(value || []));
  }

  private safeParse(value: string | null): any {
    try {
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  }
}
