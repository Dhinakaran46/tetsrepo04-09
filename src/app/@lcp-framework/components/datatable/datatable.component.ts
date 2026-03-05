import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  TemplateRef,
  OnChanges,
  SimpleChanges,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
  ViewChildren,
  QueryList,
  ViewContainerRef,
  AfterViewChecked,
} from '@angular/core';

import { NgMultiSelectDropDownModule } from 'ng-multiselect-dropdown';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { debounceTime, distinctUntilChanged, map, switchMap } from 'rxjs/operators';
import { Observable, Subject } from 'rxjs';
import { BooleanStatusPipe } from '../../pipes/boolean/boolean-status.pipe';
import { animate, style, transition, trigger } from '@angular/animations';
import { CommonSharedModule } from '../../shared/common/common.module';
import { Store } from '@ngrx/store';
import { commonConfig } from '../../config/common.config';

import { DatePipe, Location } from '@angular/common';
import { LocalStorageService } from '../../service/common/local-storage.service';
import { OpenaiService } from '../../service/common/openai.service';
import { TimezoneService } from '../../service/common/timezone.service';
import { MasterListComponent } from '../../pages/master-list/master-list.component';
import { LoaderComponent } from '../loader/loader.component';
import { AppendToBodyDirective } from './append-to-body.directive';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ApiResponce, GridApiService } from '../../service/common/grid.service';

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

interface FilterCondition {
  field: string;
  operator: string;
  value: string;
  clause_type: string;
  enum_values: any[];
  availableOperators: SearchCondition[];
  inputType: string;
  isEnum: boolean;
  enumType: string;
  enumValueOptions: Array<{ label: any; value: any }>;
  autocompleteLoading: boolean;
  autocompleteSearchText: string;
}

@Component({
  selector: 'app-datatable',
  standalone: true,
  imports: [CommonSharedModule, NgMultiSelectDropDownModule, BooleanStatusPipe, LoaderComponent, AppendToBodyDirective],
  templateUrl: './datatable.component.html',
  styleUrl: './datatable.component.scss',
  animations: [
    trigger('toggleAnimation', [
      transition(':enter', [style({ opacity: 0, transform: 'scale(0.95)' }), animate('100ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))]),
      transition(':leave', [animate('75ms', style({ opacity: 0, transform: 'scale(0.95)' }))]),
    ]),
  ],
})
export class DataTableComponent implements OnInit, OnChanges, AfterViewChecked {
  // Add this property to your component class:
  pendingPopupData: { item: any; entityName: string } | null = null;

  expandedItem: any = null;
  expandedColumnChildGrid: { uuid: string; colHeader: string; rowIndex: number } | null = null;
  @Input() permissions: boolean = true;
  @Input() unique_id: any;
  @Input() loading: boolean = false;
  @ViewChild('searchInput') searchInput!: ElementRef;
  store: any;
  @Input() customTemplates: { [key: string]: TemplateRef<any> } = {};
  @Input() title: any = '';
  @Input() previewTitle: any = '';
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
  @Output() linkComponentClick = new EventEmitter<{ col: any; item: any }>();
  @Output() selectionChange = new EventEmitter<any>();
  autocompleteSearchSubject = new Subject<string>();

  search: any = '';
  appliedCommonSearch: string = '';
  isCommonSearchApplied: boolean = false;
  selectedColumns: any[] = [];
  selectedColumn = '';
  searchCondition: string = 'contains';
  @Input() selectedItems: any[] = [];

  totalPages: number = 1;
  filteredItems: any[] = [];
  filteredColumns: any[] = [];

  textClass: string = '';

  isMenuOpen = false;
  filterCondition: any = true;
  filterConditions: Array<FilterCondition> = [];
  selectedColumnType: any = 1;
  currentSearchConditions: any = [];
  field_types = commonConfig.field_types;
  inputTypes: InputTypes = commonConfig.field_type;
  searchConditions: SearchConditions = commonConfig.search_conditions;
  isSchemaChunks: boolean = false;

  // Quick fix - minimal required settings
  filterDropdownSettings: any = {
    singleSelection: false,
    idField: 'value', // REQUIRED: This was missing!
    textField: 'label', // REQUIRED: This was missing!
    allowSearchFilter: true,
  };

  onItemSelect(item: any, index: number) {
    const enum_values = this.filterConditions[index].enum_values;
    // this.filterConditions[index].value = enum_values.map((e) => e.value);
  }

  onItemDeSelect(item: any, index: number) {
    const enum_values = this.filterConditions[index].enum_values;
  }

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
      case 'in':
        return 'IN';
      case 'not_in':
        return 'NOT IN';
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
      case 'in':
      case 'not_in': {
        if (Array.isArray(value)) {
          return value;
        }
        return value
          .split(',')
          .map((val: string) => val.trim())
          .filter(Boolean);
      }
      default:
        return value;
    }
  };

  mapConditionToValue = (condition: any, value: any) => {
    switch (condition) {
      case 'is_empty':
        return '';
      case 'is_not_empty':
        return '';
      case 'is_null':
        return null;
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
  previousSelections: any[] = [];

  user_info: any;
  config: any;

  @ViewChild('childMasterListContainer', { read: ViewContainerRef }) childMasterListContainer!: ViewContainerRef;
  @ViewChild('columnChildMasterListContainer', { read: ViewContainerRef }) columnChildMasterListContainer!: ViewContainerRef;
  @ViewChild('popupChildMasterListContainer', { read: ViewContainerRef }) popupChildMasterListContainer!: ViewContainerRef;
  public lastRenderedUuid: string | null = null;
  public lastRenderedColumnChildUuid: string | null = null;
  @Input() isViewPopupOpen: boolean = false;

  isViewPopupOpenDirect = false;
  loadingpopup = false;
  noPopupPermission = false;

  constructor(
    private translate: TranslateService,
    private gridApiService: GridApiService,
    private toastr: ToastrService,
    public storeData: Store<any>,
    public datePipe: DatePipe,
    private localstore: LocalStorageService,
    private openaiService: OpenaiService,
    public location: Location,
    private timezoneService: TimezoneService,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer
  ) {
    this.config = JSON.parse(this.localstore.getData('config'));
    this.user_info = JSON.parse(this.localstore.getData('user_data'));
    this.paginationOptions = this.config.grid_pagination_dropdown.split(',').map((item: any) => +item);
    this.initStore();
  }

  ngAfterViewChecked() {
    // if a popup is requested and the container is now available, create it once
    if (this.isViewPopupOpenDirect && this.pendingPopupData && this.popupChildMasterListContainer) {
      const { item, entityName } = this.pendingPopupData;
      this.pendingPopupData = null; // prevent double-create
      this.createColumnPopupChildMasterList(item, entityName);
      this.cdr.detectChanges(); // flush changes
    }
  }

  onEnumChange(selectedValues: any[], index: number) {
    // If you still need select / deselect logic:
    const previous = this.previousSelections[index] || [];

    const added = selectedValues.filter((x: any) => !previous.includes(x));
    const removed = previous.filter((x: any) => !selectedValues.includes(x));

    added.forEach((item) => this.onItemSelect(item, index));
    removed.forEach((item: any) => this.onItemDeSelect(item, index));

    this.previousSelections[index] = [...selectedValues];
  }

  /**
   * Return the HTML template string for a column, looking in various places/keys.
   */
  getHtmlTemplateFor(col: any): string | null {
    // 1) direct on the header column (snake_case or camelCase)
    const direct = col?.field_html_content || col?.fieldHtmlContent;
    if (direct && String(direct).trim().length) return String(direct);

    // 2) find matching definition from selectcolumns metadata
    const match =
      this.selectcolumns?.find(
        (sc: any) =>
          // try by field match first
          (sc.field && col.field && sc.field === col.field) ||
          // then by header/title match (depending on what you pass)
          (sc.title && col.title && sc.title === col.title) ||
          (sc.title && col.header && sc.title === col.header) ||
          (sc.header && col.header && sc.header === col.header)
      ) || null;

    const fromMeta = match?.field_html_content || match?.fieldHtmlContent;
    return fromMeta && String(fromMeta).trim().length ? String(fromMeta) : null;
  }

  /**
   * Process HTML content with col.header as the primary property accessor
   * @param htmlTemplate - The HTML template string with interpolations
   * @param item - The data item/row
   * @param col - The column object containing header and other metadata
   * @returns Sanitized HTML
   */
  getProcessedHtmlContent(htmlTemplate: string, item: any, col: any): SafeHtml {
    let processedHtml = htmlTemplate;

    // primary value (column field wins over header)
    const key = (col?.field ?? col?.header) as string;
    const primaryValue = key ? item?.[key] ?? '' : '';

    // Build a context exposed to expressions:
    // - spread row properties (e.g., name)
    // - value: primary cell value
    // - row_object: full row for explicit usage in templates
    const context: any = {
      ...item,
      value: primaryValue,
      row_object: item,
    };

    // 1) Resolve ternary/conditional expressions first:
    //    {{ condition ? trueValue : falseValue }} or {{ some.prop }}
    const exprRegex = /\{\{\s*(.+?)\s*\}\}/g;
    processedHtml = processedHtml.replace(exprRegex, (_m, expression: string) => {
      const exp = expression.trim();

      // ternary?
      const qIdx = exp.indexOf('?');
      const cIdx = exp.lastIndexOf(':');
      if (qIdx > -1 && cIdx > qIdx) {
        const condition = exp.slice(0, qIdx).trim();
        const truePart = exp.slice(qIdx + 1, cIdx).trim();
        const falsePart = exp.slice(cIdx + 1).trim();

        const condResult = this.evaluateCondition(condition, context);

        // resolve each branch as either literal, path, or raw
        const chosen = condResult ? truePart : falsePart;
        const val = this.getContextValue(chosen, context);
        return val === undefined
          ? chosen.replace(/^['"]|['"]$/g, '') // strip quotes if they used them
          : this.formatHtmlTemplateValue(val);
      }

      // non-ternary: try to resolve as path/literal (supports row_object.name, value, etc.)
      const v = this.getContextValue(exp, context);
      return v !== undefined && v !== null ? this.formatHtmlTemplateValue(v) : '';
    });

    // (optional) final pass for the explicit {{ value }} or {{ key }} placeholders
    if (key) {
      processedHtml = processedHtml
        .replace(/\{\{\s*value\s*\}\}/g, this.formatHtmlTemplateValue(primaryValue))
        .replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), this.formatHtmlTemplateValue(primaryValue));
    }

    return this.sanitizer.bypassSecurityTrustHtml(processedHtml);
    //return processedHtml;
  }

  private formatHtmlTemplateValue(value: any): string {
    if (value === undefined || value === null) {
      return '';
    }

    if (Array.isArray(value)) {
      return value
        .map((item) => this.formatHtmlTemplateValue(item))
        .filter((item) => item !== '')
        .join(', ');
    }

    if (typeof value === 'object') {
      return Object.entries(value)
        .map(([key, val]) => {
          const translated = this.translate.instant(key);
          if (translated && translated !== key) {
            return translated;
          }
          return this.formatHtmlTemplateValue(val);
        })
        .filter((item) => item !== '')
        .join(', ');
    }

    if (typeof value === 'string') {
      const parts = value.split('|').map((part) => part.trim());
      let hasKeyValuePattern = false;

      const translatedParts = parts.map((part) => {
        const colonIndex = part.indexOf(':');
        if (colonIndex <= 0) {
          return part;
        }

        const rawKey = part.slice(0, colonIndex).trim();
        const rawValue = part.slice(colonIndex + 1).trim();

        if (!/^[a-zA-Z0-9_.-]+$/.test(rawKey)) {
          return part;
        }

        hasKeyValuePattern = true;
        const translatedKey = this.translate.instant(rawKey);
        const displayKey = translatedKey && translatedKey !== rawKey ? translatedKey : rawKey;

        return `${displayKey}: ${rawValue}`;
      });

      if (hasKeyValuePattern) {
        return translatedParts.join(' | ');
      }
    }

    return String(value);
  }

  onHtmlCellClick(ev: MouseEvent) {
    const a = (ev.target as HTMLElement)?.closest('a') as HTMLAnchorElement | null;
    if (!a) return;

    // Don’t let row-level handlers swallow it
    ev.stopPropagation();
    ev.preventDefault();

    const href = a.getAttribute('href');
    if (!href) return;

    const target = a.getAttribute('target') || '_blank';
    window.open(href, target, 'noopener,noreferrer');
  }

  /** Resolve a.b.c or ["a"][0].b style paths against an object */
  /** Resolve a.b.c or ["a"][0].b style paths against an object */
  private resolvePath(path: string, root: any): any {
    let p = (path ?? '').trim();
    if (!p) return undefined;

    // 🔧 normalize doubled quotes from SQL/JSON (''x'' or ""x"")
    if (/^''.*''$/.test(p)) p = p.slice(2, -2).replace(/''''/g, "''"); // handle escaped inner ''
    if (/^"".*""$/.test(p)) p = p.slice(2, -2).replace(/""""/g, '""');

    // single-quoted / double-quoted literals
    if ((p.startsWith("'") && p.endsWith("'")) || (p.startsWith('"') && p.endsWith('"'))) {
      return p.slice(1, -1);
    }

    // number & boolean literals
    if (/^-?\d+(\.\d+)?$/.test(p)) return Number(p);
    if (p === 'true') return true;
    if (p === 'false') return false;

    // normalize bracket to dot: a['b'][0] -> a.b.0
    p = p.replace(/\[(\d+)\]/g, '.$1').replace(/\[["']([^"']+)["']\]/g, '.$1');

    const parts = p.split('.');
    let cur = root;
    for (const part of parts) {
      if (cur == null) return undefined;
      cur = cur[part];
    }
    return cur;
  }

  private getContextValue(key: string, context: any): any {
    return this.resolvePath(key, context);
  }

  private parseNumber(value: any): number {
    if (typeof value === 'number') return value;
    const n = parseFloat(String(value).replace(/['"]/g, ''));
    return isNaN(n) ? 0 : n;
  }

  /** Evaluate simple comparisons & truthiness with full context support */
  /** Evaluate simple comparisons & truthiness with full context support */
  private evaluateCondition(condition: string, context: any): boolean {
    const c = (condition ?? '').trim();
    const ops = ['==', '!=', '>=', '<=', '>', '<'] as const;

    for (const op of ops) {
      const idx = c.indexOf(op);
      if (idx > -1) {
        let left = c.slice(0, idx).trim();
        let right = c.slice(idx + op.length).trim();

        // 🔧 normalize doubled quotes on both sides
        if (/^''.*''$/.test(left)) left = left.slice(2, -2);
        if (/^"".*""$/.test(left)) left = left.slice(2, -2);
        if (/^''.*''$/.test(right)) right = right.slice(2, -2);
        if (/^"".*""$/.test(right)) right = right.slice(2, -2);

        const lv = this.getContextValue(left, context);
        const rvRaw = this.getContextValue(right, context);
        const rv = rvRaw === undefined ? right.replace(/^['"]|['"]$/g, '') : rvRaw;

        switch (op) {
          case '==':
            return String(lv) == String(rv);
          case '!=':
            return String(lv) != String(rv);
          case '>=':
            return this.parseNumber(lv) >= this.parseNumber(rv);
          case '<=':
            return this.parseNumber(lv) <= this.parseNumber(rv);
          case '>':
            return this.parseNumber(lv) > this.parseNumber(rv);
          case '<':
            return this.parseNumber(lv) < this.parseNumber(rv);
        }
      }
    }
    return !!this.getContextValue(c, context);
  }

  toggleRow(item: any, row_index: number) {
    if (this.expandedItem === row_index) {
      this.clearAllExpandedGrids();
      return;
    }

    // Close any previously expanded row and its column child grids
    if (this.expandedItem) {
      this.clearAllExpandedGrids();
    }

    if (this.expandedColumnChildGrid) {
      this.clearAllExpandedGrids();
    }

    // Expand the new row
    this.expandedItem = row_index;

    if (this.expandedItem !== null) {
      if (item) {
        setTimeout(() => {
          this.createChildMasterList(item, this.masterInfo?.children.child_details.entity_name, row_index - 1);
        }, 250);
      }
    }
  }

  clearAllExpandedGrids() {
    this.expandedItem = null;
    this.expandedColumnChildGrid = null;

    if (this.childMasterListContainer) {
      this.childMasterListContainer.clear();
    }

    if (this.columnChildMasterListContainer) {
      this.columnChildMasterListContainer.clear();
    }
  }

  ngOnInit() {
    this.headercolumns.forEach((col) => {
      col.sortDirection = '';
      col.colFilterHide = false;
    });

    this.filteredItems = [...this.items];

    for (let each of this.items) {
      this.selectedItems.push(each);
    }

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

    this.autocompleteSearchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((searchTerm) => this.autoCompleteFieldChange(searchTerm))
      )
      .subscribe((results) => {
        const activeCondition = this.filterConditions.find((c) => c.enumType === 'autocomplete' && c.autocompleteLoading);
        if (activeCondition) {
          activeCondition.enumValueOptions = results;
          activeCondition.autocompleteLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  /* advanced search filter functions */
  updateFilterConditions() {
    this.currentSearchConditions = this.searchConditions[this.selectedColumnType] || [];
  }

  getOperatorsForColumn(column: string): SearchCondition[] {
    const columnData = this.filteredColumns.find((col) => col.field === column);
    const columnType = columnData?.field_type_id;
    if (columnData?.enum_values) {
      return [
        { id: '1', label: 'In', value: 'in' },
        { id: '2', label: 'Not In', value: 'not_in' },
      ];
    } else if (this.isAggregateFunction(column) && columnData?.clause_type !== 'having') {
      return this.searchConditions[columnType]?.filter((condition) => condition.value !== 'in' && condition.value !== 'not_in') || [];
    } else {
      return this.searchConditions[columnType] || [];
    }
  }

  async getEnumValues(columnData: any, operator: string): Promise<{ label: any; value: any }[]> {
    if (!columnData) return [];

    const enumObj = this.resolveEnumConfig(columnData?.enum_values);

    switch (enumObj?.type) {
      case 'master':
        if (enumObj?.value) {
          try {
            console.log('Fetching master data for enum values with params:', enumObj.value);
            const response = await this.gridApiService.getListData(enumObj.value).toPromise();
            if (response.status && response.data?.records) {
              return response.data.records.map((option: any) => ({
                label: enumObj.optionKey ? option[enumObj.optionKey] : option.label,
                value: enumObj.optionValue ? option[enumObj.optionValue] : option.value,
              }));
            }
          } catch (error: any) {
            const key = 'error';
            const errorMessage = this.translate.instant(key);
            this.toastr.error(errorMessage, 'Error');
          }
        }
        return [];
      case 'autocomplete':
        return [];
      case 'json':
        if (!enumObj?.value || !Array.isArray(enumObj.value)) {
          return [];
        }
        return enumObj.value.map((value: any) => ({
          label: enumObj.optionKey ? value[enumObj.optionKey] : value.label,
          value: enumObj.optionValue ? value[enumObj.optionValue] : value.value,
        }));

      case 'array':
        if (!enumObj?.value || !Array.isArray(enumObj.value)) {
          return [];
        }
        return enumObj.value.map((value: any) => ({
          label: value.trim() ?? '',
          value: value.trim() ?? '',
        }));

      default:
        return [];
    }
  }

  // Update autoCompleteFieldChange to handle the active condition
  async autoCompleteFieldChange(searchTerm: string): Promise<{ label: any; value: any }[]> {
    if (!searchTerm || searchTerm.length < 2) return [];

    const activeCondition = this.filterConditions.find((c) => c.enumType === 'autocomplete' && c.autocompleteLoading);
    // const activeCondition = this.filterConditions[index];
    if (!activeCondition) return [];

    const columnData = this.filteredColumns.find((col) => col.field === activeCondition.field);
    const enumObj = this.resolveEnumConfig(columnData?.enum_values);

    try {
      // Add search parameter to your API call
      let params: any = enumObj.value || {}; // is an object
      params = this.replaceSearchTermInObject(params, searchTerm);

      const response = await this.gridApiService.getListData(params).toPromise();
      if (response.status && response.data?.records) {
        return response.data.records.map((option: any) => ({
          label: enumObj.optionKey ? option[enumObj.optionKey] : option.label,
          value: enumObj.optionValue ? option[enumObj.optionValue] : option.value,
        }));
      }
    } catch (error: any) {
      const key = 'error';
      const errorMessage = this.translate.instant(key);
      this.toastr.error(errorMessage, 'Error');
    }
    return [];
  }

  // Handle search event from ng-select
  onAutocompleteSearch(event: any, index: number) {
    const condition = this.filterConditions[index];
    const searchTerm = event.term;

    if (searchTerm && searchTerm.length >= 2) {
      condition.autocompleteLoading = true;
      condition.autocompleteSearchText = searchTerm;
      this.autocompleteSearchSubject.next(searchTerm);
    } else {
      condition.enumValueOptions = [];
    }
  }

  // Handle clear event
  onAutocompleteClear(index: number) {
    const condition = this.filterConditions[index];
    condition.enum_values = [];
    condition.enumValueOptions = [];
    condition.autocompleteSearchText = '';
  }

  isAggregateFunction(column: string): boolean {
    // Check for common SQL aggregate functions
    const aggregatePatterns = [/^count\(/i, /^sum\(/i, /^avg\(/i, /^min\(/i, /^max\(/i, /^group_concat\(/i, /^string_agg\(/i, /^stddev\(/i, /^variance\(/i];

    return aggregatePatterns.some((pattern) => pattern.test(column.trim()));
  }

  getInputTypeForColumn(column: string): string {
    const columnType = this.filteredColumns.find((col) => col.field === column)?.field_type_id;
    return this.inputTypes[columnType] || 'text';
  }

  private resolveEnumConfig(enumSource: any): any {
    let enumObj = enumSource ?? {};

    if (Array.isArray(enumObj)) {
      return { type: 'array', value: enumObj };
    }

    if (enumObj?.mode == 'from_config' && enumObj?.config_key) {
      const rawConfig = this.config?.[enumObj.config_key];
      if (typeof rawConfig === 'string') {
        try {
          enumObj = JSON.parse(rawConfig);
        } catch {
          enumObj = {};
        }
      } else {
        enumObj = rawConfig ?? {};
      }
    }

    if (Array.isArray(enumObj)) {
      enumObj = { type: 'array', value: enumObj };
    }

    return enumObj ?? {};
  }

  async onColumnChange(event: Event, index: number) {
    // const target = event.target as HTMLSelectElement;
    // const column = target.value;
    const column = this.filterConditions[index].field; //(event.target as HTMLSelectElement).value;
    const data = this.filteredColumns.find((col) => col.field === column);
    const columnType = data?.field_type_id;
    this.filterConditions[index].clause_type = data?.clause_type || 'where';
    const operator = data?.enum_values ? 'in' : this.searchConditions[columnType][0].value;
    this.filterConditions[index].operator = operator;
    this.filterConditions[index].value = '';
    this.filterConditions[index].enum_values = [];
    this.filterConditions[index].availableOperators = this.getOperatorsForColumn(column);
    this.filterConditions[index].inputType = this.getInputTypeForColumn(column);
    const isEnum = this.isEnumValue(data, operator);

    this.filterConditions[index].isEnum = isEnum;
    if (isEnum) {
      const enumObj = this.resolveEnumConfig(data?.enum_values);
      this.filterConditions[index].enumType = enumObj?.type || '';

      this.filterConditions[index].enumValueOptions = await this.getEnumValues(data, operator);
    }
    this.currentSearchConditions = this.searchConditions[columnType] || [];
  }

  async onOperatorChange(index: number, selectedOperator?: string) {
    const condition = this.filterConditions[index];
    if (!condition) return;

    const selectedField = condition.field;
    if (selectedOperator !== undefined) {
      condition.operator = selectedOperator;
    }

    const data = this.filteredColumns.find((col) => col.field === selectedField);
    condition.field = selectedField;
    const isNoValue = this.isNoValueOperator(condition.operator);
    if (isNoValue) {
      condition.value = '';
      condition.enum_values = [];
    }

    const isEnum = this.isEnumValue(data, condition.operator);
    condition.isEnum = isEnum;

    if (isEnum && data?.enum_values) {
      condition.value = '';
      condition.enum_values = [];
      const enumObj = this.resolveEnumConfig(data?.enum_values);
      condition.enumType = enumObj?.type || '';
      condition.enumValueOptions = await this.getEnumValues(data, condition.operator);
      return;
    }

    if (!isNoValue) {
      condition.enum_values = [];
    }
    condition.enumType = '';
    condition.enumValueOptions = [];
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
    if (this.isMenuOpen && this.filterConditions.length == 0) {
      this.addCondition();
    }
  }

  openAdvancedFilterMenu() {
    this.isMenuOpen = true;
    if (this.filterConditions.length == 0) {
      this.addCondition();
    }
  }

  addCondition() {
    this.filterConditions.push({
      field: '',
      operator: '',
      value: '',
      clause_type: '',
      enum_values: [],
      availableOperators: [],
      inputType: 'text', // Default input type
      isEnum: false,
      enumValueOptions: [], // Default options
      enumType: '',
      autocompleteLoading: false,
      autocompleteSearchText: '',
    });
  }

  removeCondition(index: number) {
    const value = this.filterConditions[index].value;
    const enum_values = this.filterConditions[index].enum_values;
    this.filterConditions.splice(index, 1);
    if (value || enum_values.length > 0) this.applyFilters();
  }

  clearFilters() {
    this.filterConditions = [];
    this.applyFilters();
  }

  clearAllAppliedFilters() {
    this.clearFilters();
  }

  removeAppliedFilter(index: number, event?: Event) {
    event?.stopPropagation();
    this.filterConditions.splice(index, 1);
    this.applyFilters();
  }

  getFilterColumnLabel(field: string): string {
    const col = this.filteredColumns.find((column) => column.field === field);
    return col?.title || col?.previewTitle || field;
  }

  getFilterOperatorLabel(condition: FilterCondition): string {
    const matched = condition?.availableOperators?.find((op) => op.value === condition.operator);
    return matched?.label || condition.operator;
  }

  getFilterValueLabel(condition: FilterCondition): string {
    const operatorLabel = this.getFilterOperatorLabel(condition);

    if (this.isNoValueOperator(condition.operator)) {
      return operatorLabel;
    }

    if (condition.enum_values?.length > 0) {
      const values = condition.enum_values
        .map((entry: any) => {
          if (entry && typeof entry === 'object') {
            return entry.label ?? entry.value ?? '';
          }
          return entry;
        })
        .filter((entry: any) => String(entry ?? '').trim() !== '')
        .join(', ');

      return `sa${operatorLabel} ${values}`.trim();
    }

    const value = String(condition.value ?? '').trim();
    return `${operatorLabel} ${value}`.trim();
  }

  isAdvancedFilterApplied(condition: FilterCondition): boolean {
    return !!condition?.field && (this.isNoValueOperator(condition.operator) || condition.value.trim() !== '' || condition.enum_values.length > 0);
  }

  getAppliedAdvancedFilterIndexes(): number[] {
    return this.filterConditions
      .map((condition, index) => ({ condition, index }))
      .filter(({ condition }) => this.isAdvancedFilterApplied(condition))
      .map(({ index }) => index);
  }

  formatDateTime(dateTime: any) {
    return this.timezoneService.transformDateTime(dateTime);
  }
  formatDate(dateTime: any) {
    return this.timezoneService.transformDateOnly(dateTime);
  }

  formatTime(dateTime: any) {
    return this.timezoneService.transformTimeOnly(dateTime);
  }

  getConditionValue(index: number): string | null {
    const value = this.filterConditions[index].value;
    if (value) {
      const type = this.getInputTypeForColumn(this.filterConditions[index].field);
      if (type === 'datetime-local') {
        return value;
      } else if (type === 'date') {
        return this.timezoneService.transformDateOnly(value);
      } else if (type === 'time') {
        return this.timezoneService.transformDate(value, 'HH:mm:ss');
      }
    }
    return value;
  }

  isEnumValue(columnData: any, operator: string): boolean {
    if (!columnData) return false;
    let enumObj = columnData?.enum_values ?? {};
    if (Array.isArray(enumObj)) {
      enumObj = { type: 'array', value: enumObj };
    }

    if (enumObj?.mode == 'from_config' && enumObj?.config_key) {
      enumObj = this.config?.[enumObj.config_key] ? JSON.parse(this.config[enumObj.config_key]) : {};

      return true;
      // enumObj = enumObj;
    }
    switch (enumObj?.type) {
      case 'master':
        return operator === 'in' || operator === 'not_in';
      case 'autocomplete':
        return operator === 'in' || operator === 'not_in';
      case 'json':
      case 'array':
        return true;
      default:
        return false;
    }
  }

  setConditionValue(index: number, value: string): void {
    const type = this.filterConditions[index].inputType;
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
      const type = key.inputType || this.getInputTypeForColumn(key.field);
      const isNoValue = this.isNoValueOperator(key.operator);
      const enum_values = key.enum_values;

      let operator: string = '';
      let value: any = '';
      let filterValue = key.value;
      if (!isNoValue) {
        if (type == 'datetime-local') {
          //filterValue = this.timezoneService.transformDisplayDateTimeToUTC(key.value, 'yyyy-MM-dd HH:mm:ss');
          filterValue = this.timezoneService.transformDisplayDateTimeToUTC(key.value, 'yyyy-MM-dd HH:mm');
        } else if (type == 'time') {
          filterValue = this.timezoneService.transformDisplayDateTimeToUTC(key.value, 'HH:mm');
        } else if (type == 'date') {
          filterValue = this.formatDate(key.value);
        }

        operator = key.operator ? this.mapConditionToSQL(key.operator) : '=';
        value =
          enum_values?.length > 0 ? enum_values.map((e: any) => (typeof e === 'object' ? e.value : e)) : this.addWildcards(key.operator, filterValue?.trim());
      } else {
        operator = this.getNoValueOperatorSQL(key.operator);
      }

      return {
        column_name: key.field,
        operator,
        value,
        isAggregate: key?.clause_type === 'having',
      };
    });
    const fdata = { data: data, condition: condition };
    this.advancedSearchQuery.emit(fdata);
  }

  /*applyFilters() {
    this.removeEmptyFilters();
    this.isMenuOpen = false;

    const condition = this.filterCondition ? 'AND' : 'OR';
    const data = this.filterConditions.map((key: any, index: any) => {
      const type = this.getInputTypeForColumn(key.field);


      const isNoValue = this.isNoValueOperator(key.operator);

      if (!isNoValue) {
        if (type == 'datetime-local') {
          const formattedDate: any = this.formatDateTime(key.value);
          key.value = formattedDate;
        } else if (type == 'date') {
          const formattedDate: any = this.formatDate(key.value);
          key.value = formattedDate;
        }
      }

       // Get the appropriate value for no-value operators
    let finalValue = '';
    if (isNoValue) {
      finalValue = this.getNoValueOperatorSQL(key.operator);
    } else {
      finalValue = this.addWildcards(key.operator, key.value).trim();
    }

      return {
        column_name: key.field,
        operator: key.operator ? this.mapConditionToSQL(key.operator) : '=',
        value: finalValue,
        isAggregate: key?.clause_type === 'having',
      };
    });
    const fdata = { data: data, condition: condition };

    this.advancedSearchQuery.emit(fdata);
  }*/

  // Get the SQL value for no-value operators (is_empty, is_not_empty, is_null, is_not_null)
  getNoValueOperatorSQL(operator: string): string {
    switch (operator) {
      case 'is_null':
        return 'IS NULL';
      case 'is_empty':
        return 'IS_EMPTY'; // Custom marker for backend
      case 'is_not_null':
        return 'IS NOT NULL';
      case 'is_not_empty':
        return 'IS_NOT_EMPTY'; // Custom marker for backend
      default:
        return '';
    }
  }

  isApplyButtonEnabled(): boolean {
    return this.filterConditions.some((condition) => {
      const isNoValueOperator = this.isNoValueOperator(condition.operator);
      const value = (condition.value ?? '').trim();
      return condition.field && condition.operator && (isNoValueOperator || value !== '' || condition.enum_values?.length > 0);
    });
  }
  /*isApplyButtonEnabled(): boolean {
    return this.filterConditions.some((condition) => condition.field && condition.operator && condition.value.trim() !== '');
  }*/
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

  getStepForColumn(column: string): string | null {
    const columnType = this.getInputTypeForColumn(column);
    if (columnType === 'datetime-local' || columnType === 'time') {
      return '1';
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
    return this.filterConditions.filter((filter) => this.isNoValueOperator(filter.operator) || filter.value.trim() !== '' || filter.enum_values?.length > 0)
      .length;
  }

  private removeEmptyFilters(): void {
    this.filterConditions = this.filterConditions.filter(
      (filter: any) => this.isNoValueOperator(filter.operator) || filter.value.trim() !== '' || filter.enum_values?.length > 0
    );
  }
  // Check if the operator doesn't require a value (is_empty, is_not_empty, is_null, is_not_null)
  isNoValueOperator(operator: string): boolean {
    const noValueOperators = ['is_empty', 'is_not_empty', 'is_null', 'is_not_null'];
    return noValueOperators.includes(operator);
  }
  /*private removeEmptyFilters(): void {
    this.filterConditions = this.filterConditions.filter((filter: any) => filter.value.trim() !== '');
  }*/

  cancelFilters() {
    this.isMenuOpen = false;
  }

  /* advanced search filter functions */

  capitalizeFirstLetter(string: string) {
    return string?.charAt(0)?.toUpperCase() + string?.slice(1);
  }

  async initStore() {
    this.storeData
      .select((d) => d.index)
      .subscribe((d) => {
        this.store = d;
      });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.selectcolumns.length > 0) {
      const translationKeys = this.selectcolumns.filter((col) => col.searchable).map((col: any) => `GRIDS.${this.title}.fields.${col.title}`);
      //const allowedFieldTypes = [3, 4];

      if (this.masterInfo.fullEntity === 'schema_chunks') {
        this.isSchemaChunks = true;
      }

      if (!translationKeys?.length) return;

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

  private buildCommonSearchPayload(searchValue: string) {
    let hereColumns = [...this.filteredColumns];
    const items = [3, 4];
    hereColumns = hereColumns.filter((item) => items.includes(item.field_type_id));

    const whereSource = this.selectedColumns.length > 0 ? this.selectedColumns : hereColumns;

    const whereData = whereSource
      .filter((key: any) => key.clause_type === 'where')
      .map((key: any) => {
        return {
          column_name: key.field,
          operator: this.searchCondition ? this.mapConditionToSQL(this.searchCondition) : '=',
          value: this.addWildcards(this.searchCondition, searchValue),
        };
      });

    const havingData = hereColumns
      .filter((key: any) => key.clause_type === 'having')
      .map((key: any) => {
        return {
          column_name: key.field,
          operator: this.searchCondition ? this.mapConditionToSQL(this.searchCondition) : '=',
          value: this.addWildcards(this.searchCondition, searchValue),
        };
      });

    return { whereData, havingData };
  }
  private buildCommonSearchPayloadLabelPurpose(searchValue: string) {
    let hereColumns = [...this.filteredColumns];
    const items = [3, 4];
    hereColumns = hereColumns.filter((item) => items.includes(item.field_type_id));

    const whereSource = this.selectedColumns.length > 0 ? this.selectedColumns : hereColumns;

    const whereData = whereSource
      .filter((key: any) => key.clause_type === 'where')
      .map((key: any) => {
        return {
          column_name: key.field,
          operator: this.searchCondition,
          value: searchValue,
        };
      });

    const havingData = hereColumns
      .filter((key: any) => key.clause_type === 'having')
      .map((key: any) => {
        return {
          column_name: key.field,
          operator: this.searchCondition,
          value: searchValue,
        };
      });

    return { whereData, havingData };
  }

  getCommonSearchBadgeConditions(): Array<{ column_name: string; operator: string; value: any }> {
    if (!this.isCommonSearchApplied || !this.appliedCommonSearch) {
      return [];
    }

    const { whereData, havingData } = this.buildCommonSearchPayloadLabelPurpose(this.appliedCommonSearch);
    return [...whereData, ...havingData];
  }

  getCommonSearchBadgeLabel(): string {
    const conditions = this.getCommonSearchBadgeConditions();
    return conditions.map((condition) => `${this.getFilterColumnLabel(condition.column_name)} : ${condition.operator} ${condition.value}`).join(' | ');
  }

  clearCommonSearchBadge(event?: Event) {
    event?.stopPropagation();
    this.search = '';
    this.appliedCommonSearch = '';
    this.isCommonSearchApplied = false;
    this.onSearch();
  }

  onSearch() {
    this.search = this.search.trim();
    const { whereData, havingData } = this.buildCommonSearchPayload(this.search);
    const fdata = { where: { data: whereData, search: this.search }, having: { data: havingData, search: this.search } };
    this.searchQuery.emit(fdata);

    this.appliedCommonSearch = this.search;
    this.isCommonSearchApplied = this.search.length > 0;
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

    this.selectionChange.emit(this.selectedItems);
  }

  isItemSelected(item: any): boolean {
    return this.selectedItems.some((sel) => sel.uuid === item.uuid);
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

  onLinkPopupGridClick(item: any, col: any) {
    this.isViewPopupOpenDirect = true;
    this.loadingpopup = true;

    // Store the parameters for use after the view is initialized
    this.pendingPopupData = { item, entityName: col.link_action };

    // Use setTimeout to ensure the DOM is updated and ViewChild is available
    setTimeout(() => {
      this.createColumnPopupChildMasterList(item, col.link_action);
    }, 100); // Increased delay to ensure DOM is ready
  }
  toggleColumnChildGrid(item: any, col: any, row_index: number) {
    if (this.expandedColumnChildGrid && this.expandedColumnChildGrid.rowIndex === row_index && this.expandedColumnChildGrid.colHeader === col.header) {
      this.clearAllExpandedGrids();
      return;
    }

    if (this.expandedItem) {
      this.clearAllExpandedGrids();
    }

    if (this.expandedColumnChildGrid) {
      this.clearAllExpandedGrids();
    }

    this.expandedColumnChildGrid = { uuid: item.uuid, colHeader: col.header, rowIndex: row_index };
    setTimeout(() => {
      this.createColumnChildMasterList(item, col.link_action);
    }, 250);
  }

  isColumnChildGridExpanded(row_index: number, col: any): boolean {
    return !!this.expandedColumnChildGrid && this.expandedColumnChildGrid.rowIndex === row_index && this.expandedColumnChildGrid.colHeader === col.header;
  }

  createChildMasterList(item: any, entityName: string, row_index: number) {
    if (!this.childMasterListContainer) return;
    this.childMasterListContainer.clear();
    const componentRef = this.childMasterListContainer.createComponent(MasterListComponent);
    componentRef.instance.uuid = item['uuid'];
    componentRef.instance.entity_name = entityName;
    componentRef.instance.nonGridPage = false;
    componentRef.instance.enableCheckBox = this.enableCheckBox;
    componentRef.instance.selectionChange.subscribe((selectedItems: any) => {
      this.selectionChange.emit(selectedItems);
    });

    const gridParams: any = {};
    Object.keys(item).forEach((key) => {
      if (key.startsWith('gparam_')) {
        let temp_key = '$' + key;
        gridParams[temp_key] = item[key];
      }
    });
    componentRef.instance.grid_params = gridParams;
  }

  closeViewPopup() {
    this.isViewPopupOpenDirect = false;
  }

  // In your component.ts
  onVideoHover(event: Event) {
    const video = event.target as HTMLVideoElement;
    if (!video.paused) return; // don't reload if already playing
    // Optionally preload buffer when hovered
    video.load();
  }

  onVideoLeave(event: Event) {
    const video = event.target as HTMLVideoElement;
    // pause, but do not reset to start
    video.pause();
  }

  createColumnPopupChildMasterList(item: any, entityName: string) {
    // Add safety check
    if (!this.popupChildMasterListContainer) {
      this.loadingpopup = false;
      return;
    }

    // Clear any existing components
    this.popupChildMasterListContainer.clear();

    const componentRef = this.popupChildMasterListContainer.createComponent(MasterListComponent);
    componentRef.instance.uuid = item['uuid'];
    componentRef.instance.entity_name = entityName;
    componentRef.instance.nonGridPage = false;

    const gridParams: any = {};
    Object.keys(item).forEach((key) => {
      if (key.startsWith('gparam_')) {
        let temp_key = '$' + key;
        gridParams[temp_key] = item[key];
      }
    });
    componentRef.instance.grid_params = gridParams;

    setTimeout(() => {
      this.loadingpopup = false;
    }, 500);
  }
  createColumnChildMasterList(item: any, entityName: string) {
    if (!this.columnChildMasterListContainer) return;
    this.columnChildMasterListContainer.clear();
    const componentRef = this.columnChildMasterListContainer.createComponent(MasterListComponent);
    componentRef.instance.uuid = item['uuid'];
    componentRef.instance.entity_name = entityName;
    componentRef.instance.nonGridPage = false;

    const gridParams: any = {};
    Object.keys(item).forEach((key) => {
      if (key.startsWith('gparam_')) {
        let temp_key = '$' + key;
        gridParams[temp_key] = item[key];
      }
    });
    componentRef.instance.grid_params = gridParams;
  }

  private replaceSearchTermInObject(obj: any, searchText: string): any {
    if (!obj) return obj;

    // Handle strings - check if they contain %searchTerm%
    if (typeof obj === 'string') {
      if (obj.includes('%searchTerm%')) {
        return obj.replace(/%searchTerm%/g, `%${searchText}%`);
      } else if (obj.includes('%searchTerm')) {
        return obj.replace(/%searchTerm/g, '%' + searchText);
      } else if (obj.includes('searchTerm%')) {
        return obj.replace(/searchTerm%/g, searchText + '%');
      }
      return obj;
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map((item) => this.replaceSearchTermInObject(item, searchText));
    }

    // Handle objects
    if (typeof obj === 'object' && obj !== null) {
      const result: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          result[key] = this.replaceSearchTermInObject(obj[key], searchText);
        }
      }
      return result;
    }

    // Return other types as is (number, boolean, etc.)
    return obj;
  }
}
