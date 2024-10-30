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

export function viewMandatoryValidator(): ValidatorFn {
  return (control: AbstractControl): { [key: string]: any } | null => {
    const selectedOptions = control.value;
    if (Array.isArray(selectedOptions) && selectedOptions.includes('view')) {
      return null; // Valid
    }
    return { viewMandatory: true }; // Invalid
  };
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
  entity_types: any = [];
  action_types: any[] = [];
  field_types: any[] = [];
  tables_list: any = [];
  wizard_type_list: any[] = [];
  id: number | null = null;
  editTitle = false;
  submitted = false;
  commonConfig = commonConfig;
  existing_actions: string[] = [];
  redirect_url: string = '';
  rowsLength: number = 26;

  editorOptions = { theme: 'vs-dark', language: 'json', tabSize: 1, insertSpaces: true };
  htmlEditorOptions = { ...this.editorOptions, language: 'html' };
  isDarkTheme = true; // Default theme
  @ViewChild('monacoEditor') monacoEditor: EditorComponent | undefined;

  insert_json_schema: any = {
    // it will be removed
    action: ['insert', 'insert'],
    table: ['import_templates', 'import_template_line_items'],
    table_mapping: ['table1', 'table2'],
    data: {
      table1: [],
      table2: [],
    },
  };

  update_json_schema: any = {
    // it will be removed
    action: ['update', 'hard_delete', 'insert', 'hard_delete', 'insert'],
    table: ['import_templates', 'import_template_line_items', 'import_template_line_items'],
    table_mapping: ['table1', 'table2', 'table3'],
    data: {
      table1: [],
      table3: [],
    },
    conditions: {
      table1: [],
      table2: [],
    },
  };

  // wizard group properties
  wizardGroups: any[] = [];
  showWizardGroupMenu: boolean = false;
  showWizardGroupModal: boolean = false;
  newWizardGroupName: string = '';
  wizardGroupForm!: FormGroup;

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
    this.constructRedirectUrl();

    // To load all the lookups
    this.field_types = this.commonConfig.field_types;
    this.entity_types = this.commonConfig.entity_types;
    this.action_types = this.commonConfig.action_types;
    this.wizard_type_list = this.commonConfig.wizard_type;
    this.fetchAllTables();

    // To listen "entityType" on value change
    this.form.get('entityType')?.valueChanges.subscribe((value) => {
      this.updateFormValidation(value);
    });

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
    });
  }

  updateFormValidation(entityType: any) {
    this.form.clearValidators();

    const primary_tableControl = this.form.get('primary_table');

    const itemsControl = this.form.get('items');

    if (entityType == commonConfig.ENTITY_TYPES.FORM_BUILDER_MODULE) {
      primary_tableControl?.setValidators([Validators.required, Validators.maxLength(100)]);
      itemsControl?.setValidators([Validators.required, Validators.minLength(1)]);
    }

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

  addItem() {
    const items = this.form.get('items') as FormArray;
    items.push(
      this.fb.group({
        fieldName: ['', [Validators.required, Validators.maxLength(100)]],
        displayName: ['', [Validators.required, Validators.maxLength(100)]],
        orderNo: ['', [Validators.required, Validators.min(0)]],
        isGridColumn: ['true', Validators.required],
        isSearchable: ['true', Validators.required],
        isSortable: ['true', Validators.required],
        fieldType: [this.commonConfig.field_types[0].value, Validators.required],
      })
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

  get itemsControls() {
    return (this.form.get('items') as FormArray).controls;
  }

  loadData(id: number) {
    const params = {
      company_id: 1,
      print_query: true,
      primary_table: 'import_templates',
      start_index: 0,
      limit_range: 1,
      sort_columns: [['import_templates.id', 'desc']],
      select_columns: [
        ['import_templates.*'],

        [
          "CASE WHEN COUNT(import_template_line_items.id) = 0 THEN null ELSE COALESCE(Json_agg(DISTINCT jsonb_build_object('id', import_template_line_items.id,'field_name', import_template_line_items.field_name,'display_name', import_template_line_items.display_name,'order_no', import_template_line_items.order_no,'is_grid_column', import_template_line_items.is_grid_column,'is_searchable', import_template_line_items.is_searchable,'is_sortable', import_template_line_items.is_sortable,'field_type_id', import_template_line_items.field_type_id))) END",
          'items',
        ],
      ],
      includes: [
        {
          table_name: 'import_template_line_items',
          join_type: 'LEFT',
          join_condition: `import_templates.id = import_template_line_items.item_template_id AND import_templates.uuid = '${id}'`,
        },
      ],
      group_by: ['import_templates.id'],
    };

    this.gridApiService.getAllList(params).subscribe(
      (response) => {
        if (response.status && response.code === 200) {
          const entity = response.data.records[0];
          this.existing_actions = this.populateSelectedActionTypes(entity.permissions);

          this.form.patchValue({
            name: entity.name,
            slug: entity.slug,
            description: entity.description,
            primary_table: entity.primary_table && entity.primary_table != 'null' ? entity.primary_table : '',
            status_id: entity.status_id,
          });

          const items = this.form.get('items') as FormArray;

          if (entity.items && entity.items.length > 0) {
            entity.items.forEach((item: any) => {
              items.push(
                this.fb.group({
                  field_name: [item.field_name, Validators.required],
                  display_name: [item.display_name, Validators.required],
                  order_no: [item.order_no, [Validators.required, Validators.min(0)]],
                  field_table: [item.field_table, Validators.required],
                  default_value: [item.default_value, Validators.required],
                  check_reg_exp: [item.check_reg_exp, Validators.required],
                  is_nullable: [item.is_nullable, Validators.required],
                  is_unique: [item.is_unique, Validators.required],
                  is_foreign: [item.is_foreign, Validators.required],
                  is_multiple: [item.is_multiple, Validators.required],
                  is_enum: [item.is_enum, Validators.required],
                  enum_values: [item.enum_values, Validators.required],
                  foreign_table: [item.foreign_table, Validators.required],
                  foreign_column: [item.foreign_column, Validators.required],
                  foreign_can_create: [item.foreign_can_create, Validators.required],
                  field_type_id: [item.field_type_id, Validators.required],
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

  populateSelectedActionTypes(permissions: any) {
    const permissionList = permissions.map((item: any) => {
      const actionType = this.action_types.find((elem: any) => elem.value == item.name);
      return actionType ? actionType.value : '';
    });
    return permissionList;
  }

  getAddParams(formData: any) {
    const master = [
      {
        name: formData.name,
        entity_type: formData.entityType,
        primary_table: formData.primary_table,
        status_id: formData.statusId,
        slug: formData.slug,
        description: formData.description,
      },
    ];

    if (formData.items && formData.items.length > 0) {
      const items = formData.items.map((item: any) => ({
        item_template_id: '@table1.id',
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

    this.insert_json_schema.data['table1'] = master;

    return this.insert_json_schema;
  }

  getEditParams(formData: any, id: any) {
    const master = [
      {
        name: formData.name,
        entity_type: formData.entityType,
        primary_table: formData.primary_table,
        status_id: formData.statusId,
        slug: formData.slug,
        description: formData.description,
      },
    ];

    this.update_json_schema.data['table1'] = master;
    this.update_json_schema.conditions['table1'] = [{ uuid: id }];

    this.update_json_schema.conditions['table2'] = [{ item_template_id: '@table1.id' }];

    if (formData.items && formData.items.length > 0) {
      const items = formData.items.map((item: any) => ({
        item_template_id: '@table1.id',
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
    return this.form.invalid || this.itemsControls.length === 0;
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
}
