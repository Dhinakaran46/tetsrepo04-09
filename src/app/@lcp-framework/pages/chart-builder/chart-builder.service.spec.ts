import { of, throwError } from 'rxjs';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ChartBuilderService, ChartCard } from './chart-builder.service';

describe('ChartBuilderService', () => {
  let service: ChartBuilderService;
  let gridApiServiceMock: { getAllList: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    gridApiServiceMock = {
      getAllList: vi.fn(),
    };

    service = new ChartBuilderService(gridApiServiceMock as any);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getChartCards()', () => {
    it('should call getAllList with correct primary_table', () => {
      gridApiServiceMock.getAllList.mockReturnValue(of({ status: true, code: 200, data: { records: [] } }));

      service.getChartCards().subscribe();

      const callArgs = gridApiServiceMock.getAllList.mock.calls[0][0];
      expect(callArgs.primary_table).toBe('master_entities');
    });

    it('should filter by dashboard_wizard_type = chart', () => {
      gridApiServiceMock.getAllList.mockReturnValue(of({ status: true, code: 200, data: { records: [] } }));

      service.getChartCards().subscribe();

      const callArgs = gridApiServiceMock.getAllList.mock.calls[0][0];
      const typeFilter = callArgs.search_all.find(
        (f: any) => f.column_name === 'master_entities.dashboard_wizard_type'
      );
      expect(typeFilter).toBeDefined();
      expect(typeFilter.value).toBe('chart');
      expect(typeFilter.operator).toBe('=');
    });

    it('should filter by status_id = 1', () => {
      gridApiServiceMock.getAllList.mockReturnValue(of({ status: true, code: 200, data: { records: [] } }));

      service.getChartCards().subscribe();

      const callArgs = gridApiServiceMock.getAllList.mock.calls[0][0];
      const statusFilter = callArgs.search_all.find(
        (f: any) => f.column_name === 'master_entities.status_id'
      );
      expect(statusFilter).toBeDefined();
      expect(statusFilter.value).toBe(1);
      expect(statusFilter.operator).toBe('=');
    });

    it('should select all required columns', () => {
      gridApiServiceMock.getAllList.mockReturnValue(of({ status: true, code: 200, data: { records: [] } }));

      service.getChartCards().subscribe();

      const callArgs = gridApiServiceMock.getAllList.mock.calls[0][0];
      const aliases = callArgs.select_columns.map((col: string[]) => col[1]);

      expect(aliases).toContain('id');
      expect(aliases).toContain('title');
      expect(aliases).toContain('chart_format');
      expect(aliases).toContain('query_information');
      expect(aliases).toContain('type');
      expect(aliases).toContain('rows');
      expect(aliases).toContain('cols');
      expect(aliases).toContain('entity_name');
      expect(aliases).toContain('reload_timeout');
    });

    it('should map name column to title alias', () => {
      gridApiServiceMock.getAllList.mockReturnValue(of({ status: true, code: 200, data: { records: [] } }));

      service.getChartCards().subscribe();

      const callArgs = gridApiServiceMock.getAllList.mock.calls[0][0];
      const titleCol = callArgs.select_columns.find((col: string[]) => col[1] === 'title');
      expect(titleCol[0]).toBe('master_entities.name');
    });

    it('should map dashboard_wizard_options to chart_format alias', () => {
      gridApiServiceMock.getAllList.mockReturnValue(of({ status: true, code: 200, data: { records: [] } }));

      service.getChartCards().subscribe();

      const callArgs = gridApiServiceMock.getAllList.mock.calls[0][0];
      const chartFormatCol = callArgs.select_columns.find((col: string[]) => col[1] === 'chart_format');
      expect(chartFormatCol[0]).toBe('master_entities.dashboard_wizard_options');
    });

    it('should map dashboard_wizard_type to type alias', () => {
      gridApiServiceMock.getAllList.mockReturnValue(of({ status: true, code: 200, data: { records: [] } }));

      service.getChartCards().subscribe();

      const callArgs = gridApiServiceMock.getAllList.mock.calls[0][0];
      const typeCol = callArgs.select_columns.find((col: string[]) => col[1] === 'type');
      expect(typeCol[0]).toBe('master_entities.dashboard_wizard_type');
    });

    it('should map dashboard_wizard_rows to rows alias', () => {
      gridApiServiceMock.getAllList.mockReturnValue(of({ status: true, code: 200, data: { records: [] } }));

      service.getChartCards().subscribe();

      const callArgs = gridApiServiceMock.getAllList.mock.calls[0][0];
      const rowsCol = callArgs.select_columns.find((col: string[]) => col[1] === 'rows');
      expect(rowsCol[0]).toBe('master_entities.dashboard_wizard_rows');
    });

    it('should map dashboard_wizard_columns to cols alias', () => {
      gridApiServiceMock.getAllList.mockReturnValue(of({ status: true, code: 200, data: { records: [] } }));

      service.getChartCards().subscribe();

      const callArgs = gridApiServiceMock.getAllList.mock.calls[0][0];
      const colsCol = callArgs.select_columns.find((col: string[]) => col[1] === 'cols');
      expect(colsCol[0]).toBe('master_entities.dashboard_wizard_columns');
    });

    it('should return mapped ChartCard[] on success', () =>
      new Promise<void>((resolve) => {
        const mockRecord = {
          id: 1,
          title: 'Sales Chart',
          chart_format: { chart: { type: 'bar' } },
          query_information: { primary_table: 'sales' },
          type: 'chart',
          rows: 2,
          cols: 4,
          entity_name: 'sales_chart',
          reload_timeout: 5,
        };

        gridApiServiceMock.getAllList.mockReturnValue(
          of({ status: true, code: 200, data: { records: [mockRecord] } })
        );

        service.getChartCards().subscribe((cards: ChartCard[]) => {
          expect(cards.length).toBe(1);
          expect(cards[0].id).toBe(1);
          expect(cards[0].title).toBe('Sales Chart');
          expect(cards[0].entity_name).toBe('sales_chart');
          expect(cards[0].reload_timeout).toBe(5);
          resolve();
        });
      }));

    it('should return empty array when records is empty', () =>
      new Promise<void>((resolve) => {
        gridApiServiceMock.getAllList.mockReturnValue(
          of({ status: true, code: 200, data: { records: [] } })
        );

        service.getChartCards().subscribe((cards: ChartCard[]) => {
          expect(cards).toEqual([]);
          resolve();
        });
      }));

    it('should propagate errors from GridApiService', () =>
      new Promise<void>((resolve) => {
        const mockError = new Error('Network error');
        gridApiServiceMock.getAllList.mockReturnValue(throwError(() => mockError));

        service.getChartCards().subscribe({
          next: () => { throw new Error('Expected error to be thrown'); },
          error: (err) => {
            expect(err).toBe(mockError);
            resolve();
          },
        });
      }));

    it('should throw error when response status is false', () =>
      new Promise<void>((resolve) => {
        gridApiServiceMock.getAllList.mockReturnValue(
          of({ status: false, code: 500, message: 'Server error' })
        );

        service.getChartCards().subscribe({
          next: () => { throw new Error('Expected error to be thrown'); },
          error: (err) => {
            expect(err.message).toBe('Server error');
            resolve();
          },
        });
      }));
  });
});
