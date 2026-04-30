/**
 * Chart Builder Component – Task 5 tests
 *
 * Property tests use fast-check (min 100 iterations each).
 * Unit tests cover specific scenarios for selectChart / deselectChart.
 *
 * We instantiate the component directly (no TestBed) to avoid Angular JIT
 * compilation issues in the Vitest environment, following the same pattern
 * as chart-builder.service.spec.ts.
 */

// Mock Angular and ngrx modules before any imports to avoid JIT compilation
vi.mock('@angular/core', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    Component: () => () => {},
    Injectable: () => () => {},
    CUSTOM_ELEMENTS_SCHEMA: {},
  };
});

vi.mock('@ngrx/store', () => ({
  Store: class MockStore {
    select = vi.fn().mockReturnValue({ subscribe: vi.fn() });
  },
}));

vi.mock('../../../store/index.reducer', () => ({
  initialState: {},
}));

vi.mock('../../shared/common/common.module', () => ({
  CommonSharedModule: class {},
}));

vi.mock('ng-apexcharts', () => ({
  NgApexchartsModule: class {},
}));

vi.mock('@angular/common', () => ({
  CommonModule: class {},
}));

import { of, throwError } from 'rxjs';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

import { ChartBuilderComponent } from './chart-builder.component';
import { ChartCard } from './chart-builder.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCard(overrides: Partial<ChartCard> = {}): ChartCard {
  return {
    id: 1,
    title: 'Test Chart',
    chart_format: null,
    query_information: null,
    type: 'chart',
    rows: 2,
    cols: 4,
    entity_name: 'test_entity',
    reload_timeout: 0,
    data: [],
    ...overrides,
  };
}

function buildMocks() {
  const gridApiServiceMock = {
    getAllList: vi.fn().mockReturnValue(of({ status: true, code: 200, data: { records: [] } })),
  };
  const chartBuilderServiceMock = {
    getChartCards: vi.fn().mockReturnValue(of([])),
  };
  const localstoreMock = {
    getData: vi.fn().mockReturnValue(null),
    getDataDecrypted: vi.fn().mockReturnValue(null),
  };
  const toastrMock = { error: vi.fn(), success: vi.fn() };
  const translateMock = { instant: vi.fn((k: string) => k) };
  const cdrMock = { markForCheck: vi.fn(), detectChanges: vi.fn() };
  const storeDataMock = {
    select: vi.fn().mockReturnValue(
      of({ theme: 'light', isDarkMode: false, rtlClass: 'ltr' })
    ),
  };
  return { gridApiServiceMock, chartBuilderServiceMock, localstoreMock, toastrMock, translateMock, cdrMock, storeDataMock };
}

function buildComponent(mocks: ReturnType<typeof buildMocks>): ChartBuilderComponent {
  const comp = new ChartBuilderComponent(
    mocks.chartBuilderServiceMock as any,
    mocks.gridApiServiceMock as any,
    mocks.localstoreMock as any,
    mocks.toastrMock as any,
    mocks.translateMock as any,
    mocks.cdrMock as any,
    mocks.storeDataMock as any,
  );
  // Manually call initStore equivalent (store subscription)
  comp['isDark'] = false;
  comp['isRtl'] = false;
  return comp;
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const cardArb = fc.record({
  id: fc.integer({ min: 1, max: 10_000 }),
  title: fc.string({ minLength: 1, maxLength: 50 }),
  chart_format: fc.constant(null),
  query_information: fc.constant(null),
  type: fc.constant('chart'),
  rows: fc.integer({ min: 1, max: 10 }),
  cols: fc.integer({ min: 1, max: 12 }),
  entity_name: fc.string({ minLength: 1, maxLength: 30 }),
  reload_timeout: fc.integer({ min: 0, max: 60 }),
  data: fc.constant([]),
}) as fc.Arbitrary<ChartCard>;

const uniqueCardsArb = fc
  .array(cardArb, { minLength: 1, maxLength: 20 })
  .map((cards) => {
    const seen = new Set<number>();
    return cards.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  })
  .filter((cards) => cards.length > 0);

// ---------------------------------------------------------------------------
// Property 3: Select adds to selected set
// Validates: Requirements 3.1
// ---------------------------------------------------------------------------
describe('Property 3: Select adds to selected set', () => {
  it('selectChart adds the card to selectedCharts', () => {
    fc.assert(
      fc.property(cardArb, (card) => {
        const mocks = buildMocks();
        const comp = buildComponent(mocks);
        comp.selectedCharts = [];

        comp.selectChart(card);

        expect(comp.selectedCharts.some((c) => c.id === card.id)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 4: Deselect removes from selected set
// Validates: Requirements 3.2
// ---------------------------------------------------------------------------
describe('Property 4: Deselect removes from selected set', () => {
  it('deselectChart removes the card from selectedCharts', () => {
    fc.assert(
      fc.property(cardArb, (card) => {
        const mocks = buildMocks();
        const comp = buildComponent(mocks);
        comp.selectedCharts = [{ ...card }];

        comp.deselectChart(card);

        expect(comp.selectedCharts.some((c) => c.id === card.id)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 5: Multiple selections are preserved simultaneously
// Validates: Requirements 3.3
// ---------------------------------------------------------------------------
describe('Property 5: Multiple selections are preserved simultaneously', () => {
  it('selecting multiple cards one by one results in all being in selectedCharts', () => {
    fc.assert(
      fc.property(uniqueCardsArb, (cards) => {
        const mocks = buildMocks();
        const comp = buildComponent(mocks);
        comp.selectedCharts = [];

        cards.forEach((card) => comp.selectChart(card));

        cards.forEach((card) => {
          expect(comp.selectedCharts.some((c) => c.id === card.id)).toBe(true);
        });
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 6: Default format baseline is always applied
// Validates: Requirements 4.2
// ---------------------------------------------------------------------------
describe('Property 6: Default format baseline is always applied', () => {
  it('merging any chart_format with createDefaultFormat produces all baseline keys', () => {
    const partialFormatArb = fc.record({
      series: fc.option(fc.constant([{ name: 'X', data: [1, 2] }]), { nil: undefined }),
      chart: fc.option(fc.record({ height: fc.integer({ min: 100, max: 800 }) }), { nil: undefined }),
    });

    fc.assert(
      fc.property(partialFormatArb, (partial) => {
        const mocks = buildMocks();
        const comp = buildComponent(mocks);

        const card = makeCard({ chart_format: partial, query_information: null });
        comp.selectChart(card);

        const baselineKeys = ['series', 'chart', 'xaxis', 'yaxis', 'stroke', 'dataLabels', 'grid', 'tooltip', 'colors', 'legend', 'labels'];
        baselineKeys.forEach((key) => {
          expect(card.chart_format).toHaveProperty(key);
        });
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 7: Labels field maps to xaxis categories and labels
// Validates: Requirements 4.3
// ---------------------------------------------------------------------------
describe('Property 7: Labels field maps to xaxis categories and labels', () => {
  it('mapDataToChart sets xaxis.categories and labels from records.labels', () => {
    const labelValArb = fc.oneof(fc.string({ minLength: 1, maxLength: 10 }), fc.integer());
    const recordsArb = fc.array(
      fc.record({ labels: labelValArb, value: fc.integer() }),
      { minLength: 1, maxLength: 20 }
    );

    fc.assert(
      fc.property(recordsArb, (records) => {
        const mocks = buildMocks();
        mocks.gridApiServiceMock.getAllList.mockReturnValue(
          of({ status: true, code: 200, data: { records } })
        );
        const comp = buildComponent(mocks);

        const card = makeCard({ query_information: { primary_table: 'test' } });
        comp.selectChart(card);

        const expectedLabels = records.map((r) => r.labels);
        expect(card.chart_format.xaxis.categories).toEqual(expectedLabels);
        expect(card.chart_format.labels).toEqual(expectedLabels);
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 8: Non-labels keys map to named series entries
// Validates: Requirements 4.4
// ---------------------------------------------------------------------------
describe('Property 8: Non-labels keys map to named series entries', () => {
  it('mapDataToChart creates one series entry per non-labels key with capitalised name', () => {
    const keysArb = fc
      .array(
        fc.string({ minLength: 2, maxLength: 10 }).filter((s) => s !== 'labels' && /^[a-z]/.test(s)),
        { minLength: 1, maxLength: 5 }
      )
      .map((keys) => [...new Set(keys)])
      .filter((keys) => keys.length > 0);

    fc.assert(
      fc.property(keysArb, fc.array(fc.integer(), { minLength: 1, maxLength: 10 }), (keys, values) => {
        const records = values.map((v) => {
          const rec: any = { labels: 'Jan' };
          keys.forEach((k) => { rec[k] = v; });
          return rec;
        });

        const mocks = buildMocks();
        mocks.gridApiServiceMock.getAllList.mockReturnValue(
          of({ status: true, code: 200, data: { records } })
        );
        const comp = buildComponent(mocks);

        const card = makeCard({ query_information: { primary_table: 'test' } });
        comp.selectChart(card);

        const seriesNames = card.chart_format.series.map((s: any) => s.name);
        keys.forEach((key) => {
          const expectedName = key.charAt(0).toUpperCase() + key.slice(1);
          expect(seriesNames).toContain(expectedName);
        });

        card.chart_format.series.forEach((s: any) => {
          expect(s.data.length).toBe(records.length);
        });
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 9: String tooltip formatter is converted to a Function
// Validates: Requirements 4.6
// ---------------------------------------------------------------------------
describe('Property 9: String tooltip formatter is converted to a Function', () => {
  it('string tooltip.y.formatter is converted to typeof function after selectChart', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 30 }), (body) => {
        // Sanitise body to avoid breaking the function string
        const safeBody = body.replace(/'/g, '').replace(/\\/g, '');
        const formatterStr = `function(number) { return number + '${safeBody}'; }`;
        const mocks = buildMocks();
        const comp = buildComponent(mocks);

        const card = makeCard({
          chart_format: { tooltip: { y: { formatter: formatterStr } } },
          query_information: null,
        });
        comp.selectChart(card);

        expect(typeof card.chart_format.tooltip.y.formatter).toBe('function');
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 10: Timer is started for cards with non-zero reload_timeout
// Validates: Requirements 8.1
// ---------------------------------------------------------------------------
describe('Property 10: Timer is started for cards with non-zero reload_timeout', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('reloadTimers contains an entry for card.id after selectChart when reload_timeout > 0', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 60 }), fc.integer({ min: 1, max: 10_000 }), (timeout, id) => {
        vi.useFakeTimers();
        const mocks = buildMocks();
        const comp = buildComponent(mocks);

        const card = makeCard({ id, reload_timeout: timeout, query_information: null });
        comp.selectChart(card);

        expect(comp.reloadTimers.has(card.id)).toBe(true);
        vi.useRealTimers();
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 11: Timer is cancelled when a chart is deselected
// Validates: Requirements 8.2
// ---------------------------------------------------------------------------
describe('Property 11: Timer is cancelled when a chart is deselected', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('reloadTimers does NOT contain card.id after deselectChart', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 60 }), fc.integer({ min: 1, max: 10_000 }), (timeout, id) => {
        vi.useFakeTimers();
        const mocks = buildMocks();
        const comp = buildComponent(mocks);

        const card = makeCard({ id, reload_timeout: timeout, query_information: null });
        comp.selectChart(card);
        expect(comp.reloadTimers.has(card.id)).toBe(true);

        comp.deselectChart(card);
        expect(comp.reloadTimers.has(card.id)).toBe(false);
        vi.useRealTimers();
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 12: All timers are cleared on component destruction
// Validates: Requirements 8.3
// ---------------------------------------------------------------------------
describe('Property 12: All timers are cleared on component destruction', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('reloadTimers.size === 0 after ngOnDestroy regardless of how many timers were active', () => {
    fc.assert(
      fc.property(uniqueCardsArb, (cards) => {
        vi.useFakeTimers();
        const mocks = buildMocks();
        const comp = buildComponent(mocks);

        cards.forEach((card) => {
          const timedCard = { ...card, reload_timeout: 1, query_information: null };
          comp.selectChart(timedCard);
        });

        comp.ngOnDestroy();

        expect(comp.reloadTimers.size).toBe(0);
        vi.useRealTimers();
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Unit tests: selectChart / deselectChart (Task 5.11)
// ---------------------------------------------------------------------------
describe('Unit tests: selectChart / deselectChart', () => {
  it('selectChart calls GridApiService.getAllList when query_information is present', () => {
    const mocks = buildMocks();
    const comp = buildComponent(mocks);

    const card = makeCard({ query_information: { primary_table: 'sales' } });
    comp.selectChart(card);

    expect(mocks.gridApiServiceMock.getAllList).toHaveBeenCalledTimes(1);
  });

  it('selectChart does NOT call GridApiService.getAllList when query_information is absent', () => {
    const mocks = buildMocks();
    const comp = buildComponent(mocks);

    const card = makeCard({ query_information: null });
    comp.selectChart(card);

    expect(mocks.gridApiServiceMock.getAllList).not.toHaveBeenCalled();
  });

  it('empty data array results in empty series on the rendered chart', () => {
    const mocks = buildMocks();
    mocks.gridApiServiceMock.getAllList.mockReturnValue(
      of({ status: true, code: 200, data: { records: [] } })
    );
    const comp = buildComponent(mocks);

    const card = makeCard({ query_information: { primary_table: 'sales' } });
    comp.selectChart(card);

    expect(card.chart_format.series).toEqual([{ name: 'Chart', data: [] }]);
  });

  it('selectChart does not add the same card twice', () => {
    const mocks = buildMocks();
    mocks.gridApiServiceMock.getAllList.mockReturnValue(
      of({ status: true, code: 200, data: { records: [] } })
    );
    const comp = buildComponent(mocks);

    const card = makeCard({ id: 42 });
    comp.selectChart(card);
    comp.selectChart(card);

    expect(comp.selectedCharts.filter((c) => c.id === 42).length).toBe(1);
  });

  it('deselectChart removes the card and leaves others intact', () => {
    const mocks = buildMocks();
    const comp = buildComponent(mocks);

    const card1 = makeCard({ id: 1 });
    const card2 = makeCard({ id: 2 });
    comp.selectedCharts = [card1, card2];

    comp.deselectChart(card1);

    expect(comp.selectedCharts.some((c) => c.id === 1)).toBe(false);
    expect(comp.selectedCharts.some((c) => c.id === 2)).toBe(true);
  });

  it('selectChart shows error toast when GridApiService fails', () => {
    const mocks = buildMocks();
    mocks.gridApiServiceMock.getAllList.mockReturnValue(throwError(() => new Error('Network error')));
    const comp = buildComponent(mocks);

    const card = makeCard({ query_information: { primary_table: 'sales' } });
    comp.selectChart(card);

    expect(mocks.toastrMock.error).toHaveBeenCalled();
  });

  it('selectChart substitutes $session_user_id in query_information', () => {
    const mocks = buildMocks();
    mocks.gridApiServiceMock.getAllList.mockReturnValue(
      of({ status: true, code: 200, data: { records: [] } })
    );
    const comp = buildComponent(mocks);
    comp.userId = 'user-123';

    const card = makeCard({
      query_information: { user_id: '$session_user_id', primary_table: 'sales' },
    });
    comp.selectChart(card);

    expect(JSON.stringify(card.query_information)).not.toContain('$session_user_id');
    expect(JSON.stringify(card.query_information)).toContain('user-123');
  });
});
