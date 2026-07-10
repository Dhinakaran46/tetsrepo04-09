import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { Title } from '@angular/platform-browser';
import { ToastrService } from 'ngx-toastr';
import { animate, style, transition, trigger } from '@angular/animations';

import { initialState } from '../../../store/index.reducer';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { CommonSharedModule } from '../../shared/common/common.module';
import { GridApiService } from '../../service/common/grid.service';
import { LocalStorageService } from '../../service/common/local-storage.service';
import { commonConfig } from '../../config/common.config';
import { ClientDatatableComponent, TableConfig } from '../../components/client-datatable/client-datatable.component';
import { LoaderComponent } from '../../components/loader/loader.component';

@Component({
  selector: 'app-approval-workflow-module',
  standalone: true,
  imports: [CommonSharedModule, MonacoEditorModule, ReactiveFormsModule, ClientDatatableComponent, LoaderComponent],
  templateUrl: './approval-workflow-module.component.html',
  styleUrl: './approval-workflow-module.component.scss',
  animations: [
    trigger('toggleAnimation', [
      transition(':enter', [style({ opacity: 0, transform: 'scale(0.95)' }), animate('100ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))]),
      transition(':leave', [animate('75ms', style({ opacity: 0, transform: 'scale(0.95)' }))]),
    ]),
  ],
})
export class ApprovalWorkflowModuleComponent implements OnInit {
  store: any = initialState;
  form!: FormGroup;
  ruleOptionForm!: FormGroup;

  id: string | null = null;
  editTitle = false;
  submitted = false;
  commonConfig = commonConfig;

  field_types: any[] = [];
  tables_list: string[] = [];

  modalJsonEditorOptions = { theme: 'vs-dark', language: 'json', tabSize: 2, insertSpaces: true, minimap: { enabled: false }, automaticLayout: true };

  isRuleOptionModalOpen = false;
  selectedRuleOption: any = null;
  editingRuleOptionIndex = -1;

  private _originalRuleOptions: any[] = [];

  insert_json_schema: any = {
    action: ['insert', 'insert'],
    table: ['approval_workflow_modules', 'approval_workflow_module_rule_options'],
    table_mapping: ['table1', 'table2'],
    data: { table1: [], table2: [] },
  };

  update_json_schema: any = {
    action: ['update', 'hard_delete', 'insert'],
    table: ['approval_workflow_modules', 'approval_workflow_module_rule_options', 'approval_workflow_module_rule_options'],
    table_mapping: ['table1', 'table2', 'table3'],
    data: { table1: [], table3: [] },
    conditions: { table1: [], table2: [] },
  };

  ruleOptionsTableConfig: TableConfig = {
    columns: [
      { key: 'field_name', label: 'Field Name', sortable: true, searchable: true },
      { key: 'display_name', label: 'Display Name', sortable: true, searchable: true },
      { key: 'table_name', label: 'Table Name', sortable: true, searchable: true },
      { key: 'field_type_id', label: 'Field Type', sortable: true, searchable: true },
      {
        key: 'actions',
        label: 'Actions',
        type: 'button',
        actions: [
          {
            icon: 'fa-solid fa-edit',
            onClick: (item: any) => this.editRuleOption(item),
            class: 'mr-4',
            tooltip: 'Edit',
          },
          {
            icon: 'fa-solid fa-trash',
            onClick: (item: any) => this.removeRuleOption(item),
            class: '',
            tooltip: 'Delete',
          },
        ],
      },
    ],
    pageSizes: [5, 10, 25, 50],
    defaultPageSize: 5,
    searchable: true,
    headerConfig: {
      title: 'Rule Options',
      showHeader: true,
      addButton: {
        show: true,
        label: 'Add New',
        icon: 'fa-solid fa-plus',
        onClick: () => this.initNewRuleOption(),
        disabled: false,
        class: 'btn-primary flex items-center rounded-md border border-[#e0e6ed] px-4 py-2 font-semibold dark:border-[#253b5c] dark:bg-[#1b2e4b] dark:text-white-dark',
      },
      enableFilter: true,
      enableColumnSelector: true,
      enableExport: true,
    },
  };

  constructor(
    private fb: FormBuilder,
    private gridApiService: GridApiService,
    private toastr: ToastrService,
    private route: ActivatedRoute,
    private router: Router,
    public localStorageService: LocalStorageService,
    public storeData: Store<any>,
    public location: Location,
    private translate: TranslateService,
    private titleService: Title,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.initStore();
    this.id = this.route.snapshot.params['uuid'] || null;
    this.initForm();
    this.field_types = this.commonConfig.field_types;
    this.fetchAllTables();

    if (!this.id) {
      this.editTitle = false;
    } else {
      this.editTitle = true;
      this.loadData(this.id);
    }
    this.titleChange();
  }

  async initStore() {
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
    const title = this.editTitle ? 'title_edit_entity' : 'title_add_entity';
    this.titleService.setTitle(this.translate.instant(title));
  }

  initForm() {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      slug: [''],
      description: [''],
      status_id: [1],
      rule_options: this.fb.array([]),
    });

    this.initRuleOptionForm();
  }

  initRuleOptionForm() {
    this.ruleOptionForm = this.fb.group({
      table_name: [''],
      field_name: ['', [Validators.required, Validators.maxLength(100)]],
      display_name: ['', [Validators.maxLength(100)]],
      enum_values: [''],
      field_type_id: ['', Validators.required],
      status_id: [1],
    });
  }

  fetchAllTables() {
    this.gridApiService.getAllTables().subscribe(
      (response: any) => {
        if (response.status && response.code === 200) {
          this.tables_list = response.data;
        }
      },
      () => {
        this.toastr.error(this.translate.instant('error'), 'Error');
      }
    );
  }

  // ── Rule Option Modal ──────────────────────────────────────────────────────

  initNewRuleOption() {
    this.editingRuleOptionIndex = -1;
    this.selectedRuleOption = {};
    this.ruleOptionForm.reset({ status_id: 1 });
    this.isRuleOptionModalOpen = true;
  }

  editRuleOption(item: any) {
    this.selectedRuleOption = item;
    this.editingRuleOptionIndex = this.ruleOptionsData.findIndex(
      (r) => r.field_name === item.field_name && r.table_name === item.table_name
    );
    const enumVal = item.enum_values ? this.prettyJSON(item.enum_values) : '';
    this.ruleOptionForm.patchValue({ ...item, enum_values: enumVal });
    this.isRuleOptionModalOpen = true;
  }

  cancelRuleOptionEdit() {
    this.selectedRuleOption = null;
    this.editingRuleOptionIndex = -1;
    this.ruleOptionForm.reset({ status_id: 1 });
    this.isRuleOptionModalOpen = false;
  }

  onRuleOptionSubmit() {
    if (this.ruleOptionForm.invalid) {
      this.ruleOptionForm.markAllAsTouched();
      return;
    }

    const ruleOptionsArray = this.form.get('rule_options') as FormArray;
    const formValue = { ...this.ruleOptionForm.value };
    formValue.enum_values = this.prepareOptionalJSON(formValue.enum_values, 'Enum Values') ?? [];

    if (this.editingRuleOptionIndex !== -1) {
      ruleOptionsArray.at(this.editingRuleOptionIndex).patchValue(formValue);
      this._originalRuleOptions[this.editingRuleOptionIndex] = {
        ...this._originalRuleOptions[this.editingRuleOptionIndex],
        ...formValue,
      };
    } else {
      ruleOptionsArray.push(this.fb.group(formValue));
      this._originalRuleOptions.push({ ...formValue });
    }

    this.isRuleOptionModalOpen = false;
    this.cancelRuleOptionEdit();
  }

  removeRuleOption(item: any) {
    const ruleOptions = this.form.get('rule_options') as FormArray;
    const index = ruleOptions.controls.findIndex(
      (ctrl) => ctrl.value.field_name === item.field_name && ctrl.value.table_name === item.table_name
    );
    if (index !== -1) {
      ruleOptions.removeAt(index);
      this._originalRuleOptions.splice(index, 1);
    } else {
      this.toastr.warning(`Rule option not found.`);
    }
  }

  get ruleOptionsControls() {
    return (this.form.get('rule_options') as FormArray).controls;
  }

  get ruleOptionsData(): any[] {
    return (this.form.get('rule_options') as FormArray).controls.map((c) => c.value);
  }

  isRuleOptionFieldInvalid(fieldName: string): boolean {
    const field = this.ruleOptionForm?.get(fieldName);
    return field ? field.invalid && (field.touched || this.submitted) : false;
  }

  getRuleOptionErrorMessage(fieldName: string): string {
    const field = this.ruleOptionForm.get(fieldName);
    if (!field) return '';
    if (field.hasError('required')) return 'required_message';
    if (field.hasError('maxlength')) return `Maximum length exceeded (${field.errors?.['maxlength'].requiredLength} characters allowed)`;
    return '';
  }

  onRuleOptionsDataChange(data: any[]) {
    const ruleOptions = this.form.get('rule_options') as FormArray;
    ruleOptions.clear();
    const toUse = !data || data.length === 0 ? this._originalRuleOptions : data;
    toUse.forEach((item) => ruleOptions.push(this.fb.group(item)));
  }

  // ── Load / Save ────────────────────────────────────────────────────────────

  loadData(id: string) {
    const params = {
      company_id: 1,
      primary_table: 'approval_workflow_modules',
      start_index: 0,
      limit_range: 1,
      sort_columns: [['approval_workflow_modules.id', 'desc']],
      search_all: [{ column_name: 'approval_workflow_modules.uuid', value: id, operator: '=' }],
      select_columns: [
        ['approval_workflow_modules.*'],
        [
          "CASE WHEN COUNT(approval_workflow_module_rule_options.id) = 0 THEN null ELSE COALESCE(Json_agg(DISTINCT jsonb_build_object('table_name', approval_workflow_module_rule_options.table_name, 'field_name', approval_workflow_module_rule_options.field_name, 'display_name', approval_workflow_module_rule_options.display_name, 'enum_values', approval_workflow_module_rule_options.enum_values, 'field_type_id', approval_workflow_module_rule_options.field_type_id, 'status_id', approval_workflow_module_rule_options.status_id))) END",
          'rule_options',
        ],
      ],
      includes: [
        {
          table_name: 'approval_workflow_module_rule_options',
          join_type: 'LEFT',
          join_condition: 'approval_workflow_modules.id = approval_workflow_module_rule_options.approval_workflow_module_id',
        },
      ],
      group_by: ['approval_workflow_modules.id'],
    };

    this.gridApiService.getAllList(params).subscribe(
      (response: any) => {
        if (response.status && response.code === 200) {
          const entity = response.data.records[0];
          this.form.patchValue({
            name: entity.name,
            slug: entity.slug,
            description: entity.description,
            status_id: entity.status_id,
          });

          const ruleOptions = this.form.get('rule_options') as FormArray;
          if (entity.rule_options && entity.rule_options.length > 0) {
            this._originalRuleOptions = [...entity.rule_options];
            entity.rule_options.forEach((opt: any) => {
              ruleOptions.push(
                this.fb.group({
                  table_name: [opt.table_name || ''],
                  field_name: [opt.field_name, Validators.required],
                  display_name: [opt.display_name || ''],
                  enum_values: [Array.isArray(opt.enum_values) ? opt.enum_values : []],
                  field_type_id: [opt.field_type_id, Validators.required],
                  status_id: [opt.status_id ?? 1],
                })
              );
            });
          }
        }
      },
      () => {
        this.toastr.error(this.translate.instant('error'), 'Error');
      }
    );
  }

  getAddParams(formData: any) {
    const slug = formData.slug || this.localStorageService.generateSlugWithTimestamp(formData.name);
    const master = [{
      name: formData.name,
      slug,
      description: formData.description || null,
      status_id: formData.status_id,
      created_by: true,
    }];

    this.insert_json_schema.data['table1'] = master;

    if (formData.rule_options && formData.rule_options.length > 0) {
      this.insert_json_schema.data['table2'] = formData.rule_options.map((opt: any) => ({
        approval_workflow_module_id: '@table1.id',
        table_name: opt.table_name || null,
        field_name: opt.field_name,
        display_name: opt.display_name || null,
        enum_values: Array.isArray(opt.enum_values) ? opt.enum_values : [],
        field_type_id: opt.field_type_id,
        status_id: opt.status_id ?? 1,
        created_by: true,
      }));
    } else {
      this.insert_json_schema.data['table2'] = [];
    }

    return this.insert_json_schema;
  }

  getEditParams(formData: any, id: string) {
    const master = [{
      name: formData.name,
      slug: formData.slug,
      description: formData.description || null,
      status_id: formData.status_id,
      updated_by: true,
    }];

    this.update_json_schema.data['table1'] = master;
    this.update_json_schema.conditions['table1'] = [{ uuid: id }];
    this.update_json_schema.conditions['table2'] = [{ approval_workflow_module_id: '@table1.id' }];

    this.update_json_schema.data['table3'] = formData.rule_options?.map((opt: any) => ({
      approval_workflow_module_id: '@table1.id',
      table_name: opt.table_name || null,
      field_name: opt.field_name,
      display_name: opt.display_name || null,
      enum_values: Array.isArray(opt.enum_values) ? opt.enum_values : [],
      field_type_id: opt.field_type_id,
      status_id: opt.status_id ?? 1,
      created_by: true,
    })) || [];

    return this.update_json_schema;
  }

  onSubmit() {
    this.submitted = true;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formData = this.form.value;
    const payload = this.id ? this.getEditParams(formData, this.id) : this.getAddParams(formData);

    this.gridApiService.executeRecords(payload).subscribe(
      (response: any) => {
        if (response.status && response.code === 200) {
          const key = this.id ? 'record_updated_successfully' : 'record_inserted_successfully';
          this.toastr.success(this.translate.instant(key));
          this.location.back();
        } else {
          this.toastr.error(this.translate.instant(response.message), 'Error');
        }
      },
      () => {
        this.toastr.error(this.translate.instant('error'), 'Error');
      }
    );
  }

  prettyJSON(data: any): string {
    return JSON.stringify(JSON.parse(JSON.stringify(data)), null, 2);
  }

  prepareOptionalJSON(data: any, fieldName: string = 'JSON field'): any | null {
    if (data === null || data === undefined) return null;
    if (typeof data === 'string' && data.trim() === '') return null;
    try {
      const source = typeof data === 'string' ? data : JSON.stringify(data);
      return JSON.parse(source);
    } catch {
      this.toastr.error(`Invalid JSON in "${fieldName}".`, 'Error');
      throw new Error(`Invalid JSON in "${fieldName}".`);
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return field ? field.invalid && (field.touched || this.submitted) : false;
  }

  getErrorMessage(fieldName: string): string {
    const field = this.form.get(fieldName);
    if (!field) return '';
    if (field.hasError('required')) return 'required_message';
    if (field.hasError('maxlength')) return `Maximum length exceeded (${field.errors?.['maxlength'].requiredLength} characters allowed)`;
    return '';
  }

  isFormInvalid(): boolean {
    return this.form.invalid;
  }
}
