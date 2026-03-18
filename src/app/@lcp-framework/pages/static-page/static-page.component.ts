import { Component, EventEmitter, HostListener, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { SafeHtmlPipe } from '../../pipes/safehtml/safe-html.pipe';
import * as Handlebars from 'handlebars';
import { CommonSharedModule } from '../../shared/common/common.module';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Store, select } from '@ngrx/store';
import { GridApiService } from '../../service/common/grid.service';
import { Observable } from 'rxjs';
import { Location } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { registerHandlebarsHelpers } from '../../helpers/handlebar/handlebar-helpers';
import { slideDownUp } from '../../shared/animations';
import { Title } from '@angular/platform-browser';
import { TimezoneService } from '../../service/common/timezone.service';

@Component({
  selector: 'app-static-page',
  standalone: true,
  imports: [CommonSharedModule, SafeHtmlPipe],
  templateUrl: './static-page.component.html',
  styleUrl: './static-page.component.scss',
  animations: [slideDownUp],
})
export class StaticPageComponent implements OnChanges {
  currentAccordion: string = 'home';
  currentTab: string = 'home';

  pageContent: string = '';
  store$: Observable<any>;
  unique_id!: string | null;
  entity_name!: string;
  entity_type!: string | null;
  query_information!: any | null;
  accepted_parent_params: any = [];
  static_page_content: string = '';
  routeGParams: Record<string, string> = {};

  @Input() uuid!: string | null;
  @Input() entityName!: string;
  @Input() isModal: boolean = false;
  @Input() gridParams!: any;
  @Input() parentGridFilters: {
    search_all: any[];
    search_any: any[];
    having_conditions: any[];
    having_any_conditions: any[];
    columns?: any[];
  } | null = null;
  @Input() keyword: string = '';
  @Output() closeModal = new EventEmitter<void>();

  private imageDelegationAttached = false;
  private lastLoadSignature: string = '';

  viewer = {
    open: false,
    items: [] as string[],
    index: 0,
    zoom: 1,
    pan: { x: 0, y: 0 },
    dragging: false,
    dragStart: { x: 0, y: 0 },
    panStart: { x: 0, y: 0 },
    minZoom: 0.5,
    maxZoom: 5,
    zoomStep: 0.15,
  };

  /* Keyboard shortcuts */
  @HostListener('window:keydown.escape')
  onEsc() {
    if (this.viewer.open) this.closeViewer();
  }

  @HostListener('window:keydown.arrowright')
  onRight() {
    if (this.viewer.open) this.nextImage();
  }

  @HostListener('window:keydown.arrowleft')
  onLeft() {
    if (this.viewer.open) this.prevImage();
  }

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private gridApiService: GridApiService,
    private toastr: ToastrService,
    private store: Store<any>,
    public location: Location,
    public translate: TranslateService,
    private titleService: Title,
    private timezoneService: TimezoneService
  ) {
    this.store$ = this.store.pipe(select('index'));
    this.initStore();

    registerHandlebarsHelpers(this.translate);
  }

  ngAfterViewInit() {
    // Attach once; works even as innerHTML changes
    this.attachImageClickDelegation();
  }

  /** Delegated click: open viewer when any IMG inside #static-content is clicked */
  private attachImageClickDelegation() {
    if (this.imageDelegationAttached) return;
    const container = document.getElementById('static-content');
    if (!container) return;

    container.addEventListener('click', (evt: Event) => {
      const target = evt.target as HTMLElement;
      const img = (target instanceof HTMLImageElement ? target : target?.closest?.('img')) as HTMLImageElement | null;
      if (!img) return;

      // Limit to images inside the “Item Images” table (optional but tidy)
      const allImgs = Array.from(
        container.querySelectorAll('table img') // or just 'img' to allow all
      ) as HTMLImageElement[];

      const srcs = allImgs.map((i) => i.currentSrc || i.src).filter(Boolean);

      this.viewer.items = Array.from(new Set(srcs)); // de-dupe
      this.viewer.index = Math.max(0, this.viewer.items.indexOf(img.currentSrc || img.src));
      this.openViewer();
    });

    this.imageDelegationAttached = true;
  }

  /* ---------- Viewer controls ---------- */

  private openViewer() {
    this.viewer.open = true;
    this.resetView();
    document.body.style.overflow = 'hidden';
  }

  closeViewer() {
    this.viewer.open = false;
    document.body.style.overflow = '';
  }

  nextImage(evt?: Event) {
    evt?.stopPropagation();
    if (!this.viewer.items.length) return;
    this.viewer.index = (this.viewer.index + 1) % this.viewer.items.length;
    this.resetView();
  }

  prevImage(evt?: Event) {
    evt?.stopPropagation();
    if (!this.viewer.items.length) return;
    this.viewer.index = (this.viewer.index - 1 + this.viewer.items.length) % this.viewer.items.length;
    this.resetView();
  }

  zoomIn(evt?: Event) {
    evt?.stopPropagation();
    this.viewer.zoom = Math.min(this.viewer.maxZoom, this.viewer.zoom + this.viewer.zoomStep);
  }

  zoomOut(evt?: Event) {
    evt?.stopPropagation();
    this.viewer.zoom = Math.max(this.viewer.minZoom, this.viewer.zoom - this.viewer.zoomStep);
  }

  resetView(evt?: Event) {
    evt?.stopPropagation();
    this.viewer.zoom = 1;
    this.viewer.pan = { x: 0, y: 0 };
  }

  onWheel(evt: WheelEvent) {
    evt.preventDefault();
    evt.stopPropagation();

    const delta = Math.sign(evt.deltaY);
    const prevZoom = this.viewer.zoom;
    let nextZoom = prevZoom + (delta > 0 ? -this.viewer.zoomStep : this.viewer.zoomStep);
    nextZoom = Math.max(this.viewer.minZoom, Math.min(this.viewer.maxZoom, nextZoom));

    // keep zoom roughly centered at cursor
    const rect = (evt.currentTarget as HTMLElement).getBoundingClientRect();
    const cx = evt.clientX - rect.left - rect.width / 2 - this.viewer.pan.x;
    const cy = evt.clientY - rect.top - rect.height / 2 - this.viewer.pan.y;

    this.viewer.pan.x -= cx * (nextZoom / prevZoom - 1);
    this.viewer.pan.y -= cy * (nextZoom / prevZoom - 1);
    this.viewer.zoom = nextZoom;
  }

  onDragStart(evt: MouseEvent) {
    this.viewer.dragging = true;
    this.viewer.dragStart = { x: evt.clientX, y: evt.clientY };
    this.viewer.panStart = { ...this.viewer.pan };
    (evt.currentTarget as HTMLElement).classList.replace('cursor-grab', 'cursor-grabbing');
  }

  onDrag(evt: MouseEvent) {
    if (!this.viewer.dragging) return;
    const dx = evt.clientX - this.viewer.dragStart.x;
    const dy = evt.clientY - this.viewer.dragStart.y;
    this.viewer.pan = { x: this.viewer.panStart.x + dx, y: this.viewer.panStart.y + dy };
  }

  onDragEnd() {
    if (!this.viewer.dragging) return;
    this.viewer.dragging = false;
    const el = document.querySelector('.cursor-grabbing');
    el?.classList.replace('cursor-grabbing', 'cursor-grab');
  }

  setTab(tab: string) {
    this.currentTab = tab;
    this.requestLoadData();
  }
  setAccordion(index: any) {
    this.currentAccordion = index;
    this.requestLoadData();
  }
  attachEventListeners() {
    const tabLinks = document.querySelectorAll('a[data-tab]');

    tabLinks.forEach((tabLink) => {
      const tabName = tabLink.getAttribute('data-tab');
      if (tabName) {
        tabLink.addEventListener('click', () => this.setTab(tabName));
      }
    });

    const buttons = document.querySelectorAll('button[data-accordion]');
    buttons.forEach((buttonLink) => {
      const buttonName = buttonLink.getAttribute('data-accordion');
      if (buttonName) {
        buttonLink.addEventListener('click', () => this.setAccordion(buttonName));
      }
    });
  }

  ngOnInit() {
    this.collectRouteGParams();

    if (!this.uuid) {
      this.route.paramMap.subscribe((params) => {
        this.unique_id = params.get('id') || params.get('uuid');
        this.collectRouteGParams();
        this.requestLoadData();
      });
    }
    if (this.uuid) {
      this.unique_id = this.uuid;
    }

    if (!this.entityName) {
      this.route.data.subscribe((data) => {
        const pageInfo = data['pageInfo'];
        this.entity_name = pageInfo.fullEntity;
        const translateTitle = this.translate.instant(this.entity_name);
        this.titleService.setTitle(translateTitle);
        this.entity_type = pageInfo.action_slug;
      });
    }
    if (this.entityName) {
      this.entity_name = this.entityName;
      const translateTitle = this.translate.instant(this.entity_name);
      this.titleService.setTitle(translateTitle);
    }

    this.initStore();
    if (this.entity_name) {
      this.requestLoadData();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['uuid']) {
      this.unique_id = this.uuid || this.route.snapshot.paramMap.get('id') || this.route.snapshot.paramMap.get('uuid');
    }

    if (changes['entityName'] && this.entityName) {
      this.entity_name = this.entityName;
      const translateTitle = this.translate.instant(this.entity_name);
      this.titleService.setTitle(translateTitle);
    }

    if ((changes['entityName'] || changes['uuid'] || changes['gridParams'] || changes['parentGridFilters']) && this.entity_name) {
      this.requestLoadData();
    }
  }

  private requestLoadData() {
    if (!this.entity_name) {
      return;
    }

    const currentSignature = JSON.stringify({
      entity_name: this.entity_name,
      unique_id: this.unique_id || null,
      gridParams: this.gridParams || null,
      parentGridFilters: this.parentGridFilters || null,
      currentTab: this.currentTab,
      currentAccordion: this.currentAccordion,
    });

    if (currentSignature === this.lastLoadSignature) {
      return;
    }

    this.lastLoadSignature = currentSignature;
    this.loadData();
  }

  private initStore() {
    this.store$.subscribe((store) => {
      // Handle store changes
    });
  }

  private loadData() {
    const listParams = {
      company_id: 1,
      print_query: false,
      primary_table: 'master_entities',
      start_index: 0,
      limit_range: 1,
      sort_columns: [['master_entities.id', 'desc']],
      select_columns: [['master_entities.*']],
      search_all: [
        { column_name: 'master_entities.entity_name', operator: '=', value: this.entity_name },
        { column_name: 'master_entities.entity_type', operator: '=', value: 'static_page_builder_module' },
        { column_name: 'master_entities.status_id', operator: '=', value: '1' },
      ],
    };

    this.gridApiService.getAllList(listParams).subscribe(
      (response) => {
        if (response.status && response.data?.records?.length > 0) {
          this.query_information = response.data.records[0].query_information;
          this.accepted_parent_params = [];
          this.query_information = this.replaceGParamsInObject(this.query_information);
          this.static_page_content = response.data.records[0].static_page_content;

          if (this.query_information) {
            this.loadAcceptedParentParamsAndDefaultData();
          } else {
            //this.pageContent = this.static_page_content;
            this.pageContent = this.compileStaticContent(this.static_page_content, {
              currentTab: this.currentTab,
              currentAccordion: this.currentAccordion,
            });

            setTimeout(() => {
              this.attachEventListeners();
            }, 0);
          }
        } else {
          this.toastr.error('Invalid entity details given1.');
          this.router.navigate(['/dashboard']);
        }
      },
      (error) => {
        const key = 'error';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
        this.router.navigate(['/dashboard']);
      }
    );
  }

  private loadAcceptedParentParamsAndDefaultData() {
    if (!this.entity_name) {
      this.accepted_parent_params = [];
      this.loadDefaultData();
      return;
    }

    this.gridApiService.getAttachedPolicies({ entity_name: this.entity_name }).subscribe(
      (response) => {
        if (response?.status && response?.code === 200) {
          this.accepted_parent_params = response?.data?.accepted_parent_params || {};
        } else {
          this.accepted_parent_params = this.query_information?.accepted_parent_params || {};
        }
      },
      () => {
        this.accepted_parent_params = this.query_information?.accepted_parent_params || {};
      },
      () => {
        this.loadDefaultData();
      }
    );
  }

  private collectRouteGParams() {
    const mergedGParams: Record<string, string> = {};

    const collectFromParams = (params: any) => {
      const aggregatedGparam = params.get('gparam');
      if (aggregatedGparam) {
        try {
          const decoded = decodeURIComponent(aggregatedGparam);
          const parsed = JSON.parse(decoded);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            Object.keys(parsed).forEach((key) => {
              if (key.startsWith('gparam_') && parsed[key] !== undefined && parsed[key] !== null) {
                mergedGParams[key] = String(parsed[key]);
              }
            });
          }
        } catch {
          try {
            const parsed = JSON.parse(aggregatedGparam);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
              Object.keys(parsed).forEach((key) => {
                if (key.startsWith('gparam_') && parsed[key] !== undefined && parsed[key] !== null) {
                  mergedGParams[key] = String(parsed[key]);
                }
              });
            }
          } catch {}
        }
      }

      params.keys.forEach((key: string) => {
        if (key.startsWith('gparam_')) {
          const value = params.get(key);
          if (value !== null) {
            mergedGParams[key] = value;
          }
        }
      });
    };

    collectFromParams(this.route.snapshot.paramMap);
    collectFromParams(this.route.snapshot.queryParamMap);

    this.routeGParams = mergedGParams;
  }

  private replaceGParamsInObject(obj: any): any {
    if (!obj || Object.keys(this.routeGParams).length === 0) {
      return obj;
    }

    const walk = (value: any): any => {
      if (Array.isArray(value)) {
        return value.map((item) => walk(item));
      }

      if (value && typeof value === 'object') {
        const out: any = {};
        Object.keys(value).forEach((key) => {
          out[key] = walk(value[key]);
        });
        return out;
      }

      if (typeof value === 'string') {
        return value.replace(/\$gparam_\d+/g, (match) => {
          const paramKey = match.substring(1);
          const replacement = this.routeGParams[paramKey];
          return replacement !== undefined ? String(replacement) : match;
        });
      }

      return value;
    };

    return walk(obj);
  }

  private loadDefaultData() {
    if (this.unique_id) {
      this.query_information = this.replaceUniqueId(this.query_information, '$unique_id', this.unique_id);
    }
    this.query_information = this.mergeAcceptedParentFiltersIntoQueryInformation(this.query_information);
    this.query_information.grid_params = this.gridParams;
    delete this.query_information?.accepted_parent_params;
    this.gridApiService.getAllList(this.query_information).subscribe(
      (response) => {
        if (response.status && response.data?.records?.length > 0) {
          if (response.data?.records?.length === 1) {
            this.pageContent = this.compileStaticContent(this.static_page_content, {
              result_data: response.data.records[0],
              currentTab: this.currentTab,
              currentAccordion: this.currentAccordion,
            });
          } else {
            this.pageContent = this.compileStaticContent(this.static_page_content, {
              result_data: response.data.records,
              currentTab: this.currentTab,
              currentAccordion: this.currentAccordion,
            });
          }
        }
      },
      (error) => {
        const key = 'error';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
        this.router.navigate(['/dashboard']);
      }
    );
  }

  private mergeAcceptedParentFiltersIntoQueryInformation(queryInformation: any): any {
    const matchedFilters = this.getAcceptedParentFilterMatches();
    if (
      matchedFilters.search_all.length === 0 &&
      matchedFilters.search_any.length === 0 &&
      matchedFilters.having_conditions.length === 0 &&
      matchedFilters.having_any_conditions.length === 0
    ) {
      return queryInformation;
    }

    const mergedQueryInformation: any = {
      ...(queryInformation || {}),
    };

    if (matchedFilters.search_all.length > 0) {
      mergedQueryInformation.search_all = this.mergeUniqueFilters(queryInformation?.search_all, matchedFilters.search_all);
    }

    if (matchedFilters.search_any.length > 0) {
      mergedQueryInformation.search_any = this.mergeUniqueFilters(queryInformation?.search_any, matchedFilters.search_any);
    }

    if (matchedFilters.having_conditions.length > 0) {
      mergedQueryInformation.having_conditions = this.mergeUniqueFilters(queryInformation?.having_conditions, matchedFilters.having_conditions);
    }

    if (matchedFilters.having_any_conditions.length > 0) {
      mergedQueryInformation.having_any_conditions = this.mergeUniqueFilters(queryInformation?.having_any_conditions, matchedFilters.having_any_conditions);
    }

    return mergedQueryInformation;
  }

  private getAcceptedParentFilterMatches(): {
    search_all: any[];
    search_any: any[];
    having_conditions: any[];
    having_any_conditions: any[];
  } {
    const empty = {
      search_all: [],
      search_any: [],
      having_conditions: [],
      having_any_conditions: [],
    };

    const acceptedParams = this.normalizeAcceptedParentParams(this.accepted_parent_params);
    const hasAcceptedParams = Object.values(acceptedParams).some((params) => params.size > 0);
    if (!hasAcceptedParams || !this.parentGridFilters) {
      return empty;
    }
    const parentHavingAll = [
      ...(Array.isArray(this.parentGridFilters.having_conditions) ? this.parentGridFilters.having_conditions : []),
      ...(Array.isArray((this.parentGridFilters as any).having_all) ? (this.parentGridFilters as any).having_all : []),
    ];
    const parentHavingAny = [
      ...(Array.isArray(this.parentGridFilters.having_any_conditions) ? this.parentGridFilters.having_any_conditions : []),
      ...(Array.isArray((this.parentGridFilters as any).having_any) ? (this.parentGridFilters as any).having_any : []),
    ];

    return {
      search_all: this.filterAcceptedParentConditions(this.parentGridFilters.search_all, acceptedParams.search_all),
      search_any: this.filterAcceptedParentConditions(this.parentGridFilters.search_any, acceptedParams.search_any),
      having_conditions: this.filterAcceptedParentConditions(parentHavingAll, acceptedParams.having_conditions),
      having_any_conditions: this.filterAcceptedParentConditions(parentHavingAny, acceptedParams.having_any_conditions),
    };
  }

  private filterAcceptedParentConditions(parentConditions: any, acceptedTokens: Set<string>): any[] {
    const conditions = Array.isArray(parentConditions) ? parentConditions : [];
    return conditions.filter((condition: any) => {
      if (!condition || typeof condition !== 'object' || Array.isArray(condition)) {
        return false;
      }
      const columnName = this.normalizeFilterToken(condition?.column_name);
      return !!columnName && acceptedTokens.has(columnName);
    });
  }

  private getAcceptedParamToken(value: any): string {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return this.normalizeFilterToken(value.column_name || value.field || value.name || value.value || value.key || '');
    }
    return this.normalizeFilterToken(value);
  }

  private normalizeAcceptedParentParams(value: any): {
    search_all: Set<string>;
    search_any: Set<string>;
    having_conditions: Set<string>;
    having_any_conditions: Set<string>;
  } {
    const empty = {
      search_all: new Set<string>(),
      search_any: new Set<string>(),
      having_conditions: new Set<string>(),
      having_any_conditions: new Set<string>(),
    };

    if (Array.isArray(value)) {
      const tokens = new Set(value.map((param: any) => this.getAcceptedParamToken(param)).filter(Boolean));
      return {
        search_all: new Set(tokens),
        search_any: new Set(tokens),
        having_conditions: new Set(tokens),
        having_any_conditions: new Set(tokens),
      };
    }

    if (!value || typeof value !== 'object') {
      return empty;
    }

    return {
      search_all: this.createAcceptedParamTokenSet(value.search_all),
      search_any: this.createAcceptedParamTokenSet(value.search_any),
      having_conditions: this.createAcceptedParamTokenSet(value.having_conditions),
      having_any_conditions: this.createAcceptedParamTokenSet(value.having_any_conditions),
    };
  }

  private createAcceptedParamTokenSet(values: any): Set<string> {
    if (!Array.isArray(values)) {
      return new Set<string>();
    }

    return new Set(values.map((param: any) => this.getAcceptedParamToken(param)).filter(Boolean));
  }

  private mergeUniqueFilters(existingFilters: any, newFilters: any[]): any[] {
    const existing = Array.isArray(existingFilters) ? [...existingFilters] : [];
    const seen = new Set(existing.map((item: any) => this.getFilterSignature(item)));

    for (const filter of newFilters) {
      const signature = this.getFilterSignature(filter);
      if (seen.has(signature)) continue;
      existing.push(JSON.parse(JSON.stringify(filter)));
      seen.add(signature);
    }

    return existing;
  }

  private getFilterSignature(filter: any): string {
    return JSON.stringify({
      column_name: String(filter?.column_name || ''),
      operator: String(filter?.operator || ''),
      value: filter?.value,
      clause_type: String(filter?.clause_type || ''),
    });
  }

  private normalizeFilterToken(value: any): string {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '');
  }

  // Helper function to replace <render-html> tags with inner HTML content
  replaceRenderHtmlTags(html: string): string {
    // Create a temporary DOM element to parse HTML string safely
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // Find all <render-html> elements inside tempDiv
    const renderHtmlElems = tempDiv.querySelectorAll('render-html');

    renderHtmlElems.forEach((elem) => {
      // Replace <render-html> node with its innerHTML content
      const parent = elem.parentNode;
      if (parent) {
        // Insert a new span element with innerHTML of <render-html>
        const fragment = document.createRange().createContextualFragment(elem.innerHTML);
        parent.replaceChild(fragment, elem);
      }
    });

    return tempDiv.innerHTML;
  }

  isDateLike(value: any): boolean {
    if (!value || typeof value !== 'string') return false;
    return /\d{4}-\d{2}-\d{2}/.test(value);
  }

  formatDateValue(value: any): string {
    if (this.isDateLike(value)) {
      if (/\d{2}:\d{2}:\d{2}/.test(value)) {
        return this.timezoneService.transformDateTime(value) || value;
      } else {
        return this.timezoneService.transformDateOnly(value) || value;
      }
    }
    return value;
  }

  formatDatesInObject(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map((item) => this.formatDatesInObject(item));
    } else if (obj && typeof obj === 'object') {
      const newObj: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          newObj[key] = this.formatDatesInObject(obj[key]);
        }
      }
      return newObj;
    } else {
      return this.formatDateValue(obj);
    }
  }

  compileStaticContent(staticContent: string, data: any): string {
    staticContent = staticContent.replace(/<code class="xml">([\s\S]*?)<\/code>/g, (match, p1) => {
      return `<code class="xml">${this.escapeHtml(p1)}</code>`;
    });
    // Pretty-print JSON if data contains JSON fields
    const formattedData = this.prettifyJsonFields(data);
    // Recursively format all date-like values
    const dateFormattedData = this.formatDatesInObject(formattedData);
    // Compile the static content using Handlebars
    const compiledTemplate = Handlebars.compile(staticContent);
    let rendered = compiledTemplate(dateFormattedData);
    rendered = this.escapeRenderIntoHtml(rendered);
    rendered = this.replaceRenderHtmlTags(rendered);
    return rendered;
  }

  escapeRenderIntoHtml(html: string): string {
    return html
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&#123;/g, '{')
      .replace(/&#125;/g, '}');
  }

  // Utility function to prettify JSON fields in the data object
  prettifyJsonFields(data: any): any {
    const formattedData = { ...data.result_data };

    for (const key in formattedData) {
      if (formattedData.hasOwnProperty(key)) {
        const value = formattedData[key];

        // Only pretty-print if the value is a JSON object or array (not a primitive)
        if (typeof value === 'string' && this.isValidJson(value)) {
          const parsed = JSON.parse(value);
          if (typeof parsed === 'object' && parsed !== null) {
            formattedData[key] = JSON.stringify(parsed, null, 2);
          } else {
            // Leave as is for numbers, booleans, etc.
            formattedData[key] = value;
          }
        }
      }
    }

    data.result_data = formattedData;
    return data;
  }

  // Helper function to check if a string contains valid JSON
  isValidJson(value: string): boolean {
    try {
      JSON.parse(value);
      return true;
    } catch (e) {
      return false;
    }
  }

  escapeHtml(html: string): string {
    return html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/{/g, '&#123;')
      .replace(/}/g, '&#125;');
    //.replace(/\//g, '&#47;');
  }

  replaceUniqueId(jsonObject: any, uniqueIdPlaceholder: string, uniqueIdValue: string): any {
    // Create a regular expression that matches the exact placeholder string
    const placeholderRegex = new RegExp(uniqueIdPlaceholder.replace(/\$/g, '\\$'), 'g');

    // Base case: if the jsonObject is a string, replace the placeholder with the value
    if (typeof jsonObject === 'string') {
      const replacedString = jsonObject.replace(placeholderRegex, uniqueIdValue);

      return replacedString;
    }

    // Recursive case: if the jsonObject is an array, process each element
    if (Array.isArray(jsonObject)) {
      return jsonObject.map((item) => this.replaceUniqueId(item, uniqueIdPlaceholder, uniqueIdValue));
    }

    // Recursive case: if the jsonObject is an object, process each key-value pair
    if (typeof jsonObject === 'object' && jsonObject !== null) {
      const newObject: any = {};
      for (const key in jsonObject) {
        if (jsonObject.hasOwnProperty(key)) {
          newObject[key] = this.replaceUniqueId(jsonObject[key], uniqueIdPlaceholder, uniqueIdValue);
        }
      }
      return newObject;
    }

    // If it's neither a string, array, or object, return it as is
    return jsonObject;
  }
}
