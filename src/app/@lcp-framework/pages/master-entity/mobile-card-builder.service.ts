import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { CdkDragDrop, transferArrayItem, moveItemInArray } from '@angular/cdk/drag-drop';

// Interfaces
export interface MobileCardBuilderPaletteField {
  field_name: string;
  display_name: string;
}

export interface MobileCardBuilderColumn {
  id: string;
  field_name: string | null;
  label: string;
  type: 'text' | 'media' | 'badge' | 'icon_text' | 'action';
  col_span: number;
  row_span: number;
  align: 'left' | 'center' | 'right';
  format: string;
  label_position: '' | 'inline' | 'top';
  show_label: boolean;
  extras_json: string;
}

export interface MobileCardBuilderRow {
  id: string;
  row_no: number;
  divider_after: boolean;
  columns: MobileCardBuilderColumn[];
}

export interface MobileCardBuilderState {
  view_type: 'card';
  card: {
    style: 'elevated' | 'flat' | 'outlined';
    shape: 'rounded' | 'square';
    grid_columns: number;
    grid_rows: number;
    action_placement_index: number;
    row: MobileCardBuilderRow;
  };
}

@Injectable()
export class MobileCardBuilderService {
  // State properties
  isMobileCardBuilderModalOpen = false;
  isMobileCardColumnModalOpen = false;
  isMobileCardPreviewModalOpen = false;
  mobileCardColumnEditTarget: { rowIndex: number; colIndex: number } | null = null;
  mobileCardColumnDraft: MobileCardBuilderColumn | null = null;
  mobileCardColumnTypeConfig: any = {};
  mobileCardBuilderError = '';
  mobileCardPreviewSearch = '';
  selectedMobileCardIndex: number | null = null;
  selectedCardActions: any[] = [];

  readonly mobileCardPreviewRows: Array<{ title: string; status: 'active' | 'inactive'; subtitle: string }> = [
    { title: 'Order #1001', status: 'active', subtitle: 'Created 2h ago' },
    { title: 'Order #1002', status: 'inactive', subtitle: 'Created yesterday' },
    { title: 'Order #1003', status: 'active', subtitle: 'Created last week' },
  ];

  mobileCardBuilderState: MobileCardBuilderState = this.getDefaultMobileCardBuilderState();

  private mobileCardBuilderCounter = 0;

  // Callbacks to parent component
  private _form!: FormGroup;
  private _commonConfig: any;
  private _prettyJSON!: (obj: any) => string;
  private _parseJsonSafe!: (json: string, fallback: any) => any;
  private _getLabelFromFieldName!: (fieldName: string) => string;
  private _paletteFields: MobileCardBuilderPaletteField[] = [];

  constructor(private translate: TranslateService, private toastr: ToastrService) {}

  // Initialize service with parent component dependencies
  initialize(config: {
    form: FormGroup;
    commonConfig: any;
    prettyJSON: (obj: any) => string;
    parseJsonSafe: (json: string, fallback: any) => any;
    getLabelFromFieldName: (fieldName: string) => string;
    paletteFields: MobileCardBuilderPaletteField[];
  }): void {
    this._form = config.form;
    this._commonConfig = config.commonConfig;
    this._prettyJSON = config.prettyJSON;
    this._parseJsonSafe = config.parseJsonSafe;
    this._getLabelFromFieldName = config.getLabelFromFieldName;
    this._paletteFields = config.paletteFields;
  }

  // Getters
  get mobileCardBuilderRows(): MobileCardBuilderRow[] {
    return [this.mobileCardBuilderState.card.row];
  }

  get mobileCardBuilderPrimaryRow(): MobileCardBuilderRow {
    return this.mobileCardBuilderState.card.row;
  }

  get mobileCardBuilderConnectedDropLists(): string[] {
    return this.mobileCardBuilderRows.map((row) => `mobile-card-row-${row.id}`);
  }

  get mobileCardBuilderGridColumnsMin(): number {
    const occupied = this.mobileCardBuilderRows.reduce((max, row) => {
      const rowMax = row.columns.reduce((sum, col) => Math.max(sum, Number(col.col_span) || 0), 0);
      return Math.max(max, rowMax);
    }, 0);
    return Math.max(1, occupied);
  }

  get mobileCardBuilderGridRowsMin(): number {
    const occupied = this.mobileCardBuilderRows.reduce((max, row) => {
      const rowMax = row.columns.reduce((sum, col) => Math.max(sum, Number(col.row_span) || 0), 0);
      return Math.max(max, rowMax);
    }, 0);
    return Math.max(1, occupied);
  }

  get mobileCardPreviewColumns(): MobileCardBuilderColumn[] {
    return this.mobileCardBuilderState.card.row.columns || [];
  }

  get mobileCardPreviewTitle(): string {
    return this._form?.get('name')?.value || 'Mobile Card Preview';
  }

  get mobileCardPreviewResultsText(): string {
    const total = this.filteredMobileCardPreviewRows.length;
    const items = total === 1 ? 'item' : 'items';
    return `${total} ${items}`;
  }

  get filteredMobileCardPreviewRows(): Array<{ title: string; status: 'active' | 'inactive'; subtitle: string }> {
    const search = (this.mobileCardPreviewSearch || '').trim().toLowerCase();
    if (!search) return this.mobileCardPreviewRows;
    return this.mobileCardPreviewRows.filter((row) => row.title.toLowerCase().includes(search));
  }

  // ID generation
  private nextMobileCardBuilderId(prefix: string): string {
    this.mobileCardBuilderCounter += 1;
    return `${prefix}_${this.mobileCardBuilderCounter}`;
  }

  // Default state
  getDefaultMobileCardBuilderState(): MobileCardBuilderState {
    return {
      view_type: 'card',
      card: {
        style: 'elevated',
        shape: 'rounded',
        grid_columns: 4,
        grid_rows: 4,
        action_placement_index: 0,
        row: {
          id: 'row_1',
          row_no: 1,
          divider_after: true,
          columns: [],
        },
      },
    };
  }

  extractMobileCardConfig(entityConfigurations: any): any | null {
    if (!entityConfigurations || typeof entityConfigurations !== 'object') return null;
    if (entityConfigurations.mobile_view && typeof entityConfigurations.mobile_view === 'object') {
      return entityConfigurations.mobile_view;
    }
    if (entityConfigurations.view_type === 'card' && entityConfigurations.card) {
      return entityConfigurations;
    }
    return null;
  }

  buildDefaultMobileCardConfigFromLineItems(): any {
    const palette = this._paletteFields;
    const defaultColumns = palette.map((field, index) => ({
      field_name: field.field_name,
      label: field.display_name || this._getLabelFromFieldName(field.field_name),
      type: 'text',
      col_span: 1,
      row_span: 1,
      align: index % 4 === 3 ? 'right' : 'left',
    }));

    return {
      view_type: 'card',
      card: {
        style: 'elevated',
        shape: 'rounded',
        row: {
          row_no: 1,
          divider_after: true,
          columns: defaultColumns,
        },
      },
    };
  }

  // Extras JSON helpers
  getDefaultExtrasJsonForType(type: MobileCardBuilderColumn['type']): string {
    if (type === 'media') {
      return JSON.stringify(
        {
          media_type: 'image',
          fallback_icon: 'fa-regular fa-image',
          border_radius: 4,
        },
        null,
        2
      );
    }

    if (type === 'badge') {
      return JSON.stringify(
        {
          color_map: { active: 'success', inactive: 'secondary' },
        },
        null,
        2
      );
    }

    if (type === 'icon_text') {
      return JSON.stringify(
        {
          icon: 'fa-regular fa-circle-info',
          icon_position: 'left',
        },
        null,
        2
      );
    }

    if (type === 'action') {
      return JSON.stringify(
        {
          actions: [
            { action: this._commonConfig.ACTION_TYPE.VIEW, icon: 'fa-regular fa-eye', label: 'View' },
            { action: this._commonConfig.ACTION_TYPE.EDIT, icon: 'fa-regular fa-pen-to-square', label: 'Edit' },
            { action: this._commonConfig.ACTION_TYPE.DELETE, icon: 'fa-regular fa-trash-can', label: 'Delete' },
          ],
        },
        null,
        2
      );
    }

    return '';
  }

  getDefaultTypeConfig(type: MobileCardBuilderColumn['type']): any {
    if (type === 'media') {
      return {
        media_type: 'image',
        fallback_icon: 'fa-regular fa-image',
        border_radius: 4,
      };
    }

    if (type === 'badge') {
      return { color_map: { active: 'success', inactive: 'secondary' } };
    }

    if (type === 'icon_text') {
      return { icon: 'fa-regular fa-circle-info', icon_position: 'left' };
    }

    return {};
  }

  getTypeConfigFromExtras(type: MobileCardBuilderColumn['type'], extrasJson: string): any {
    const defaults = this.getDefaultTypeConfig(type);
    let parsed: any = {};
    try {
      parsed = JSON.parse(extrasJson || '{}');
    } catch {
      return defaults;
    }

    if (type === 'media') {
      return { ...defaults, ...(parsed || {}) };
    }

    if (type === 'badge') {
      return { ...defaults, ...(parsed || {}) };
    }

    if (type === 'icon_text') {
      return { ...defaults, ...(parsed || {}) };
    }

    return defaults;
  }

  buildExtrasJsonFromTypeConfig(type: MobileCardBuilderColumn['type'], config: any): string {
    if (type === 'media') {
      return JSON.stringify(
        {
          media_type: config.media_type || 'image',
          fallback_icon: config.fallback_icon || 'fa-regular fa-image',
          border_radius: Number(config.border_radius) || 4,
        },
        null,
        2
      );
    }

    if (type === 'badge') {
      return JSON.stringify(
        {
          color_map: config.color_map || { active: 'success', inactive: 'secondary' },
        },
        null,
        2
      );
    }

    if (type === 'icon_text') {
      return JSON.stringify(
        {
          icon: config.icon || 'fa-regular fa-circle-info',
          icon_position: config.icon_position || 'left',
        },
        null,
        2
      );
    }

    return '';
  }

  isValidActionType(action: string): boolean {
    const normalized = (action || '').toLowerCase();
    return (
      Object.values(this._commonConfig.ACTION_TYPE)
        .map((v: any) => String(v).toLowerCase())
        .includes(normalized) || normalized === 'share'
    );
  }

  createBuilderColumn(field: MobileCardBuilderPaletteField): MobileCardBuilderColumn {
    return {
      id: this.nextMobileCardBuilderId('col'),
      field_name: field.field_name,
      label: field.display_name || this._getLabelFromFieldName(field.field_name),
      type: 'text',
      col_span: 1,
      row_span: 1,
      align: 'left',
      format: '',
      label_position: '',
      show_label: true,
      extras_json: this.getDefaultExtrasJsonForType('text'),
    };
  }

  // Parsing helpers
  parseOptionalJsonObject(raw: string, fieldName: string): any | null {
    const input = (raw || '').trim();
    if (!input) return null;
    let parsed: any;
    try {
      parsed = JSON.parse(input);
    } catch {
      throw new Error(`Invalid JSON for ${fieldName}.`);
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error(`${fieldName} must be a JSON object.`);
    }
    return parsed;
  }

  parseOptionalJsonArray(raw: string, fieldName: string): any[] | null {
    const input = (raw || '').trim();
    if (!input) return null;
    let parsed: any;
    try {
      parsed = JSON.parse(input);
    } catch {
      throw new Error(`Invalid JSON for ${fieldName}.`);
    }
    if (!Array.isArray(parsed)) {
      throw new Error(`${fieldName} must be a JSON array.`);
    }
    return parsed;
  }

  // Normalization & Serialization
  normalizeMobileCardConfig(config: any): any {
    if (!config || typeof config !== 'object') {
      throw new Error('Mobile card configuration must be a JSON object.');
    }
    if (config.view_type !== 'card') {
      throw new Error('Mobile card configuration must have view_type="card".');
    }
    if (!config.card || typeof config.card !== 'object') {
      throw new Error('Mobile card configuration must include a card object.');
    }

    // Handle both old format (rows array) and new format (single row)
    let row: any;
    if (config.card.row) {
      row = config.card.row;
    } else if (Array.isArray(config.card.rows) && config.card.rows.length > 0) {
      row = config.card.rows[0];
    } else {
      row = { row_no: 1, divider_after: true, columns: [] };
    }

    const columns = Array.isArray(row?.columns) ? row.columns : [];

    return {
      view_type: 'card',
      card: {
        style: config.card.style || 'elevated',
        shape: config.card.shape || 'rounded',
        grid_columns: Math.max(1, Number(config.card?.grid_columns) || 4),
        grid_rows: Math.max(1, Number(config.card?.grid_rows) || 4),
        action_placement_index: Math.max(0, Number(config.card?.action_placement_index) || 0),
        row: {
          row_no: 1,
          divider_after: !!row?.divider_after,
          columns,
        },
      },
    };
  }

  deserializeMobileCardBuilderState(config: any): MobileCardBuilderState {
    const normalized = this.normalizeMobileCardConfig(config);
    const maxColumns = Math.max(1, Number((normalized.card as any)?.grid_columns) || 4);
    const maxRows = Math.max(1, Number((normalized.card as any)?.grid_rows) || 4);

    const row: any = normalized.card.row || {};
    const columns: MobileCardBuilderColumn[] = (row.columns || []).map((column: any) => {
      const { field_name, label, type, align, format, label_position, ...extras } = column || {};
      const extrasJson = Object.keys(extras).length > 0 ? JSON.stringify(extras, null, 2) : this.getDefaultExtrasJsonForType(type || 'text');

      return {
        id: this.nextMobileCardBuilderId('col'),
        field_name: field_name ?? null,
        label: label || '',
        type: (type || 'text') as MobileCardBuilderColumn['type'],
        col_span: Math.max(1, Math.min(maxColumns, Number((column as any)?.col_span) || 1)),
        row_span: Math.max(1, Math.min(maxRows, Number((column as any)?.row_span) || 1)),
        align: (align || 'left') as MobileCardBuilderColumn['align'],
        format: format || '',
        label_position: (label_position || '') as MobileCardBuilderColumn['label_position'],
        show_label: column?.show_label !== false,
        extras_json: extrasJson,
      };
    });

    const deserializedRow: MobileCardBuilderRow = {
      id: this.nextMobileCardBuilderId('row'),
      row_no: 1,
      divider_after: !!row.divider_after,
      columns,
    };

    return {
      view_type: 'card',
      card: {
        style: normalized.card.style,
        shape: normalized.card.shape,
        grid_columns: Math.max(1, Number((normalized.card as any)?.grid_columns) || 4),
        grid_rows: Math.max(1, Number((normalized.card as any)?.grid_rows) || 4),
        action_placement_index: Math.max(0, Number((normalized.card as any)?.action_placement_index) || 0),
        row: columns.length > 0 ? deserializedRow : this.getDefaultMobileCardBuilderState().card.row,
      },
    };
  }

  serializeMobileCardBuilderState(state: MobileCardBuilderState): any {
    const maxColumns = Math.max(1, Number(state.card.grid_columns) || 1);
    const maxRows = Math.max(1, Number(state.card.grid_rows) || 1);

    const row = state.card.row;
    const columns = row.columns.map((column, colIndex) => {
      const extras = this.parseOptionalJsonObject(column.extras_json || '', `column extras for column ${colIndex + 1}`) || {};

      const base: any = {
        field_name: column.field_name,
        type: column.type,
        col_span: Math.max(1, Math.min(maxColumns, Number(column.col_span) || 1)),
        row_span: Math.max(1, Math.min(maxRows, Number(column.row_span) || 1)),
        align: column.align,
      };

      if ((column.label || '').trim()) {
        base.label = column.label.trim();
      }
      if ((column.format || '').trim()) {
        base.format = column.format.trim();
      }
      if ((column.label_position || '').trim()) {
        base.label_position = column.label_position.trim();
      }
      base.show_label = !!column.show_label;

      return {
        ...base,
        ...extras,
      };
    });

    const serializedRow = {
      row_no: 1,
      divider_after: !!row.divider_after,
      columns,
    };

    return {
      view_type: 'card',
      card: {
        style: state.card.style,
        shape: state.card.shape,
        grid_columns: Math.max(1, Number(state.card.grid_columns) || 4),
        grid_rows: Math.max(1, Number(state.card.grid_rows) || 4),
        row: serializedRow,
      },
    };
  }

  // Configuration sync
  ensureMobileCardConfigInitialized(): void {
    const mobileCardControl = this._form.get('mobileCardViewConfig');
    if ((mobileCardControl?.value || '').trim()) {
      return;
    }

    const entityConfigurations = this._parseJsonSafe(this._form.get('entity_configurations')?.value, {}) || {};
    const extracted = this.extractMobileCardConfig(entityConfigurations);
    if (extracted) {
      mobileCardControl?.setValue(this._prettyJSON(extracted), { emitEvent: false });
      return;
    }

    mobileCardControl?.setValue(this._prettyJSON(this.buildDefaultMobileCardConfigFromLineItems()), { emitEvent: false });
  }

  syncMobileCardConfigIntoEntityConfigurations(): void {
    const entityConfigurationsControl = this._form.get('entity_configurations');
    const mobileCardControl = this._form.get('mobileCardViewConfig');
    const entityConfigurations = this._parseJsonSafe(entityConfigurationsControl?.value, {}) || {};
    const mobileCardRaw = (mobileCardControl?.value || '').trim();

    if (!mobileCardRaw) {
      delete entityConfigurations.mobile_view;
      entityConfigurationsControl?.setValue(this._prettyJSON(entityConfigurations), { emitEvent: false });
      return;
    }

    const mobileCardConfig = this.normalizeMobileCardConfig(JSON.parse(mobileCardRaw));

    entityConfigurations.mobile_view = mobileCardConfig;

    entityConfigurationsControl?.setValue(this._prettyJSON(entityConfigurations), { emitEvent: false });
    mobileCardControl?.setValue(this._prettyJSON(mobileCardConfig), { emitEvent: false });
  }

  // Grid bounds normalization
  normalizeMobileCardGridBounds(): void {
    const cols = Math.max(this.mobileCardBuilderGridColumnsMin, Math.floor(Number(this.mobileCardBuilderState.card.grid_columns) || 1));
    const rows = Math.max(this.mobileCardBuilderGridRowsMin, Math.floor(Number(this.mobileCardBuilderState.card.grid_rows) || 1));

    this.mobileCardBuilderState.card.grid_columns = cols;
    this.mobileCardBuilderState.card.grid_rows = rows;

    this.mobileCardBuilderRows.forEach((row) => {
      row.columns.forEach((column) => {
        column.col_span = Math.max(1, Math.min(cols, Number(column.col_span) || 1));
        column.row_span = Math.max(1, Math.min(rows, Number(column.row_span) || 1));
      });
    });
  }

  // Event handlers
  onMobileCardGridColumnsChange(value: number): void {
    this.mobileCardBuilderState.card.grid_columns = Math.floor(Number(value) || 1);
    this.normalizeMobileCardGridBounds();
  }

  onMobileCardGridRowsChange(value: number): void {
    this.mobileCardBuilderState.card.grid_rows = Math.floor(Number(value) || 1);
    this.normalizeMobileCardGridBounds();
  }

  getMobileCardRowDropListId(rowId: string): string {
    return `mobile-card-row-${rowId}`;
  }

  trackByMobileCardColumnId(index: number, column: MobileCardBuilderColumn): string {
    return column.id;
  }

  // Modal handlers
  openMobileCardBuilderModal(): void {
    this.ensureMobileCardConfigInitialized();
    this.mobileCardBuilderError = '';
    const raw = (this._form.get('mobileCardViewConfig')?.value || '').trim();
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        this.mobileCardBuilderState = this.deserializeMobileCardBuilderState(parsed);
      } catch (error: any) {
        this.mobileCardBuilderError = error?.message || 'Invalid mobile card configuration JSON.';
      }
    } else {
      this.mobileCardBuilderState = this.getDefaultMobileCardBuilderState();
    }

    this.normalizeMobileCardGridBounds();
    this.isMobileCardBuilderModalOpen = true;
  }

  closeMobileCardBuilderModal(): void {
    this.isMobileCardBuilderModalOpen = false;
    this.closeMobileCardColumnEditor();
    this.mobileCardBuilderError = '';
  }

  openMobileCardColumnEditor(rowIndex: number, colIndex: number): void {
    const column = this.mobileCardBuilderRows[rowIndex]?.columns[colIndex];
    if (!column) return;

    this.mobileCardColumnEditTarget = { rowIndex, colIndex };
    this.mobileCardColumnDraft = {
      ...column,
      extras_json: column.extras_json || this.getDefaultExtrasJsonForType(column.type),
    };
    this.mobileCardColumnTypeConfig = this.getTypeConfigFromExtras(column.type, this.mobileCardColumnDraft.extras_json);
    this.isMobileCardColumnModalOpen = true;
  }

  closeMobileCardColumnEditor(): void {
    this.isMobileCardColumnModalOpen = false;
    this.mobileCardColumnEditTarget = null;
    this.mobileCardColumnDraft = null;
    this.mobileCardColumnTypeConfig = {};
  }

  openMobileCardPreviewModal(): void {
    this.mobileCardPreviewSearch = '';
    this.selectedMobileCardIndex = null;
    this.selectedCardActions = [];
    this.isMobileCardPreviewModalOpen = true;
  }

  closeMobileCardPreviewModal(): void {
    this.isMobileCardPreviewModalOpen = false;
    this.selectedMobileCardIndex = null;
    this.selectedCardActions = [];
  }

  // WhatsApp-style card interactions
  onMobileCardClick(rowIndex: number): void {
    const row = this.filteredMobileCardPreviewRows[rowIndex];

    if (this.selectedMobileCardIndex === rowIndex) {
      this.selectedMobileCardIndex = null;
      this.selectedCardActions = [];
    } else {
      this.selectedMobileCardIndex = rowIndex;
      this.selectedCardActions = this.getMobileCardActionsFromRow(row);
    }
  }

  getMobileCardActionsFromRow(row: any): any[] {
    // Simulated API response - in production this comes from backend
    const availableActions = [
      { action_type: this._commonConfig.ACTION_TYPE.VIEW, icon: 'fa-regular fa-eye', label: 'View' },
      { action_type: this._commonConfig.ACTION_TYPE.EDIT, icon: 'fa-regular fa-pen-to-square', label: 'Edit' },
      { action_type: this._commonConfig.ACTION_TYPE.DELETE, icon: 'fa-regular fa-trash-can', label: 'Delete' },
      { action_type: 'share', icon: 'fa-regular fa-share-nodes', label: 'Share' },
    ];

    if (row.status === 'active') {
      availableActions.push({ action_type: this._commonConfig.ACTION_TYPE.EXPORT_PDF, icon: 'fa-regular fa-file-pdf', label: 'Export PDF' });
    }

    return availableActions;
  }

  onMobileCardActionBarClick(action: any): void {
    const actionType = action.action_type;
    const actionLabel = action.label || actionType;

    // Handle action based on type
    switch (actionType) {
      case this._commonConfig.ACTION_TYPE.VIEW:
        console.log('View action clicked');
        this.toastr.info(`${actionLabel} action triggered`);
        break;

      case this._commonConfig.ACTION_TYPE.EDIT:
        console.log('Edit action clicked');
        this.toastr.info(`${actionLabel} action triggered`);
        break;

      case this._commonConfig.ACTION_TYPE.DELETE:
        console.log('Delete action clicked');
        this.toastr.warning(`${actionLabel} action triggered`);
        break;

      case 'share':
        console.log('Share action clicked');
        this.toastr.info(`${actionLabel} action triggered`);
        break;

      case this._commonConfig.ACTION_TYPE.EXPORT_PDF:
        console.log('Export PDF action clicked');
        this.toastr.info(`${actionLabel} action triggered`);
        break;

      default:
        console.log(`Unknown action: ${actionType}`);
        this.toastr.info(`${actionLabel} action triggered`);
    }

    // Deselect card after action
    this.selectedMobileCardIndex = null;
    this.selectedCardActions = [];
  }

  isCardSelected(rowIndex: number): boolean {
    return this.selectedMobileCardIndex === rowIndex;
  }

  getMobileCardPreviewValue(column: MobileCardBuilderColumn, rowIndex: number): string {
    const row = this.filteredMobileCardPreviewRows[rowIndex];
    if (!row) return '';
    if (column.field_name === 'title') return row.title;
    if (column.field_name === 'status') return row.status;
    if (column.field_name === 'subtitle') return row.subtitle;
    return 'Sample Value';
  }

  // Column editor
  saveMobileCardColumnEditor(): void {
    if (!this.mobileCardColumnDraft || !this.mobileCardColumnEditTarget) {
      return;
    }

    try {
      const { rowIndex, colIndex } = this.mobileCardColumnEditTarget;
      const target = this.mobileCardBuilderRows[rowIndex]?.columns[colIndex];
      if (!target) {
        this.closeMobileCardColumnEditor();
        return;
      }

      target.field_name = this.mobileCardColumnDraft.field_name;
      target.type = this.mobileCardColumnDraft.type;
      target.label = this.mobileCardColumnDraft.label;
      const maxColumns = Math.max(1, Number(this.mobileCardBuilderState.card.grid_columns) || 1);
      const maxRows = Math.max(1, Number(this.mobileCardBuilderState.card.grid_rows) || 1);
      target.col_span = Math.max(1, Math.min(maxColumns, Number(this.mobileCardColumnDraft.col_span) || 1));
      target.row_span = Math.max(1, Math.min(maxRows, Number(this.mobileCardColumnDraft.row_span) || 1));
      target.align = this.mobileCardColumnDraft.align;
      target.format = '';
      target.label_position = this.mobileCardColumnDraft.label_position;
      target.show_label = this.mobileCardColumnDraft.show_label;
      target.extras_json = this.buildExtrasJsonFromTypeConfig(this.mobileCardColumnDraft.type, this.mobileCardColumnTypeConfig);

      this.normalizeMobileCardGridBounds();
      this.closeMobileCardColumnEditor();
    } catch (error: any) {
      this.mobileCardBuilderError = error?.message || 'Invalid column configuration JSON.';
    }
  }

  setMobileCardColumnAlignment(column: MobileCardBuilderColumn, align: 'left' | 'center' | 'right'): void {
    column.align = align;
  }

  submitMobileCardBuilderModal(): void {
    try {
      const serialized = this.serializeMobileCardBuilderState(this.mobileCardBuilderState);
      this._form.get('mobileCardViewConfig')?.setValue(this._prettyJSON(serialized), { emitEvent: false });
      this.syncMobileCardConfigIntoEntityConfigurations();
      this.toastr.success('Mobile card view JSON updated.');
      this.closeMobileCardBuilderModal();
    } catch (error: any) {
      this.mobileCardBuilderError = error?.message || 'Failed to transform playground data to JSON.';
    }
  }

  // Column management
  addMobileCardColumnFromPalette(rowIndex: number, field: MobileCardBuilderPaletteField): void {
    this.mobileCardBuilderRows[rowIndex]?.columns.push(this.createBuilderColumn(field));
  }

  removeMobileCardColumn(rowIndex: number, colIndex: number): void {
    this.mobileCardBuilderRows[rowIndex]?.columns.splice(colIndex, 1);
  }

  onMobileCardColumnTypeChange(column: MobileCardBuilderColumn): void {
    this.mobileCardColumnTypeConfig = this.getDefaultTypeConfig(column.type);
    if (column.type !== 'text') {
      column.format = '';
    }
  }

  // Drag & drop
  dropMobileCardColumns(event: CdkDragDrop<MobileCardBuilderColumn[]>, rowIndex: number): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      return;
    }

    if (event.previousContainer.id === 'mobile-card-palette') {
      const palette = event.previousContainer.data as unknown as MobileCardBuilderPaletteField[];
      const paletteField = palette[event.previousIndex];
      if (!paletteField) return;
      this.mobileCardBuilderRows[rowIndex].columns.splice(event.currentIndex, 0, this.createBuilderColumn(paletteField));
      return;
    }

    transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
  }
}
