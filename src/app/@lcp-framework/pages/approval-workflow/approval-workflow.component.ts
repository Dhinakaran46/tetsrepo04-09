import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Location, CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { Title } from '@angular/platform-browser';
import { ToastrService } from 'ngx-toastr';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { NgSelectModule } from '@ng-select/ng-select';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';

import { initialState } from '../../../store/index.reducer';
import { CommonSharedModule } from '../../shared/common/common.module';
import { GridApiService } from '../../service/common/grid.service';
import { MenuMapService } from '../../service/common/menu-map.service';
import { LocalStorageService } from '../../service/common/local-storage.service';
import { commonConfig } from '../../config/common.config';

export const OPERATORS = [
  { label: 'Equals', value: 'equals', symbol: '=' },
  { label: 'Not equals', value: 'not_equals', symbol: '!=' },
  { label: 'Greater than', value: 'greater_than', symbol: '>' },
  { label: 'Less than', value: 'less_than', symbol: '<' },
  { label: 'Contains', value: 'contains', symbol: 'contains' },
];

export const ENUM_OPERATORS = [
  { label: 'In', value: 'in', symbol: 'in' },
  { label: 'Not In', value: 'not_in', symbol: 'not_in' },
];

@Component({
  selector: 'app-approval-workflow',
  standalone: true,
  imports: [CommonSharedModule, CommonModule, ReactiveFormsModule, FormsModule, MonacoEditorModule, NgSelectModule, DragDropModule],
  templateUrl: './approval-workflow.component.html',
  styleUrl: './approval-workflow.component.scss',
  animations: [
    trigger('slideDownUp', [
      state('true', style({ height: '*', opacity: 1 })),
      state('false', style({ height: '0px', opacity: 0 })),
      transition('false <=> true', animate('300ms ease-in-out')),
    ]),
  ],
})
export class ApprovalWorkflowComponent implements OnInit {
  store: any = initialState;
  form!: FormGroup;
  config: any = {};

  id: string | null = null;
  editTitle = false;
  submitted = false;
  loading = false;

  // Reference data
  modules: any[] = [];
  moduleRuleOptions: any[] = [];
  moduleApproveQueryLineItems: any[] = [];
  moduleRejectQueryLineItems: any[] = [];
  emailTemplateList: { id: number; name: string }[] = [];
  whatsappTemplateList: { id: number; name: string }[] = [];

  operators = OPERATORS;
  showConditionsModal = false;
  committedConditions: any[] = [];
  conditionsDraftBackup: any[] = [];
  approverTypes = [
    { label: 'Tag', value: 'tag' },
    { label: 'User', value: 'user_id' },
    { label: 'Role', value: 'role_id' },
  ];

  editorOptions = { theme: 'vs-dark', language: 'json', tabSize: 2, insertSpaces: true, minimap: { enabled: false }, automaticLayout: true };
  queryEditorOptions = { theme: 'vs-dark', language: 'sql', tabSize: 2, insertSpaces: true, minimap: { enabled: false }, automaticLayout: true };

  // ── JSON schemas ────────────────────────────────────────────────────────────

  insert_json_schema: any = {
    action: ['insert', 'insert'],
    table: ['approval_workflows', 'approval_workflow_assignments'],
    table_mapping: ['table1', 'table2'],
    data: { table1: [], table2: [] },
  };

  update_json_schema: any = {
    action: ['update', 'hard_delete', 'insert'],
    table: ['approval_workflows', 'approval_workflow_assignments', 'approval_workflow_assignments'],
    table_mapping: ['table1', 'table2', 'table3'],
    data: { table1: [], table3: [] },
    conditions: { table1: [], table2: [] },
  };

  constructor(
    private fb: FormBuilder,
    private gridApiService: GridApiService,
    private commonService: MenuMapService,
    private toastr: ToastrService,
    private route: ActivatedRoute,
    public localStorageService: LocalStorageService,
    public storeData: Store<any>,
    public location: Location,
    private translate: TranslateService,
    private titleService: Title,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    this.initStore();
    this.config = this.parseJSONSafe(this.localStorageService.getData('config')) || {};
    this.id = this.route.snapshot.params['uuid'] || null;
    this.editTitle = !!this.id;
    this.initForm();
    this.titleChange();

    await this.loadModules();
    await this.loadEmailTemplates();
    await this.loadWhatsappTemplates();

    if (this.id) {
      this.loadData(this.id);
    } else {
      this.addLevel();
    }
  }

  initStore() {
    this.storeData
      .select((d: any) => d.index)
      .subscribe((d: any) => {
        queueMicrotask(() => {
          this.store = d;
          this.cdr.detectChanges();
        });
      });
  }

  titleChange() {
    this.titleService.setTitle(this.translate.instant(this.editTitle ? 'title_edit_entity' : 'title_add_entity'));
  }

  initForm() {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      slug: ['', [Validators.required, Validators.maxLength(100)]],
      url: [''],
      description: [''],
      status_id: [1],
      approval_workflow_module_id: [null, Validators.required],
      query_information: [''],
      conditions: this.fb.array([]),
      levels: this.fb.array([]),
    });
  }

  // ── Reference data ──────────────────────────────────────────────────────────

  async loadModules() {
    return new Promise<void>((resolve) => {
      const params = {
        company_id: 1,
        primary_table: 'master_approval_workflows',
        start_index: 0,
        limit_range: 1000,
        sort_columns: [['master_approval_workflows.entity_name', 'asc']],
        search_all: [{ column_name: 'master_approval_workflows.status_id', value: 3, operator: '!=' }],
        select_columns: [
          [
            'master_approval_workflows.id, master_approval_workflows.name, master_approval_workflows.entity_name, master_approval_workflows.primary_table, master_approval_workflows.query_information, master_approval_workflows.approve_mail_id, master_approval_workflows.reject_mail_id, master_approval_workflows.approve_whatsapp_id, master_approval_workflows.reject_whatsapp_id',
          ],
        ],
      };
      this.gridApiService.getAllList(params).subscribe(
        (res: any) => {
          if (res.status && res.code === 200) {
            this.modules = (res.data.records || []).map((module: any) => ({
              ...module,
              entity_name: module.entity_name || module.name,
            }));
          }
          resolve();
        },
        () => {
          resolve();
        }
      );
    });
  }

  async loadEmailTemplates() {
    return new Promise<void>((resolve) => {
      const payload = {
        company_id: 1,
        primary_table: 'notification_templates',
        start_index: 0,
        limit_range: 1000,
        search_all: [
          { value: 'email', operator: '=', column_name: 'notification_templates.notification_type' },
          { value: 3, operator: '!=', column_name: 'notification_templates.status_id' },
        ],
        select_columns: [['notification_templates.id'], ['notification_templates.name']],
      };
      this.commonService.getCommonList(payload).subscribe({
        next: (res: any) => {
          if (res.status) this.emailTemplateList = res.data.records;
          resolve();
        },
        error: () => resolve(),
      });
    });
  }

  async loadWhatsappTemplates() {
    return new Promise<void>((resolve) => {
      const payload = {
        company_id: 1,
        primary_table: 'notification_templates',
        start_index: 0,
        limit_range: 1000,
        search_all: [
          { value: 'whatsapp', operator: '=', column_name: 'notification_templates.notification_type' },
          { value: 3, operator: '!=', column_name: 'notification_templates.status_id' },
        ],
        select_columns: [['notification_templates.id'], ['notification_templates.name']],
      };
      this.commonService.getCommonList(payload).subscribe({
        next: (res: any) => {
          if (res.status) this.whatsappTemplateList = res.data.records;
          resolve();
        },
        error: () => resolve(),
      });
    });
  }

  onModuleChange(moduleSelection: any, mode: 'reset' | 'preserve' = 'reset') {
    const moduleId = typeof moduleSelection === 'object' && moduleSelection !== null ? moduleSelection.id : moduleSelection;
    const conditionsArray = this.form.get('conditions') as FormArray;
    conditionsArray.clear();
    this.moduleRuleOptions = [];
    this.moduleApproveQueryLineItems = [];
    this.moduleRejectQueryLineItems = [];
    this.committedConditions = [];
    this.conditionsDraftBackup = [];
    if (!moduleId) return;

    const selectedModule = this.modules.find((m: any) => Number(m.id) === Number(moduleId));
    const selectedTableName = selectedModule?.primary_table || '';

    const params = {
      company_id: 1,
      primary_table: 'master_approval_workflow_line_items',
      start_index: 0,
      limit_range: 1000,
      sort_columns: [['master_approval_workflow_line_items.order_no', 'asc']],
      search_all: [
        { column_name: 'master_approval_workflow_line_items.master_approval_workflow_id', value: moduleId, operator: '=' },
        { column_name: 'master_approval_workflow_line_items.status_id', value: 3, operator: '!=' },
      ],
      select_columns: [
        [
          'master_approval_workflow_line_items.id, master_approval_workflow_line_items.type, master_approval_workflow_line_items.default_query, master_approval_workflow_line_items.field_name, master_approval_workflow_line_items.display_name, master_approval_workflow_line_items.field_type_id, master_approval_workflow_line_items.enum_values, master_approval_workflow_line_items.order_no, master_approval_workflow_line_items.approve_query_information, master_approval_workflow_line_items.reject_query_information',
        ],
      ],
    };

    this.gridApiService.getAllList(params).subscribe(
      (res: any) => {
        if (res.status && res.code === 200) {
          const records = res.data.records || [];

          this.moduleRuleOptions = records
            .filter((item: any) => !this.isApproveQueryLineItem(item) && !this.isRejectQueryLineItem(item))
            .map((item: any) => ({
              ...item,
              table_name: selectedTableName,
              enum_source: item?.enum_values,
              enum_values: [],
            }));

          this.moduleApproveQueryLineItems = records
            .filter((item: any) => this.isApproveQueryLineItem(item))
            .sort((a: any, b: any) => Number(a?.order_no || 0) - Number(b?.order_no || 0))
            .map((item: any) => ({
              ...item,
              label: `${item.display_name || item.field_name || 'Approve Query'}${item.default_query ? ' (Default)' : ''}`,
              approve_query_information: this.normalizeTextArray(item.approve_query_information),
            }));

          this.moduleRejectQueryLineItems = records
            .filter((item: any) => this.isRejectQueryLineItem(item))
            .sort((a: any, b: any) => Number(a?.order_no || 0) - Number(b?.order_no || 0))
            .map((item: any) => ({
              ...item,
              label: `${item.display_name || item.field_name || 'Reject Query'}${item.default_query ? ' (Default)' : ''}`,
              reject_query_information: this.normalizeTextArray(item.reject_query_information),
            }));

          this.applyModuleDefaultsToLevels(selectedModule, mode === 'preserve');
          this.syncLevelQuerySelectionsFromStoredInfo(mode === 'preserve');

          void this.syncConditionsWithModuleRuleOptions();
        }
      },
      () => this.toastr.error(this.translate.instant('error'), 'Error')
    );
  }

  private isApproveQueryLineItem(item: any): boolean {
    return String(item?.type || '') === 'approve_query';
  }

  private isRejectQueryLineItem(item: any): boolean {
    return String(item?.type || '') === 'reject_query';
  }

  private normalizeTextArray(value: any): string[] {
    if (Array.isArray(value)) {
      return value.map((item: any) => (item === null || item === undefined ? '' : String(item).trim())).filter((item: string) => !!item);
    }

    if (value === null || value === undefined) return [];

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return [];
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((item: any) => (item === null || item === undefined ? '' : String(item).trim())).filter((item: string) => !!item);
        }
      } catch {
        return [trimmed];
      }
      return [trimmed];
    }

    return [String(value).trim()].filter((item) => !!item);
  }

  private getCurrentSelectedModule(): any {
    const moduleId = this.form.get('approval_workflow_module_id')?.value;
    return this.modules.find((m: any) => String(m.id) === String(moduleId));
  }

  private getDefaultApproveQueryLineItemId(): number | null {
    if (!this.moduleApproveQueryLineItems.length) return null;
    const defaultItem = this.moduleApproveQueryLineItems.find((item: any) => !!item.default_query) || this.moduleApproveQueryLineItems[0];
    return defaultItem?.id ?? null;
  }

  private getDefaultRejectQueryLineItemId(): number | null {
    if (!this.moduleRejectQueryLineItems.length) return null;
    const defaultItem = this.moduleRejectQueryLineItems.find((item: any) => !!item.default_query) || this.moduleRejectQueryLineItems[0];
    return defaultItem?.id ?? null;
  }

  private applyModuleDefaultsToLevels(selectedModule: any, onlyWhenEmpty: boolean): void {
    const levelsArray = this.form.get('levels') as FormArray;
    if (!levelsArray?.length) return;

    const lastIndex = levelsArray.length - 1;
    levelsArray.controls.forEach((ctrl: any, index: number) => {
      this.applyModuleDefaultsToLevel(ctrl as FormGroup, selectedModule, onlyWhenEmpty, index === lastIndex);
    });
  }

  private applyModuleDefaultsToLevel(levelGroup: FormGroup, selectedModule: any, onlyWhenEmpty: boolean, setQueryDefaultForLevel: boolean): void {
    const patchData: any = {};

    const setTemplateDefault = (controlName: string, moduleValue: any) => {
      if (!levelGroup.get(controlName)) return;
      const currentValue = levelGroup.get(controlName)?.value;
      if (!onlyWhenEmpty || currentValue === null || currentValue === undefined || currentValue === '') {
        patchData[controlName] = moduleValue ?? null;
      }
    };

    setTemplateDefault('accept_email', selectedModule?.approve_mail_id);
    setTemplateDefault('reject_email', selectedModule?.reject_mail_id);
    setTemplateDefault('accept_whatsapp', selectedModule?.approve_whatsapp_id);
    setTemplateDefault('reject_whatsapp', selectedModule?.reject_whatsapp_id);

    const setQueryLineItemDefault = (controlName: string, defaultId: number | null) => {
      if (!levelGroup.get(controlName)) return;
      const currentSelection = levelGroup.get(controlName)?.value;
      if (setQueryDefaultForLevel) {
        if (!onlyWhenEmpty || currentSelection === null || currentSelection === undefined || currentSelection === '') {
          patchData[controlName] = defaultId;
        }
      } else if (!onlyWhenEmpty) {
        patchData[controlName] = null;
      }
    };

    setQueryLineItemDefault('approve_query_line_item_id', this.getDefaultApproveQueryLineItemId());
    setQueryLineItemDefault('reject_query_line_item_id', this.getDefaultRejectQueryLineItemId());

    if (Object.keys(patchData).length) {
      levelGroup.patchValue(patchData, { emitEvent: false });
    }

    const selectedApproveQueryLineItemId = levelGroup.get('approve_query_line_item_id')?.value;
    if (selectedApproveQueryLineItemId !== null && selectedApproveQueryLineItemId !== undefined && selectedApproveQueryLineItemId !== '') {
      this.onLevelApproveQuerySelectionChange(levelGroup);
    } else if (!onlyWhenEmpty) {
      levelGroup.patchValue({ approve_query_information: [] }, { emitEvent: false });
    }

    const selectedRejectQueryLineItemId = levelGroup.get('reject_query_line_item_id')?.value;
    if (selectedRejectQueryLineItemId !== null && selectedRejectQueryLineItemId !== undefined && selectedRejectQueryLineItemId !== '') {
      this.onLevelRejectQuerySelectionChange(levelGroup);
    } else if (!onlyWhenEmpty) {
      levelGroup.patchValue({ reject_query_information: [] }, { emitEvent: false });
    }
  }

  private arraysEqual(left: string[], right: string[]): boolean {
    if (left.length !== right.length) return false;
    for (let i = 0; i < left.length; i++) {
      if (left[i] !== right[i]) return false;
    }
    return true;
  }

  private syncLevelQuerySelectionsFromStoredInfo(onlyWhenEmpty: boolean): void {
    const levelsArray = this.form.get('levels') as FormArray;
    if (!levelsArray?.length) return;
    if (!this.moduleApproveQueryLineItems.length && !this.moduleRejectQueryLineItems.length) return;

    const lastIndex = levelsArray.length - 1;

    levelsArray.controls.forEach((ctrl: any, index: number) => {
      const levelGroup = ctrl as FormGroup;
      const isLastLevel = index === lastIndex;

      this.syncLevelQuerySelectionForType(
        levelGroup,
        'approve_query_line_item_id',
        'approve_query_information',
        this.moduleApproveQueryLineItems,
        onlyWhenEmpty,
        isLastLevel
      );
      this.syncLevelQuerySelectionForType(
        levelGroup,
        'reject_query_line_item_id',
        'reject_query_information',
        this.moduleRejectQueryLineItems,
        onlyWhenEmpty,
        isLastLevel
      );
    });
  }

  private syncLevelQuerySelectionForType(
    levelGroup: FormGroup,
    idControlName: 'approve_query_line_item_id' | 'reject_query_line_item_id',
    infoControlName: 'approve_query_information' | 'reject_query_information',
    lineItems: any[],
    onlyWhenEmpty: boolean,
    isLastLevel: boolean
  ): void {
    if (!lineItems.length) return;

    const currentId = levelGroup.get(idControlName)?.value;
    const hasCurrentId = currentId !== null && currentId !== undefined && currentId !== '';

    if (!(onlyWhenEmpty && hasCurrentId)) {
      if (!isLastLevel && !hasCurrentId) {
        if (!onlyWhenEmpty) {
          levelGroup.patchValue({ [infoControlName]: [] }, { emitEvent: false });
        }
        return;
      }

      const currentInfo = this.normalizeTextArray(levelGroup.get(infoControlName)?.value);
      const matchedItem = lineItems.find((item: any) => this.arraysEqual(this.normalizeTextArray(item[infoControlName]), currentInfo));

      if (matchedItem) {
        levelGroup.patchValue({ [idControlName]: matchedItem.id }, { emitEvent: false });
      }
    }

    const selectedId = levelGroup.get(idControlName)?.value;
    if (selectedId !== null && selectedId !== undefined && selectedId !== '') {
      if (idControlName === 'approve_query_line_item_id') {
        this.onLevelApproveQuerySelectionChange(levelGroup);
      } else {
        this.onLevelRejectQuerySelectionChange(levelGroup);
      }
    }
  }

  onLevelApproveQuerySelectionChange(levelGroup: FormGroup): void {
    const selectedId = levelGroup.get('approve_query_line_item_id')?.value;
    const selectedItem = this.moduleApproveQueryLineItems.find((item: any) => String(item.id) === String(selectedId));

    levelGroup.patchValue(
      { approve_query_information: selectedItem ? this.normalizeTextArray(selectedItem.approve_query_information) : [] },
      { emitEvent: false }
    );
  }

  onLevelRejectQuerySelectionChange(levelGroup: FormGroup): void {
    const selectedId = levelGroup.get('reject_query_line_item_id')?.value;
    const selectedItem = this.moduleRejectQueryLineItems.find((item: any) => String(item.id) === String(selectedId));

    levelGroup.patchValue(
      { reject_query_information: selectedItem ? this.normalizeTextArray(selectedItem.reject_query_information) : [] },
      { emitEvent: false }
    );
  }
  async syncConditionsWithModuleRuleOptions() {
    const conditionsArray = this.form.get('conditions') as FormArray;
    for (const ctrl of conditionsArray.controls as any[]) {
      const fieldName = ctrl.get('field_name')?.value;
      if (!fieldName) continue;
      const ruleOption = this.moduleRuleOptions.find((r: any) => r.field_name === fieldName);
      if (!ruleOption) continue;

      await this.applyRuleOptionToCondition(ctrl, ruleOption, false);
    }
  }

  private parseJSONSafe(value: any): any {
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  private resolveRuleEnumConfig(enumSource: any): any {
    let enumObj: any;
    try {
      enumObj = enumSource ? JSON.parse(JSON.stringify(enumSource)) : {};
    } catch {
      enumObj = enumSource ?? {};
    }

    enumObj = this.parseJSONSafe(enumObj);

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
        try {
          enumObj = rawConfig ? JSON.parse(JSON.stringify(rawConfig)) : {};
        } catch {
          enumObj = rawConfig ?? {};
        }
      }
    }

    if (Array.isArray(enumObj)) {
      enumObj = { type: 'array', value: enumObj };
    }

    if (enumSource?.filter) {
      enumObj.value = this.localStorageService.formatEnumColumnFilters(enumObj.value, enumSource?.filter || null);
    }

    return enumObj ?? {};
  }

  private mapPrimitiveOrObjectOption(item: any): { label: any; value: any } {
    if (item && typeof item === 'object') {
      return {
        label: item.label ?? item.name ?? item.value ?? item.id ?? '',
        value: item.value ?? item.id ?? item.label ?? item.name ?? '',
      };
    }
    return { label: item, value: item };
  }

  async getRuleEnumValueOptions(enumSource: any): Promise<Array<{ label: any; value: any }>> {
    const enumObj = this.resolveRuleEnumConfig(enumSource);
    if (!enumObj?.type) return [];

    if (enumObj.type === 'master' || enumObj.type === 'autocomplete') {
      const payload = this.parseJSONSafe(enumObj.value);
      if (!payload || typeof payload !== 'object') return [];
      try {
        const response = await this.gridApiService.getListData(payload).toPromise();
        if (response?.status && response?.data?.records) {
          return response.data.records.map((option: any) => ({
            label: enumObj.optionKey ? option?.[enumObj.optionKey] : option?.label ?? option?.name ?? option?.value,
            value: enumObj.optionValue ? option?.[enumObj.optionValue] : option?.value ?? option?.id ?? option?.label,
          }));
        }
      } catch {
        return [];
      }
      return [];
    }

    const rawValues = this.parseJSONSafe(enumObj.value);

    if (enumObj.type === 'array') {
      if (!Array.isArray(rawValues)) return [];
      return rawValues
        .map((value: any) => ({
          label: typeof value === 'string' ? value.trim() : value,
          value: typeof value === 'string' ? value.trim() : value,
        }))
        .filter((item: any) => item.value !== '' && item.value !== null && item.value !== undefined);
    }

    if (enumObj.type === 'json') {
      if (!rawValues || !Array.isArray(rawValues)) return [];
      return rawValues.map((value: any) => ({
        label: enumObj.optionKey ? value?.[enumObj.optionKey] : value?.label,
        value: enumObj.optionValue ? value?.[enumObj.optionValue] : value?.value,
      }));
    }

    return [];
  }

  private async applyRuleOptionToCondition(conditionGroup: FormGroup, ruleOption: any, resetValue: boolean) {
    const options = await this.getRuleEnumValueOptions(ruleOption.enum_source ?? ruleOption.enum_values);
    const currentValue = conditionGroup.get('value')?.value;
    const hasEnum = options.length > 0;
    const isEnumOperator = ['in', 'not_in'].includes(conditionGroup.get('operator')?.value);

    let nextValue: any = '';
    if (hasEnum) {
      const currentValues = Array.isArray(currentValue)
        ? currentValue
        : currentValue !== null && currentValue !== undefined && String(currentValue).trim() !== ''
        ? [currentValue]
        : [];
      const filteredValues = currentValues.filter((val: any) => options.some((option: any) => String(option.value) === String(val)));
      nextValue = resetValue ? [] : filteredValues;
    } else {
      nextValue = resetValue ? '' : currentValue ?? '';
    }

    conditionGroup.patchValue({
      display_name: ruleOption.display_name || ruleOption.field_name,
      table_name: ruleOption.table_name || '',
      field_type_id: ruleOption.field_type_id,
      enum_values: options,
      operator: hasEnum ? (isEnumOperator ? conditionGroup.get('operator')?.value : 'in') : 'equals',
      value: nextValue,
    });
  }

  getConditionOperators(condGroup: FormGroup): typeof OPERATORS {
    const enumValues = condGroup.get('enum_values')?.value;
    return enumValues?.length > 0 ? ENUM_OPERATORS : OPERATORS;
  }

  // ── Conditions (Common Approval Rules) ─────────────────────────────────────

  get conditionsControls() {
    return (this.form.get('conditions') as FormArray).controls as FormGroup[];
  }

  addCondition() {
    const conditionsArray = this.form.get('conditions') as FormArray;
    conditionsArray.push(
      this.fb.group({
        field_name: ['', Validators.required],
        display_name: [''],
        table_name: [''],
        field_type_id: [null],
        enum_values: [[]],
        operator: ['equals', Validators.required],
        value: ['', Validators.required],
      })
    );
  }

  openConditionsModal() {
    this.conditionsDraftBackup = this.buildConditionsJson();
    this.showConditionsModal = true;
  }

  closeConditionsModal() {
    this.loadConditionsFromJson(this.conditionsDraftBackup || []);
    this.showConditionsModal = false;
  }

  saveConditionsModal() {
    if (!this.isConditionsModalSavable()) return;
    this.committedConditions = this.buildConditionsJson();
    this.conditionsDraftBackup = [...this.committedConditions];
    this.showConditionsModal = false;
  }

  isConditionsModalSavable(): boolean {
    const conditionsArray = this.form.get('conditions') as FormArray;
    if (!conditionsArray?.length) return false;

    return conditionsArray.controls.every((ctrl: any) => {
      const fieldName = ctrl.get('field_name')?.value;
      const operator = ctrl.get('operator')?.value;
      const value = ctrl.get('value')?.value;

      const hasValue = Array.isArray(value) ? value.length > 0 : value !== null && value !== undefined && String(value).trim() !== '';

      return !!fieldName && !!operator && hasValue;
    });
  }

  removeCommittedCondition(index: number) {
    this.removeCondition(index);
    this.committedConditions = this.buildConditionsJson();
    this.conditionsDraftBackup = [...this.committedConditions];
  }

  dropCommittedConditions(event: CdkDragDrop<any[]>) {
    if (event.previousIndex === event.currentIndex) return;
    moveItemInArray(this.committedConditions, event.previousIndex, event.currentIndex);
    this.conditionsDraftBackup = [...this.committedConditions];
    this.loadConditionsFromJson(this.committedConditions);
  }

  removeCondition(index: number) {
    (this.form.get('conditions') as FormArray).removeAt(index);
  }

  dropConditions(event: CdkDragDrop<FormGroup[]>) {
    if (event.previousIndex === event.currentIndex) return;
    const conditionsArray = this.form.get('conditions') as FormArray;
    const movedControl = conditionsArray.at(event.previousIndex);
    conditionsArray.removeAt(event.previousIndex);
    conditionsArray.insert(event.currentIndex, movedControl);
  }

  async onConditionFieldChange(conditionGroup: FormGroup, fieldName: string) {
    const ruleOption = this.moduleRuleOptions.find((r) => r.field_name === fieldName);
    if (ruleOption) {
      await this.applyRuleOptionToCondition(conditionGroup, ruleOption, true);
    }
  }

  private allOperators = [...OPERATORS, ...ENUM_OPERATORS];

  conditionDisplayLabel(cond: any): string {
    const op = this.allOperators.find((o) => o.value === cond.operator);
    const displayValue = Array.isArray(cond.value) ? cond.value.join(', ') : cond.value;
    return `${cond.display_name || cond.field_name} ${op?.symbol || cond.operator} ${displayValue}`;
  }

  buildConditionsJson(): any[] {
    const conditionsArray = this.form.get('conditions') as FormArray;
    return conditionsArray.controls.map((ctrl) => {
      const v = ctrl.value;
      const op = this.allOperators.find((o) => o.value === v.operator);
      const normalizedValue = Array.isArray(v.value)
        ? v.value
        : ['in', 'not_in'].includes(v.operator)
        ? v.value !== null && v.value !== undefined && String(v.value).trim() !== ''
          ? [v.value]
          : []
        : v.value;
      const displayValue = Array.isArray(normalizedValue) ? normalizedValue.join(', ') : normalizedValue;
      return {
        field_name: v.field_name,
        table_name: v.table_name || null,
        display_name: v.display_name || v.field_name,
        operator: v.operator,
        value: normalizedValue,
        display: `${v.display_name || v.field_name} ${op?.symbol || v.operator} ${displayValue}`,
      };
    });
  }

  loadConditionsFromJson(conditions: any[]) {
    const conditionsArray = this.form.get('conditions') as FormArray;
    conditionsArray.clear();
    if (!conditions?.length) return;
    conditions.forEach((c) => {
      const isEnumOperator = ['in', 'not_in'].includes(c.operator);
      const normalizedValue = isEnumOperator
        ? Array.isArray(c.value)
          ? c.value
          : c.value !== null && c.value !== undefined && String(c.value).trim() !== ''
          ? [c.value]
          : []
        : c.value;

      conditionsArray.push(
        this.fb.group({
          field_name: [c.field_name, Validators.required],
          display_name: [c.display_name || ''],
          table_name: [c.table_name || ''],
          field_type_id: [c.field_type_id || null],
          enum_values: [c.enum_values || []],
          operator: [c.operator, Validators.required],
          value: [normalizedValue, Validators.required],
        })
      );
    });
  }

  // ── Levels (Approval Assignments) ──────────────────────────────────────────

  get levelControls() {
    return (this.form.get('levels') as FormArray).controls as FormGroup[];
  }

  addLevel() {
    const levelsArray = this.form.get('levels') as FormArray;
    levelsArray.push(
      this.fb.group({
        id: [0],
        approver_conditional_logic: ['AND', Validators.required],
        approver_type: ['tag', Validators.required],
        approver_order_no: [levelsArray.length + 1, Validators.required],
        approver: [null, Validators.required],
        approve_query_line_item_id: [null],
        reject_query_line_item_id: [null],
        approve_query_information: [[]],
        reject_query_information: [[]],
        accordion: [false],
        user_list: [null],
        role_list: [null],
        tag_list: [null],
        tag: [null],
        users: [null],
        roles: [null],
        approver_candidate: [null],
        accept_email: [null],
        reject_email: [null],
        accept_whatsapp: [null],
        reject_whatsapp: [null],
      })
    );
    const newGroup = this.levelControls[this.levelControls.length - 1];
    this.applyModuleDefaultsToLevel(newGroup, this.getCurrentSelectedModule(), true, true);
    this.loadTagsForLevel(newGroup, this.levelControls.length - 1, '');
  }

  removeLevel(index: number) {
    const levelsArray = this.form.get('levels') as FormArray;
    levelsArray.removeAt(index);
    levelsArray.controls.forEach((ctrl, i) => ctrl.patchValue({ approver_order_no: i + 1 }));
  }

  dropLevels(event: CdkDragDrop<FormGroup[]>) {
    if (event.previousIndex === event.currentIndex) return;
    const levelsArray = this.form.get('levels') as FormArray;
    const movedControl = levelsArray.at(event.previousIndex);
    levelsArray.removeAt(event.previousIndex);
    levelsArray.insert(event.currentIndex, movedControl);
    levelsArray.controls.forEach((ctrl, i) => ctrl.patchValue({ approver_order_no: i + 1 }));
  }

  toggleAccordion(group: FormGroup) {
    group.get('accordion')?.setValue(!group.get('accordion')?.value);

    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 300);
  }

  onApproverTypeChange(group: FormGroup, index: number) {
    group.patchValue({ approver: null, users: null, roles: null, tag: null, approver_candidate: null });
    switch (group.get('approver_type')?.value) {
      case 'role_id':
        this.loadRolesForLevel(group, index, '');
        break;
      case 'user_id':
        this.loadUsersForLevel(group, index, '');
        break;
      default:
        this.loadTagsForLevel(group, index, '');
    }
  }

  updateApproverValue(group: FormGroup) {
    const type = group.get('approver_type')?.value;
    if (type === 'role_id') {
      group.patchValue({ approver: (group.get('roles')?.value || []).join(','), users: null, tag: null });
    } else if (type === 'user_id') {
      group.patchValue({ approver: (group.get('users')?.value || []).join(','), roles: null, tag: null });
    } else {
      group.patchValue({ approver: (group.get('tag')?.value || []).join(','), users: null, roles: null });
    }
  }

  getApproverTypeLabel(type: string): string {
    if (type === 'user_id') return 'Users';
    if (type === 'role_id') return 'Roles';
    return 'Tags';
  }

  getApproverOptions(group: FormGroup): Array<{ label: any; value: any }> {
    const type = group.get('approver_type')?.value;
    if (type === 'user_id') return group.get('user_list')?.value || [];
    if (type === 'role_id') return group.get('role_list')?.value || [];
    return group.get('tag_list')?.value || [];
  }

  getSelectedApproverValues(group: FormGroup): any[] {
    const type = group.get('approver_type')?.value;
    if (type === 'user_id') return group.get('users')?.value || [];
    if (type === 'role_id') return group.get('roles')?.value || [];
    return group.get('tag')?.value || [];
  }

  getApproverDisplayLabel(group: FormGroup, value: any): string {
    const options = this.getApproverOptions(group);
    const option = options.find((item: any) => String(item?.value) === String(value));
    return option?.label || String(value);
  }

  onApproverCandidateSearch(group: FormGroup, index: number, term: string) {
    const type = group.get('approver_type')?.value;
    const search = term || '';
    if (type === 'user_id') {
      this.loadUsersForLevel(group, index, search);
      return;
    }
    if (type === 'role_id') {
      this.loadRolesForLevel(group, index, search);
      return;
    }
    this.loadTagsForLevel(group, index, search);
  }

  addApproverCandidate(group: FormGroup) {
    const type = group.get('approver_type')?.value;
    const candidate = group.get('approver_candidate')?.value;
    if (candidate === null || candidate === undefined || String(candidate).trim() === '') return;

    const controlName = type === 'user_id' ? 'users' : type === 'role_id' ? 'roles' : 'tag';
    const current = group.get(controlName)?.value || [];
    const exists = (current || []).some((item: any) => String(item) === String(candidate));
    if (exists) {
      group.get('approver_candidate')?.setValue(null);
      return;
    }

    group.patchValue({ [controlName]: [...current, candidate], approver_candidate: null });
    this.updateApproverValue(group);
  }

  removeApproverValue(group: FormGroup, value: any) {
    const type = group.get('approver_type')?.value;
    const controlName = type === 'user_id' ? 'users' : type === 'role_id' ? 'roles' : 'tag';
    const current = group.get(controlName)?.value || [];
    const filtered = (current || []).filter((item: any) => String(item) !== String(value));
    group.patchValue({ [controlName]: filtered });
    this.updateApproverValue(group);
  }

  dropApproverValues(event: CdkDragDrop<any[]>, group: FormGroup) {
    if (event.previousIndex === event.currentIndex) return;
    const type = group.get('approver_type')?.value;
    const controlName = type === 'user_id' ? 'users' : type === 'role_id' ? 'roles' : 'tag';
    const current = [...(group.get(controlName)?.value || [])];
    moveItemInArray(current, event.previousIndex, event.currentIndex);
    group.patchValue({ [controlName]: current });
    this.updateApproverValue(group);
  }

  private composeApproverValue(level: any): string | null {
    if (!level) return null;
    if (level.approver_type === 'user_id') {
      const users = Array.isArray(level.users) ? level.users : [];
      return users.length ? users.join(',') : null;
    }
    if (level.approver_type === 'role_id') {
      const roles = Array.isArray(level.roles) ? level.roles : [];
      return roles.length ? roles.join(',') : null;
    }
    const tags = Array.isArray(level.tag) ? level.tag : [];
    return tags.length ? tags.join(',') : null;
  }

  loadUsersForLevel(group: FormGroup, index: number, search: string) {
    const payload: any = {
      company_id: 1,
      primary_table: 'users',
      start_index: 0,
      limit_range: 25,
      sort_columns: [['email', 'asc']],
      search_all: [{ value: 1, operator: '=', column_name: 'status_id' }],
      select_columns: [
        ['id', 'value'],
        ['email', 'label'],
      ],
    };
    if (search) payload.search_all.push({ value: `%${search}%`, operator: 'ILIKE', column_name: 'email' });
    this.commonService.getCommonList(payload).subscribe({
      next: (res: any) => {
        if (res.status) group.get('user_list')?.setValue(res.data.records);
      },
    });
  }

  loadRolesForLevel(group: FormGroup, index: number, search: string) {
    const payload: any = {
      company_id: 1,
      primary_table: 'roles',
      start_index: 0,
      limit_range: 25,
      sort_columns: [['name', 'asc']],
      search_all: [{ value: 1, operator: '=', column_name: 'status_id' }],
      select_columns: [
        ['id', 'value'],
        ['name', 'label'],
      ],
    };
    if (search) payload.search_all.push({ value: `%${search}%`, operator: 'ILIKE', column_name: 'name' });
    this.commonService.getCommonList(payload).subscribe({
      next: (res: any) => {
        if (res.status) group.get('role_list')?.setValue(res.data.records);
      },
    });
  }

  loadTagsForLevel(group: FormGroup, index: number, search: string) {
    const payload: any = {
      company_id: 1,
      primary_table: 'approval_workflow_approver_tags',
      start_index: 0,
      limit_range: 25,
      sort_columns: [['name', 'asc']],
      search_all: [{ value: 1, operator: '=', column_name: 'status_id' }],
      select_columns: [
        ['slug', 'value'],
        ['name', 'label'],
      ],
    };
    if (search) payload.search_all.push({ value: `%${search}%`, operator: 'ILIKE', column_name: 'name' });
    this.commonService.getCommonList(payload).subscribe({
      next: (res: any) => {
        if (res.status) group.get('tag_list')?.setValue(res.data.records);
      },
    });
  }

  // ── Load / Save ─────────────────────────────────────────────────────────────

  loadData(id: string) {
    this.loading = true;
    const params = {
      company_id: 1,
      primary_table: 'approval_workflows',
      start_index: 0,
      limit_range: 1,
      sort_columns: [['approval_workflows.id', 'desc']],
      search_all: [
        { column_name: 'approval_workflows.uuid', value: id, operator: '=' },
        { column_name: 'approval_workflows.status_id', value: 3, operator: '!=' },
      ],
      includes: [
        {
          join_type: 'LEFT',
          table_name: 'approval_workflow_assignments',
          join_condition: 'approval_workflow_assignments.approval_workflow_slug = approval_workflows.slug AND approval_workflow_assignments.status_id != 3',
        },
      ],
      group_by: ['approval_workflows.id'],
      select_columns: [
        ['approval_workflows.*'],
        [
          `COALESCE(JSON_AGG(DISTINCT JSONB_BUILD_OBJECT(
            'id', approval_workflow_assignments.id,
            'approver_order_no', approval_workflow_assignments.approver_order_no,
            'approver_conditional_logic', approval_workflow_assignments.approver_conditional_logic,
            'approver_type', approval_workflow_assignments.approver_type,
            'approver', approval_workflow_assignments.approver,
            'approve_query_information', approval_workflow_assignments.approve_query_information,
            'reject_query_information', approval_workflow_assignments.reject_query_information,
            'approve_mail_id', approval_workflow_assignments.approve_mail_id,
            'reject_mail_id', approval_workflow_assignments.reject_mail_id,
            'approve_whatsapp_id', approval_workflow_assignments.approve_whatsapp_id,
            'reject_whatsapp_id', approval_workflow_assignments.reject_whatsapp_id
          )) FILTER (WHERE approval_workflow_assignments.id IS NOT NULL), '[]')`,
          'assignments',
        ],
      ],
    };

    this.gridApiService.getAllList(params).subscribe(
      (res: any) => {
        this.loading = false;
        if (res.status && res.code === 200 && res.data.records.length) {
          const entity = res.data.records[0];
          this.form.patchValue({
            name: entity.name,
            slug: entity.slug,
            url: entity.url || '',
            description: entity.description || '',
            status_id: entity.status_id,
            approval_workflow_module_id: entity.approval_workflow_module_id || null,
            query_information: entity.query_information || '',
          });

          if (entity.approval_workflow_module_id) {
            this.onModuleChange(entity.approval_workflow_module_id, 'preserve');
          }

          if (entity.approval_workflow_query_conditions) {
            const conds =
              typeof entity.approval_workflow_query_conditions === 'string'
                ? JSON.parse(entity.approval_workflow_query_conditions)
                : entity.approval_workflow_query_conditions;
            this.loadConditionsFromJson(Array.isArray(conds) ? conds : []);
            this.committedConditions = this.buildConditionsJson();
            this.conditionsDraftBackup = [...this.committedConditions];
          } else {
            this.committedConditions = [];
            this.conditionsDraftBackup = [];
          }

          const levelsArray = this.form.get('levels') as FormArray;
          const assignments: any[] = Array.isArray(entity.assignments) ? entity.assignments : [];
          if (assignments.length) {
            assignments
              .sort((a: any, b: any) => a.approver_order_no - b.approver_order_no)
              .forEach((each: any, i: number) => {
                levelsArray.push(
                  this.fb.group({
                    id: [each.id],
                    approver_conditional_logic: [each.approver_conditional_logic || 'AND', Validators.required],
                    approver_type: [each.approver_type || 'tag', Validators.required],
                    approver_order_no: [each.approver_order_no, Validators.required],
                    approver: [each.approver, Validators.required],
                    approve_query_line_item_id: [null],
                    reject_query_line_item_id: [null],
                    approve_query_information: [this.normalizeTextArray(each.approve_query_information)],
                    reject_query_information: [this.normalizeTextArray(each.reject_query_information)],
                    accordion: [false],
                    user_list: [null],
                    role_list: [null],
                    tag_list: [null],
                    tag: [each.approver_type === 'tag' ? each.approver?.split(',') : null],
                    users: [
                      each.approver_type === 'user_id'
                        ? each.approver
                            ?.split(',')
                            .map(Number)
                            .filter((n: number) => !isNaN(n))
                        : null,
                    ],
                    roles: [
                      each.approver_type === 'role_id'
                        ? each.approver
                            ?.split(',')
                            .map(Number)
                            .filter((n: number) => !isNaN(n))
                        : null,
                    ],
                    approver_candidate: [null],
                    accept_email: [each.approve_mail_id || null],
                    reject_email: [each.reject_mail_id || null],
                    accept_whatsapp: [each.approve_whatsapp_id || null],
                    reject_whatsapp: [each.reject_whatsapp_id || null],
                  })
                );
                const group = this.levelControls[i];
                if (each.approver_type === 'tag') this.loadTagsForLevel(group, i, '');
                else if (each.approver_type === 'user_id') this.loadUsersForLevel(group, i, '');
                else if (each.approver_type === 'role_id') this.loadRolesForLevel(group, i, '');
              });

            this.applyModuleDefaultsToLevels(this.getCurrentSelectedModule(), true);
            this.syncLevelQuerySelectionsFromStoredInfo(true);
          } else {
            this.addLevel();
          }
        }
      },
      () => {
        this.loading = false;
        this.toastr.error(this.translate.instant('error'), 'Error');
      }
    );
  }

  onSubmit() {
    this.submitted = true;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastr.error(this.translate.instant('error'), 'Enter all required fields');
      return;
    }

    const formData = this.form.value;
    const slug = String(formData.slug || '').trim();
    const conditions = this.committedConditions || [];
    const queryInformation = this.buildWorkflowQueryInformation(formData.approval_workflow_module_id, conditions);

    const masterRecord = {
      name: formData.name,
      slug,
      url: formData.url || null,
      description: formData.description || null,
      status_id: formData.status_id,
      approval_workflow_module_id: formData.approval_workflow_module_id || null,
      approval_workflow_query_conditions: conditions.length ? JSON.stringify(conditions) : null,
      query_information: queryInformation,
    };

    const levelRecords = formData.levels.map((level: any) => ({
      approval_workflow_slug: '@table1.slug',
      approver_conditional_logic: level.approver_conditional_logic || 'AND',
      approver_type: level.approver_type,
      approver: this.composeApproverValue(level),
      approver_order_no: level.approver_order_no,
      approve_query_information: this.resolveLevelQueryInformation(level, 'approve_query_information'),
      reject_query_information: this.resolveLevelQueryInformation(level, 'reject_query_information'),
      approve_mail_id: level.accept_email || null,
      reject_mail_id: level.reject_email || null,
      approve_whatsapp_id: level.accept_whatsapp || null,
      reject_whatsapp_id: level.reject_whatsapp || null,
      status_id: 1,
      created_by: true,
      updated_by: true,
    }));

    if (levelRecords.some((level: any) => !level.approver)) {
      this.toastr.error(this.translate.instant('error'), 'Please select at least one approver in each level');
      return;
    }

    let payload: any;
    if (this.id) {
      this.update_json_schema.data['table1'] = [{ ...masterRecord, updated_by: true }];
      this.update_json_schema.data['table3'] = levelRecords;
      this.update_json_schema.conditions['table1'] = [{ uuid: this.id }];
      this.update_json_schema.conditions['table2'] = [{ approval_workflow_slug: '@table1.slug' }];
      payload = this.update_json_schema;
    } else {
      this.insert_json_schema.data['table1'] = [{ ...masterRecord, created_by: true }];
      this.insert_json_schema.data['table2'] = levelRecords;
      payload = this.insert_json_schema;
    }

    this.loading = true;
    this.gridApiService.executeRecords(payload).subscribe(
      (res: any) => {
        this.loading = false;
        if (res.status && res.code === 200) {
          const key = this.id ? 'record_updated_successfully' : 'record_inserted_successfully';
          this.toastr.success(this.translate.instant(key));
          this.location.back();
        } else {
          this.toastr.error(this.translate.instant(res.message || 'error'), 'Error');
        }
      },
      () => {
        this.loading = false;
        this.toastr.error(this.translate.instant('error'), 'Error');
      }
    );
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  prettyJSON(data: any): string {
    return JSON.stringify(JSON.parse(JSON.stringify(data)), null, 2);
  }

  parseJSON(data: string): any {
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private resolveLevelQueryInformation(level: any, infoControlName: 'approve_query_information' | 'reject_query_information'): string[] {
    const isApprove = infoControlName === 'approve_query_information';
    const lineItems = isApprove ? this.moduleApproveQueryLineItems : this.moduleRejectQueryLineItems;
    const idControlName = isApprove ? 'approve_query_line_item_id' : 'reject_query_line_item_id';
    const selectedItem = lineItems.find((item: any) => String(item.id) === String(level?.[idControlName]));
    if (selectedItem) {
      return this.normalizeTextArray(selectedItem[infoControlName]);
    }

    return this.normalizeTextArray(level?.[infoControlName]);
  }

  private buildWorkflowQueryInformation(moduleId: any, conditions: any[]): string | null {
    const selectedModule = this.modules.find((m: any) => String(m.id) === String(moduleId));
    if (!selectedModule) return null;

    const tableName = selectedModule.primary_table || '';
    let baseQuery = tableName ? `SELECT * FROM ${tableName}` : '';

    const rawQueryInfo = this.parseJSONSafe(selectedModule.query_information);
    if (typeof rawQueryInfo === 'string' && rawQueryInfo.trim().toLowerCase().includes('select')) {
      baseQuery = rawQueryInfo.trim().replace(/;$/, '');
    } else if (rawQueryInfo && typeof rawQueryInfo === 'object') {
      const candidate = rawQueryInfo?.query || rawQueryInfo?.select_query || rawQueryInfo?.sql || '';
      if (typeof candidate === 'string' && candidate.trim().toLowerCase().includes('select')) {
        baseQuery = candidate.trim().replace(/;$/, '');
      } else {
        // Build raw postgres SQL from module query_information payload + module line items + common conditions
        const selectClause = this.buildSelectClause(tableName, rawQueryInfo);
        const includeClause = this.buildIncludesClause(rawQueryInfo?.includes || []);
        const whereClause = this.buildWhereClause(tableName, rawQueryInfo, conditions || []);
        const groupByClause = this.buildGroupByClause(rawQueryInfo?.group_by || []);
        const orderByClause = this.buildOrderByClause(rawQueryInfo?.sort_columns || []);
        const limitOffsetClause = this.buildLimitOffsetClause(rawQueryInfo);

        const sql = [`SELECT ${selectClause}`, `FROM ${tableName}`, includeClause, whereClause, groupByClause, orderByClause, limitOffsetClause]
          .filter((part) => !!part)
          .join(' ')
          .trim();

        return sql ? `${sql};` : null;
      }
    }

    if (!baseQuery) return null;

    const whereParts = (conditions || []).map((cond: any) => this.toConditionSql(cond, tableName)).filter((part: string) => !!part);

    if (!whereParts.length) return `${baseQuery};`;

    const hasWhere = /\bwhere\b/i.test(baseQuery);
    return `${baseQuery}${hasWhere ? ' AND ' : ' WHERE '}${whereParts.join(' AND ')};`;
  }

  private buildSelectClause(tableName: string, rawQueryInfo: any): string {
    const lineItemSelects = (this.moduleRuleOptions || [])
      .map((item: any) => this.normalizeFieldExpression(item?.field_name, item?.table_name || tableName))
      .filter((col: string) => !!col);

    if (lineItemSelects.length) {
      return Array.from(new Set(lineItemSelects)).join(', ');
    }

    const selectColumns = Array.isArray(rawQueryInfo?.select_columns) ? rawQueryInfo.select_columns : [];
    if (!selectColumns.length) {
      return `${tableName}.*`;
    }

    const normalized = selectColumns
      .map((entry: any) => {
        if (Array.isArray(entry)) {
          const expr = String(entry[0] || '').trim();
          const alias = String(entry[1] || '').trim();
          if (!expr) return '';
          return alias ? `${expr} AS ${alias}` : expr;
        }
        return String(entry || '').trim();
      })
      .filter((col: string) => !!col);

    return normalized.length ? normalized.join(', ') : `${tableName}.*`;
  }

  private buildIncludesClause(includes: any[]): string {
    if (!Array.isArray(includes) || !includes.length) return '';

    return includes
      .map((inc: any) => {
        const joinType = String(inc?.join_type || 'LEFT').toUpperCase();
        const table = inc?.table_name;
        const condition = inc?.join_condition;
        if (!table || !condition) return '';
        return `${joinType} JOIN ${table} ON ${condition}`;
      })
      .filter((part: string) => !!part)
      .join(' ');
  }

  private buildWhereClause(tableName: string, rawQueryInfo: any, conditions: any[]): string {
    const payloadSearchAll = Array.isArray(rawQueryInfo?.search_all) ? rawQueryInfo.search_all : [];
    const payloadSearchAny = Array.isArray(rawQueryInfo?.search_any) ? rawQueryInfo.search_any : [];

    const allParts = payloadSearchAll.map((rule: any) => this.toPayloadRuleSql(rule, tableName)).filter((part: string) => !!part);

    const anyParts = payloadSearchAny.map((rule: any) => this.toPayloadRuleSql(rule, tableName)).filter((part: string) => !!part);

    if (anyParts.length) {
      allParts.push(`(${anyParts.join(' OR ')})`);
    }

    const commonConditionParts = (conditions || []).map((cond: any) => this.toConditionSql(cond, tableName)).filter((part: string) => !!part);

    const allWhereParts = [...allParts, ...commonConditionParts];
    if (!allWhereParts.length) return '';

    return `WHERE ${allWhereParts.join(' AND ')}`;
  }

  private buildGroupByClause(groupBy: any[]): string {
    if (!Array.isArray(groupBy) || !groupBy.length) return '';
    const parts = groupBy.map((entry: any) => String(entry || '').trim()).filter((part: string) => !!part);
    return parts.length ? `GROUP BY ${parts.join(', ')}` : '';
  }

  private buildOrderByClause(sortColumns: any[]): string {
    if (!Array.isArray(sortColumns) || !sortColumns.length) return '';
    const parts = sortColumns
      .map((entry: any) => {
        if (!Array.isArray(entry) || !entry.length) return '';
        const col = String(entry[0] || '').trim();
        const dir = String(entry[1] || 'ASC')
          .trim()
          .toUpperCase();
        if (!col) return '';
        return `${col} ${dir === 'DESC' ? 'DESC' : 'ASC'}`;
      })
      .filter((part: string) => !!part);

    return parts.length ? `ORDER BY ${parts.join(', ')}` : '';
  }

  private buildLimitOffsetClause(rawQueryInfo: any): string {
    const parts: string[] = [];
    const limit = Number(rawQueryInfo?.limit_range);
    const offset = Number(rawQueryInfo?.start_index);

    if (!isNaN(limit) && limit > 0) {
      parts.push(`LIMIT ${limit}`);
    }
    if (!isNaN(offset) && offset > 0) {
      parts.push(`OFFSET ${offset}`);
    }

    return parts.join(' ');
  }

  private toPayloadRuleSql(rule: any, fallbackTable: string): string {
    const columnName = String(rule?.column_name || '').trim();
    const operator = String(rule?.operator || '=')
      .trim()
      .toUpperCase();
    const value = rule?.value;
    if (!columnName) return '';

    // If column contains an inline expression (e.g. users.id = user_details.user_id), keep as-is.
    if (/\s|=|\(|\)/.test(columnName)) {
      return `${columnName}`;
    }

    const fieldExpr = columnName.includes('.') ? columnName : `${fallbackTable}.${columnName}`;

    if (operator === 'IN' || operator === 'NOT IN') {
      const values = Array.isArray(value) ? value : [value];
      const literals = values.map((item: any) => this.toSqlLiteral(item)).join(', ');
      return `${fieldExpr} ${operator} (${literals})`;
    }

    if (operator === 'LIKE' || operator === 'ILIKE') {
      return `${fieldExpr} ${operator} ${this.toSqlLiteral(value)}`;
    }

    return `${fieldExpr} ${operator} ${this.toSqlLiteral(value)}`;
  }

  private toConditionSql(cond: any, fallbackTable: string): string {
    if (!cond?.field_name || !cond?.operator) return '';

    const tableName = cond.table_name || fallbackTable;
    const fieldExpr = this.normalizeFieldExpression(cond.field_name, tableName);
    const operator = cond.operator;
    const value = cond.value;

    if (operator === 'in' || operator === 'not_in') {
      const values = Array.isArray(value) ? value : value !== null && value !== undefined && String(value).trim() !== '' ? [value] : [];
      if (!values.length) return '';
      const list = values.map((item: any) => this.toSqlLiteral(item)).join(', ');
      return `${fieldExpr} ${operator === 'in' ? 'IN' : 'NOT IN'} (${list})`;
    }

    if (operator === 'contains') {
      return `${fieldExpr} ILIKE ${this.toSqlLiteral(`%${String(value ?? '')}%`)}`;
    }

    const operatorMap: Record<string, string> = {
      equals: '=',
      not_equals: '!=',
      greater_than: '>',
      less_than: '<',
    };

    const sqlOperator = operatorMap[operator] || '=';
    return `${fieldExpr} ${sqlOperator} ${this.toSqlLiteral(value)}`;
  }

  private normalizeFieldExpression(fieldName: any, fallbackTable: string): string {
    const raw = String(fieldName || '').trim();
    if (!raw) return raw;

    // Raw expressions/functions/dotted columns should not be prefixed.
    if (raw.includes('.') || raw.includes('(') || raw.includes(' ') || raw.includes('"') || raw.includes("'")) {
      return raw;
    }

    return fallbackTable ? `${fallbackTable}.${raw}` : raw;
  }

  private toSqlLiteral(value: any): string {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'number') return `${value}`;
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';

    const str = String(value);
    if (/^-?\d+(\.\d+)?$/.test(str)) return str;
    return `'${str.replace(/'/g, "''")}'`;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return field ? field.invalid && (field.touched || this.submitted) : false;
  }

  getErrorMessage(fieldName: string): string {
    const field = this.form.get(fieldName);
    if (!field) return '';
    if (field.hasError('required')) return 'required_message';
    if (field.hasError('maxlength')) return `Maximum length exceeded (${field.errors?.['maxlength'].requiredLength} chars)`;
    return '';
  }

  isConditionFieldInvalid(group: FormGroup, fieldName: string): boolean {
    const ctrl = group.get(fieldName);
    return ctrl ? ctrl.invalid && (ctrl.touched || this.submitted) : false;
  }
}
