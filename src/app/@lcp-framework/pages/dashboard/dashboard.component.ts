import {
  Component,
  ElementRef,
  Renderer2,
  ViewChild,
  AfterViewInit,
  ChangeDetectorRef,
  ViewChildren,
  QueryList,
  OnDestroy,
  CUSTOM_ELEMENTS_SCHEMA,
  ViewContainerRef,
  ComponentRef,
  NgZone,
} from '@angular/core';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { DateRange } from '../../../@lcp-framework/components/models/date-range.model';
import { DateRangePickerComponent } from '../../components/date-range-picker/date-range-picker.component';
import { CdkDragDrop, moveItemInArray, DragDropModule } from '@angular/cdk/drag-drop';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexDataLabels,
  ApexStroke,
  ApexYAxis,
  ApexTitleSubtitle,
  ApexLegend,
  ApexPlotOptions,
  ApexGrid,
  ApexFill,
  NgApexchartsModule,
} from 'ng-apexcharts';

import { SafeHtmlPipe } from '../../pipes/safehtml/safe-html.pipe';
import * as Handlebars from 'handlebars';
import { CommonSharedModule } from '../../shared/common/common.module';

import { Store } from '@ngrx/store';
import { MenuLoadService } from '../../service/common/menu-load.service';
import { LocalStorageService } from '../../service/common/local-storage.service';
import { ToastrService } from 'ngx-toastr';
import { GridApiService } from '../../service/common/grid.service';
import { commonConfig } from '../../config/common.config';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { registerHandlebarsHelpers } from '../../helpers/handlebar/handlebar-helpers';
import { initialState } from '../../../store/index.reducer';
import { environment } from '../../../../environments/environment';
import { IdleService } from '../../service/common/idle.service';
import * as pbi from 'powerbi-client';
import { AuthService } from '../../service/common/auth.service';
import { FormBuilderComponent } from '../form-builder/form-builder.component';
import { StaticPageComponent } from '../static-page/static-page.component';
import { MasterListComponent } from '../master-list/master-list.component';
import { RouteUpdateService } from '../../service/common/route-update.service';

// import { MasterListChildrenComponent } from '../master-list-children/master-list-children.component';

export type format = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis?: ApexYAxis;
  stroke: ApexStroke;
  dataLabels?: ApexDataLabels;
  //title: ApexTitleSubtitle;
  grid: ApexGrid;
  plotOptions?: ApexPlotOptions;
  tooltip?: any;
  colors?: any;
  fill?: ApexFill;
  legend?: ApexLegend;
  labels?: any;
};

enum ReportType {
  lcp,
  powerbi,
}
interface BaseCard {
  id: number;
  cols: number;
  rows: number;
  type: any;
  order_no?: number;
  reload_timeout?: any;
  query_information?: any;
  report_information?: any;
  dashboard_entity_name?: any;
  dashboard_entity_type?: string;
  report_type: ReportType;
  permissions: any;
}

interface CommonCard extends BaseCard {
  entity_name?: string;
  title: any;
  format?: any;
  particular_format?: any; // For static content, to hold compiled HTML
  data?: any;
  chart_format?: any;
}

type Card = CommonCard;

interface DashboardTab {
  id: string;
  name: string;
  cards: Card[];
  show_daterange_filter?: boolean | string | number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  animations: [
    trigger('toggleAnimation', [
      transition(':enter', [style({ opacity: 0, transform: 'scale(0.95)' }), animate('100ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))]),
      transition(':leave', [animate('75ms', style({ opacity: 0, transform: 'scale(0.95)' }))]),
    ]),
  ],
  imports: [
    CommonModule,
    CommonSharedModule,
    DragDropModule,
    NgApexchartsModule,
    SafeHtmlPipe,
    MasterListComponent,
    //MasterListChildrenComponent,
    DateRangePickerComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements AfterViewInit, OnDestroy {
  // Add these properties to your class
  @ViewChildren('gridContainer', { read: ViewContainerRef }) gridContainers!: QueryList<ViewContainerRef>;
  private gridComponentRefs: ComponentRef<MasterListComponent>[] = [];

  @ViewChildren('entityContainer', { read: ViewContainerRef }) entityContainers!: QueryList<ViewContainerRef>;
  private entityComponentRefs: ComponentRef<any>[] = [];

  dateRange: DateRange = {
    fromDate: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
    toDate: new Date(),
  };

  grid_params = {
    $gparam_1: '1950-01-01',
    $gparam_2: '2050-01-01',
  };

  commonConfig = commonConfig;
  config: any = null;
  displayDateRangeFilter = false;
  isDashboardLoading = true;
  dashboardLoadError = '';

  store: any = initialState;
  @ViewChild('staticContentContainer', { read: ElementRef }) staticContentContainer!: ElementRef;
  @ViewChildren('powerBiContainer') powerBiContainers!: QueryList<ElementRef>;
  isDark: any = 'light';
  isRtl: any = false;
  powerBiReportInstances: pbi.Report[] = [];
  powerbiService: pbi.service.Service = new pbi.service.Service(pbi.factories.hpmFactory, pbi.factories.wpmpFactory, pbi.factories.routerFactory);
  dashboardTabs: DashboardTab[] = [];
  private powerBiSubscription!: Subscription;

  activeTabId: string = '1';
  showDateRangePicker = false;
  userId: any;
  companyId: any;

  permissionsList: any;

  showMasterList = false;
  showMasterListPopup = false;
  selectedItemUuid: string | null = null;
  popupEntityName: string = '';
  popupConfig: {
    popupName: string;
    selectedItemUuid: string | null;
    popupEntityName: string;
    isViewPopupOpen: boolean;
    properties: Record<string, any>;
  } | null = null;

  // NEW: keep track of per-widget timers
  private reloadTimers = new Map<string, any>();

  // Helper to generate a unique key per card (per tab)
  private cardKey(tabId: string, cardId: number | string) {
    return `${tabId}:${cardId}`;
  }

  // Clear all timers
  private clearReloadTimers() {
    this.reloadTimers.forEach((timerId) => clearInterval(timerId));
    this.reloadTimers.clear();
  }

  constructor(
    public storeData: Store<any>,
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer,
    private renderer: Renderer2,
    private cdr: ChangeDetectorRef,
    private localstore: LocalStorageService,
    private menuLoadService: MenuLoadService,
    private gridApiService: GridApiService,
    private toastr: ToastrService,
    public translate: TranslateService,
    public idleService: IdleService,
    public authService: AuthService,
    private routeUpdateService: RouteUpdateService,
    private zone: NgZone
  ) {
    this.idleService.startIdleWatcher();
    registerHandlebarsHelpers(this.translate);
    // Set default date range
    this.dateRange = {
      fromDate: new Date('1950-01-01'),
      toDate: new Date('2050-01-01'),
    };
  }

  removePowerBiInstances() {
    this.powerBiReportInstances.map((instance, index) => {
      if (instance) {
        instance.off('loaded'); // Remove event listeners
        instance.off('error');
        instance.off('ready');
        instance.off('viewChange');
        instance.off('selectionChanged');
        instance.off('interactivityChanged');
        instance.off('pageChanged');
        instance.off('dataChanged');
        instance.off('viewModeChanged');
        instance.off('scroll');
        instance.off('resize');
        instance.off('viewUpdated');
        instance.off('viewModeChanging');
        instance.off('viewModeChanged');
        this.powerbiService.reset(instance.element);
        if (instance.element) {
          instance.element.remove(); // Removes the element from the DOM
        } else {
          console.warn(`Element at index ${index} not found`);
        }
      }
    });
    if (this.powerBiSubscription) {
      this.powerBiSubscription.unsubscribe(); // Unsubscribe when the component is destroyed
    }
    this.powerBiReportInstances = [];
  }

  ngOnDestroy(): void {
    this.clearReloadTimers();
    this.removePowerBiInstances();
    this.clearGridComponents();
    this.clearEntityComponents();
  }
  private clearGridComponents() {
    this.gridComponentRefs.forEach((ref) => ref.destroy());
    this.gridComponentRefs = [];
  }
  private clearEntityComponents() {
    this.entityComponentRefs.forEach((ref) => ref.destroy());
    this.entityComponentRefs = [];
  }

  formatDate(date: Date | null): string {
    if (!date) return '';

    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    // Format as YYYY-MM-DD
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  getDateRangeText(): string {
    if (!this.dateRange) return 'Select a Date Range';

    const from = this.dateRange.fromDate ? this.formatDate(this.dateRange.fromDate) : '';
    const to = this.dateRange.toDate ? this.formatDate(this.dateRange.toDate) : '';

    if (from && to) {
      return `Showing Results From ${from} To ${to}`;
    }
    return 'Select a Date Range';
  }

  onDateRangeChange(range: DateRange) {
    // Only update if dates have actually changed
    const fromDateChanged =
      !this.dateRange.fromDate ||
      !range.fromDate ||
      (this.dateRange.fromDate && range.fromDate && this.dateRange.fromDate.getTime() !== range.fromDate.getTime());
    const toDateChanged =
      !this.dateRange.toDate || !range.toDate || (this.dateRange.toDate && range.toDate && this.dateRange.toDate.getTime() !== range.toDate.getTime());

    if (fromDateChanged || toDateChanged) {
      // Create new date objects to avoid reference issues
      this.dateRange = {
        fromDate: range.fromDate ? new Date(range.fromDate) : null,
        toDate: range.toDate ? new Date(range.toDate) : null,
      };

      // Update grid_params with the new date range
      this.grid_params = {
        ...this.grid_params,
        $gparam_1: this.formatDate(this.dateRange.fromDate),
        $gparam_2: this.formatDate(this.dateRange.toDate),
      };

      this.refreshDashboardData();
    }
  }

  ngAfterViewInit(): void {
    this.initStore();
    const rawUserData = this.localstore.getData('user_data');
    const parsedUserData = this.parseUserData(rawUserData);

    this.permissionsList = parsedUserData?.permissions || parsedUserData?.main?.permissions || null;

    if (parsedUserData) {
      this.userId = parsedUserData.main?.id;
      this.companyId = parsedUserData.main?.company_id;
    }

    // Defer async operations to next tick to avoid NG0100 ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => {
      this.loadConfig();
      this.loadDashboardWizards();
      this.setupMasterListButtonListeners();
    }, 0);
    //this.menuLoadService.fetchMenuData(this.companyId);
  }

  loadConfig() {
    this.config = this.parseJson(this.localstore.getData('config'));
    this.displayDateRangeFilter = this.config?.display_dashboard_daterange_filter === 'true';
    this.cdr.detectChanges();
  }

  private parseJson(value: any): any {
    if (!value) {
      return null;
    }
    if (typeof value === 'object') {
      return value;
    }
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  private parseUserData(rawUserData: any): any {
    const parsedRaw = this.parseJson(rawUserData);
    if (parsedRaw) {
      return parsedRaw;
    }

    try {
      const decrypted = this.localstore.getDataDecrypted('user_data');
      return this.parseJson(decrypted);
    } catch {
      return null;
    }
  }
  async loadDashboardWizards() {
    this.isDashboardLoading = true;
    this.dashboardLoadError = '';

    const db = (environment as any).DB || 'pg';
    let params: any;
    switch (db) {
      case 'sql':
        params = {
          company_id: 1,
          primary_table: 'wizard_group',
          sort_columns: [['wizard_group.order_number', 'asc']],
          limit_range: 1000,
          print_query: true,
          select_columns: [
            ['wizard_group.id', 'id'],
            ['wizard_group.name', 'name'],
            ['wizard_group.order_number', 'order_number'],
            [
              'CASE WHEN COUNT(master_entities.id) = 0 THEN NULL ELSE (SELECT sub.id AS id, sub.title, sub.format, sub.chart_format, sub.type, sub.rows, sub.cols, sub.order_no, sub.query_information, sub.report_information, sub.report_type, sub.entity_name, sub.dashboard_entity_name, sub.dashboard_entity_type FROM (SELECT master_entities.id AS id, master_entities.name AS title, master_entities.static_page_content AS format, master_entities.dashboard_wizard_options AS chart_format, master_entities.dashboard_wizard_type AS type, master_entities.dashboard_wizard_rows AS rows, master_entities.dashboard_wizard_columns AS cols, master_entities.dashboard_entity_name AS dashboard_entity_name, ref_ent.entity_type AS dashboard_entity_type, master_entities.dashboard_wizard_order_no AS order_no, master_entities.reload_timeout, master_entities.query_information AS query_information, master_entities.report_information AS report_information, master_entities.report_type AS report_type, master_entities.entity_name AS entity_name FROM master_entities LEFT JOIN master_entities AS ref_ent ON ref_ent.entity_name = master_entities.dashboard_entity_name WHERE master_entities.dashboard_wizard_group_id = wizard_group.id AND master_entities.status_id = 1) sub ORDER BY sub.order_no FOR JSON PATH) END',
              'cards',
            ],
            ['wizard_group.show_daterange_filter', 'show_daterange_filter'],
          ],
          includes: [
            {
              table_name: '(SELECT * FROM master_entities) as master_entities',
              join_type: 'LEFT',
              join_condition: 'master_entities.dashboard_wizard_group_id = wizard_group.id AND master_entities.status_id = 1',
            },
          ],
          group_by: ['wizard_group.id', 'wizard_group.name', 'wizard_group.order_number', 'wizard_group.show_daterange_filter'],
        };
        break;
      case 'pg':
      default:
        params = {
          company_id: 1,
          primary_table: 'wizard_group',
          sort_columns: [['wizard_group.order_number', 'asc']],
          limit_range: 1000,
          print_query: true,
          search_all: [
            {
              value: 1,
              operator: '=',
              column_name: 'wizard_group.status_id',
            },
          ],
          select_columns: [
            ['wizard_group.id', 'id'],
            ['wizard_group.name', 'name'],
            ['wizard_group.order_number', 'order_number'],
            ['wizard_group.show_daterange_filter', 'show_daterange_filter'],
            [
              `CASE
            WHEN COUNT(subquery.id) = 0 THEN null
            ELSE COALESCE(
                Json_agg(
                    subquery.jsonb_object
                    ORDER BY subquery.order_no
                )
            )
        END`,
              'cards',
            ],
          ],
          includes: [
            {
              table_name: `LATERAL (
                  SELECT
                    DISTINCT ON (master_entities.id)
                    master_entities.id,
                    jsonb_build_object(
                      'id', master_entities.id,
                      'title', master_entities.name,
                      'format', master_entities.static_page_content,
                      'chart_format', master_entities.dashboard_wizard_options,
                      'type', master_entities.dashboard_wizard_type,
                      'rows', master_entities.dashboard_wizard_rows,
                      'cols', master_entities.dashboard_wizard_columns,
                      'dashboard_entity_name', master_entities.dashboard_entity_name,
                      'order_no', master_entities.dashboard_wizard_order_no,
                      'reload_timeout', master_entities.reload_timeout,
                      'query_information', master_entities.query_information,
                      'report_information', master_entities.report_information,
                      'dashboard_entity_type', ref_ent.entity_type,
                      'report_type', master_entities.report_type,
                      'entity_name', master_entities.entity_name
                    ) AS jsonb_object,
                    master_entities.dashboard_wizard_order_no AS order_no
                  FROM
                    master_entities
                  LEFT JOIN master_entities AS ref_ent ON ref_ent.entity_name = master_entities.dashboard_entity_name
                  WHERE
                    master_entities.dashboard_wizard_group_id = wizard_group.id AND master_entities.status_id = 1
                  ORDER BY
                    master_entities.id, master_entities.dashboard_wizard_order_no
                ) AS subquery`,
              join_type: 'LEFT',

              join_condition: 'TRUE',
            },
          ],
          group_by: ['wizard_group.id', 'wizard_group.order_number'],
        };
        break;
    }
    this.gridApiService.getAllList(params).subscribe(
      async (response) => {
        if (response.status && response.code === 200) {
          this.dashboardTabs = await Promise.all(
            response.data.records.map(async (mainElem: any) => {
              // Parse if cards is a string
              if (typeof mainElem.cards === 'string') {
                try {
                  const parsedCards = JSON.parse(mainElem.cards);
                  mainElem.cards = Array.isArray(parsedCards) ? parsedCards : [];
                } catch (error) {
                  console.error('Error parsing JSON for cards:', error);
                  mainElem.cards = [];
                }
              } else if (!Array.isArray(mainElem.cards)) {
                mainElem.cards = [];
              }

              // Proceed with Promise.all only if cards is an array
              if (Array.isArray(mainElem.cards)) {
                mainElem.cards = await Promise.all(
                  mainElem.cards.map(async (item: any) => {
                    return {
                      ...item,
                      format: item.format ? (Array.isArray(item.format) ? item.format : [item.format]) : [],
                      data: [],
                      permissions: {
                        view: this.permissionsList?.[`view_` + item.entity_name] || false,
                      },
                    };
                  })
                );
              }

              return mainElem;
            })
          );
          // Set the first tab with at least one viewable card as active
          const tabsWithActiveCards = this.getTabsWithActiveCards();
          if (tabsWithActiveCards.length > 0) {
            await this.setActiveTab(tabsWithActiveCards[0].id);
          } else {
            this.activeTabId = '';
          }

          this.isDashboardLoading = false;
          this.cdr.markForCheck();
        }
      },
      (error) => {
        const key = 'failed_to_load';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
        this.dashboardLoadError = errorMessage;
        this.isDashboardLoading = false;
        this.cdr.markForCheck();
      }
    );
  }

  async getQueryInfo(params: any): Promise<any> {
    try {
      params.grid_params = { ...params.grid_params, ...this.grid_params };
      const response = await this.gridApiService.getAllList(params).toPromise();
      if (response.status && response.code === 200) {
        return response.data.records || [];
      } else {
        const key = 'failed_to_load';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
        return [];
      }
    } catch (error) {
      const key = 'failed_to_load';
      const errorMessage = this.translate.instant(key);
      this.toastr.error(errorMessage, 'Error');
      return [];
    }
  }

  async setActiveTab(tabId: any) {
    this.activeTabId = tabId;
    // NEW: stop existing reloads before re-init
    this.clearReloadTimers();

    const activeTab = this.dashboardTabs.find((tab) => tab.id === tabId);

    // Update displayDateRangeFilter based on both global config and the active tab's setting
    const globalShow = this.config?.display_dashboard_daterange_filter === 'true';
    const tabShow = activeTab
      ? activeTab.show_daterange_filter !== false &&
        activeTab.show_daterange_filter !== 'false' &&
        activeTab.show_daterange_filter !== 0 &&
        activeTab.show_daterange_filter !== '0'
      : true;
    this.displayDateRangeFilter = globalShow && tabShow;

    //if (activeTab && activeTab.cards.some((card) => card.data.length === 0)) {
    if (activeTab) {
      this.removePowerBiInstances();
      await this.initializeDashboardCards(activeTab.cards);
      this.cdr.detectChanges();
    }
  }

  // NEW: schedule auto-reload for LCP card
  private scheduleLcpReload(card: Card) {
    if (card.type === commonConfig.WIZARD_TYPES.ENTITY) {
      return; // Skip scheduling reloads for ENTITY wizard type cards since they use real-time sockets and manage their own state.
    }
    const minutes = Number(card.reload_timeout) || 0;
    if (minutes > 0 && card?.id != null) {
      const key = this.cardKey(this.activeTabId, card.id);
      // clear existing (if any)
      if (this.reloadTimers.has(key)) {
        clearInterval(this.reloadTimers.get(key));
        this.reloadTimers.delete(key);
      }
      const intervalId = setInterval(() => this.refreshLcpCard(card), minutes * 60 * 1000);
      this.reloadTimers.set(key, intervalId);
    }
  }

  // NEW: refresh just one LCP card (data + static/chart rebuild)
  private async refreshLcpCard(card: Card) {
    try {
      // re-run query if present
      if (card.query_information) {
        const queryInfo = JSON.parse(JSON.stringify(card.query_information));
        // Initialize grid_params if it doesn't exist
        if (!queryInfo.grid_params) {
          queryInfo.grid_params = {};
        }

        // Merge existing grid_params with the component's grid_params
        queryInfo.grid_params = { ...queryInfo.grid_params, ...this.grid_params };
        const queryString = JSON.stringify(queryInfo).replace(/\$session_user_id/g, this.userId);
        card.query_information = JSON.parse(queryString);
        card.data = await this.getQueryInfo(card.query_information);
      }

      // static widgets: recompile
      if (card.type === commonConfig.WIZARD_TYPES.STATIC && card.format) {
        card.particular_format = this.compileStaticContent(card.format, card.data);
      }

      // charts: rebuild series/labels
      if (card.type === commonConfig.WIZARD_TYPES.CHART) {
        card.chart_format = card.chart_format ? [{ ...this.createformat(), ...card.chart_format[0] }] : [this.createformat()];

        if (card.chart_format[0]) {
          if (!card.chart_format[0].chart) {
            card.chart_format[0].chart = {};
          }
          if (!card.chart_format[0].chart.zoom) {
            card.chart_format[0].chart.zoom = {};
          }
          card.chart_format[0].chart.zoom.enabled = false;
          card.chart_format[0].chart.zoom.allowMouseWheelZoom = false;

          if (card.chart_format[0].tooltip?.y?.formatter) {
            if (typeof card.chart_format[0].tooltip.y.formatter === 'string') {
              card.chart_format[0].tooltip.y.formatter = new Function(
                'number',
                card.chart_format[0].tooltip.y.formatter.substring(
                  card.chart_format[0].tooltip.y.formatter.indexOf('{') + 1,
                  card.chart_format[0].tooltip.y.formatter.lastIndexOf('}')
                )
              );
            }
          }
        }

        if (card.data?.length > 0) {
          const dataMap: Record<string, any[]> = {};
          const labels: any[] = [];
          card.data.forEach((rec: any) => {
            labels.push(rec.labels);
            Object.keys(rec).forEach((k) => {
              if (k !== 'labels') {
                (dataMap[k] ||= []).push(rec[k]);
              }
            });
          });

          card.chart_format[0].series = Object.keys(dataMap).map((k) => ({
            name: k.charAt(0).toUpperCase() + k.slice(1),
            data: dataMap[k],
          }));
          card.chart_format[0].labels = labels;
          card.chart_format[0].xaxis.categories = labels;
        } else {
          // no data: reset series/labels
          card.chart_format[0].series = [];
          card.chart_format[0].labels = [];
          card.chart_format[0].xaxis.categories = [];
        }
      }

      // Handle GRID refresh
      if (card.type === commonConfig.WIZARD_TYPES.ENTITY && card.dashboard_entity_type === 'grid_builder_module') {
        const activeTab = this.dashboardTabs.find((tab) => tab.id === this.activeTabId);
        if (activeTab) {
          const cardIndex = activeTab.cards
            .filter((c) => c.type === commonConfig.WIZARD_TYPES.ENTITY && c.dashboard_entity_type === 'grid_builder_module')
            .findIndex((c) => c.id === card.id);
          if (cardIndex !== -1) {
            this.createGridComponent(card, cardIndex);
          }
        }
      }

      // Handle ENTITY refresh
      if (card.type === commonConfig.WIZARD_TYPES.ENTITY && card.dashboard_entity_type !== 'grid_builder_module') {
        const activeTab = this.dashboardTabs.find((tab) => tab.id === this.activeTabId);
        if (activeTab) {
          const entityCardIndex = activeTab.cards
            .filter((c) => c.type === commonConfig.WIZARD_TYPES.ENTITY && c.dashboard_entity_type !== 'grid_builder_module')
            .findIndex((c) => c.id === card.id);
          if (entityCardIndex !== -1) {
            this.createEntityComponent(card, entityCardIndex);
          }
        }
      }

      this.cdr.detectChanges();
    } catch (e) {
      // swallow per-card errors to avoid breaking other timers
      console.error('Card refresh failed', e);
    }
  }

  loadPowerBIReport(index: number, reportInformation: any) {
    try {
      // Your logic for loading the Power BI report into the specific container
      this.authService
        .generatePowerBiEmbedToken({
          reportId: reportInformation.reportId,
          groupId: reportInformation.groupId,
        })
        .subscribe(
          (response: any) => {
            if (response.status && response.code === 200) {
              const embedConfig = {
                type: 'report',
                embedUrl: `https://app.powerbi.com/reportEmbed?reportId=${reportInformation.reportId}&groupId=${reportInformation.groupId}&wsauth=true`,
                accessToken: response.data,
                tokenType: pbi.models.TokenType.Embed,
                settings: {
                  filterPaneEnabled: false,
                  navContentPaneEnabled: false,
                  layoutType: pbi.models.LayoutType.Custom,
                  background: pbi.models.BackgroundType.Transparent,
                  barsHidden: true,
                  ...(reportInformation?.settings && reportInformation.settings),
                },
              };
              if (this.powerBiContainers.get(index)) {
                this.powerBiReportInstances.push(this.powerbiService.embed(this.powerBiContainers.get(index)?.nativeElement, embedConfig) as pbi.Report);
                this.powerBiReportInstances[index]?.on('loaded', function () {});

                this.powerBiReportInstances[index]?.on('error', function (event) {
                  console.error('Power BI error:', event);
                });
              }
            } else {
              const key = 'failed_to_load';
              const errorMessage = this.translate.instant(key);
              this.toastr.error(errorMessage, 'Error');
            }
          },
          (error) => {
            const key = 'failed_to_load';
            const errorMessage = this.translate.instant(key);
            this.toastr.error(errorMessage, 'Error');
          }
        );
    } catch (error: any) {
      console.error(`Error loading Power BI report - ${index}:`, error);
      return;
    }
  }

  private async initializeDashboardCards(cards: Card[]): Promise<void> {
    if (cards) {
      let pbiIndex = 0;
      let gridIndex = 0;
      // Use a ref object so the async lambda captures the same counter
      const entityIndexRef = { count: 0 };
      await Promise.all(
        cards.map(async (card, i) => {
          if (card.report_type === commonConfig.REPORT_TYPES.LCP) {
            if (card.query_information) {
              let queryString = JSON.stringify(card.query_information);
              queryString = queryString.replace(/\$session_user_id/g, this.userId);
              card.query_information = JSON.parse(queryString);
              card.data = await this.getQueryInfo(card.query_information);
            }

            if (card.type === commonConfig.WIZARD_TYPES.STATIC && card.format) {
              card.particular_format = this.compileStaticContent(card.format, card.data);
            }

            if (card.type === commonConfig.WIZARD_TYPES.CHART) {
              card.chart_format = card.chart_format ? [{ ...this.createformat(), ...card.chart_format[0] }] : [this.createformat()];

              if (card.chart_format[0]) {
                if (!card.chart_format[0].chart) {
                  card.chart_format[0].chart = {};
                }
                if (!card.chart_format[0].chart.zoom) {
                  card.chart_format[0].chart.zoom = {};
                }
                card.chart_format[0].chart.zoom.enabled = false;
                card.chart_format[0].chart.zoom.allowMouseWheelZoom = false;

                if (card.chart_format[0].tooltip.y.formatter) {
                  if (typeof card.chart_format[0].tooltip.y.formatter === 'string') {
                    card.chart_format[0].tooltip.y.formatter = new Function(
                      'number',
                      card.chart_format[0].tooltip.y.formatter.substring(
                        card.chart_format[0].tooltip.y.formatter.indexOf('{') + 1,
                        card.chart_format[0].tooltip.y.formatter.lastIndexOf('}')
                      )
                    );
                  }
                }
              }
              if (card.data.length > 0) {
                const dataMap: any = {};
                const labels: any[] = [];

                card.data.forEach((record: any) => {
                  labels.push(record.labels);

                  Object.keys(record).forEach((key) => {
                    if (key !== 'labels') {
                      dataMap[key] = dataMap[key] || [];
                      dataMap[key].push(record[key]);
                    }
                  });
                });

                card.chart_format[0].series = Object.keys(dataMap).map((key) => ({
                  name: key.charAt(0).toUpperCase() + key.slice(1),
                  data: dataMap[key],
                }));

                card.chart_format[0].labels = labels;

                card.chart_format[0].xaxis.categories = labels;
              }
            }

            // Handle GRID type (represented as WIZARD_TYPES.ENTITY with dashboard_entity_type === 'grid_builder_module')
            if (card.type === commonConfig.WIZARD_TYPES.ENTITY && card.dashboard_entity_type === 'grid_builder_module') {
              if (!card.dashboard_entity_name) {
                console.error('Grid card missing dashboard_entity_name:', card);
                return;
              }
              const currentGridIndex = gridIndex++;
              setTimeout(() => {
                this.createGridComponent(card, currentGridIndex);
              }, 100);
            }

            // Handle ENTITY type (custom component - dashboard_entity_type !== 'grid_builder_module')
            if (card.type === commonConfig.WIZARD_TYPES.ENTITY && card.dashboard_entity_type !== 'grid_builder_module') {
              if (!card.dashboard_entity_name) {
                console.error('Entity card missing dashboard_entity_name (entity_type):', card);
                return;
              }
              const entityIndex = entityIndexRef.count++;
              setTimeout(() => {
                this.createEntityComponent(card, entityIndex);
              }, 150);
            }

            // Schedule auto-reload for LCP card
            this.scheduleLcpReload(card);
          } else {
            this.powerBiSubscription = this.powerBiContainers.changes.subscribe((response: any) => {
              if (response.length && response.toArray()[pbiIndex]) {
                this.loadPowerBIReport(pbiIndex, card.report_information);
                pbiIndex++;
              }
            });
          }
        })
      );
    }
    this.cdr.detectChanges();
  }

  // Create a MasterListComponent dynamically for GRID type cards (using WIZARD_TYPES.ENTITY with dashboard_entity_type === 'grid_builder_module')
  private createGridComponent(card: Card, index: number) {
    if (!this.gridContainers || this.gridContainers.length === 0) {
      setTimeout(() => this.createGridComponent(card, index), 100);
      return;
    }

    const container = this.gridContainers.toArray()[index];
    if (!container) {
      console.warn(`Grid container at index ${index} not found`);
      return;
    }

    this.zone.run(() => {
      container.clear();
      const componentRef = container.createComponent(MasterListComponent);

      if (card.dashboard_entity_name) {
        componentRef.instance.entity_name = card.dashboard_entity_name;
      }

      if (card.data && card.data.length > 0 && card.data[0].uuid) {
        componentRef.instance.uuid = card.data[0].uuid;
      }

      componentRef.instance.nonGridPage = false;
      componentRef.instance.enableCheckBox = false;

      const gridParams: any = {};
      if (card.data && card.data.length > 0) {
        Object.keys(card.data[0]).forEach((key) => {
          if (key.startsWith('gparam_')) {
            let temp_key = '$' + key;
            gridParams[temp_key] = card.data[0][key];
          }
        });
      }

      componentRef.instance.grid_params = { ...gridParams, ...this.grid_params };

      componentRef.instance.selectionChange.subscribe((selectedItems: any) => {
        // Handle selection changes if needed
      });

      this.gridComponentRefs.push(componentRef);
      componentRef.instance.ngAfterContentInit();
      this.cdr.detectChanges();
    });
  }

  /**
   * Dynamically creates a custom component for ENTITY type dashboard cards (custom pages like Asset Overview Dashboard).
   * card.dashboard_entity_name holds the entity_name slug (e.g. asset_overview_dashboard).
   * We use getComponentLoader(entity_name) to resolve the correct component factory
   * directly from the unorgmenuList → component_class_name → componentMap,
   * without going through the full route/permission pipeline.
   */
  private async createEntityComponent(card: Card, index: number) {
    if (!this.entityContainers || this.entityContainers.length === 0) {
      setTimeout(() => this.createEntityComponent(card, index), 100);
      return;
    }

    const container = this.entityContainers.toArray()[index];
    if (!container) {
      console.warn(`Entity container at index ${index} not found for entity: ${card.dashboard_entity_name}`);
      return;
    }

    const entityName = card.dashboard_entity_name as string;
    if (!entityName) {
      console.warn('Entity card has no dashboard_entity_name value');
      return;
    }

    try {
      // Resolve directly using dashboard_entity_type first, fallback to getComponentLoader by entityName
      let loader = null;
      if (card.dashboard_entity_type) {
        loader = this.routeUpdateService.getComponentLoaderByClass(card.dashboard_entity_type);
      }
      if (!loader) {
        loader = this.routeUpdateService.getComponentLoader(entityName);
      }

      if (!loader) {
        console.warn(`No route/component found for entity_type "${card.dashboard_entity_type}" or entity_name "${entityName}"`);
        container.clear();
        return;
      }

      const componentClass = await loader();
      this.zone.run(() => {
        container.clear();
        const componentRef = container.createComponent(componentClass);

        // Pass grid_params if the component supports it
        if ((componentRef.instance as any).grid_params !== undefined) {
          (componentRef.instance as any).grid_params = { ...this.grid_params };
        }
        // Pass uuid from card data if supported
        if (card.data && card.data.length > 0 && (componentRef.instance as any).uuid !== undefined) {
          (componentRef.instance as any).uuid = card.data[0]?.uuid || null;
        }

        this.entityComponentRefs.push(componentRef);
        this.cdr.detectChanges();
      });
    } catch (err) {
      console.error(`Failed to load component for entity "${entityName}":`, err);
    }
  }

  validateChartData(chart: any) {
    if (chart.data.length > 0) {
      return true;
    }
    return false;
  }
  getActiveCards(): Card[] {
    const activeTab = this.dashboardTabs.find((tab) => tab.id == this.activeTabId);
    return activeTab ? activeTab.cards : [];
  }

  hasNonEntityCards(): boolean {
    return this.getActiveCards().some(
      (card) => card?.permissions?.view && (card.type !== this.commonConfig.WIZARD_TYPES.ENTITY || card.dashboard_entity_type === 'grid_builder_module')
    );
  }

  getTabsWithActiveCards(): DashboardTab[] {
    return this.dashboardTabs.filter((tab) => tab.cards?.some((card) => card?.permissions?.view));
  }

  async initStore() {
    this.storeData
      .select((d) => d.index)
      .subscribe((d) => {
        this.store = d;
        this.isDark = this.store.theme === 'dark' || this.store.isDarkMode ? true : false;
        this.isRtl = this.store.rtlClass === 'rtl' ? true : false;
        this.cdr.detectChanges();
      });
  }

  compileStaticContent(format: string[], data: any): string[] {
    const compiled = format.map((html) => {
      const template = Handlebars.compile(html);
      let passData = data[0];
      if (data.length > 0) {
        passData.data_list = data;
      }
      return template(passData);
    });
    setTimeout(() => this.setupMasterListButtonListeners(), 0);
    return compiled;
  }

  getStaticContent(card: Card): string[] {
    //if (card.type === commonConfig.WIZARD_TYPES.STATIC && card.format) {
    return card.type == commonConfig.WIZARD_TYPES.STATIC ? card.particular_format : [];
  }

  onDrop(event: CdkDragDrop<Card[]>) {
    const activeCards = this.getActiveCards();
    moveItemInArray(activeCards, event.previousIndex, event.currentIndex);

    const activeTab = this.dashboardTabs.find((tab) => tab.id === this.activeTabId);
    if (activeTab) {
      activeTab.cards = activeCards;
    }
  }

  resizeCard(card: Card, cols: number, rows: number) {
    card.cols = cols;
    card.rows = rows;

    const dashboard = this.dashboardTabs.find((tab) => tab.cards.includes(card));
    if (dashboard) {
      const index = dashboard.cards.indexOf(card);
      if (index !== -1) {
        dashboard.cards[index] = card;
      }
    }
  }

  getCardStyle(card: any) {
    return {
      'grid-column': `span ${card.cols}`,
      'grid-row': `span ${card.rows}`,
      // height: '300px',
      '@media (max-width: 640px)': {
        'grid-column': 'span 1', // Make each card take up one column on small screens
        'grid-row': 'span 1', // Adjust the row span if needed
      },
    };
  }
  getScrollContainerStyle(rows: number, cols: number) {
    const height = rows * 170;
    const width = cols * 100;

    const baseHeight = 170; // Base height for one row
    const baseWidth = 100; // Base width for one column

    return {
      height: `${height}px`,
      //'max-width': `${width}px`,
      //width: '100%', // Set width to 100% to make it responsive
      '@media (max-width: 640px)': {
        height: `${baseHeight * 2}px`, // Adjust height for small screens if needed
        //width: '100%', // Ensure it takes full width on smaller screens
      },
    };
  }

  private createformat(): format {
    const chartType = 'line';
    const baseOptions: format = {
      series: [
        {
          name: 'Chart',
          data: [],
        },
      ],
      chart: {
        height: 350,
        type: chartType,
        zoom: {
          enabled: false,
          allowMouseWheelZoom: false,
        },
        toolbar: {
          show: false,
        },
      },

      colors: ['#805dca'],
      dataLabels: {
        enabled: false,
      },
      tooltip: {
        theme: this.isDark ? 'dark' : 'light',
      },
      stroke: {
        width: 2,
        curve: 'smooth',
      },

      xaxis: {
        axisBorder: {
          color: this.isDark ? '#191e3a' : '#e0e6ed',
        },
      },
      yaxis: {
        opposite: this.isRtl ? true : false,
        labels: {
          offsetX: this.isRtl ? -40 : 0,
        },
      },

      grid: {
        borderColor: this.isDark ? '#191e3a' : '#e0e6ed',
      },
      legend: {
        horizontalAlign: 'left',
      },
    };

    return baseOptions;
  }

  setupMasterListButtonListeners() {
    setTimeout(() => {
      const container = this.staticContentContainer?.nativeElement || document;
      container.querySelectorAll('.open-master-list-btn').forEach((btn: Element) => {
        btn.removeEventListener('click', this.handleMasterListButtonClick); // Remove previous
        btn.addEventListener('click', this.handleMasterListButtonClick.bind(this));
      });
    }, 0);
  }

  handleMasterListButtonClick(event: Event) {
    const target = event.currentTarget as HTMLElement;
    const uuid = target.getAttribute('data-uuid') || '';
    const entityName = target.getAttribute('data-entity') || '';
    const popupName = target.getAttribute('data-popup') || '';
    const propertiesRaw = target.getAttribute('data-properties') || '';
    let properties: Record<string, any> = {};
    if (propertiesRaw) {
      try {
        properties = JSON.parse(propertiesRaw);
      } catch {
        properties = {};
      }
    }
    this.openMasterList(uuid, entityName, popupName, properties);
  }

  openMasterList(uuid: string, entityName: string, popupName: string, properties: Record<string, any> = {}) {
    this.popupConfig = {
      popupName,
      selectedItemUuid: uuid ? uuid : null,
      popupEntityName: entityName,
      isViewPopupOpen: true,
      properties,
    };
    this.showMasterListPopup = true;
  }

  closeMasterListPopup() {
    this.showMasterListPopup = false;
    this.popupConfig = null;
  }

  private refreshDashboardData(): void {
    const activeTab = this.dashboardTabs.find((tab) => tab.id === this.activeTabId);
    if (activeTab) {
      this.initializeDashboardCards(activeTab.cards).catch((error) => {
        console.error('Error refreshing dashboard data:', error);
        this.toastr.error('Failed to refresh dashboard data');
      });
    }
  }
}
