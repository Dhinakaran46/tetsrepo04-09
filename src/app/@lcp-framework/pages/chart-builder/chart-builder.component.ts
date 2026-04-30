import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule } from 'ng-apexcharts';
import { ToastrService } from 'ngx-toastr';
import { TranslateService } from '@ngx-translate/core';
import { Store } from '@ngrx/store';
import { ActivatedRoute } from '@angular/router';
import { initialState } from '../../../store/index.reducer';

import { CommonSharedModule } from '../../shared/common/common.module';
import { LocalStorageService } from '../../service/common/local-storage.service';
import { GridApiService } from '../../service/common/grid.service';
import { ChartBuilderService, ChartCard } from './chart-builder.service';

@Component({
  selector: 'app-chart-builder',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule, CommonSharedModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './chart-builder.component.html',
  styleUrls: ['./chart-builder.component.scss'],
})
export class ChartBuilderComponent implements OnInit, OnDestroy {
  allCharts: ChartCard[] = [];
  visibleCharts: ChartCard[] = [];
  selectedCharts: ChartCard[] = [];
  isLoading: boolean = false;
  loadError: string = '';
  userId: any;
  reloadTimers: Map<number, any> = new Map();

  isDark: boolean = false;
  isRtl: boolean = false;
  private store: any = initialState;

  private permissionsList: any;

  constructor(
    private chartBuilderService: ChartBuilderService,
    private gridApiService: GridApiService,
    private localstore: LocalStorageService,
    private toastr: ToastrService,
    public translate: TranslateService,
    private cdr: ChangeDetectorRef,
    private storeData: Store<any>,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.initStore();
    this.loadUserData();
    this.loadCharts();
  }

  ngOnDestroy(): void {
    this.reloadTimers.forEach((timerId) => clearInterval(timerId));
    this.reloadTimers.clear();
  }

  private loadUserData(): void {
    const rawUserData = this.localstore.getData('user_data');
    const parsedUserData = this.parseUserData(rawUserData);

    this.permissionsList =
      parsedUserData?.permissions || parsedUserData?.main?.permissions || null;

    if (parsedUserData) {
      this.userId = parsedUserData.main?.id;
    }
  }

  private loadCharts(): void {
    this.isLoading = true;
    this.loadError = '';

    // Read entity_id from route data (the specific chart mapped to this menu item)
    const pageInfo = this.route.snapshot.data['pageInfo'];
    
    const entityId = pageInfo?.fullEntity;

    if (!entityId) {
      this.loadError = this.translate.instant('no_chart_configured');
      this.toastr.error(this.loadError, 'Error');
      this.isLoading = false;
      return;
    }

    this.chartBuilderService.getChartCard(entityId).subscribe({
      next: (card: ChartCard) => {
        // Check permission
        if (card.entity_name && this.permissionsList?.['view_' + card.entity_name] !== true) {
          this.loadError = this.translate.instant('no_permission');
          this.toastr.error(this.loadError, 'Error');
          this.isLoading = false;
          this.cdr.markForCheck();
          return;
        }

        this.allCharts = [card];
        this.visibleCharts = [card];
        this.isLoading = false;

        // Auto-select and render the chart
        this.selectChart(card);
        this.cdr.markForCheck();
      },
      error: () => {
        const errorMessage = this.translate.instant('failed_to_load');
        this.loadError = errorMessage;
        this.toastr.error(errorMessage, 'Error');
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  // Stub — implemented in Task 5
  selectChart(card: ChartCard): void {
    if (this.selectedCharts.find((c) => c.id === card.id)) {
      return;
    }
    this.selectedCharts = [...this.selectedCharts, card];

    if (card.query_information) {
      try {
        const queryString = JSON.stringify(card.query_information).replace(
          /\$session_user_id/g,
          this.userId
        );
        card.query_information = JSON.parse(queryString);
      } catch {
        console.error('Failed to parse query_information for card', card.id);
      }

      this.gridApiService.getAllList(card.query_information).subscribe({
        next: (response: any) => {
          const data: any[] =
            response.status && response.code === 200
              ? response.data?.records || []
              : [];
          card.data = data;
          this.applyChartFormat(card);
          this.cdr.markForCheck();
        },
        error: () => {
          card.data = [];
          this.applyChartFormat(card);
          const errorMessage = this.translate.instant('failed_to_load');
          this.toastr.error(errorMessage, 'Error');
          this.cdr.markForCheck();
        },
      });
    } else {
      card.data = [];
      this.applyChartFormat(card);
      this.cdr.markForCheck();
    }

    if ((card.reload_timeout || 0) > 0) {
      this.scheduleReload(card);
    }
  }

  // Stub — implemented in Task 5
  deselectChart(card: ChartCard): void {
    this.selectedCharts = this.selectedCharts.filter((c) => c.id !== card.id);
    this.cancelReload(card);
    this.cdr.markForCheck();
  }

  isSelected(card: ChartCard): boolean {
    return this.selectedCharts.some((c) => c.id === card.id);
  }

  private applyChartFormat(card: ChartCard): void {
    const base = this.createDefaultFormat();
    const stored = card.chart_format ? (Array.isArray(card.chart_format) ? card.chart_format[0] : card.chart_format) : {};
    card.chart_format = { ...base, ...stored };

    if (card.data && card.data.length > 0) {
      this.mapDataToChart(card, card.data);
    }

    // Convert string tooltip.y.formatter to Function
    if (card.chart_format?.tooltip?.y?.formatter) {
      if (typeof card.chart_format.tooltip.y.formatter === 'string') {
        try {
          const formatterStr: string = card.chart_format.tooltip.y.formatter;
          card.chart_format.tooltip.y.formatter = new Function(
            'number',
            formatterStr.substring(
              formatterStr.indexOf('{') + 1,
              formatterStr.lastIndexOf('}')
            )
          );
        } catch {
          card.chart_format.tooltip.y.formatter = undefined;
        }
      }
    }
  }

  private createDefaultFormat(): any {
    return {
      series: [{ name: 'Chart', data: [] }],
      chart: {
        height: 350,
        type: 'line',
        zoom: { enabled: false },
        toolbar: { show: false },
      },
      colors: ['#805dca'],
      dataLabels: { enabled: false },
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
      labels: [],
    };
  }

  private mapDataToChart(card: ChartCard, data: any[]): void {
    const dataMap: { [key: string]: any[] } = Object.create(null);
    const labels: any[] = [];

    data.forEach((record: any) => {
      labels.push(record.labels);
      Object.keys(record).forEach((key) => {
        if (key !== 'labels') {
          dataMap[key] = dataMap[key] || [];
          dataMap[key].push(record[key]);
        }
      });
    });

    card.chart_format.series = Object.keys(dataMap).map((key) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      data: dataMap[key],
    }));

    card.chart_format.labels = labels;
    card.chart_format.xaxis = { ...(card.chart_format.xaxis || {}), categories: labels };
  }

  private scheduleReload(card: ChartCard): void {
    const minutes = Number(card.reload_timeout) || 0;
    if (minutes > 0 && card.id != null) {
      if (this.reloadTimers.has(card.id)) {
        clearInterval(this.reloadTimers.get(card.id));
        this.reloadTimers.delete(card.id);
      }
      const intervalId = setInterval(() => {
        if (card.query_information) {
          this.gridApiService.getAllList(card.query_information).subscribe({
            next: (response: any) => {
              const data: any[] =
                response.status && response.code === 200
                  ? response.data?.records || []
                  : [];
              card.data = data;
              this.applyChartFormat(card);
              this.cdr.markForCheck();
            },
            error: () => {
              card.data = [];
              this.applyChartFormat(card);
              this.cdr.markForCheck();
            },
          });
        }
      }, minutes * 60 * 1000);
      this.reloadTimers.set(card.id, intervalId);
    }
  }

  private cancelReload(card: ChartCard): void {
    if (this.reloadTimers.has(card.id)) {
      clearInterval(this.reloadTimers.get(card.id));
      this.reloadTimers.delete(card.id);
    }
  }

  private initStore(): void {
    this.storeData
      .select((d: any) => d.index)
      .subscribe((d: any) => {
        this.store = d;
        this.isDark = this.store.theme === 'dark' || this.store.isDarkMode ? true : false;
        this.isRtl = this.store.rtlClass === 'rtl' ? true : false;
        this.cdr.markForCheck();
      });
  }

  private parseJson(value: any): any {
    if (!value) return null;
    if (typeof value === 'object') return value;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  private parseUserData(rawUserData: any): any {
    const parsedRaw = this.parseJson(rawUserData);
    if (parsedRaw) return parsedRaw;
    try {
      const decrypted = this.localstore.getDataDecrypted('user_data');
      return this.parseJson(decrypted);
    } catch {
      return null;
    }
  }
}
