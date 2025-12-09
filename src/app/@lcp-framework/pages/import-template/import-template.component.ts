import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, ValidationErrors } from '@angular/forms';
import { CommonSharedModule } from '../../shared/common/common.module';
import { IconXComponent } from '../../shared/icon/icon-x';
import { IconSendComponent } from '../../shared/icon/icon-send';
import { IconSaveComponent } from '../../shared/icon/icon-save';
import { IconEyeComponent } from '../../shared/icon/icon-eye';
import { IconDownloadComponent } from '../../shared/icon/icon-download';
import { IconXCircleComponent } from '../../shared/icon/icon-x-circle';
import { IconPlusCircleComponent } from '../../shared/icon/icon-plus-circle';
import { GridApiService } from '../../service/common/grid.service';
import { ToastrService } from 'ngx-toastr';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { commonConfig } from '../../config/common.config';
import { LocalStorageService } from '../../service/common/local-storage.service';
import { AbstractControl, ValidatorFn } from '@angular/forms';
import { Location } from '@angular/common';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { EditorComponent } from 'ngx-monaco-editor-v2';
import { animate, style, transition, trigger } from '@angular/animations';
import { TranslateService } from '@ngx-translate/core';
import { Title } from '@angular/platform-browser';
import { ClientDatatableComponent, TableConfig } from '../../components/client-datatable/client-datatable.component';

export function viewMandatoryValidator(): ValidatorFn {
  return (control: AbstractControl): { [key: string]: any } | null => {
    const selectedOptions = control.value;
    if (Array.isArray(selectedOptions) && selectedOptions.includes('view')) {
      return null; // Valid
    }
    return { viewMandatory: true }; // Invalid
  };
}

interface LineItem {
  field_name: string;
  display_name: string;
  field_table: string;
  order_no: number;
  default_value: string;
  check_reg_exp: string;
  is_nullable: boolean;
  is_unique: boolean;
  is_foreign: boolean;
  is_multiple: boolean;
  is_enum: boolean;
  enum_values: string;
  is_individual: boolean;
  individual_column: string;
  foreign_table: string;
  foreign_column: string;
  foreign_can_create: boolean;
  foreign_query: boolean;
  unique_query: boolean;
  field_type_id: number;
}

interface QueryItem {
  query_string: string;
  order_no: number;
  query_name: string;
  allow_multiple: boolean;
  is_indvidual: boolean;
  before_lineitems: boolean;
}

@Component({
  selector: 'app-import-template',
  standalone: true,
  imports: [
    CommonSharedModule,
    MonacoEditorModule,
    IconXComponent,
    IconSendComponent,
    IconSaveComponent,
    IconEyeComponent,
    IconDownloadComponent,
    IconXCircleComponent,
    IconPlusCircleComponent,
    ReactiveFormsModule,
    ClientDatatableComponent,
  ],
  templateUrl: './import-template.component.html',
  styleUrl: './import-template.component.scss',
  animations: [
    trigger('toggleAnimation', [
      transition(':enter', [style({ opacity: 0, transform: 'scale(0.95)' }), animate('100ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))]),
      transition(':leave', [animate('75ms', style({ opacity: 0, transform: 'scale(0.95)' }))]),
    ]),
  ],
})
export class ImportTemplateComponent implements OnInit {
  store: any;
  form!: FormGroup;
  items: any = [];
  queries: any = [];

  action_types: any[] = [];
  field_types: any[] = [];
  tables_list: any = [];
  wizard_type_list: any[] = [];
  id: number | null = null;
  editTitle = false;
  submitted = false;
  commonConfig = commonConfig;
  existing_actions: string[] = [];
  redirect_url: string = 'import_template';
  rowsLength: number = 26;

  lineItemForm!: FormGroup;
  selectedItem: any = null;
  editingItemIndex: number = -1;

  lineQueryForm!: FormGroup;
  selectedQuery: any = null;
  editingQueryIndex: number = -1;

  editorOptions = { theme: 'vs-dark', language: 'json', tabSize: 1, insertSpaces: true };
  htmlEditorOptions = { ...this.editorOptions, language: 'html' };
  isDarkTheme = true; // Default theme
  @ViewChild('monacoEditor') monacoEditor: EditorComponent | undefined;

  private _originalItems: any[] = [];
  private _originalQueries: any[] = [];

  emailprocesslist: any = [];

  insert_json_schema: any = {
    // it will be removed
    action: ['insert', 'insert', 'insert'],
    table: ['import_templates', 'import_template_line_items', 'import_template_queries'],
    table_mapping: ['table1', 'table2', 'table3'],
    data: {
      table1: [],
      table2: [],
      table3: [],
    },
  };

  update_json_schema: any = {
    // it will be removed
    action: ['update', 'hard_delete', 'insert', 'hard_delete', 'insert'],
    table: ['import_templates', 'import_template_line_items', 'import_template_line_items', 'import_template_queries', 'import_template_queries'],
    table_mapping: ['table1', 'table2', 'table3', 'table4', 'table5'],
    data: {
      table1: [],
      table3: [],
      table5: [],
    },
    conditions: {
      table1: [],
      table2: [],
      table4: [],
    },
  };

  // Add modal state variables
  isItemModalOpen = false;
  isQueryModalOpen = false;

  // Items Datatable Configuration
  itemsTableConfig: TableConfig = {
    columns: [
      { key: 'field_name', label: 'Field Name', sortable: true, searchable: true },
      { key: 'display_name', label: 'Display Name', sortable: true, searchable: true },
      { key: 'field_table', label: 'Field Table', sortable: true, searchable: true },
      { key: 'order_no', label: 'Order No', sortable: true, searchable: true },
      { key: 'field_type_id', label: 'Field Type', sortable: true, searchable: true },
      {
        key: 'actions',
        label: 'Actions',
        type: 'button',
        actions: [
          {
            icon: 'fa-solid fa-edit',
            onClick: (item: any) => this.editLineItem(item),
            class: '   mr-4',
            tooltip: 'Edit Item',
          },
          {
            icon: 'fa-solid fa-trash',
            onClick: (item: any) => this.removeItem(item),
            class: '  ',
            tooltip: 'Delete Item',
          },
        ],
      },
    ],
    pageSizes: [5, 10, 25, 50],
    defaultPageSize: 5,
    searchable: true,
    headerConfig: {
      title: 'Import Template Line Items',
      showHeader: true,
      addButton: {
        show: true,
        label: 'Add New',
        icon: 'fa-solid fa-plus',
        onClick: () => this.initNewLineItem(),
        disabled: false,
        class:
          'btn-primary flex items-center rounded-md border border-[#e0e6ed] px-4 py-2 font-semibold dark:border-[#253b5c] dark:bg-[#1b2e4b] dark:text-white-dark',
      },
      enableFilter: true,
      enableColumnSelector: true,
      enableExport: true,
    },
  };

  // Queries Datatable Configuration
  queriesTableConfig: TableConfig = {
    columns: [
      { key: 'query_name', label: 'Query Name', sortable: true, searchable: true },

      { key: 'order_no', label: 'Order No', sortable: true, searchable: true },
      { key: 'allow_multiple', label: 'Allow Multiple', sortable: true, searchable: true },
      { key: 'is_individual', label: 'Is Individual', sortable: true, searchable: true },
      { key: 'before_lineitems', label: 'Before Line Items', sortable: true, searchable: true },

      { key: 'query_string', label: 'Query String', sortable: true, searchable: true },
      {
        key: 'actions',
        label: 'Actions',
        type: 'button',
        actions: [
          {
            icon: 'fa-solid fa-edit',
            onClick: (item: any) => this.editQueryItem(item),
            class: '   mr-4',
            tooltip: 'Edit Query',
          },
          {
            icon: 'fa-solid fa-trash',
            onClick: (item: any) => this.removeQuery(item),
            class: '  ',
            tooltip: 'Delete Query',
          },
        ],
      },
    ],
    pageSizes: [5, 10, 25, 50],
    defaultPageSize: 5,
    searchable: true,
    headerConfig: {
      title: 'Import Template Line Queries',
      showHeader: true,
      addButton: {
        show: true,
        label: 'Add New',
        icon: 'fa-solid fa-plus',
        onClick: () => this.initNewLineQuery(),
        disabled: false,
        class:
          'btn-primary flex items-center rounded-md border border-[#e0e6ed] px-4 py-2 font-semibold dark:border-[#253b5c] dark:bg-[#1b2e4b] dark:text-white-dark',
      },
      enableFilter: true,
      enableColumnSelector: true,
      enableExport: true,
    },
  };

  showEmailProcessSlug = false;

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
    private titleService: Title
  ) {
    this.initStore();
  }

  ngOnInit() {
    this.id = this.route.snapshot.params['uuid'] || null;
    this.getEmailTemplateProcessList();
    this.initForm();
    //this.constructRedirectUrl();

    // To load all the lookups
    this.field_types = this.commonConfig.field_types;
    //this.entity_types = this.commonConfig.entity_types;
    this.action_types = this.commonConfig.action_types;
    this.wizard_type_list = this.commonConfig.wizard_type;
    this.fetchAllTables();

    // If "id" is not available we need consider it as "Add", otherwise "Edit"
    if (!this.id) {
      this.editTitle = false;
    } else {
      this.editTitle = true;
      this.loadData(this.id);
    }
    this.titleChange();
  }

  toggleEmailProcessSlug(value: boolean) {
    this.showEmailProcessSlug = value;
  }

  getEmailTemplateProcessList() {
    const params = {
      company_id: 1,
      print_query: true,
      primary_table: 'notification_templates',
      start_index: 0,
      limit_range: 1,
      sort_columns: [['notification_templates.id', 'asc']],
      select_columns: [['notification_templates.*']],
    };

    this.gridApiService.getAllList(params).subscribe(
      (response) => {
        if (response.status && response.code === 200) {
          this.emailprocesslist = response.data.records;
        }
      },
      (error) => {
        const key = 'error';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
      }
    );
  }

  async initStore() {
    this.storeData
      .select((d) => d.index)
      .subscribe((d) => {
        this.store = d;
      });
  }

  initLineItemForm() {
    this.lineItemForm = this.fb.group({
      field_name: ['', [Validators.required, Validators.maxLength(100)]],
      display_name: ['', [Validators.required, Validators.maxLength(100)]],
      order_no: ['', [Validators.required, Validators.min(0)]],
      field_table: ['', Validators.required],
      default_value: [''],
      check_reg_exp: [''],
      is_nullable: [false],
      is_unique: [false],
      is_foreign: [false],
      is_multiple: [false],
      is_enum: [false],
      enum_values: [''],
      is_individual: [false],
      individual_column: [''],
      foreign_table: [''],
      foreign_column: [''],
      foreign_can_create: [false],
      foreign_query: [''],
      unique_query: [''],
      expression_rules: this.fb.array([this.createExpressionRule()]),
      query_rules: this.fb.array([this.createQueryRule()]),
      field_type_id: ['', Validators.required],
    });

    this.addFormArraySubscriptions();

    this.expressionRules.controls.forEach((ruleGroup: AbstractControl) => {
      ruleGroup.valueChanges.subscribe(() => {
        this.lineItemForm.updateValueAndValidity();
      });
    });
  }

  private createQueryRule() {
    return this.fb.group({
      query: ['', Validators.required],
      message: ['', Validators.required],
    });
  }

  get queryRules(): FormArray {
    return this.lineItemForm.get('query_rules') as FormArray;
  }

  addQueryRule() {
    this.queryRules.push(this.createQueryRule());
    this.lineItemForm.updateValueAndValidity();
  }
  
  removeQueryRule(index: number) {
    this.queryRules.removeAt(index);
    this.lineItemForm.updateValueAndValidity();
  }

  createExpressionRule() {
    return this.fb.group({
      expression: ['', Validators.required],
      message: ['', Validators.required],
    });
  }

  get expressionRules(): FormArray {
    const arr = this.lineItemForm.get('expression_rules') as FormArray;

    return arr;
  }

  addExpressionRule() {
    const ruleGroup = this.fb.group({
      expression: ['', Validators.required],
      message: ['', Validators.required],
    });

    this.expressionRules.push(ruleGroup);

    // Important: Update form validity after adding new controls
    this.lineItemForm.updateValueAndValidity();
  }

  removeExpressionRule(index: number) {
    this.expressionRules.removeAt(index);
    // Important: Update form validity after removing controls
    this.lineItemForm.updateValueAndValidity();
  }

  initLineQueryForm() {
    this.lineQueryForm = this.fb.group({
      query_string: ['', [Validators.required]],
      order_no: ['', [Validators.required, Validators.min(0)]],
      query_name: ['', [Validators.required, Validators.min(0)]],
      allow_multiple: [false],
      is_individual: [false],
      before_lineitems: [false],
    });
  }

  addFormArraySubscriptions() {
    this.lineItemForm.get('is_foreign')?.valueChanges.subscribe((value) => {
      const foreignControls = ['foreign_table', 'foreign_column', 'foreign_can_create', 'foreign_query'];
      foreignControls.forEach((control) => {
        const formControl = this.lineItemForm.get(control);
        if (value) {
          formControl?.enable();
        } else {
          formControl?.disable();
        }
      });
    });

    this.lineItemForm.get('is_enum')?.valueChanges.subscribe((value) => {
      const enumControl = this.lineItemForm.get('enum_values');
      if (value) {
        enumControl?.enable();
      } else {
        enumControl?.disable();
      }
    });

    this.lineItemForm.get('is_individual')?.valueChanges.subscribe((value) => {
      const individualColumn = this.lineItemForm.get('individual_column');
      if (value) {
        individualColumn?.enable();
      } else {
        individualColumn?.disable();
      }
    });

    
  }

  initNewLineItem() {
    this.editingItemIndex = -1;
    this.selectedItem = {};
    this.lineItemForm.reset({
      is_nullable: false,
      is_unique: false,
      is_foreign: false,
      is_multiple: false,
      is_enum: false,
      is_individual: false,

      foreign_can_create: false,
      foreign_query: '',
      unique_query: '',
    });
    this.lineItemForm.setControl('expression_rules', this.fb.array([])); // ← ensure it's reset
    this.lineItemForm.setControl('query_rules', this.fb.array([])); // ← ensure it's reset

    // Force form validation update
    this.lineItemForm.updateValueAndValidity();

    this.isItemModalOpen = true;
  }
  initNewLineQuery() {
    this.editingQueryIndex = -1;
    this.selectedQuery = {};
    this.lineQueryForm.reset({
      query_string: '',
      order_no: '',
      query_name: '',
      allow_multiple: false,
      is_individual: false,
      before_lineitems: false,
    });
    this.isQueryModalOpen = true;
  }

  editQueryItem(index: any) {
    this.selectedQuery = index;
    this.editingQueryIndex = this.queriesData.findIndex((q) => q === index);
    this.lineQueryForm.patchValue(index);

    this.isQueryModalOpen = true;
  }

  editLineItem(index: any) {
    this.selectedItem = index;
    //this.editingItemIndex = this.itemsData.findIndex((i) => i === index);
    this.editingItemIndex = this._originalItems.findIndex((i: any) => i.field_name === index.field_name);
    this.lineItemForm.patchValue(index);

    // Reset and reassign expression_rules form array
    const expressionArray = this.fb.array(
      (index.expression_rules || []).map((rule: any) => {
        return this.fb.group({
          expression: [rule.expression || '', Validators.required],
          message: [rule.message || '', Validators.required],
        });
      })
    );

    const queryArray = this.fb.array(
      (index.query_rules || []).map((rule: any) =>
        this.fb.group({
          query: [rule.query || '', Validators.required],
          message: [rule.message || '', Validators.required],
        })
      )
    );

    this.lineItemForm.setControl('expression_rules', expressionArray);
    this.lineItemForm.setControl('query_rules', queryArray);

    // Force form validation update
    this.lineItemForm.updateValueAndValidity();

    this.isItemModalOpen = true;
  }

  cancelLineItemEdit() {
    this.selectedItem = null;
    this.editingItemIndex = -1;
    this.lineItemForm.reset();
    this.isItemModalOpen = false;
  }

  cancelLineQueryEdit() {
    this.selectedQuery = null;
    this.editingQueryIndex = -1;
    this.lineQueryForm.reset();
    this.isQueryModalOpen = false;
  }

  onLineItemSubmit() {
    if (this.lineItemForm.valid) {
      const itemsArray = this.form.get('items') as FormArray;
      const formValue = this.lineItemForm.value;

      if (this.editingItemIndex !== -1) {
        // Update existing item in FormArray
        
        itemsArray.setControl(this.editingItemIndex, this.createItemFormGroup(formValue));
        
        this._originalItems[this.editingItemIndex] = { ...formValue };
      } else {
        // Push new item to FormArray
        
        itemsArray.push(this.createItemFormGroup(formValue));

        this._originalItems.push({ ...formValue });
      }

      this.onItemsDataChange(this._originalItems);
      this.isItemModalOpen = false;
      this.cancelLineItemEdit(); // Clear form after submission
    }
  }

  onLineQuerySubmit() {
    if (this.lineQueryForm.valid) {
      const queriesArray = this.form.get('queries') as FormArray;
      const formValue = this.lineQueryForm.value;

      if (this.editingQueryIndex !== -1) {
        // Update existing item in FormArray
        queriesArray.at(this.editingQueryIndex).patchValue(formValue);
        this._originalQueries[this.editingQueryIndex] = {
          ...this._originalQueries[this.editingQueryIndex],
          ...formValue,
        };
      } else {
        // Push new item to FormArray
        queriesArray.push(this.fb.group(formValue));
        this._originalQueries.push({ ...formValue });
      }

      this.isQueryModalOpen = false;
      this.cancelLineQueryEdit(); // Clear form after submission
    }
  }

  getFieldTypeName(typeId: number): string {
    const fieldType = this.field_types.find((type) => type.value === typeId);
    return fieldType ? fieldType.label : '';
  }

  isLineItemFieldInvalid(fieldName: string): boolean {
    const field = this.lineItemForm?.get(fieldName);
    return field ? field.invalid && (field.touched || this.submitted) : false;
  }

  isLineQueryFieldInvalid(fieldName: string): boolean {
    const field = this.lineQueryForm?.get(fieldName);
    return field ? field.invalid && (field.touched || this.submitted) : false;
  }

  titleChange() {
    const title = this.editTitle ? 'title_edit_entity' : 'title_add_entity';
    const translateTitle = this.translate.instant(title);
    this.titleService.setTitle(translateTitle);
  }
  decimalValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (value !== null && value !== undefined && !/^\d+(\.\d{1,2})?$/.test(value)) {
      return { decimalInvalid: true };
    }
    return null;
  }

  initForm() {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      slug: [''],
      description: ['', Validators.required],
      max_row_count: ['', Validators.required],
      header_row: ['', Validators.required],
      data_start_row: ['', Validators.required],
      data_end_row: ['', Validators.required],
      is_admin_module: [false],
      ignore_error_rows: [false],
      is_send_mail: [false],
      email_process_slug: ['mail-import'],
      status_id: [1],
      job_type: ['direct'],
      batch_process_count: [50],
      items: this.fb.array([]),
      queries: this.fb.array([]),
    });
    this.initLineItemForm();
    this.initLineQueryForm();
  }

  updateFormValidation(entityType: any) {
    this.form.clearValidators();

    const itemsControl = this.form.get('items');
    const queriesControl = this.form.get('queries');

    this.form.updateValueAndValidity();
  }

  constructRedirectUrl() {
    const currentUrl = this.router.url;
    let updatedUrl = currentUrl.replace(/\/edit\/\d+$/, '');
    this.redirect_url = updatedUrl.replace(/\/add$/, '');
  }

  toggleTheme() {
    this.isDarkTheme = !this.isDarkTheme;
    this.editorOptions = {
      ...this.editorOptions,
      theme: this.isDarkTheme ? 'vs-dark' : 'vs-light',
    };
  }

  fetchAllTables() {
    this.gridApiService.getAllTables().subscribe(
      (response) => {
        if (response.status && response.code === 200) {
          this.tables_list = response.data;
        }
      },
      (error) => {
        const key = 'error';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
      }
    );
  }

  removeItem(item: any) {
    const items = this.form.get('items') as FormArray;

    // Find the index of the item with the matching field_name
    const index = items.controls.findIndex((control) => control.value.field_name === item.field_name);

    if (index !== -1) {
      // If the item exists in the form array, remove it
      items.removeAt(index);
      if (this._originalItems && this._originalItems[index]) {
        this._originalItems.splice(index, 1);
      }
     
    } else {
      this.toastr.warning(`Item with field_name: ${item.field_name} not found.`);
    }
  }

  removeQuery(query: any) {
    const queries = this.form.get('queries') as FormArray;

    // Find the index of the query with the matching query_name
    const index = queries.controls.findIndex((control) => control.value.query_name === query.query_name);

    if (index !== -1) {
      // If the query exists in the form array, remove it
      queries.removeAt(index);
      if (this._originalQueries && this._originalQueries[index]) {
        this._originalQueries.splice(index, 1);
      }
      
    } else {
      this.toastr.warning(`Query with query_name: ${query.query_name} not found.`);
    }
  }

  get itemsControls() {
    return (this.form.get('items') as FormArray).controls;
  }
  get queriesControls() {
    return (this.form.get('queries') as FormArray).controls;
  }

  loadData(id: number) {
    const params = {
      company_id: 1,
      print_query: true,
      primary_table: 'import_templates',
      start_index: 0,
      limit_range: 1,
      sort_columns: [['import_templates.id', 'desc']],
      search_all: [
        {
          column_name: 'import_templates.uuid',
          value: id,
          operator: '=',
        },
      ],
      select_columns: [
        ['import_templates.*'],

        [
          "CASE WHEN COUNT(import_template_line_items.id) = 0 THEN null ELSE COALESCE(Json_agg(DISTINCT jsonb_build_object('expression_rules', import_template_line_items.expression_rules,'query_rules', import_template_line_items.query_rules,'field_name', import_template_line_items.field_name, 'display_name', import_template_line_items.display_name, 'field_table', import_template_line_items.field_table, 'order_no', import_template_line_items.order_no, 'default_value', import_template_line_items.default_value, 'check_reg_exp', import_template_line_items.check_reg_exp, 'is_nullable', import_template_line_items.is_nullable, 'is_unique', import_template_line_items.is_unique, 'is_foreign', import_template_line_items.is_foreign, 'is_multiple', import_template_line_items.is_multiple, 'is_enum', import_template_line_items.is_enum, 'enum_values', import_template_line_items.enum_values,'is_individual', import_template_line_items.is_individual, 'individual_column', import_template_line_items.individual_column, 'foreign_table', import_template_line_items.foreign_table, 'foreign_column', import_template_line_items.foreign_column, 'foreign_can_create', import_template_line_items.foreign_can_create,'foreign_query',import_template_line_items.foreign_query,'unique_query',import_template_line_items.unique_query, 'field_type_id', import_template_line_items.field_type_id))) END",
          'items',
        ],
        [
          "CASE WHEN COUNT(import_template_queries.id) = 0 THEN null ELSE COALESCE(Json_agg(DISTINCT jsonb_build_object('query_string', import_template_queries.query_string,'query_name', import_template_queries.query_name,'allow_multiple', import_template_queries.allow_multiple,'is_individual',import_template_queries.is_individual,'before_lineitems',import_template_queries.before_lineitems, 'order_no', import_template_queries.order_no))) END",
          'queries',
        ],
      ],
      includes: [
        {
          table_name: 'import_template_line_items',
          join_type: 'LEFT',
          join_condition: `import_templates.id = import_template_line_items.import_template_id`,
        },
        {
          table_name: 'import_template_queries',
          join_type: 'LEFT',
          join_condition: `import_templates.id = import_template_queries.import_template_id`,
        },
      ],
      group_by: ['import_templates.id'],
    };

    this.gridApiService.getAllList(params).subscribe(
      (response) => {
        if (response.status && response.code === 200) {
          const entity = response.data.records[0];
          this.form.patchValue({
            name: entity.name,
            slug: entity.slug,
            description: entity.description,
            max_row_count: entity.max_row_count,
            header_row: entity.header_row,
            data_start_row: entity.data_start_row,
            data_end_row: entity.data_end_row,
            ignore_error_rows: entity.ignore_error_rows,
            is_admin_module: entity.is_admin_module,
            is_send_mail: entity.is_send_mail,
            email_process_slug: entity.email_process_slug,
            job_type: entity.job_type,
            batch_process_count: entity.batch_process_count,
            status_id: entity.status_id,
          });
          if (entity.is_send_mail) {
            this.showEmailProcessSlug = true;
          }

          const items = this.form.get('items') as FormArray;

          if (entity.items && entity.items.length > 0) {
            this._originalItems = [...entity.items];
            entity.items.forEach((item: any) => {
              items.push(
                this.fb.group({
                  field_name: [item.field_name, Validators.required],
                  display_name: [item.display_name, Validators.required],
                  order_no: [item.order_no, [Validators.required, Validators.min(0)]],
                  field_table: [item.field_table, Validators.required],
                  default_value: [item.default_value],
                  check_reg_exp: [item.check_reg_exp],
                  is_nullable: [item.is_nullable],
                  is_unique: [item.is_unique],
                  is_foreign: [item.is_foreign],
                  is_multiple: [item.is_multiple],
                  is_enum: [item.is_enum],
                  enum_values: [item.enum_values],
                  is_individual: [item.is_individual],
                  individual_column: [item.individual_column],
                  foreign_table: [item.foreign_table],
                  foreign_column: [item.foreign_column],
                  foreign_can_create: [item.foreign_can_create],
                  foreign_query: [item.foreign_query],
                  unique_query: [item.unique_query],
                  expression_rules: this.fb.array(
                    (item.expression_rules || []).map((rule: any) =>
                      this.fb.group({
                        expression: [rule.expression, Validators.required],
                        message: [rule.message, Validators.required],
                      })
                    )
                  ),
                  query_rules: this.fb.array(
                    (item.query_rules || []).map((rule: any) =>
                      this.fb.group({
                        query: [rule.query, Validators.required],
                        message: [rule.message, Validators.required],
                      })
                    )
                  ),                  
                  field_type_id: [item.field_type_id, Validators.required],
                })
              );
            });
          }

          const queries = this.form.get('queries') as FormArray;

          if (entity.queries && entity.queries.length > 0) {
            this._originalQueries = [...entity.queries];
            entity.queries.forEach((query: any) => {
              queries.push(
                this.fb.group({
                  query_string: [query.query_string, Validators.required],
                  order_no: [query.order_no, [Validators.required, Validators.min(0)]],
                  query_name: [query.query_name, Validators.required],
                  allow_multiple: [query.allow_multiple],
                  is_individual: [query.is_individual],
                  before_lineitems: [query.before_lineitems],
                })
              );
            });
          }
        }
      },
      (error) => {
        const key = 'error';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
      }
    );
  }

  getAddParams(formData: any) {
    const master = [
      {
        name: formData.name,
        status_id: formData.status_id,
        slug: formData.slug,
        description: formData.description,
        max_row_count: formData.max_row_count,
        header_row: formData.header_row,
        data_start_row: formData.data_start_row,
        data_end_row: formData.data_end_row,
        ignore_error_rows: formData.ignore_error_rows,
        is_admin_module: formData.is_admin_module,
        is_send_mail: formData.is_send_mail,
        email_process_slug: formData.email_process_slug,
        job_type: formData.job_type,
        batch_process_count: formData.batch_process_count,
      },
    ];

    if (formData.items && formData.items.length > 0) {
      const items = formData.items.map((item: any) => ({
        import_template_id: '@table1.id',
        field_name: item.field_name,
        display_name: item.display_name,
        order_no: item.order_no,
        field_table: item.field_table,
        default_value: item.default_value,
        check_reg_exp: item.check_reg_exp,
        is_nullable: item.is_nullable,
        is_unique: item.is_unique,
        is_foreign: item.is_foreign,
        is_multiple: item.is_multiple,
        is_enum: item.is_enum,
        enum_values: item.is_enum ? (item.enum_values ? item.enum_values : null) : null,
        is_individual: item.is_individual,
        individual_column: item.is_individual ? (item.individual_column ? item.individual_column : null) : null,
        foreign_table: item.is_foreign ? (item.foreign_table ? item.foreign_table : null) : null,
        foreign_column: item.is_foreign ? (item.foreign_column ? item.foreign_column : null) : null,
        foreign_can_create: item.is_foreign ? (item.foreign_can_create ? item.foreign_can_create : false) : false,
        foreign_query: item.is_foreign ? (item.foreign_query ? item.foreign_query : null) : null,
        //unique_query: item.is_unique ? (item.unique_query ? item.unique_query : null) : null,
        unique_query: item.unique_query,
        expression_rules: JSON.stringify(
          item.expression_rules?.map((rule: any) => ({
            expression: rule.expression,
            message: rule.message,
          })) || []
        ),
        query_rules: JSON.stringify(
          item.query_rules?.map((rule: any) => ({
            query: rule.query,
            message: rule.message,
          })) || []
        ),
        

        field_type_id: item.field_type_id,
      }));
      this.insert_json_schema.data['table2'] = items;
    }

    if (formData.queries && formData.queries.length > 0) {
      const queries = formData.queries.map((query: any) => ({
        import_template_id: '@table1.id',
        query_string: query.query_string,
        order_no: query.order_no,
        query_name: query.query_name,
        allow_multiple: query.allow_multiple,
        is_individual: query.is_individual,
        before_lineitems: query.before_lineitems,
      }));
      this.insert_json_schema.data['table3'] = queries;
    }

    this.insert_json_schema.data['table1'] = master;

    return this.insert_json_schema;
  }

  getEditParams(formData: any, id: any) {
    const master = [
      {
        name: formData.name,
        status_id: formData.status_id,
        slug: formData.slug,
        description: formData.description,
        max_row_count: formData.max_row_count,
        header_row: formData.header_row,
        data_start_row: formData.data_start_row,
        data_end_row: formData.data_end_row,
        ignore_error_rows: formData.ignore_error_rows,
        is_admin_module: formData.is_admin_module,
        is_send_mail: formData.is_send_mail,
        email_process_slug: formData.email_process_slug,
        job_type: formData.job_type,
        batch_process_count: formData.batch_process_count,
      },
    ];

    this.update_json_schema.data['table1'] = master;
    this.update_json_schema.conditions['table1'] = [{ uuid: id }];

    this.update_json_schema.conditions['table2'] = [{ import_template_id: '@table1.id' }];
    this.update_json_schema.conditions['table4'] = [{ import_template_id: '@table1.id' }];

    if (formData.items && formData.items.length > 0) {
      const items = formData.items.map((item: any) => ({
        import_template_id: '@table1.id',
        field_name: item.field_name,
        display_name: item.display_name,
        order_no: item.order_no,
        field_table: item.field_table,
        default_value: item.default_value,
        check_reg_exp: item.check_reg_exp,
        is_nullable: item.is_nullable,
        is_unique: item.is_unique,
        is_foreign: item.is_foreign,
        is_multiple: item.is_multiple,
        is_enum: item.is_enum,
        enum_values: item.is_enum ? (item.enum_values ? item.enum_values : null) : null,
        is_individual: item.is_individual,
        individual_column: item.is_individual ? (item.individual_column ? item.individual_column : null) : null,
        foreign_table: item.is_foreign ? (item.foreign_table ? item.foreign_table : null) : null,
        foreign_column: item.is_foreign ? (item.foreign_column ? item.foreign_column : null) : null,
        foreign_can_create: item.is_foreign ? (item.foreign_can_create ? item.foreign_can_create : false) : false,
        foreign_query: item.is_foreign ? (item.foreign_query ? item.foreign_query : null) : null,
        //unique_query: item.is_unique ? (item.unique_query ? item.unique_query : null) : null,
        unique_query: item.unique_query,
        expression_rules: JSON.stringify(
          item.expression_rules?.map((rule: any) => ({
            expression: rule.expression,
            message: rule.message,
          })) || []
        ),
        query_rules: JSON.stringify(
          item.query_rules?.map((rule: any) => ({
            query: rule.query,
            message: rule.message,
          })) || []
        ),
        

        field_type_id: item.field_type_id,
      }));

      this.update_json_schema.data['table3'] = items;
    }
    if (formData.queries && formData.queries.length > 0) {
      const queries = formData.queries.map((query: any) => ({
        import_template_id: '@table1.id',
        query_string: query.query_string,
        order_no: query.order_no,
        query_name: query.query_name,
        allow_multiple: query.allow_multiple,
        is_individual: query.is_individual,
        before_lineitems: query.before_lineitems,
      }));

      this.update_json_schema.data['table5'] = queries;
    }

    return this.update_json_schema;
  }

  prepareJSON(data: any): string {
    return JSON.stringify(JSON.parse(data));
  }

  prettyJSON(data: any) {
    return JSON.stringify(JSON.parse(JSON.stringify(data).replace(/@table(\w+)/g, '##table$1')), null, 2);
  }

  onSubmit() {
    this.submitted = true;

    const formData = this.form.value;
    const payload = this.id ? this.getEditParams(formData, this.id) : this.getAddParams(formData);

    this.gridApiService.executeRecords(payload).subscribe(
      (response) => {
        if (response.status && response.code === 200) {
          let key;
          if (this.id) {
            key = 'record_updated_successfully';
          } else {
            key = 'record_inserted_successfully';
          }

          const successMessage = this.translate.instant(key);
          this.toastr.success(successMessage);

          this.router.navigate([this.redirect_url]);
        } else {
          const key = response.message;
          const errorMessage = this.translate.instant(key);
          this.toastr.error(errorMessage, 'Error');
        }
      },
      (error) => {
        const key = 'error';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
      }
    );
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return field ? field.invalid && (field.touched || this.submitted) : false;
  }

  isFormInvalid() {
    return this.form.invalid || this.itemsControls.length === 0 || this.queriesControls.length === 0;
  }

  logFormStatus(): void {
    Object.keys(this.form.controls).forEach((field) => {
      const control = this.form.get(field);
      if (control) {
        
      }
    });
  }

  getErrorMessage(fieldName: string): string {
    const field = this.form.get(fieldName);
    if (field) {
      if (field.hasError('required')) {
        return 'required_message';
      }
      if (field.hasError('maxlength')) {
        return `Maximum length exceeded (${field.errors?.['maxlength'].requiredLength} characters allowed)`;
      }
      if (field.hasError('min')) {
        return `Minimum value is ${field.errors?.['min'].min}`;
      }
      if (field.hasError('viewMandatory')) {
        return '"view" option is mandatory';
      }
    }
    return '';
  }

  isItemFieldInvalid(index: number, fieldName: string): boolean {
    const items = this.form.get('items') as FormArray;
    const field = items.at(index).get(fieldName);
    return field ? field.invalid && (field.touched || this.submitted) : false;
  }

  isQueryFieldInvalid(index: number, fieldName: string): boolean {
    const queries = this.form.get('queries') as FormArray;
    const field = queries.at(index).get(fieldName);
    return field ? field.invalid && (field.touched || this.submitted) : false;
  }

  getItemErrorMessage(index: number, fieldName: string): string {
    const items = this.form.get('items') as FormArray;
    const field = items.at(index).get(fieldName);
    if (field) {
      if (field.hasError('required')) {
        return 'required_message';
      }
      if (field.hasError('maxlength')) {
        return `Maximum length exceeded (${field.errors?.['maxlength'].requiredLength} characters allowed)`;
      }
      if (field.hasError('min')) {
        return `Minimum value is ${field.errors?.['min'].min}`;
      }
    }
    return '';
  }
  getQueryErrorMessage(index: number, fieldName: string): string {
    const queries = this.form.get('queries') as FormArray;
    const field = queries.at(index).get(fieldName);
    if (field) {
      if (field.hasError('required')) {
        return 'required_message';
      }
      if (field.hasError('maxlength')) {
        return `Maximum length exceeded (${field.errors?.['maxlength'].requiredLength} characters allowed)`;
      }
      if (field.hasError('min')) {
        return `Minimum value is ${field.errors?.['min'].min}`;
      }
    }
    return '';
  }

  getLineItemErrorMessage(fieldName: string): string {
    const field = this.lineItemForm.get(fieldName);

    if (field) {
      if (field.hasError('required')) {
        return 'required_message';
      }
      if (field.hasError('maxlength')) {
        return `Maximum length exceeded (${field.errors?.['maxlength'].requiredLength} characters allowed)`;
      }
      if (field.hasError('min')) {
        return `Minimum value is ${field.errors?.['min'].min}`;
      }
    }
    return '';
  }

  getQueryItemErrorMessage(fieldName: string): string {
    const field = this.lineQueryForm.get(fieldName);

    if (field) {
      if (field.hasError('required')) {
        return 'required_message';
      }
      if (field.hasError('maxlength')) {
        return `Maximum length exceeded (${field.errors?.['maxlength'].requiredLength} characters allowed)`;
      }
      if (field.hasError('min')) {
        return `Minimum value is ${field.errors?.['min'].min}`;
      }
    }
    return '';
  }

  // Items Table Methods
  get itemsData(): any[] {
    return (this.form.get('items') as FormArray).controls.map((control) => control.value);
  }

  get queriesData(): any[] {
    return (this.form.get('queries') as FormArray).controls.map((control) => control.value);
  }

  private createItemFormGroup(item: any) {
    return this.fb.group({
      field_name: [item.field_name, Validators.required],
      display_name: [item.display_name, Validators.required],
      order_no: [item.order_no, [Validators.required, Validators.min(0)]],
      field_table: [item.field_table, Validators.required],
      default_value: [item.default_value],
      check_reg_exp: [item.check_reg_exp],
      is_nullable: [item.is_nullable],
      is_unique: [item.is_unique],
      is_foreign: [item.is_foreign],
      is_multiple: [item.is_multiple],
      is_enum: [item.is_enum],
      enum_values: [item.enum_values],
      is_individual: [item.is_individual],
      individual_column: [item.individual_column],
      foreign_table: [item.foreign_table],
      foreign_column: [item.foreign_column],
      foreign_can_create: [item.foreign_can_create],
      foreign_query: [item.foreign_query],
      unique_query: [item.unique_query],
      expression_rules: this.fb.array(
        (item.expression_rules || []).map((rule: any) =>
          this.fb.group({
            expression: [rule.expression, Validators.required],
            message: [rule.message, Validators.required],
          })
        )
      ),
      query_rules: this.fb.array(
        (item.query_rules || []).map((rule: any) =>
          this.fb.group({
            query: [rule.query, Validators.required],
            message: [rule.message, Validators.required],
          })
        )
      ),
      
      field_type_id: [item.field_type_id, Validators.required],
    });
  }

  private createQueryFormGroup(query: any) {
    return this.fb.group({
      query_string: [query.query_string, Validators.required],
      order_no: [query.order_no, [Validators.required, Validators.min(0)]],
      query_name: [query.query_name, Validators.required],
      allow_multiple: [query.allow_multiple],
      is_individual: [query.is_individual],
      before_lineitems: [query.before_lineitems],
    });
  }

  onItemsDataChange(data: any[]) {
    const items = this.form.get('items') as FormArray;
    items.clear();

    // If data is empty or undefined, use original data
    const itemsToUse = !data || data.length === 0 ? this._originalItems : data;

    itemsToUse.forEach((item) => {
      items.push(this.createItemFormGroup(item));
    });
  }

  onQueriesDataChange(data: any[]) {
    const queries = this.form.get('queries') as FormArray;
    queries.clear();

    // If data is empty or undefined, use original data
    const queriesToUse = !data || data.length === 0 ? this._originalQueries : data;

    queriesToUse.forEach((query) => {
      queries.push(this.createQueryFormGroup(query));
    });
  }

  onItemsSortChange(sort: { column: string; direction: 'asc' | 'desc' }) {
    const items = [...this.itemsData];
    items.sort((a, b) => {
      const aVal = a[sort.column];
      const bVal = b[sort.column];
      return sort.direction === 'asc' ? (aVal > bVal ? 1 : -1) : aVal < bVal ? 1 : -1;
    });
    this.onItemsDataChange(items);
  }

  onQueriesSortChange(sort: { column: string; direction: 'asc' | 'desc' }) {
    const queries = [...this.queriesData];
    queries.sort((a, b) => {
      const aVal = a[sort.column];
      const bVal = b[sort.column];
      return sort.direction === 'asc' ? (aVal > bVal ? 1 : -1) : aVal < bVal ? 1 : -1;
    });
    this.onQueriesDataChange(queries);
  }
}
