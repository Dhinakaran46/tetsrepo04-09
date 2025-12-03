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
import { TimezoneService } from '../../service/common/timezone.service';
import { MasterListComponent } from '../../pages/master-list/master-list.component';
import { LoaderComponent } from '../loader/loader.component';

import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

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
  imports: [CommonSharedModule, NgMultiSelectDropDownModule, BooleanStatusPipe, LoaderComponent],
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

  search: any = '';
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
          : String(val);
      }

      // non-ternary: try to resolve as path/literal (supports row_object.name, value, etc.)
      const v = this.getContextValue(exp, context);
      return v !== undefined && v !== null ? String(v) : '';
    });

    // (optional) final pass for the explicit {{ value }} or {{ key }} placeholders
    if (key) {
      processedHtml = processedHtml
        .replace(/\{\{\s*value\s*\}\}/g, String(primaryValue))
        .replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), String(primaryValue));
    }

    return this.sanitizer.bypassSecurityTrustHtml(processedHtml);
    //return processedHtml;
  }

  onHtmlCellClick(ev: MouseEvent) {
    const a = (ev.target as HTMLElement)?.closest('a') as HTMLAnchorElement | null;
    if (!a) return;

    // Don’t let row-level handlers swallow it
    ev.stopPropagation();

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
          this.createChildMasterList(item, this.masterInfo?.children.child_details.entity_name);
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
      // this.loading = false;
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
      //this.loading = false;
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

  createChildMasterList(item: any, entityName: string) {
    if (!this.childMasterListContainer) return;
    this.childMasterListContainer.clear();
    const componentRef = this.childMasterListContainer.createComponent(MasterListComponent);
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
}
