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
  HostListener,
  OnDestroy,
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

import { Location } from '@angular/common';
import { LocalStorageService } from '../../service/common/local-storage.service';
import { OpenaiService } from '../../service/common/openai.service';
import { TimezoneService } from '../../service/common/timezone.service';
import { MasterListComponent } from '../../pages/master-list/master-list.component';
import { FormBuilderComponent } from '../../pages/form-builder/form-builder.component';
import { LoaderComponent } from '../loader/loader.component';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ApiResponce, GridApiService } from '../../service/common/grid.service';
import { StaticPageComponent } from '../../pages/static-page/static-page.component';
import { FlatpickrDirective } from '../../directives/flatpickr.directive';
import { CommonModule } from '@angular/common';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import { MenuModule } from 'headlessui-angular';
import { NgxTippyModule } from 'ngx-tippy-wrapper';
import { NgSelectModule } from '@ng-select/ng-select';
import { DynamicFontSizeDirective } from '../../directives/page-specific-font-size.directive';
import Swal from 'sweetalert2';
import flatpickr from 'flatpickr';

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
  value: any;
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

interface GridViewState {
  commonSearch: string;
  searchCondition: string;
  selectedSearchColumns: string[];
  sortColumns: Array<{ key: string; direction: 'asc' | 'desc' }>;
  hiddenColumns: string[];
  resultsPerPage: number;
  currentPage: number;
  filterCondition: boolean;
  appliedFilterConditions: Array<{
    field: string;
    operator: string;
    value: any;
    clause_type: string;
    enum_values: any[];
    enum_value_options?: Array<{ label: any; value: any }>;
  }>;
}

interface UserSearchConfiguration {
  entity_slug: string;
  view_name?: string;
  is_default?: boolean;
  search_values: GridViewState;
  updated_at: string;
}

interface UserSearchConfigurationTemp {
  entity_slug: string;
  view_name: string;
  localstoreOnly: boolean;
  search_values: GridViewState;
  updated_at: string;
}

@Component({
  selector: 'app-datatable',
  standalone: true,
  imports: [
    CommonModule,
    NgMultiSelectDropDownModule,
    BooleanStatusPipe,
    LoaderComponent,
    StaticPageComponent,
    FormBuilderComponent,
    FlatpickrDirective,
    NgScrollbarModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    RouterModule,
    MenuModule,
    NgxTippyModule,
    NgSelectModule,
    DynamicFontSizeDirective,
  ],
  templateUrl: './datatable.component.html',
  styleUrl: './datatable.component.scss',
  animations: [
    trigger('toggleAnimation', [
      transition(':enter', [style({ opacity: 0, transform: 'scale(0.95)' }), animate('100ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))]),
      transition(':leave', [animate('75ms', style({ opacity: 0, transform: 'scale(0.95)' }))]),
    ]),
  ],
})
export class DataTableComponent implements OnInit, OnChanges, AfterViewChecked, OnDestroy {
  // Add this property to your component class:
  pendingPopupData: { item: any; entityName: string } | null = null;
  private childComponentResolvedModes: Record<string, string> = {};

  expandedItem: any = null;
  expandedColumnChildGrid: { uuid: string; colHeader: string; rowIndex: number } | null = null;
  @Input() permissions: boolean = true;
  @Input() unique_id: any;
  @Input() loading: boolean = false;
  @ViewChild('searchInput') searchInput!: ElementRef;
  @ViewChild('myViewsSelect') myViewsSelect?: any;
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
  @Input() activeSearchAll: any[] = [];
  @Input() activeSearchAny: any[] = [];
  @Input() activeHavingAll: any[] = [];
  @Input() activeHavingAny: any[] = [];
  @Input() parentFilterColumns: any[] = [];
  @Output() delete = new EventEmitter<any>();
  @Output() edit = new EventEmitter<any>();
  @Output() view = new EventEmitter<any>();
  @Output() customAction = new EventEmitter<any>();
  @Output() pageChange = new EventEmitter<{ page: number; start_index: number; skipFetch?: boolean; source?: string }>();
  @Output() exportType = new EventEmitter<{ type: string }>();
  @Output() resultsPerPageChange = new EventEmitter<{ resultsPerPage: number; start_index: number; skipFetch?: boolean }>();
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
  @Input() headerStaticEntityName: string = '';
  @Input() footerStaticEntityName: string = '';
  @Input() staticPageUuid: string | null = null;
  @Input() staticPageGridParams: any = null;

  totalPages: number = 1;
  filteredItems: any[] = [];
  filteredColumns: any[] = [];

  textClass: string = '';

  isMenuOpen = false;
  filterCondition: any = true;
  filterConditions: Array<FilterCondition> = [];
  appliedFilterCondition: any = true;
  appliedFilterConditions: Array<FilterCondition> = [];
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
    const normalizedCondition = String(condition ?? '')
      .trim()
      .toLowerCase();

    switch (normalizedCondition) {
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
      case 'between':
        return 'BETWEEN';
      default:
        return normalizedCondition || condition;
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

  save_grid_views = false;
  save_grid_latest_state = false;
  show_column_search_keys = false;
  show_common_search_keys = false;
  private activeSortOrder: string[] = [];
  entityViews: UserSearchConfiguration[] = [];
  selectedViewName: string = '';
  isViewConfigModalOpen: boolean = false;
  isEditingViewConfig: boolean = false;
  isEditingNoFilterView: boolean = false;
  isMyViewsMenuOpen: boolean = false;
  viewFormName: string = '';
  viewFormSetAsDefault: boolean = true;
  private editingOriginalViewName: string = '';
  hasSavedViewConfiguration: boolean = false;
  private appliedSavedViewSlug: string | null = null;
  private savedViewApplyScheduled = false;
  private initialFetchEmitted = false;
  private latestStateBootstrapSlug: string | null = null;
  private pendingManualViewSelection = false;
  private hasPersistedViewBeforeDestroy = false;
  private betweenRangePickers: { [key: number]: flatpickr.Instance } = {};
  private readonly NO_FILTER_VIEW_NAME = 'No Filter';
  private readonly USER_SEARCH_CONFIGURATIONS_TEMP_KEY = 'user_search_confgurations_temp';
  private upsert_saved_view_json_schema: any = {
    print_query: true,
    action: ['hard_delete', 'insert'],
    table: ['user_search_configurations', 'user_search_configurations'],
    table_mapping: ['table1', 'table2'],
    data: {
      table2: [],
    },
    conditions: {
      table1: [],
    },
  };

  private delete_saved_view_json_schema: any = {
    print_query: true,
    action: ['hard_delete'],
    table: ['user_search_configurations'],
    table_mapping: ['table1'],
    conditions: {
      table1: [],
    },
  };
  constructor(
    private translate: TranslateService,
    private gridApiService: GridApiService,
    private toastr: ToastrService,
    public storeData: Store<any>,
    private localstore: LocalStorageService,
    private openaiService: OpenaiService,
    public location: Location,
    private timezoneService: TimezoneService,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer
  ) {
    this.config = JSON.parse(this.localstore.getData('config'));

    this.save_grid_views = this.config.save_grid_views == 'true' && this.config.save_grid_views;
    this.save_grid_latest_state = this.config.save_grid_latest_state == 'true' && this.config.save_grid_latest_state;
    this.show_column_search_keys = this.config.show_column_search_keys == 'true' && this.config.show_column_search_keys;
    this.show_common_search_keys = this.config.show_common_search_keys == 'true' && this.config.show_common_search_keys;
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

  ngOnDestroy(): void {
    Object.keys(this.betweenRangePickers).forEach((key) => {
      this.betweenRangePickers[Number(key)]?.destroy();
    });
    this.betweenRangePickers = {};

    if (this.hasPersistedViewBeforeDestroy) return;
    this.persistCurrentSelectedViewStateAsDefault();
    this.hasPersistedViewBeforeDestroy = true;
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

    this.hasSavedViewConfiguration = this.getSavedViewConfiguration() !== null;
    this.refreshEntityViews();
    this.scheduleTryApplySavedView();
  }

  private emitInitialFetchIfNoSavedView(): void {
    if (this.initialFetchEmitted) return;
    if (this.save_grid_latest_state && !this.save_grid_views) return;
    const entitySlug = this.getEntitySlug();
    const tempApplyKey = `${entitySlug}::__temp__`;
    const hasStableEntityContext = !!(this.masterInfo?.ListQuery?.entity_name || this.masterInfo?.entity_name);
    if (this.save_grid_latest_state && !this.save_grid_views && !hasStableEntityContext) {
      this.scheduleTryApplySavedView();
      return;
    }
    const hasEntityContext = !!(this.masterInfo?.ListQuery?.entity_name || this.masterInfo?.entity_name || this.title);
    if (!hasEntityContext) return;
    if (this.getSavedViewConfiguration()) return;

    const tempState = this.getTempGridStateForCurrentGrid();
    if (tempState) {
      if (this.appliedSavedViewSlug === tempApplyKey) return;
      if (this.canApplyGridState(tempState)) {
        this.appliedSavedViewSlug = tempApplyKey;
        this.hasSavedViewConfiguration = true;
        this.applyGridState(tempState);
      } else {
        this.scheduleTryApplySavedView();
      }
      return;
    }

    const page = Number(this.currentPage) > 0 ? Number(this.currentPage) : 1;
    const limit = Number(this.resultsPerPage) > 0 ? Number(this.resultsPerPage) : this.getDefaultResultsPerPage();

    this.initialFetchEmitted = true;
    this.pageChange.emit({ page, start_index: (page - 1) * limit, source: 'default-initial' });
  }

  /* advanced search filter functions */
  updateFilterConditions() {
    this.currentSearchConditions = this.searchConditions[this.selectedColumnType] || [];
  }

  getOperatorsForColumn(column: string): SearchCondition[] {
    const columnData = this.filteredColumns.find((col) => col.field === column);
    const columnType = columnData?.field_type_id;
    const inputType = this.inputTypes[columnType] || 'text';
    const supportsBetween = this.supportsBetweenInputType(inputType);
    const withBetween = (ops: SearchCondition[]) => {
      if (!supportsBetween) return ops;
      if (ops.some((condition) => condition.value === 'between')) return ops;
      return [...ops, { id: 'between', label: 'Between', value: 'between' }];
    };

    if (columnData?.enum_values) {
      return [
        { id: '1', label: 'In', value: 'in' },
        { id: '2', label: 'Not In', value: 'not_in' },
      ];
    } else if (this.isAggregateFunction(column) && columnData?.clause_type !== 'having') {
      return withBetween(this.searchConditions[columnType]?.filter((condition) => condition.value !== 'in' && condition.value !== 'not_in') || []);
    } else {
      return withBetween(this.searchConditions[columnType] || []);
    }
  }

  async getEnumValues(columnData: any, operator: string): Promise<{ label: any; value: any }[]> {
    if (!columnData) return [];

    const enumObj = this.resolveEnumConfig(columnData?.enum_values);

    switch (enumObj?.type) {
      case 'master':
        if (enumObj?.value) {
          try {
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
    condition.inputType = this.getInputTypeForColumn(selectedField);
    const isNoValue = this.isNoValueOperator(condition.operator);
    if (isNoValue) {
      condition.value = '';
      condition.enum_values = [];
    } else if (this.isBetweenOperator(condition.operator)) {
      condition.value = this.normalizeBetweenValue(condition.value);
      condition.enum_values = [];
    } else if (this.isRangeInputType(condition.inputType) && typeof condition.value === 'object') {
      condition.value = '';
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
    if (this.isMenuOpen) {
      this.syncDraftFiltersFromApplied();
    }
  }

  openAdvancedFilterMenu() {
    this.isMenuOpen = true;
    this.syncDraftFiltersFromApplied();
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
    this.filterConditions = this.cloneFilterConditions(this.appliedFilterConditions);
    this.filterConditions.splice(index, 1);
    this.filterCondition = this.appliedFilterCondition;
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
    if (this.isNoValueOperator(condition.operator)) {
      return '';
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

      return values;
    }

    if (this.isBetweenOperator(condition.operator)) {
      const range = this.normalizeBetweenValue(condition.value);
      const start = String(range.start ?? '')
        .trim()
        .replace('T', ' ')
        .replace('Z', '');
      const end = String(range.end ?? '')
        .trim()
        .replace('T', ' ')
        .replace('Z', '');
      if (!start && !end) return '';
      return `${start} - ${end}`;
    }

    const value = String(condition.value ?? '').trim();
    return value.replace('T', ' ').replace('Z', '');
  }

  isAdvancedFilterApplied(condition: FilterCondition): boolean {
    return (
      !!condition?.field &&
      (this.isNoValueOperator(condition.operator) ||
        this.hasRangeValue(condition) ||
        String(condition.value ?? '').trim() !== '' ||
        condition.enum_values.length > 0)
    );
  }

  getAppliedAdvancedFilters(): Array<FilterCondition> {
    return this.appliedFilterConditions.filter((condition) => this.isAdvancedFilterApplied(condition));
  }

  onAdvancedFilterValueEnter(event: Event): void {
    event.preventDefault();
    if (this.isApplyButtonEnabled()) {
      this.applyFilters();
    }
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
    if (this.isBetweenOperator(this.filterConditions[index]?.operator)) {
      return null;
    }

    const value = this.filterConditions[index].value;
    if (value) {
      const type = this.getInputTypeForColumn(this.filterConditions[index].field);
      if (type === 'datetime-local') {
        return value;
      } else if (type === 'date') {
        return this.timezoneService.transformDateOnly(value);
      } else if (type === 'time') {
        const rawValue = String(value);
        if (/^\d{2}:\d{2}(:\d{2})?$/.test(rawValue)) {
          return rawValue.slice(0, 5);
        }
        return this.timezoneService.transformDate(value, 'HH:mm') || rawValue;
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
    if (this.isBetweenOperator(this.filterConditions[index]?.operator)) {
      return;
    }

    const type = this.filterConditions[index].inputType;
    if (type === 'datetime-local' || type === 'date') {
      this.filterConditions[index].value = value;
    } else {
      this.filterConditions[index].value = value;
    }
  }
  applyFilters() {
    this.removeEmptyFilters();
    this.appliedFilterCondition = this.filterCondition;
    this.appliedFilterConditions = this.cloneFilterConditions(this.filterConditions);
    this.isMenuOpen = false;

    const condition = this.filterCondition ? 'AND' : 'OR';
    const data = this.filterConditions.map((key: any, index: any) => {
      const type = key.inputType || this.getInputTypeForColumn(key.field);
      const normalizedOperator = this.normalizeSavedOperator(key.operator, key.value);
      const isNoValue = this.isNoValueOperator(normalizedOperator);
      const isBetween = this.isBetweenOperator(normalizedOperator);
      const enum_values = key.enum_values;

      let operator: string = '';
      let value: any = '';
      let filterValue = key.value;
      if (!isNoValue) {
        if (isBetween) {
          const between = this.normalizeBetweenValue(key.value);
          operator = this.mapConditionToSQL('between');
          const formattedStart = this.formatFilterValueByType(type, between.start);
          const formattedEnd = this.formatFilterValueByType(type, between.end);
          value = [formattedStart, formattedEnd];
        } else {
          if (type == 'datetime-local') {
            filterValue = this.timezoneService.transformDisplayDateTimeToUTC(key.value, 'yyyy-MM-dd HH:mm');
          } else if (type == 'time') {
            filterValue = this.timezoneService.transformDisplayDateTimeToUTC(key.value, 'HH:mm');
          } else if (type == 'date') {
            filterValue = this.formatDate(key.value);
          }

          operator = normalizedOperator ? this.mapConditionToSQL(normalizedOperator) : '=';
          value =
            enum_values?.length > 0
              ? enum_values.map((e: any) => (typeof e === 'object' ? e.value : e))
              : this.addWildcards(normalizedOperator, typeof filterValue === 'string' ? filterValue.trim() : filterValue);
        }
      } else {
        operator = this.getNoValueOperatorSQL(normalizedOperator);
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
      const value = String(condition.value ?? '').trim();
      const hasBetween = this.hasRangeValue(condition);
      return condition.field && condition.operator && (isNoValueOperator || hasBetween || value !== '' || condition.enum_values?.length > 0);
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
        return 'YYYY-MM-DD';
      case 'datetime-local':
        return 'YYYY-MM-DD HH:mm';
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
    return this.getAppliedAdvancedFilters().length;
  }

  private removeEmptyFilters(): void {
    this.filterConditions = this.filterConditions.filter(
      (filter: any) =>
        this.isNoValueOperator(filter.operator) || this.hasRangeValue(filter) || String(filter.value ?? '').trim() !== '' || filter.enum_values?.length > 0
    );
  }

  private cloneFilterCondition(condition: FilterCondition): FilterCondition {
    const clonedValue = condition?.value && typeof condition.value === 'object' && !Array.isArray(condition.value) ? { ...condition.value } : condition?.value;

    return {
      ...condition,
      value: clonedValue,
      enum_values: [...(condition.enum_values || [])],
      availableOperators: [...(condition.availableOperators || [])],
      enumValueOptions: [...(condition.enumValueOptions || [])],
    };
  }

  private cloneFilterConditions(conditions: Array<FilterCondition>): Array<FilterCondition> {
    return conditions.map((condition) => this.cloneFilterCondition(condition));
  }

  private normalizeEnumValues(values: any[]): any[] {
    if (!Array.isArray(values)) return [];
    return values.map((entry: any) => {
      if (entry && typeof entry === 'object') {
        if ('value' in entry) return entry.value;
      }
      return entry;
    });
  }

  private normalizeEnumValueOptions(options: any[]): Array<{ label: any; value: any }> {
    if (!Array.isArray(options)) return [];
    return options
      .map((entry: any) => {
        if (entry && typeof entry === 'object') {
          if ('value' in entry || 'label' in entry) {
            return {
              label: entry.label ?? entry.value ?? '',
              value: entry.value ?? entry.label ?? '',
            };
          }
          return null;
        }
        return {
          label: entry,
          value: entry,
        };
      })
      .filter((entry): entry is { label: any; value: any } => !!entry);
  }

  private buildRestoredEnumOptions(savedOptions: any[], savedValues: any[]): Array<{ label: any; value: any }> {
    const normalizedOptions = this.normalizeEnumValueOptions(savedOptions);
    const optionMap = new Map<any, { label: any; value: any }>();

    normalizedOptions.forEach((option) => {
      optionMap.set(option.value, option);
    });

    if (Array.isArray(savedValues)) {
      savedValues.forEach((entry: any) => {
        const value = entry && typeof entry === 'object' ? entry.value ?? entry.label ?? '' : entry;
        const label = entry && typeof entry === 'object' ? entry.label ?? entry.value ?? '' : entry;

        if (!optionMap.has(value)) {
          optionMap.set(value, { label, value });
        }
      });
    }

    return Array.from(optionMap.values());
  }

  private async hydrateEnumOptionsForRenderedFilters(): Promise<void> {
    if (!Array.isArray(this.filterConditions) || this.filterConditions.length === 0) return;

    for (let index = 0; index < this.filterConditions.length; index++) {
      const condition = this.filterConditions[index];
      if (!condition?.isEnum || !condition.field) continue;

      const columnData = this.filteredColumns.find((col) => col.field === condition.field);
      if (!columnData) continue;

      const fetchedOptions = await this.getEnumValues(columnData, condition.operator);
      const mergedOptions = this.buildRestoredEnumOptions(fetchedOptions, condition.enum_values || []);

      condition.enumValueOptions = mergedOptions;
      if (this.appliedFilterConditions[index]) {
        this.appliedFilterConditions[index].enumValueOptions = [...mergedOptions];
      }
    }

    this.cdr.detectChanges();
  }

  private syncDraftFiltersFromApplied(): void {
    this.filterCondition = this.appliedFilterCondition;
    this.filterConditions = this.cloneFilterConditions(this.appliedFilterConditions);
    if (this.filterConditions.length == 0) {
      this.addCondition();
    }
  }
  // Check if the operator doesn't require a value (is_empty, is_not_empty, is_null, is_not_null)
  isNoValueOperator(operator: string): boolean {
    const normalizedOperator = String(operator || '')
      .trim()
      .toLowerCase();
    const noValueOperators = ['is_empty', 'is_not_empty', 'is_null', 'is_not_null'];
    return noValueOperators.includes(normalizedOperator);
  }
  /*private removeEmptyFilters(): void {
    this.filterConditions = this.filterConditions.filter((filter: any) => filter.value.trim() !== '');
  }*/

  cancelFilters() {
    this.isMenuOpen = false;
    this.filterCondition = this.appliedFilterCondition;
    this.filterConditions = this.cloneFilterConditions(this.appliedFilterConditions);
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

        this.scheduleTryApplySavedView();
      });
    }

    this.hasSavedViewConfiguration = this.getSavedViewConfiguration() !== null;
    this.refreshEntityViews();
    this.scheduleTryApplySavedView();
    this.emitInitialFetchIfNoSavedView();
  }

  private scheduleTryApplySavedView(): void {
    if (this.savedViewApplyScheduled) return;
    this.savedViewApplyScheduled = true;

    setTimeout(() => {
      this.savedViewApplyScheduled = false;
      this.tryApplySavedView();
    }, 0);
  }

  private getDefaultResultsPerPage(): number {
    const defaultValue = Number(this.config?.grid_pagination_default);
    return Number.isFinite(defaultValue) && defaultValue > 0 ? defaultValue : 10;
  }

  private getEntitySlug(): string {
    return String(this.masterInfo?.ListQuery?.entity_name || this.masterInfo?.entity_name || this.title || 'default_entity');
  }

  private parseJsonSafe(value: any, fallback: any = null): any {
    if (!value) return fallback;
    if (typeof value === 'object') return value;
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  private getUserDataObject(): any {
    const userDataRaw = this.localstore.getData('user_data');
    return this.parseJsonSafe(userDataRaw, { main: {} }) || { main: {} };
  }

  private persistUserDataObject(userData: any): void {
    const isEncrypted = this.config?.encrypt_local_storage === 'true';
    const payload = JSON.stringify(userData);
    if (isEncrypted) {
      this.localstore.storeDataEncrypted('user_data', payload);
    } else {
      this.localstore.storeData('user_data', payload);
    }
    this.user_info = userData;
  }

  private getUserSearchConfigurations(): UserSearchConfiguration[] {
    const userData = this.getUserDataObject();
    const configs = userData?.main?.user_search_configurations;
    return Array.isArray(configs) ? configs : [];
  }

  private getUserSearchConfigurationsTemp(): UserSearchConfigurationTemp[] {
    if (!this.save_grid_latest_state) return [];
    const rawTemp = this.localstore.getData(this.USER_SEARCH_CONFIGURATIONS_TEMP_KEY);
    const parsed = this.parseJsonSafe(rawTemp, []);
    return Array.isArray(parsed) ? parsed : [];
  }

  private setUserSearchConfigurationsTemp(configs: UserSearchConfigurationTemp[]): void {
    if (!this.save_grid_latest_state) return;
    const payload = JSON.stringify(configs);
    const isEncrypted = this.config?.encrypt_local_storage === 'true';
    if (isEncrypted) {
      this.localstore.storeDataEncrypted(this.USER_SEARCH_CONFIGURATIONS_TEMP_KEY, payload);
      return;
    }
    this.localstore.storeData(this.USER_SEARCH_CONFIGURATIONS_TEMP_KEY, payload);
  }

  private getTempConfigurationForEntity(entitySlug: string): UserSearchConfigurationTemp | null {
    if (!this.save_grid_latest_state) return null;
    const tempConfigs = this.getUserSearchConfigurationsTemp();
    return tempConfigs.find((item: any) => String(item?.entity_slug || '') === entitySlug) || null;
  }

  private getTempGridStateForCurrentGrid(): GridViewState | null {
    const entitySlug = this.getEntitySlug();
    const tempConfig = this.getTempConfigurationForEntity(entitySlug);
    if (!tempConfig?.search_values || !tempConfig.localstoreOnly) return null;
    return tempConfig.search_values;
  }

  private hasTempDraftForCurrentGrid(): boolean {
    return !!this.getTempGridStateForCurrentGrid();
  }

  private hasTempChangesForCurrentGrid(): boolean {
    const tempState = this.getTempGridStateForCurrentGrid();
    if (!tempState) return false;
    return !this.areGridStatesEqual(tempState, this.buildNoFilterGridViewState());
  }

  shouldShowNoFilterStyleActions(): boolean {
    if (!this.save_grid_views) return false;
    if (!this.hasTempChangesForCurrentGrid()) return false;

    const selectedView = this.getSelectedViewConfiguration();
    if (!selectedView) return true;
    return this.isNoFilterViewName(String(selectedView?.view_name || ''));
  }

  private canApplyGridState(state: GridViewState): boolean {
    const selectedSearchColumns = state?.selectedSearchColumns || [];
    const appliedFilterConditions = state?.appliedFilterConditions || [];
    if (!this.headercolumns?.length) return false;
    if (selectedSearchColumns.length > 0 && !this.filteredColumns?.length) return false;
    if (appliedFilterConditions.length > 0 && !this.filteredColumns?.length) return false;
    return true;
  }

  private saveTempConfigurationForEntity(entitySlug: string, viewName: string, searchValues: GridViewState): void {
    if (!this.save_grid_latest_state) return;
    if (this.areGridStatesEqual(searchValues, this.buildNoFilterGridViewState())) {
      this.clearTempConfigurationForEntity(entitySlug);
      return;
    }

    const tempConfigs = this.getUserSearchConfigurationsTemp().filter((item: any) => String(item?.entity_slug || '') !== entitySlug);
    tempConfigs.push({
      entity_slug: entitySlug,
      view_name: String(viewName || this.NO_FILTER_VIEW_NAME),
      localstoreOnly: true,
      search_values: searchValues,
      updated_at: new Date().toISOString(),
    });
    this.setUserSearchConfigurationsTemp(tempConfigs);
  }

  private clearTempConfigurationForEntity(entitySlug: string): void {
    if (!this.save_grid_latest_state) return;
    const tempConfigs = this.getUserSearchConfigurationsTemp();
    const nextTempConfigs = tempConfigs.filter((item: any) => String(item?.entity_slug || '') !== entitySlug);
    if (nextTempConfigs.length === tempConfigs.length) return;
    this.setUserSearchConfigurationsTemp(nextTempConfigs);
  }

  private getEntityViews(): UserSearchConfiguration[] {
    const entitySlug = this.getEntitySlug();
    return this.getUserSearchConfigurations().filter((item: any) => (item?.entity_slug || item?.key) === entitySlug);
  }

  private getConsolidatedEntityViews(entitySlug: string, persistedViews: UserSearchConfiguration[]): UserSearchConfiguration[] {
    const normalizedViews = persistedViews.map((item: any) => ({
      ...item,
      entity_slug: entitySlug,
      view_name: String(item?.view_name || 'Default View'),
    }));

    const tempConfig = this.getTempConfigurationForEntity(entitySlug);
    if (!tempConfig?.localstoreOnly || !tempConfig?.search_values) {
      return normalizedViews;
    }

    const tempViewName = String(tempConfig.view_name || this.NO_FILTER_VIEW_NAME)
      .trim()
      .toLowerCase();
    const mergedViews = normalizedViews.map((item: UserSearchConfiguration) => {
      const currentName = String(item?.view_name || 'Default View')
        .trim()
        .toLowerCase();
      if (currentName !== tempViewName) {
        return item;
      }
      return {
        ...item,
        search_values: tempConfig.search_values,
        updated_at: tempConfig.updated_at || item.updated_at,
      };
    });

    return mergedViews;
  }

  private refreshEntityViews(): void {
    const entitySlug = this.getEntitySlug();
    const allConfigs = this.getUserSearchConfigurations();
    const currentEntityViews = allConfigs.filter((item: any) => (item?.entity_slug || item?.key) === entitySlug) as UserSearchConfiguration[];
    const syncedViews = this.syncNoFilterViewForEntity(currentEntityViews);

    if (syncedViews.changed) {
      const otherConfigs = allConfigs.filter((item: any) => (item?.entity_slug || item?.key) !== entitySlug);
      this.setUserSearchConfigurations([...otherConfigs, ...syncedViews.views]);
      if (syncedViews.views.length > 0) {
        this.persistSavedViewsToDatabase(entitySlug, syncedViews.views);
      } else {
        this.deleteSavedViewFromDatabase(entitySlug);
      }
    }

    const consolidatedViews = this.getConsolidatedEntityViews(entitySlug, syncedViews.views);

    this.entityViews = consolidatedViews.map((item: UserSearchConfiguration) => ({
      ...item,
      view_name: String(item?.view_name || 'Default View'),
    }));
    if (this.entityViews.length === 0) {
      this.selectedViewName = '';
      return;
    }

    const normalizedSelectedName = String(this.selectedViewName || '')
      .trim()
      .toLowerCase();
    const hasSelection = this.entityViews.some(
      (item: any) =>
        String(item?.view_name || 'Default View')
          .trim()
          .toLowerCase() === normalizedSelectedName
    );
    if (!hasSelection) {
      const defaultView = this.entityViews.find((item: any) => !!item?.is_default);
      this.selectedViewName = String(defaultView?.view_name || this.entityViews[0]?.view_name || 'Default View');
    }
  }

  private isNoFilterViewName(viewName: string): boolean {
    return (
      String(viewName || '')
        .trim()
        .toLowerCase() === this.NO_FILTER_VIEW_NAME.toLowerCase()
    );
  }

  private buildNoFilterGridViewState(): GridViewState {
    return {
      commonSearch: '',
      searchCondition: 'contains',
      selectedSearchColumns: [],
      sortColumns: [],
      hiddenColumns: [],
      resultsPerPage: this.getDefaultResultsPerPage(),
      currentPage: 1,
      filterCondition: true,
      appliedFilterConditions: [],
    };
  }

  private syncNoFilterViewForEntity(entityViews: UserSearchConfiguration[]): { views: UserSearchConfiguration[]; changed: boolean } {
    const entitySlug = this.getEntitySlug();
    const normalizedViews = entityViews.map((item: any) => ({
      ...item,
      entity_slug: entitySlug,
      view_name: String(item?.view_name || 'Default View'),
    }));

    let changed = false;
    const regularViews = normalizedViews.filter((item: any) => !this.isNoFilterViewName(String(item?.view_name || '')));
    const noFilterViews = normalizedViews.filter((item: any) => this.isNoFilterViewName(String(item?.view_name || '')));

    if (regularViews.length === 0) {
      return { views: [], changed: noFilterViews.length > 0 };
    }

    if (noFilterViews.length > 1) {
      changed = true;
    }

    let noFilterView = noFilterViews[0];
    const noFilterSearchValues = this.buildNoFilterGridViewState();
    if (!noFilterView) {
      noFilterView = {
        entity_slug: entitySlug,
        view_name: this.NO_FILTER_VIEW_NAME,
        is_default: false,
        search_values: noFilterSearchValues,
        updated_at: new Date().toISOString(),
      };
      changed = true;
    } else {
      const mergedNoFilterView = {
        ...noFilterView,
        entity_slug: entitySlug,
        view_name: this.NO_FILTER_VIEW_NAME,
        search_values: noFilterSearchValues,
      };

      if (JSON.stringify(mergedNoFilterView) !== JSON.stringify(noFilterView)) {
        changed = true;
      }
      noFilterView = mergedNoFilterView;
    }

    if (noFilterView.is_default) {
      const anyRegularDefault = regularViews.some((item: any) => !!item?.is_default);
      if (anyRegularDefault) {
        changed = true;
      }
      regularViews.forEach((item: any) => {
        item.is_default = false;
      });
    } else if (!regularViews.some((item: any) => !!item?.is_default)) {
      regularViews[0].is_default = true;
      changed = true;
    }

    const nextViews = [...regularViews, noFilterView];
    if (!nextViews.some((item: any) => !!item?.is_default)) {
      nextViews[0].is_default = true;
      changed = true;
    }

    return { views: nextViews, changed };
  }

  canDeleteViewOption(view: string | UserSearchConfiguration): boolean {
    const viewName = typeof view === 'string' ? view : String(view?.view_name || 'Default View');
    return !this.isNoFilterViewName(viewName);
  }

  isSelectedNoFilterView(): boolean {
    const selectedView = this.getSelectedViewConfiguration();
    if (!selectedView) return false;
    return this.isNoFilterViewName(String(selectedView?.view_name || ''));
  }

  private applyNoFilterSelection(): void {
    this.search = '';
    this.appliedCommonSearch = '';
    this.isCommonSearchApplied = false;
    this.searchCondition = 'contains';
    this.selectedColumns = [];

    this.filterCondition = true;
    this.appliedFilterCondition = true;
    this.filterConditions = [];
    this.appliedFilterConditions = [];

    this.activeSortOrder = [];
    this.headercolumns.forEach((column: any) => {
      column.sortDirection = '';
      if (column.header !== 'table_column_sno') {
        column.colFilterHide = false;
      }
    });

    this.resultsPerPage = this.getDefaultResultsPerPage();
    this.currentPage = 1;

    this.searchQuery.emit({ where: { data: [], search: '' }, having: { data: [], search: '' }, skipFetch: true });
    this.advancedSearchQuery.emit({ data: [], condition: 'AND', skipFetch: true });
    this.columnSort.emit({ sortColumns: [], skipFetch: true });
    this.resultsPerPageChange.emit({ resultsPerPage: this.resultsPerPage, start_index: 0, skipFetch: true });

    this.initialFetchEmitted = true;
    const source = this.pendingManualViewSelection ? 'saved-view-manual' : 'saved-view';
    this.pendingManualViewSelection = false;
    this.pageChange.emit({ page: 1, start_index: 0, source });
  }

  private applyGridState(state: GridViewState): void {
    const selectedSearchColumns = state.selectedSearchColumns || [];

    this.searchCondition = state.searchCondition || 'contains';

    this.headercolumns.forEach((column: any) => {
      const colKey = this.getColumnUniqueKey(column);
      column.colFilterHide = (state.hiddenColumns || []).includes(colKey);
      column.sortDirection = '';
    });

    this.activeSortOrder = [];
    (state.sortColumns || []).forEach((sortItem: { key: string; direction: 'asc' | 'desc' }) => {
      const column = this.headercolumns.find((col: any) => this.getColumnUniqueKey(col) === sortItem.key);
      if (column && (sortItem.direction === 'asc' || sortItem.direction === 'desc')) {
        column.sortDirection = sortItem.direction;
        this.activeSortOrder.push(sortItem.key);
      }
    });

    if (selectedSearchColumns.length > 0) {
      this.selectedColumns = this.filteredColumns.filter((col: any) => selectedSearchColumns.includes(String(col?.field || '')));
    } else {
      this.selectedColumns = [];
    }

    const normalizedFilters: Array<FilterCondition> = (state.appliedFilterConditions || []).map((condition: any) => {
      const field = condition.field || '';
      const operator = this.normalizeSavedOperator(condition.operator, condition.value);
      const columnData = this.filteredColumns.find((col) => col.field === field);
      const isEnum = this.isEnumValue(columnData, operator);
      const enumObj = this.resolveEnumConfig(columnData?.enum_values);
      const rawEnumValues = Array.isArray(condition.enum_values) ? [...condition.enum_values] : [];
      const restoredEnumOptions = this.buildRestoredEnumOptions(condition.enum_value_options || [], rawEnumValues);

      return {
        field,
        operator,
        value: this.isBetweenOperator(operator) ? this.normalizeBetweenValue(condition.value) : condition.value || '',
        clause_type: condition.clause_type || 'where',
        enum_values: this.normalizeEnumValues(rawEnumValues),
        availableOperators: this.getOperatorsForColumn(field),
        inputType: this.getInputTypeForColumn(field),
        isEnum,
        enumType: isEnum ? enumObj?.type || '' : '',
        enumValueOptions: isEnum ? restoredEnumOptions : [],
        autocompleteLoading: false,
        autocompleteSearchText: '',
      };
    });

    this.filterCondition = state.filterCondition !== undefined ? !!state.filterCondition : true;
    this.appliedFilterCondition = this.filterCondition;
    this.filterConditions = this.cloneFilterConditions(normalizedFilters);
    this.appliedFilterConditions = this.cloneFilterConditions(normalizedFilters);
    this.hydrateEnumOptionsForRenderedFilters();

    this.resultsPerPage = Number(state.resultsPerPage) > 0 ? Number(state.resultsPerPage) : this.getDefaultResultsPerPage();
    this.currentPage = Number(state.currentPage) > 0 ? Number(state.currentPage) : 1;

    this.search = state.commonSearch || '';
    this.appliedCommonSearch = this.search;
    this.isCommonSearchApplied = this.search.length > 0;

    if (this.search.length > 0) {
      const { whereData, havingData } = this.buildCommonSearchPayload(this.search);
      this.searchQuery.emit({ where: { data: whereData, search: this.search }, having: { data: havingData, search: this.search }, skipFetch: true });
    } else {
      this.searchQuery.emit({ where: { data: [], search: '' }, having: { data: [], search: '' }, skipFetch: true });
    }

    if (this.appliedFilterConditions.length > 0) {
      const condition = this.appliedFilterCondition ? 'AND' : 'OR';
      const data = this.appliedFilterConditions.map((key: any) => {
        const type = key.inputType || this.getInputTypeForColumn(key.field);
        const normalizedOperator = this.normalizeSavedOperator(key.operator, key.value);
        const isNoValue = this.isNoValueOperator(normalizedOperator);
        const isBetween = this.isBetweenOperator(normalizedOperator);

        let filterValue = key.value;
        if (!isNoValue && !isBetween) {
          if (type == 'datetime-local' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(String(filterValue || ''))) {
            filterValue = this.timezoneService.transformDisplayDateTimeToUTC(filterValue, 'yyyy-MM-dd HH:mm') || filterValue;
          } else if (type == 'time' && /^\d{2}:\d{2}(:\d{2})?$/.test(String(filterValue || ''))) {
            filterValue = this.timezoneService.transformDisplayDateTimeToUTC(filterValue, 'HH:mm') || filterValue;
          } else if (type == 'date' && /^\d{4}-\d{2}-\d{2}$/.test(String(filterValue || ''))) {
            filterValue = this.formatDate(filterValue);
          }
        }

        const normalizedFilterValue = typeof filterValue === 'string' ? filterValue.trim() : filterValue;

        return {
          column_name: key.field,
          operator: isBetween ? this.mapConditionToSQL('between') : normalizedOperator ? this.mapConditionToSQL(normalizedOperator) : '=',
          value: isNoValue
            ? this.getNoValueOperatorSQL(normalizedOperator)
            : isBetween
            ? [
                this.formatFilterValueByType(type, this.normalizeBetweenValue(key.value).start),
                this.formatFilterValueByType(type, this.normalizeBetweenValue(key.value).end),
              ]
            : key.enum_values?.length > 0
            ? key.enum_values
            : this.addWildcards(normalizedOperator, normalizedFilterValue),
          isAggregate: key?.clause_type === 'having',
        };
      });
      this.advancedSearchQuery.emit({ data, condition, skipFetch: true });
    } else {
      this.advancedSearchQuery.emit({ data: [], condition: 'AND', skipFetch: true });
    }

    this.columnSort.emit({ sortColumns: this.getSortedColumnsByPriority(), skipFetch: true });

    const start_index = (this.currentPage - 1) * Number(this.resultsPerPage);
    this.resultsPerPageChange.emit({ resultsPerPage: Number(this.resultsPerPage), start_index, skipFetch: true });

    this.initialFetchEmitted = true;
    const source = this.pendingManualViewSelection ? 'saved-view-manual' : 'saved-view';
    this.pendingManualViewSelection = false;
    this.pageChange.emit({ page: this.currentPage, start_index, source });
  }

  private tryApplyTempConfigurationForCurrentGrid(): boolean {
    const state = this.getTempGridStateForCurrentGrid();
    if (!state) return false;
    if (!this.canApplyGridState(state)) return false;

    this.applyGridState(state);
    return true;
  }

  private setUserSearchConfigurations(configs: UserSearchConfiguration[]): void {
    const userData = this.getUserDataObject();
    userData.main = userData.main || {};
    userData.main.user_search_configurations = configs;
    this.persistUserDataObject(userData);
  }

  private buildCurrentGridViewState(): GridViewState {
    const sortColumns = this.getSortedColumnsByPriority().map((col: any) => ({
      key: this.getColumnUniqueKey(col),
      direction: col.sortDirection as 'asc' | 'desc',
    }));

    const hiddenColumns = this.headercolumns
      .filter((col: any) => col?.is_grid_column == 'true' && col?.colFilterHide)
      .map((col: any) => this.getColumnUniqueKey(col));

    const selectedSearchColumns = this.selectedColumns.map((column: any) => String(column?.field || ''));

    const appliedFilterConditions = this.appliedFilterConditions.map((condition) => {
      const isBetween = this.isBetweenOperator(condition.operator);
      const normalizedRange = this.normalizeBetweenValue(condition.value);
      const normalizedValue = isBetween ? [normalizedRange.start, normalizedRange.end] : condition.value;

      return {
        field: condition.field,
        operator: isBetween ? this.mapConditionToSQL('between') : condition.operator,
        value: normalizedValue,
        clause_type: condition.clause_type,
        enum_values: Array.isArray(condition.enum_values) ? [...condition.enum_values] : [],
        enum_value_options: Array.isArray(condition.enumValueOptions)
          ? condition.enumValueOptions.map((entry: any) => ({
              label: entry?.label ?? entry?.value ?? '',
              value: entry?.value ?? entry?.label ?? '',
            }))
          : [],
      };
    });

    return {
      commonSearch: this.appliedCommonSearch || '',
      searchCondition: this.searchCondition || 'contains',
      selectedSearchColumns,
      sortColumns,
      hiddenColumns,
      resultsPerPage: Number(this.resultsPerPage),
      currentPage: Number(this.currentPage),
      filterCondition: !!this.appliedFilterCondition,
      appliedFilterConditions,
    };
  }

  private hasActiveGridCustomizations(): boolean {
    const state = this.buildCurrentGridViewState();
    return !!(
      state.commonSearch ||
      state.selectedSearchColumns.length ||
      state.sortColumns.length ||
      state.hiddenColumns.length ||
      state.appliedFilterConditions.length ||
      state.searchCondition !== 'contains' ||
      state.currentPage !== 1 ||
      state.resultsPerPage !== this.getDefaultResultsPerPage()
    );
  }

  private normalizeGridState(state: any): GridViewState {
    return {
      commonSearch: state?.commonSearch || '',
      searchCondition: state?.searchCondition || 'contains',
      selectedSearchColumns: Array.isArray(state?.selectedSearchColumns) ? state.selectedSearchColumns.map((item: any) => String(item)) : [],
      sortColumns: Array.isArray(state?.sortColumns)
        ? state.sortColumns.map((item: any) => ({ key: String(item?.key || ''), direction: item?.direction }))
        : [],
      hiddenColumns: Array.isArray(state?.hiddenColumns) ? state.hiddenColumns.map((item: any) => String(item)) : [],
      resultsPerPage: Number(state?.resultsPerPage) > 0 ? Number(state.resultsPerPage) : this.getDefaultResultsPerPage(),
      currentPage: Number(state?.currentPage) > 0 ? Number(state.currentPage) : 1,
      filterCondition: !!state?.filterCondition,
      appliedFilterConditions: Array.isArray(state?.appliedFilterConditions)
        ? state.appliedFilterConditions.map((condition: any) => ({
            field: condition?.field || '',
            operator: this.normalizeSavedOperator(condition?.operator, condition?.value),
            value: this.isBetweenOperator(this.normalizeSavedOperator(condition?.operator, condition?.value))
              ? this.normalizeBetweenValue(condition?.value)
              : condition?.value || '',
            clause_type: condition?.clause_type || 'where',
            enum_values: this.normalizeEnumValues(Array.isArray(condition?.enum_values) ? [...condition.enum_values] : []),
            enum_value_options: this.normalizeEnumValueOptions(Array.isArray(condition?.enum_value_options) ? condition.enum_value_options : []),
          }))
        : [],
    };
  }

  private normalizeSavedOperator(operator: any, value: any): string {
    const rawOperator = String(operator || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');

    if (!rawOperator) return '';

    if (rawOperator === 'in') return 'in';
    if (rawOperator === 'not in') return 'not_in';
    if (rawOperator === 'between') return 'between';
    if (rawOperator === 'is null') return 'is_null';
    if (rawOperator === 'is not null') return 'is_not_null';
    if (rawOperator === 'is_empty') return 'is_empty';
    if (rawOperator === 'is_not_empty') return 'is_not_empty';
    if (rawOperator === 'not ilike' || rawOperator === 'not like') return 'not_contains';

    if (rawOperator === 'ilike' || rawOperator === 'like') {
      const normalizedValue = String(value ?? '').trim();
      const hasLeadingWildcard = normalizedValue.startsWith('%');
      const hasTrailingWildcard = normalizedValue.endsWith('%');

      if (hasLeadingWildcard && hasTrailingWildcard) return 'contains';
      if (!hasLeadingWildcard && hasTrailingWildcard) return 'starts_with';
      if (hasLeadingWildcard && !hasTrailingWildcard) return 'ends_with';
      return 'contains';
    }

    return rawOperator.replace(/\s+/g, '_');
  }

  private areGridStatesEqual(firstState: any, secondState: any): boolean {
    return JSON.stringify(this.normalizeGridState(firstState)) === JSON.stringify(this.normalizeGridState(secondState));
  }

  private supportsBetweenInputType(inputType: string): boolean {
    return inputType === 'date' || inputType === 'datetime-local' || inputType === 'time';
  }

  isBetweenOperator(operator: string): boolean {
    return (
      String(operator || '')
        .trim()
        .toLowerCase() === 'between'
    );
  }

  isRangeInputType(inputType: string): boolean {
    return this.supportsBetweenInputType(inputType);
  }

  isSinglePickerRangeInputType(inputType: string): boolean {
    return inputType === 'date' || inputType === 'datetime-local';
  }

  private normalizeBetweenValue(value: any): { start: string; end: string } {
    if (Array.isArray(value)) {
      return {
        start: String(value[0] ?? ''),
        end: String(value[1] ?? ''),
      };
    }

    if (value && typeof value === 'object') {
      return {
        start: String(value.start ?? value.from ?? ''),
        end: String(value.end ?? value.to ?? ''),
      };
    }

    return { start: '', end: '' };
  }

  getBetweenValue(index: number, bound: 'start' | 'end'): string {
    const condition = this.filterConditions[index];
    if (!condition) return '';
    const range = this.normalizeBetweenValue(condition.value);
    return range[bound] || '';
  }

  setBetweenValue(index: number, bound: 'start' | 'end', value: string): void {
    const condition = this.filterConditions[index];
    if (!condition) return;
    const range = this.normalizeBetweenValue(condition.value);
    range[bound] = value;
    condition.value = range;
  }

  getBetweenDisplayValue(index: number): string {
    const condition = this.filterConditions[index];
    if (!condition) return '';

    const range = this.normalizeBetweenValue(condition.value);
    const type = condition.inputType || this.getInputTypeForColumn(condition.field);
    const start = this.toRangeDisplayPart(range.start, type);
    const end = this.toRangeDisplayPart(range.end, type);

    if (!start && !end) return '';
    return `${start || ''} to ${end || ''}`.trim();
  }

  openBetweenRangePicker(index: number, event: Event): void {
    const target = event.target as HTMLInputElement | null;
    if (!target) return;

    const condition = this.filterConditions[index];
    if (!condition) return;

    const type = condition.inputType || this.getInputTypeForColumn(condition.field);
    const isTimeOnly = type === 'time';
    const enableTime = type === 'datetime-local';
    const dateFormat = isTimeOnly ? 'H:i' : enableTime ? 'Y-m-d H:i' : 'Y-m-d';
    const range = this.normalizeBetweenValue(condition.value);
    const defaultDate: Date[] = [];

    const startDate = this.toDateFromRangePart(range.start, type);
    const endDate = this.toDateFromRangePart(range.end, type);
    if (startDate) defaultDate.push(startDate);
    if (endDate) defaultDate.push(endDate);

    if (this.betweenRangePickers[index]) {
      this.betweenRangePickers[index].destroy();
      delete this.betweenRangePickers[index];
    }

    const picker = flatpickr(target, {
      mode: 'range',
      enableTime: enableTime || isTimeOnly,
      noCalendar: isTimeOnly,
      time_24hr: true,
      dateFormat,
      defaultDate,
      allowInput: false,
      clickOpens: true,
      onClose: (selectedDates: Date[]) => {
        if (!Array.isArray(selectedDates) || selectedDates.length === 0) {
          condition.value = { start: '', end: '' };
          target.value = '';
          return;
        }

        const start = this.formatRangeDateForValue(selectedDates[0], type);
        const end = selectedDates[1] ? this.formatRangeDateForValue(selectedDates[1], type) : '';
        condition.value = { start, end };
        target.value = this.getBetweenDisplayValue(index);
      },
    });

    this.betweenRangePickers[index] = picker;
    picker.open();
  }

  private toDateFromRangePart(value: any, inputType: string): Date | null {
    const raw = String(value ?? '').trim();
    if (!raw) return null;

    if (inputType === 'time') {
      const match = raw.match(/^(\d{2}):(\d{2})(?::\d{2})?$/);
      if (!match) return null;

      const hour = Number(match[1]);
      const minute = Number(match[2]);
      if (Number.isNaN(hour) || Number.isNaN(minute)) return null;

      const date = new Date();
      date.setSeconds(0, 0);
      date.setHours(hour, minute, 0, 0);
      return date;
    }

    const normalized = raw.replace(' ', 'T');
    const parsed = new Date(normalized);
    if (isNaN(parsed.getTime())) return null;
    return parsed;
  }

  private formatRangeDateForValue(date: Date, inputType: string): string {
    const pad = (num: number) => String(num).padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());

    if (inputType === 'datetime-local') {
      const hour = pad(date.getHours());
      const minute = pad(date.getMinutes());
      return `${year}-${month}-${day}T${hour}:${minute}`;
    }

    if (inputType === 'time') {
      const hour = pad(date.getHours());
      const minute = pad(date.getMinutes());
      return `${hour}:${minute}`;
    }

    return `${year}-${month}-${day}`;
  }

  private toRangeDisplayPart(value: any, inputType: string): string {
    const raw = String(value ?? '').trim();
    if (!raw) return '';

    if (inputType === 'datetime-local') {
      return raw.replace('T', ' ');
    }

    if (inputType === 'time') {
      const match = raw.match(/^(\d{2}:\d{2})(?::\d{2})?$/);
      return match ? match[1] : raw;
    }

    return raw;
  }

  private hasRangeValue(condition: FilterCondition): boolean {
    if (!this.isBetweenOperator(condition?.operator)) return false;
    const range = this.normalizeBetweenValue(condition?.value);
    return String(range.start || '').trim() !== '' && String(range.end || '').trim() !== '';
  }

  private formatFilterValueByType(type: string, rawValue: any): any {
    const value = String(rawValue ?? '').trim();
    if (!value) return value;

    if (type === 'datetime-local') {
      return this.timezoneService.transformDisplayDateTimeToUTC(value, 'yyyy-MM-dd HH:mm');
    }
    if (type === 'time') {
      return this.timezoneService.transformDisplayDateTimeToUTC(value, 'HH:mm');
    }
    if (type === 'date') {
      return this.formatDate(value);
    }

    return value;
  }

  getSelectedViewConfiguration(): UserSearchConfiguration | null {
    if (!this.save_grid_views) return null;
    if (!this.entityViews.length) return null;

    if (this.selectedViewName) {
      const normalizedSelectedName = String(this.selectedViewName || '')
        .trim()
        .toLowerCase();
      const selected = this.entityViews.find(
        (item: any) =>
          String(item?.view_name || 'Default View')
            .trim()
            .toLowerCase() === normalizedSelectedName
      );
      if (selected) return selected;
    }

    return this.entityViews.find((item: any) => !!item?.is_default) || this.entityViews[0] || null;
  }

  shouldShowMyViews(): boolean {
    if (!this.save_grid_views) return false;
    return this.entityViews.length > 0;
  }

  hasSelectedView(): boolean {
    return !!this.getSelectedViewConfiguration();
  }

  showSaveViewButton(): boolean {
    if (!this.save_grid_views) return false;
    if (this.shouldShowNoFilterStyleActions()) return true;
    const selectedView = this.getSelectedViewConfiguration();
    if (!selectedView) return this.hasActiveGridCustomizations();
    const currentState = this.buildCurrentGridViewState();
    return !this.areGridStatesEqual(currentState, selectedView.search_values);
  }

  isSelectedViewDefault(): boolean {
    const selectedView = this.getSelectedViewConfiguration();
    return !!selectedView?.is_default;
  }

  private getSavedViewConfiguration(): UserSearchConfiguration | null {
    if (!this.save_grid_views) return null;
    return this.getSelectedViewConfiguration();
  }

  private persistCurrentSelectedViewStateAsDefault(): void {
    if (!this.save_grid_views && !this.save_grid_latest_state) return;

    const entitySlug = this.getEntitySlug();
    if (!this.save_grid_views) {
      this.saveTempConfigurationForEntity(entitySlug, this.NO_FILTER_VIEW_NAME, this.buildCurrentGridViewState());
      return;
    }

    const selectedView = this.getSelectedViewConfiguration();
    if (!selectedView) {
      this.saveTempConfigurationForEntity(entitySlug, this.NO_FILTER_VIEW_NAME, this.buildCurrentGridViewState());
      return;
    }

    const selectedViewName = String(selectedView?.view_name || 'Default View');
    if (this.isNoFilterViewName(selectedViewName)) {
      this.saveTempConfigurationForEntity(entitySlug, selectedViewName, this.buildCurrentGridViewState());

      const allConfigs = this.getUserSearchConfigurations();
      const entityViews = allConfigs.filter((item: any) => (item?.entity_slug || item?.key) === entitySlug);
      if (entityViews.length === 0) return;

      const otherConfigs = allConfigs.filter((item: any) => (item?.entity_slug || item?.key) !== entitySlug);
      const nextEntityViews = entityViews.map((item: any) => ({
        ...item,
        entity_slug: entitySlug,
        view_name: String(item?.view_name || 'Default View'),
        is_default: this.isNoFilterViewName(String(item?.view_name || 'Default View')),
      }));

      const syncedEntityViews = this.syncNoFilterViewForEntity(nextEntityViews).views;
      this.setUserSearchConfigurations([...otherConfigs, ...syncedEntityViews]);
      this.persistSavedViewsToDatabase(entitySlug, syncedEntityViews);
      this.appliedSavedViewSlug = null;
      this.refreshEntityViews();
      return;
    }

    const allConfigs = this.getUserSearchConfigurations();
    const entityViews = allConfigs.filter((item: any) => (item?.entity_slug || item?.key) === entitySlug);
    const otherConfigs = allConfigs.filter((item: any) => (item?.entity_slug || item?.key) !== entitySlug);
    const searchValues = this.buildCurrentGridViewState();
    const updatedAt = new Date().toISOString();

    const nextEntityViews = entityViews.map((item: any) => {
      const currentName = String(item?.view_name || 'Default View');
      const isSelected = currentName === selectedViewName;

      return {
        ...item,
        entity_slug: entitySlug,
        view_name: currentName,
        is_default: isSelected,
        search_values: isSelected ? searchValues : item?.search_values,
        updated_at: isSelected ? updatedAt : item?.updated_at,
      };
    });

    const syncedEntityViews = this.syncNoFilterViewForEntity(nextEntityViews).views;
    this.setUserSearchConfigurations([...otherConfigs, ...syncedEntityViews]);
    this.persistSavedViewsToDatabase(entitySlug, syncedEntityViews);
    this.clearTempConfigurationForEntity(entitySlug);
    this.appliedSavedViewSlug = null;
    this.refreshEntityViews();
  }

  onGridNavigationClick(): void {
    this.persistCurrentSelectedViewStateAsDefault();
    this.hasPersistedViewBeforeDestroy = true;
  }

  onAddNewClick(): void {
    this.persistCurrentSelectedViewStateAsDefault();
    this.hasPersistedViewBeforeDestroy = true;
    this.customAction.emit('addNew');
  }

  saveViewConfiguration(): void {
    if (!this.save_grid_views) return;
    this.isEditingViewConfig = false;
    this.isEditingNoFilterView = false;
    this.editingOriginalViewName = '';
    this.viewFormName = '';
    this.viewFormSetAsDefault = true;
    this.isViewConfigModalOpen = true;
  }

  updateSelectedViewConfiguration(): void {
    if (!this.save_grid_views) return;
    const selectedView = this.getSelectedViewConfiguration();
    if (!selectedView) return;

    const entity_slug = this.getEntitySlug();
    const selectedName = String(selectedView.view_name || 'Default View');
    if (this.isNoFilterViewName(selectedName)) {
      this.saveTempConfigurationForEntity(entity_slug, selectedName, this.buildCurrentGridViewState());
      this.toastr.success('View updated successfully', 'Success');
      return;
    }

    const search_values = this.buildCurrentGridViewState();
    const allConfigs = this.getUserSearchConfigurations();

    const nextConfigs = allConfigs.map((item: any) => {
      const sameEntity = (item?.entity_slug || item?.key) === entity_slug;
      const sameName = String(item?.view_name || 'Default View') === selectedName;
      if (!sameEntity || !sameName) return item;

      return {
        ...item,
        entity_slug,
        view_name: selectedName,
        is_default: !!item?.is_default,
        search_values,
        updated_at: new Date().toISOString(),
      };
    });

    const entityViews = nextConfigs.filter((item: any) => (item?.entity_slug || item?.key) === entity_slug) as UserSearchConfiguration[];
    this.setUserSearchConfigurations(nextConfigs as UserSearchConfiguration[]);
    this.persistSavedViewsToDatabase(entity_slug, entityViews);
    this.clearTempConfigurationForEntity(entity_slug);
    this.appliedSavedViewSlug = null;
    this.refreshEntityViews();
    this.toastr.success('View updated successfully', 'Success');
  }

  openEditViewConfiguration(): void {
    if (!this.save_grid_views) return;
    const selectedView = this.getSelectedViewConfiguration();
    if (!selectedView) return;

    const selectedName = String(selectedView.view_name || 'Default View');
    this.isEditingViewConfig = true;
    this.isEditingNoFilterView = this.isNoFilterViewName(selectedName);
    this.editingOriginalViewName = selectedName;
    this.viewFormName = this.editingOriginalViewName;
    this.viewFormSetAsDefault = !!selectedView.is_default;
    this.isViewConfigModalOpen = true;
  }

  openEditViewConfigurationByName(viewName: string): void {
    if (!this.save_grid_views) return;
    const normalizedName = String(viewName || 'Default View').trim();
    this.selectedViewName = normalizedName;

    const selectedView = this.getEntityViews()
      .map((item: UserSearchConfiguration) => ({ ...item, view_name: String(item?.view_name || 'Default View') }))
      .find((item: any) => String(item?.view_name || 'Default View').trim() === normalizedName);
    if (!selectedView) return;

    this.isEditingViewConfig = true;
    this.isEditingNoFilterView = this.isNoFilterViewName(normalizedName);
    this.editingOriginalViewName = String(selectedView.view_name || 'Default View');
    this.viewFormName = this.editingOriginalViewName;
    this.viewFormSetAsDefault = !!selectedView.is_default;
    this.isViewConfigModalOpen = true;
  }

  onEditViewOptionClick(view: string | UserSearchConfiguration, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.closeMyViewsSelectDropdown();
    const viewName = typeof view === 'string' ? view : String(view?.view_name || 'Default View');
    this.openEditViewConfigurationByName(viewName);
  }

  onDeleteViewOptionClick(view: string | UserSearchConfiguration, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.closeMyViewsSelectDropdown();
    const viewName = typeof view === 'string' ? view : String(view?.view_name || 'Default View');
    if (this.isNoFilterViewName(viewName)) return;
    this.deleteViewConfigurationByName(viewName);
    this.isMyViewsMenuOpen = false;
  }

  private closeMyViewsSelectDropdown(): void {
    if (this.myViewsSelect && typeof this.myViewsSelect.close === 'function') {
      this.myViewsSelect.close();
    }
  }

  toggleMyViewsMenu(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.isMyViewsMenuOpen = !this.isMyViewsMenuOpen;
  }

  selectMyView(viewName: string, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.onSavedViewSelectionChange(viewName);
    this.isMyViewsMenuOpen = false;
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.isMyViewsMenuOpen = false;
  }

  closeViewConfigurationModal(): void {
    this.isViewConfigModalOpen = false;
    this.isEditingNoFilterView = false;
  }

  submitViewConfiguration(): void {
    if (!this.save_grid_views) return;
    const entity_slug = this.getEntitySlug();
    const name = this.isEditingNoFilterView ? this.NO_FILTER_VIEW_NAME : (this.viewFormName || '').trim();
    if (!name) {
      this.toastr.warning('View name is required', 'Warning');
      return;
    }

    const search_values = this.isEditingNoFilterView ? this.buildNoFilterGridViewState() : this.buildCurrentGridViewState();
    const allConfigs = this.getUserSearchConfigurations();
    const entityViews = allConfigs.filter((item: any) => (item?.entity_slug || item?.key) === entity_slug);
    const otherConfigs = allConfigs.filter((item: any) => (item?.entity_slug || item?.key) !== entity_slug);

    const lowerName = name.toLowerCase();
    const duplicate = entityViews.find(
      (item: any) =>
        String(item?.view_name || 'Default View').toLowerCase() === lowerName && String(item?.view_name || 'Default View') !== this.editingOriginalViewName
    );
    if (duplicate) {
      this.toastr.warning('View name already exists', 'Warning');
      return;
    }

    let nextEntityViews: UserSearchConfiguration[] = [];
    const updated_at = new Date().toISOString();

    if (this.isEditingViewConfig) {
      nextEntityViews = entityViews.map((item: any) => {
        const currentName = String(item?.view_name || 'Default View');
        if (currentName !== this.editingOriginalViewName) {
          return {
            ...item,
            entity_slug,
            view_name: currentName,
            is_default: this.viewFormSetAsDefault ? false : !!item?.is_default,
          };
        }

        return {
          ...item,
          entity_slug,
          view_name: name,
          is_default: this.viewFormSetAsDefault,
          search_values: this.isEditingNoFilterView ? this.buildNoFilterGridViewState() : search_values,
          updated_at,
        };
      });
    } else {
      nextEntityViews = [
        ...entityViews.map((item: any) => ({
          ...item,
          entity_slug,
          view_name: String(item?.view_name || 'Default View'),
          is_default: this.viewFormSetAsDefault ? false : !!item?.is_default,
        })),
        {
          entity_slug,
          view_name: name,
          is_default: this.viewFormSetAsDefault,
          search_values,
          updated_at,
        },
      ];
    }

    if (!nextEntityViews.some((item: any) => !!item?.is_default) && nextEntityViews.length > 0) {
      nextEntityViews[0].is_default = true;
    }

    const syncedEntityViews = this.syncNoFilterViewForEntity(nextEntityViews).views;

    this.setUserSearchConfigurations([...otherConfigs, ...syncedEntityViews]);
    this.persistSavedViewsToDatabase(entity_slug, syncedEntityViews);
    this.clearTempConfigurationForEntity(entity_slug);
    this.hasSavedViewConfiguration = syncedEntityViews.length > 0;
    this.selectedViewName = name;
    this.appliedSavedViewSlug = null;
    this.closeViewConfigurationModal();
    this.refreshEntityViews();
    this.toastr.success(this.isEditingViewConfig ? 'View updated successfully' : 'View saved successfully', 'Success');
  }

  onSavedViewSelectionChange(view: string | UserSearchConfiguration | null | undefined): void {
    const nextViewName = typeof view === 'string' ? view : typeof view === 'object' && view !== null ? String((view as any).view_name || 'Default View') : '';

    this.selectedViewName = String(nextViewName || '').trim();
    if (!this.selectedViewName) return;

    const currentSlug = this.getEntitySlug();
    const activeViewKey = `${currentSlug}::${this.selectedViewName}`;
    this.pendingManualViewSelection = true;
    if (this.isNoFilterViewName(this.selectedViewName)) {
      const tempState = this.getTempGridStateForCurrentGrid();
      if (tempState && this.canApplyGridState(tempState)) {
        this.applyGridState(tempState);
        this.appliedSavedViewSlug = activeViewKey;
        return;
      }
      if (tempState) {
        this.appliedSavedViewSlug = null;
        this.scheduleTryApplySavedView();
        return;
      }
      this.appliedSavedViewSlug = activeViewKey;
      this.applyNoFilterSelection();
      return;
    }
    this.appliedSavedViewSlug = null;
    this.tryApplySavedView();
    this.scheduleTryApplySavedView();
  }

  deleteSelectedViewConfiguration(): void {
    if (!this.save_grid_views) return;
    const selectedView = this.getSelectedViewConfiguration();
    if (!selectedView) return;

    const selectedName = String(selectedView.view_name || 'Default View');

    this.deleteViewConfigurationByName(selectedName);
  }

  deleteViewConfigurationByName(viewName: string): void {
    if (!this.save_grid_views) return;
    const selectedName = String(viewName || 'Default View');
    if (this.isNoFilterViewName(selectedName)) return;
    const entitySlug = this.getEntitySlug();
    const allConfigs = this.getUserSearchConfigurations();
    const targetView = allConfigs.find(
      (item: any) => (item?.entity_slug || item?.key) === entitySlug && String(item?.view_name || 'Default View') === selectedName
    );
    if (!targetView) return;

    Swal.fire({
      icon: 'warning',
      title: 'Are you sure?',
      text: `Delete view "${selectedName}"?`,
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      padding: '2em',
    }).then((result) => {
      if (!result.isConfirmed && !result.value) return;

      const allConfigs = this.getUserSearchConfigurations();
      const entityViews = allConfigs.filter((item: any) => (item?.entity_slug || item?.key) === entitySlug);
      const remainingEntityViews = entityViews.filter((item: any) => String(item?.view_name || 'Default View') !== selectedName);

      if (targetView.is_default && remainingEntityViews.length > 0) {
        remainingEntityViews[0].is_default = true;
      }

      const otherConfigs = allConfigs.filter((item: any) => (item?.entity_slug || item?.key) !== entitySlug);
      this.setUserSearchConfigurations([...otherConfigs, ...remainingEntityViews]);

      if (remainingEntityViews.length > 0) {
        this.persistSavedViewsToDatabase(entitySlug, remainingEntityViews);
      } else {
        this.deleteSavedViewFromDatabase(entitySlug);
      }

      this.hasSavedViewConfiguration = remainingEntityViews.length > 0;
      this.selectedViewName = String(remainingEntityViews.find((item: any) => !!item?.is_default)?.view_name || remainingEntityViews[0]?.view_name || '');
      this.appliedSavedViewSlug = null;
      this.refreshEntityViews();
      this.resetViewConfiguration();
      this.toastr.success('View deleted successfully', 'Success');
    });
  }

  resetViewConfiguration(): void {
    if (!this.save_grid_views) return;
    const entitySlug = this.getEntitySlug();
    this.clearTempConfigurationForEntity(entitySlug);

    const hasViews = this.shouldShowMyViews();
    const selectedView = hasViews ? this.getSelectedViewConfiguration() : null;

    if (hasViews && selectedView?.search_values) {
      this.appliedSavedViewSlug = null;
      this.scheduleTryApplySavedView();
      this.toastr.success('View reset successfully', 'Success');
      return;
    }

    this.hasSavedViewConfiguration = false;
    this.selectedViewName = '';
    this.appliedSavedViewSlug = null;

    this.search = '';
    this.appliedCommonSearch = '';
    this.isCommonSearchApplied = false;
    this.searchCondition = 'contains';
    this.selectedColumns = [];

    this.filterCondition = true;
    this.appliedFilterCondition = true;
    this.filterConditions = [];
    this.appliedFilterConditions = [];

    this.activeSortOrder = [];
    this.headercolumns.forEach((column: any) => {
      column.sortDirection = '';
      if (column.header !== 'table_column_sno') {
        column.colFilterHide = false;
      }
    });

    this.resultsPerPage = this.getDefaultResultsPerPage();
    this.currentPage = 1;

    const emptySearch = { where: { data: [], search: '' }, having: { data: [], search: '' }, skipFetch: true };

    this.searchQuery.emit(emptySearch);
    this.advancedSearchQuery.emit({ data: [], condition: 'AND', skipFetch: true });
    this.columnSort.emit({ sortColumns: [], skipFetch: true });
    this.resultsPerPageChange.emit({ resultsPerPage: this.resultsPerPage, start_index: 0, skipFetch: true });
    this.pageChange.emit({ page: 1, start_index: 0 });

    this.toastr.success('View reset successfully', 'Success');
  }

  private persistSavedViewsToDatabase(entitySlug: string, views: UserSearchConfiguration[]): void {
    if (!this.save_grid_views) return;
    const userData = this.getUserDataObject();
    const userId = userData?.main?.id;

    if (!userId) {
      this.toastr.warning('Unable to save view in database for this user', 'Warning');
      return;
    }

    this.upsert_saved_view_json_schema.conditions['table1'] = [
      {
        user_id: userId,
        entity_slug: entitySlug,
      },
    ];

    this.upsert_saved_view_json_schema.data['table2'] = views.map((view: UserSearchConfiguration) => ({
      user_id: userId,
      entity_slug: entitySlug,
      view_name: String(view?.view_name || 'Default View'),
      is_default: !!view?.is_default,
      search_values: view.search_values,
      created_by: true,
      created_at: true,
      updated_by: true,
      updated_at: true,
    }));

    this.gridApiService.executeRecords(this.upsert_saved_view_json_schema).subscribe({
      next: (response: any) => {
        if (response?.status && response?.code === 200) {
          //this.toastr.success('View saved in database successfully', 'Success');
        } else {
          this.toastr.error(response?.message || 'Failed to save view in database', 'Error');
        }
      },
      error: () => {
        this.toastr.error('Failed to save view in database', 'Error');
      },
    });
  }

  private deleteSavedViewFromDatabase(entitySlug: string): void {
    if (!this.save_grid_views) return;
    const userData = this.getUserDataObject();
    const userId = userData?.main?.id;

    if (!userId) {
      this.toastr.warning('Unable to reset saved view in database for this user', 'Warning');
      return;
    }

    this.delete_saved_view_json_schema.conditions['table1'] = [
      {
        user_id: userId,
        entity_slug: entitySlug,
      },
    ];

    this.gridApiService.executeRecords(this.delete_saved_view_json_schema).subscribe({
      next: (response: any) => {
        if (response?.status && response?.code === 200) {
          //this.toastr.success('View reset in database successfully', 'Success');
        } else {
          this.toastr.error(response?.message || 'Failed to reset view in database', 'Error');
        }
      },
      error: () => {
        this.toastr.error('Failed to reset view in database', 'Error');
      },
    });
  }

  private tryApplySavedView(): void {
    if (!this.save_grid_views) {
      const hasStableEntityContext = !!(this.masterInfo?.ListQuery?.entity_name || this.masterInfo?.entity_name);
      if (this.save_grid_latest_state && !hasStableEntityContext) {
        this.scheduleTryApplySavedView();
        return;
      }

      const currentSlug = this.getEntitySlug();
      if (this.save_grid_latest_state && this.latestStateBootstrapSlug === currentSlug) {
        return;
      }

      const tempApplyKey = `${currentSlug}::__temp__`;
      if (this.appliedSavedViewSlug === tempApplyKey) {
        if (this.save_grid_latest_state) {
          this.latestStateBootstrapSlug = currentSlug;
        }
        return;
      }

      const tempState = this.getTempGridStateForCurrentGrid();
      if (!tempState) {
        this.appliedSavedViewSlug = null;
        this.hasSavedViewConfiguration = false;

        if (!this.initialFetchEmitted) {
          const page = Number(this.currentPage) > 0 ? Number(this.currentPage) : 1;
          const limit = Number(this.resultsPerPage) > 0 ? Number(this.resultsPerPage) : this.getDefaultResultsPerPage();
          this.initialFetchEmitted = true;
          if (this.save_grid_latest_state) {
            this.latestStateBootstrapSlug = currentSlug;
          }
          this.pageChange.emit({ page, start_index: (page - 1) * limit, source: 'default-initial' });
        }
        return;
      }

      if (!this.canApplyGridState(tempState)) {
        this.scheduleTryApplySavedView();
        return;
      }

      this.appliedSavedViewSlug = tempApplyKey;
      this.hasSavedViewConfiguration = true;
      if (this.save_grid_latest_state) {
        this.latestStateBootstrapSlug = currentSlug;
      }
      this.applyGridState(tempState);
      return;
    }
    const currentSlug = this.getEntitySlug();
    const tempApplyKey = `${currentSlug}::__temp__`;

    const savedConfig = this.getSavedViewConfiguration();
    if (!savedConfig) {
      if (this.appliedSavedViewSlug === tempApplyKey) return;
      const tempState = this.getTempGridStateForCurrentGrid();
      if (!tempState) return;
      if (this.canApplyGridState(tempState)) {
        this.appliedSavedViewSlug = tempApplyKey;
        this.hasSavedViewConfiguration = true;
        this.applyGridState(tempState);
      }
      return;
    }

    const state = (savedConfig as any).search_values || (savedConfig as any).state;
    if (!state) return;

    const activeViewName = String(savedConfig?.view_name || 'Default View');
    const activeViewKey = `${currentSlug}::${activeViewName}`;
    if (this.appliedSavedViewSlug === activeViewKey) return;
    if (this.isNoFilterViewName(activeViewName)) {
      const tempState = this.getTempGridStateForCurrentGrid();
      if (tempState && this.canApplyGridState(tempState)) {
        this.appliedSavedViewSlug = activeViewKey;
        this.hasSavedViewConfiguration = true;
        this.selectedViewName = activeViewName;
        this.applyGridState(tempState);
        return;
      }
      if (tempState) return;
      this.appliedSavedViewSlug = activeViewKey;
      this.hasSavedViewConfiguration = true;
      this.selectedViewName = activeViewName;
      this.applyNoFilterSelection();
      return;
    }
    if (!this.headercolumns?.length) {
      this.scheduleTryApplySavedView();
      return;
    }

    const selectedSearchColumns = state.selectedSearchColumns || [];
    if (selectedSearchColumns.length > 0 && !this.filteredColumns?.length) {
      this.scheduleTryApplySavedView();
      return;
    }

    const appliedFilterConditions = state.appliedFilterConditions || [];
    if (appliedFilterConditions.length > 0 && !this.filteredColumns?.length) {
      this.scheduleTryApplySavedView();
      return;
    }

    this.appliedSavedViewSlug = activeViewKey;
    this.hasSavedViewConfiguration = true;
    this.selectedViewName = activeViewName;

    this.applyGridState(state);
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

  private preventSavedViewReapplyOnUserEdit(): void {
    const selectedView = this.getSelectedViewConfiguration();
    if (!selectedView) return;

    const currentSlug = this.getEntitySlug();
    const activeViewName = String(selectedView?.view_name || 'Default View');
    this.appliedSavedViewSlug = `${currentSlug}::${activeViewName}`;
  }

  onSearch() {
    this.search = this.search.trim();
    this.preventSavedViewReapplyOnUserEdit();
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

  private getColumnUniqueKey(column: any): string {
    return String(column?.field_value ?? column?.field ?? column?.header ?? column?.title ?? '');
  }

  private getSortedColumnsByPriority(): any[] {
    return this.activeSortOrder
      .map((key) => this.headercolumns.find((col) => this.getColumnUniqueKey(col) === key && col.sortDirection))
      .filter((col) => !!col);
  }

  sortColumn(column: any) {
    if (column.is_grid_column == 'true' && column.is_sortable == 'true') {
      const columnKey = this.getColumnUniqueKey(column);

      if (!column.sortDirection) {
        column.sortDirection = 'asc';
        if (!this.activeSortOrder.includes(columnKey)) {
          this.activeSortOrder.push(columnKey);
        }
      } else if (column.sortDirection === 'asc') {
        column.sortDirection = 'desc';
        if (!this.activeSortOrder.includes(columnKey)) {
          this.activeSortOrder.push(columnKey);
        }
      } else {
        column.sortDirection = '';
        this.activeSortOrder = this.activeSortOrder.filter((key) => key !== columnKey);
      }

      const sortedColumns = this.getSortedColumnsByPriority();
      this.columnSort.emit({ ...column, sortColumns: sortedColumns });
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
    this.persistCurrentSelectedViewStateAsDefault();
    this.hasPersistedViewBeforeDestroy = true;
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
    if (col?.link_type === 'child_grid') {
      setTimeout(() => {
        this.createColumnChildMasterList(item, col.link_action);
      }, 250);
    }
  }

  onChildComponentExpandClick(item: any, col: any, row_index: number) {
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

    this.persistCurrentSelectedViewStateAsDefault();
    this.hasPersistedViewBeforeDestroy = true;

    this.expandedColumnChildGrid = { uuid: item.uuid, colHeader: col.header, rowIndex: row_index };

    const resolvedMode = this.getChildComponentMode(col);
    if (resolvedMode === 'popup_grid') {
      setTimeout(() => {
        this.createColumnChildMasterList(item, col.link_action);
      }, 250);
    }
  }

  isColumnChildGridExpanded(row_index: number, col: any): boolean {
    return !!this.expandedColumnChildGrid && this.expandedColumnChildGrid.rowIndex === row_index && this.expandedColumnChildGrid.colHeader === col.header;
  }

  getChildComponentMode(col: any): string {
    const normalizedMode = this.normalizeChildComponentMode(col?.link_mode);
    if (normalizedMode) {
      if (col?.link_action) {
        this.childComponentResolvedModes[col.link_action] = normalizedMode;
      }
      return normalizedMode;
    }

    const entityName = col?.link_action;
    if (entityName && this.childComponentResolvedModes[entityName]) {
      return this.childComponentResolvedModes[entityName];
    }

    const inferredMode = this.inferChildComponentMode(entityName);
    if (entityName && inferredMode) {
      this.childComponentResolvedModes[entityName] = inferredMode;
      return inferredMode;
    }

    return 'popup_details';
  }

  getChildComponentUuid(item: any, col: any): string | null {
    return this.getChildComponentMode(col) === 'popup_add' ? null : item?.uuid || null;
  }

  getGridParamsFromItem(item: any): any {
    const gridParams: any = {};
    Object.keys(item || {}).forEach((key) => {
      if (key.startsWith('gparam_')) {
        const temp_key = '$' + key;
        gridParams[temp_key] = item[key];
      }
    });
    return gridParams;
  }

  private normalizeChildComponentMode(linkMode: any): string | null {
    const mode = typeof linkMode === 'string' ? linkMode.trim() : '';

    if (!mode || mode === 'none') {
      return null;
    }

    if (mode === 'child_grid') {
      return 'popup_grid';
    }

    if (mode === 'popup_create') {
      return 'popup_add';
    }

    if (mode === 'popup_details' || mode === 'popup_add' || mode === 'popup_edit' || mode === 'popup_grid') {
      return mode;
    }

    return null;
  }

  private inferChildComponentMode(entityName: string | undefined): string | null {
    if (!entityName) {
      return null;
    }

    const userDataRaw = this.localstore.getData('user_data');
    if (!userDataRaw || userDataRaw === 'undefined') {
      return null;
    }

    try {
      const userData = JSON.parse(userDataRaw);
      const routeInfo = userData?.unorgmenuList?.find((item: any) => item?.entity_name === entityName && item?.component_class_name);
      const componentClassName = routeInfo?.component_class_name;

      if (componentClassName === commonConfig.ENTITY_TYPES.GRID_BUILDER_MODULE) {
        return 'popup_grid';
      }

      if (componentClassName === commonConfig.ENTITY_TYPES.FORM_BUILDER_MODULE) {
        return 'popup_edit';
      }

      if (componentClassName === commonConfig.ENTITY_TYPES.STATIC_PAGE_BUILDER_MODULE) {
        return 'popup_details';
      }
    } catch (error) {
      return null;
    }

    return null;
  }

  createChildMasterList(item: any, entityName: string, row_index: number) {
    if (!this.childMasterListContainer) return;
    this.childMasterListContainer.clear();
    const componentRef = this.childMasterListContainer.createComponent(MasterListComponent);
    componentRef.instance.uuid = item['uuid'];
    componentRef.instance.entity_name = entityName;
    componentRef.instance.nonGridPage = false;
    componentRef.instance.enableCheckBox = this.enableCheckBox;
    componentRef.instance.parentGridFilters = this.getParentGridFilterContext();
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
    componentRef.instance.parentGridFilters = this.getParentGridFilterContext();

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
    componentRef.instance.parentGridFilters = this.getParentGridFilterContext();

    const gridParams: any = {};
    Object.keys(item).forEach((key) => {
      if (key.startsWith('gparam_')) {
        let temp_key = '$' + key;
        gridParams[temp_key] = item[key];
      }
    });
    componentRef.instance.grid_params = gridParams;
  }

  getParentGridFilterContext() {
    return {
      search_all: Array.isArray(this.activeSearchAll) ? JSON.parse(JSON.stringify(this.activeSearchAll)) : [],
      search_any: Array.isArray(this.activeSearchAny) ? JSON.parse(JSON.stringify(this.activeSearchAny)) : [],
      having_conditions: Array.isArray(this.activeHavingAll) ? JSON.parse(JSON.stringify(this.activeHavingAll)) : [],
      having_any_conditions: Array.isArray(this.activeHavingAny) ? JSON.parse(JSON.stringify(this.activeHavingAny)) : [],
      columns: Array.isArray(this.parentFilterColumns) ? JSON.parse(JSON.stringify(this.parentFilterColumns)) : [],
    };
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
