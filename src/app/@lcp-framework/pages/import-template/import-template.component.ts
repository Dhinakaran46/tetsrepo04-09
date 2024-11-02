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
  foreign_table: string;
  foreign_column: string;
  foreign_can_create: boolean;
  field_type_id: number;
}

interface QueryItem {
  raw_query: string;
  order_no: number;
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
  //entity_types: any = [];
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

  // Items Datatable Configuration
  itemsTableConfig: TableConfig = {
    columns: [
      { key: 'field_name', label: 'Field Name', sortable: true },
      { key: 'display_name', label: 'Display Name', sortable: true },
      { key: 'field_table', label: 'Field Table', sortable: true },
      { key: 'order_no', label: 'Order No', sortable: true },
      { key: 'field_type_id', label: 'Field Type', sortable: true },
      {
        key: 'actions',
        label: 'Actions',
        type: 'button',
        actions: [
          {
            icon: 'fa-solid fa-edit',
            onClick: (item: any) => this.editLineItem(item),
            class: ' btn-sm btn-outline-primary mr-2',
            tooltip: 'Edit Item',
          },
          {
            icon: 'fa-solid fa-trash',
            onClick: (item: any) => this.removeItem(item),
            class: ' btn-sm btn-outline-danger',
            tooltip: 'Delete Item',
          },
        ],
      },
    ],
    pageSizes: [5, 10, 25, 50],
    defaultPageSize: 5,
    searchable: true,
  };

  // Queries Datatable Configuration
  queriesTableConfig: TableConfig = {
    columns: [
      { key: 'raw_query', label: 'Raw Query', sortable: true },
      { key: 'order_no', label: 'Order No', sortable: true },
      {
        key: 'actions',
        label: 'Actions',
        type: 'button',
        actions: [
          {
            icon: 'fa-solid fa-edit',
            onClick: (item: any) => this.editQueryItem(item),
            class: ' btn-outline-primary btn-sm mr-2',
            tooltip: 'Edit Query',
          },
          {
            icon: 'fa-solid fa-trash',
            onClick: (item: any) => this.removeQuery(item),
            class: ' btn-outline-danger btn-sm',
            tooltip: 'Delete Query',
          },
        ],
      },
    ],
    pageSizes: [5, 10, 25, 50],
    defaultPageSize: 5,
    searchable: true,
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
    private titleService: Title
  ) {
    this.initStore();
  }

  ngOnInit() {
    this.id = this.route.snapshot.params['id'] || null;
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
      foreign_table: [''],
      foreign_column: [''],
      foreign_can_create: [false],
      field_type_id: ['', Validators.required],
    });

    this.addFormArraySubscriptions();
    if (!this.id) {
      this.initNewLineItem();
    }
  }
  initLineQueryForm() {
    this.lineQueryForm = this.fb.group({
      raw_query: ['', [Validators.required]],
      order_no: ['', [Validators.required, Validators.min(0)]],
    });

    if (!this.id) {
      this.initNewLineQuery();
    }
  }

  addFormArraySubscriptions() {
    this.lineItemForm.get('is_foreign')?.valueChanges.subscribe((value) => {
      const foreignControls = ['foreign_table', 'foreign_column', 'foreign_can_create'];
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
      foreign_can_create: false,
    });
  }
  initNewLineQuery() {
    this.editingQueryIndex = -1;
    this.selectedQuery = {};
    this.lineQueryForm.reset({
      raw_query: '',
      order_no: '',
    });
  }

  editQueryItem(index: any) {
    console.log(index);
    //this.editingQueryIndex = index;
    this.selectedQuery = index;
    this.editingQueryIndex = this.queriesData.findIndex((q) => q === index);
    this.lineQueryForm.patchValue(index);
    /*const queriesArray = this.form.get('queries') as FormArray;
    const query = queriesArray.at(index);
    this.selectedQuery = query.value;
    this.lineQueryForm.patchValue(query.value);*/
  }

  editLineItem(index: any) {
    console.log(index);
    //this.editingItemIndex = index;
    /* const itemsArray = this.form.get('items') as FormArray;
    const item = itemsArray.at(index);
    this.selectedItem = item.value;
    this.lineItemForm.patchValue(item.value);*/

    /*this.selectedItem = index;
    this.lineItemForm.patchValue(index);*/
    this.selectedItem = index;
    this.editingItemIndex = this.itemsData.findIndex((i) => i === index);
    this.lineItemForm.patchValue(index);
  }

  cancelLineItemEdit() {
    this.selectedItem = null;
    this.editingItemIndex = -1;
    this.lineItemForm.reset();
  }

  cancelLineQueryEdit() {
    this.selectedQuery = null;
    this.editingQueryIndex = -1;
    this.lineQueryForm.reset();
  }

  onLineItemSubmit() {
    if (this.lineItemForm.valid) {
      const itemsArray = this.form.get('items') as FormArray;
      const formValue = this.lineItemForm.value;

      if (this.editingItemIndex !== -1) {
        // Update existing item in FormArray
        itemsArray.at(this.editingItemIndex).patchValue(formValue);
      } else {
        // Push new item to FormArray
        itemsArray.push(this.fb.group(formValue));
      }

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
      } else {
        // Push new item to FormArray
        queriesArray.push(this.fb.group(formValue));
      }

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
      primary_table: [''],
      status_id: [1],
      items: this.fb.array([]),
      queries: this.fb.array([]),
    });
    this.initLineItemForm();
    this.initLineQueryForm();
  }

  updateFormValidation(entityType: any) {
    this.form.clearValidators();

    const primary_tableControl = this.form.get('primary_table');

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

  removeItem(index: number) {
    const items = this.form.get('items') as FormArray;
    if (items.length > 0) {
      items.removeAt(index);
    } else {
      this.toastr.warning('At least one item is required.');
    }
  }

  removeQuery(index: number) {
    const queries = this.form.get('queries') as FormArray;
    if (queries.length > 0) {
      queries.removeAt(index);
    } else {
      this.toastr.warning('At least one item is required.');
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
        //['import_templates.uuid = '${id}'']
      ],
      select_columns: [
        ['import_templates.*'],

        [
          "CASE WHEN COUNT(import_template_line_items.id) = 0 THEN null ELSE COALESCE(Json_agg(DISTINCT jsonb_build_object('field_name', import_template_line_items.field_name, 'display_name', import_template_line_items.display_name, 'field_table', import_template_line_items.field_table, 'order_no', import_template_line_items.order_no, 'default_value', import_template_line_items.default_value, 'check_reg_exp', import_template_line_items.check_reg_exp, 'is_nullable', import_template_line_items.is_nullable, 'is_unique', import_template_line_items.is_unique, 'is_foreign', import_template_line_items.is_foreign, 'is_multiple', import_template_line_items.is_multiple, 'is_enum', import_template_line_items.is_enum, 'enum_values', import_template_line_items.enum_values, 'foreign_table', import_template_line_items.foreign_table, 'foreign_column', import_template_line_items.foreign_column, 'foreign_can_create', import_template_line_items.foreign_can_create, 'field_type_id', import_template_line_items.field_type_id))) END",
          'items',
        ],
        [
          "CASE WHEN COUNT(import_template_queries.id) = 0 THEN null ELSE COALESCE(Json_agg(DISTINCT jsonb_build_object('raw_query', import_template_queries.raw_query, 'order_no', import_template_queries.order_no))) END",
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
            primary_table: entity.primary_table && entity.primary_table != 'null' ? entity.primary_table : '',
            status_id: entity.status_id,
          });

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
                  foreign_table: [item.foreign_table],
                  foreign_column: [item.foreign_column],
                  foreign_can_create: [item.foreign_can_create],
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
                  raw_query: [query.raw_query, Validators.required],
                  order_no: [query.order_no, [Validators.required, Validators.min(0)]],
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
        //entity_type: formData.entityType,
        primary_table: formData.primary_table,
        status_id: formData.status_id,
        slug: formData.slug,
        description: formData.description,
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
        enum_values: item.enum_values,
        foreign_table: item.foreign_table,
        foreign_column: item.foreign_column,
        foreign_can_create: item.foreign_can_create,
        field_type_id: item.field_type_id,
      }));
      this.insert_json_schema.data['table2'] = items;
    }

    if (formData.queries && formData.queries.length > 0) {
      const queries = formData.queries.map((query: any) => ({
        import_template_id: '@table1.id',
        raw_query: query.raw_query,
        order_no: query.order_no,
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
        //entity_type: formData.entityType,
        primary_table: formData.primary_table,
        status_id: formData.status_id,
        slug: formData.slug,
        description: formData.description,
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
        enum_values: item.enum_values,
        foreign_table: item.foreign_table,
        foreign_column: item.foreign_column,
        foreign_can_create: item.foreign_can_create,
        field_type_id: item.field_type_id,
      }));

      this.update_json_schema.data['table3'] = items;
    }
    if (formData.queries && formData.queries.length > 0) {
      const queries = formData.queries.map((query: any) => ({
        import_template_id: '@table1.id',
        raw_query: query.raw_query,
        order_no: query.order_no,
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

    //return;
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
    //return this.form.invalid;
  }

  logFormStatus(): void {
    Object.keys(this.form.controls).forEach((field) => {
      const control = this.form.get(field);
      if (control) {
        console.log(`Field: ${field}, Status: ${control.status}, Errors: ${JSON.stringify(control.errors)}`);
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
      foreign_table: [item.foreign_table],
      foreign_column: [item.foreign_column],
      foreign_can_create: [item.foreign_can_create],
      field_type_id: [item.field_type_id, Validators.required],
    });
  }

  private createQueryFormGroup(query: any) {
    return this.fb.group({
      raw_query: [query.raw_query, Validators.required],
      order_no: [query.order_no, [Validators.required, Validators.min(0)]],
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
