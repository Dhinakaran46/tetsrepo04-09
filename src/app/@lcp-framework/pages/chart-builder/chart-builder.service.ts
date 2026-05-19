import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { GridApiService } from '../../service/common/grid.service';

export interface ChartCard {
  id: number;
  title: string;
  chart_format: any;
  query_information: any;
  type: string;
  rows: number;
  cols: number;
  entity_name: string;
  reload_timeout: number;
  data?: any[];
  permissions?: {
    view: boolean;
  };
}

@Injectable({ providedIn: 'root' })
export class ChartBuilderService {
  constructor(private gridApiService: GridApiService) {}

  /** Fetch a single chart card by its master_entities.id (route-driven). */
  getChartCard(entityId: number | string): Observable<ChartCard> {
    const params = {
      company_id: 1,
      primary_table: 'master_entities',
      limit_range: 1,
      search_all: [
        { value: entityId, operator: '=', column_name: 'master_entities.entity_name' },
        { column_name: 'master_entities.entity_type', operator: '=', value: 'chart_builder_module' },
        { column_name: 'master_entities.status_id', operator: '=', value: '1' }
      ],
      select_columns: this.chartSelectColumns(),
    };

    return this.gridApiService.getAllList(params).pipe(
      map((response: any) => {
        if (response.status && response.code === 200) {
          const records: any[] = response.data.records || [];
          if (!records.length) throw new Error('Chart not found');
          return this.mapRecord(records[0]);
        }
        throw new Error(response.message || 'Failed to load chart');
      })
    );
  }

  /** Fetch all chart cards (kept for backwards-compat / tests). */
  getChartCards(): Observable<ChartCard[]> {
    const params = {
      company_id: 1,
      primary_table: 'master_entities',
      limit_range: 1000,
      search_all: [
        { value: 'chart', operator: '=', column_name: 'master_entities.dashboard_wizard_type' },
        { value: 1, operator: '=', column_name: 'master_entities.status_id' },
      ],
      select_columns: this.chartSelectColumns(),
    };

    return this.gridApiService.getAllList(params).pipe(
      map((response: any) => {
        if (response.status && response.code === 200) {
          return (response.data.records as any[]).map((r: any) => this.mapRecord(r));
        }
        throw new Error(response.message || 'Failed to load chart cards');
      })
    );
  }

  private chartSelectColumns(): string[][] {
    return [
      ['master_entities.id', 'id'],
      ['master_entities.name', 'title'],
      ['master_entities.dashboard_wizard_options', 'chart_format'],
      ['master_entities.query_information', 'query_information'],
      ['master_entities.dashboard_wizard_type', 'type'],
      ['master_entities.dashboard_wizard_rows', 'rows'],
      ['master_entities.dashboard_wizard_columns', 'cols'],
      ['master_entities.entity_name', 'entity_name'],
      ['master_entities.reload_timeout', 'reload_timeout'],
    ];
  }

  private mapRecord(record: any): ChartCard {
    return {
      id: record.id,
      title: record.title,
      chart_format: record.chart_format,
      query_information: record.query_information,
      type: record.type,
      rows: record.rows,
      cols: record.cols,
      entity_name: record.entity_name,
      reload_timeout: record.reload_timeout,
    };
  }
}
