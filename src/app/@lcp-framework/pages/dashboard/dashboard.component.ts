import { Component, OnInit, ElementRef, Renderer2, ViewChild, AfterViewInit, ChangeDetectorRef, ViewChildren, QueryList, OnDestroy } from '@angular/core';

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
import { environment } from '../../../../environments/environment';
import { IdleService } from '../../service/common/idle.service';
import * as pbi from 'powerbi-client';
import { AuthService } from '../../service/common/auth.service';
import { FormBuilderComponent } from '../form-builder/form-builder.component';
import { StaticPageComponent } from '../static-page/static-page.component';
import { MasterListComponent } from '../master-list/master-list.component';
import { MasterListChildrenComponent } from '../master-list-children/master-list-children.component';

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
  report_type: ReportType;
  permissions: any;
}

interface CommonCard extends BaseCard {
  title: any;
  format?: any;
  data?: any;
  chart_format?: any;
}

type Card = CommonCard;

interface DashboardTab {
  id: string;
  name: string;
  cards: Card[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonSharedModule, DragDropModule, NgApexchartsModule, SafeHtmlPipe, FormBuilderComponent, StaticPageComponent, MasterListComponent, MasterListChildrenComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements AfterViewInit, OnDestroy {
  commonConfig = commonConfig;
  store: any;
  @ViewChild('staticContentContainer', { read: ElementRef }) staticContentContainer!: ElementRef;
  @ViewChildren('powerBiContainer') powerBiContainers!: QueryList<ElementRef>;
  isDark: any = 'light';
  isRtl: any = false;
  powerBiReportInstances: pbi.Report[] = [];
  powerbiService: pbi.service.Service = new pbi.service.Service(pbi.factories.hpmFactory, pbi.factories.wpmpFactory, pbi.factories.routerFactory);
  dashboardTabs: DashboardTab[] = [];
  private powerBiSubscription!: Subscription;

  activeTabId: string = '1';

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
    public authService: AuthService
  ) {
    this.initStore();
    this.idleService.startIdleWatcher();
    registerHandlebarsHelpers(this.translate);
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
          console.log(`Element at index ${index} not found`);
        }
      }
    });
    if (this.powerBiSubscription) {
      this.powerBiSubscription.unsubscribe(); // Unsubscribe when the component is destroyed
      // console.log('Unsubscribed from powerBiContainers changes');
    }
    this.powerBiReportInstances = [];
  }

  ngOnDestroy(): void {
    this.clearReloadTimers();  
    this.removePowerBiInstances();
  }

  ngAfterViewInit(): void {
    const userData = this.localstore.getData('user_data');

    const permissionsList = userData ? JSON.parse(userData).permissions : null;

    this.permissionsList = permissionsList;

    if (userData) {
      const parsedData = JSON.parse(userData);
      this.userId = parsedData.main?.id;
      this.companyId = parsedData.main?.company_id;
    }
    this.loadDashboardWizards();
    this.setupMasterListButtonListeners();
    //this.menuLoadService.fetchMenuData(this.companyId);
  }

  async loadDashboardWizards() {
    const db = (environment as any).DB || 'pg';
    let params: any;
    switch (db) {
      case 'sql':
        params = {
          company_id: 1,
          primary_table: 'wizard_group',
          sort_columns: [['wizard_group.id', 'asc']],
          limit_range: 1000,
          print_query: true,
          select_columns: [
            ['wizard_group.id', 'id'],
            ['wizard_group.name', 'name'],
            [
              'CASE WHEN COUNT(master_entities.id) = 0 THEN NULL ELSE (SELECT sub.id AS id, sub.title, sub.format, sub.chart_format, sub.type, sub.rows, sub.cols, sub.order_no, sub.query_information, sub.report_information, sub.report_type, sub.entity_name FROM (SELECT master_entities.id AS id, master_entities.name AS title, master_entities.static_page_content AS format, master_entities.dashboard_wizard_options AS chart_format, master_entities.dashboard_wizard_type AS type, master_entities.dashboard_wizard_rows AS rows, master_entities.dashboard_wizard_columns AS cols, master_entities.dashboard_wizard_order_no AS order_no, master_entities.reload_timeout ,  master_entities.query_information AS query_information, master_entities.report_information AS report_information, master_entities.report_type AS report_type, master_entities.entity_name AS entity_name FROM master_entities WHERE master_entities.dashboard_wizard_group_id = wizard_group.id AND master_entities.status_id = 1) sub ORDER BY sub.order_no FOR JSON PATH) END',
              'cards',
            ],
          ],
          includes: [
            {
              table_name: '(SELECT * FROM master_entities) as master_entities',
              join_type: 'LEFT',
              join_condition: 'master_entities.dashboard_wizard_group_id = wizard_group.id AND master_entities.status_id = 1',
            },
          ],
          group_by: ['wizard_group.id', 'wizard_group.name'],
        };
        break;
      case 'pg':
      default:
        params = {
          company_id: 1,
          primary_table: 'wizard_group',
          sort_columns: [['wizard_group.id', 'asc']],
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
                      'order_no', master_entities.dashboard_wizard_order_no,
                      'reload_timeout', master_entities.reload_timeout,
                      'query_information', master_entities.query_information,
                      'report_information', master_entities.report_information,
                      'report_type', master_entities.report_type,
                      'entity_name',master_entities.entity_name
                    ) AS jsonb_object,
                    master_entities.dashboard_wizard_order_no AS order_no
                  FROM
                    master_entities
                  WHERE
                    master_entities.dashboard_wizard_group_id = wizard_group.id AND master_entities.status_id = 1
                  ORDER BY
                    master_entities.id, master_entities.dashboard_wizard_order_no
                ) AS subquery`,
              join_type: 'LEFT',

              join_condition: 'TRUE',
            },
          ],
          group_by: ['wizard_group.id'],
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
                  mainElem.cards = []; //JSON.parse(mainElem.cards);
                } catch (error) {
                  console.error('Error parsing JSON for cards:', error);
                  mainElem.cards = [];
                }
              }

              // Proceed with Promise.all only if cards is an array
              if (Array.isArray(mainElem.cards)) {
                mainElem.cards = await Promise.all(
                  mainElem.cards.map(async (item: any) => {
                    // console.log(item);
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
          // Set the first tab as the active tab and initialize its cards
          await this.setActiveTab(this.dashboardTabs[0].id);
        }
      },
      (error) => {
        const key = 'failed_to_load';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
      }
    );
  }

  async getQueryInfo(params: any): Promise<any> {
    try {
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
    //if (activeTab && activeTab.cards.some((card) => card.data.length === 0)) {
    if (activeTab) {
      this.removePowerBiInstances();
      await this.initializeDashboardCards(activeTab.cards);
      this.cdr.detectChanges();
    }
  }

  // NEW: schedule auto-reload for LCP card
private scheduleLcpReload(card: Card) {
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
      const qi = JSON.parse(JSON.stringify(card.query_information));
      const queryString = JSON.stringify(qi).replace(/\$session_user_id/g, this.userId);
      card.query_information = JSON.parse(queryString);
      card.data = await this.getQueryInfo(card.query_information);
    }

    // static widgets: recompile
    if (card.type === commonConfig.WIZARD_TYPES.STATIC && card.format) {
      card.format = this.compileStaticContent(card.format, card.data);
    }

    // charts: rebuild series/labels
    if (card.type === commonConfig.WIZARD_TYPES.CHART) {
      card.chart_format = card.chart_format ? [{ ...this.createformat(), ...card.chart_format[0] }] : [this.createformat()];

      if (card.chart_format[0] && card.chart_format[0].tooltip?.y?.formatter) {
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
                this.powerBiReportInstances[index]?.on('loaded', function () {
                  // console.log('Power BI report loaded successfully');
                });

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
              card.format = this.compileStaticContent(card.format, card.data);
            }

            if (card.type === commonConfig.WIZARD_TYPES.CHART) {
              card.chart_format = card.chart_format ? [{ ...this.createformat(), ...card.chart_format[0] }] : [this.createformat()];

              if (card.chart_format[0]) {
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
              // NEW: schedule auto-reload for LCP card
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

  async initStore() {
    this.storeData
      .select((d) => d.index)
      .subscribe((d) => {
        const hasChangeTheme = this.store?.theme !== d?.theme;
        const hasChangeLayout = this.store?.layout !== d?.layout;
        const hasChangeMenu = this.store?.menu !== d?.menu;
        const hasChangeSidebar = this.store?.sidebar !== d?.sidebar;

        this.store = d;

        this.isDark = this.store.theme === 'dark' || this.store.isDarkMode ? true : false;
        this.isRtl = this.store.rtlClass === 'rtl' ? true : false;
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
    return card.type == commonConfig.WIZARD_TYPES.STATIC ? card.format : [];
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
    this.openMasterList(uuid, entityName, popupName);
  }

  openMasterList(uuid: string, entityName: string, popupName: string) {
    this.popupConfig = {
      popupName,
      selectedItemUuid: uuid ? uuid : null,
      popupEntityName: entityName,
      isViewPopupOpen: true
    };
    this.showMasterListPopup = true;
  }

  closeMasterListPopup() {
    this.showMasterListPopup = false;
    this.popupConfig = null;
  }
}
