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
  selector: 'app-add-master-entity',
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
  templateUrl: './master-entity.component.html',
  styleUrl: './master-entity.component.scss',
  animations: [
    trigger('toggleAnimation', [
      transition(':enter', [style({ opacity: 0, transform: 'scale(0.95)' }), animate('100ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))]),
      transition(':leave', [animate('75ms', style({ opacity: 0, transform: 'scale(0.95)' }))]),
    ]),
  ],
})
export class MasterEntityComponent implements OnInit {
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

  editorOptions = { theme: 'vs-dark', language: 'sql', tabSize: 1, insertSpaces: true };
  htmlEditorOptions = { ...this.editorOptions, language: 'html' };
  isDarkTheme = true; // Default theme
  @ViewChild('monacoEditor') monacoEditor: EditorComponent | undefined;

  insert_json_schema: any = {
    // it will be removed
    action: ['insert', 'insert', 'insert'],
    table: ['master_entities', 'permissions', 'master_entity_line_items'],
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
    table: ['master_entities', 'master_entity_line_items', 'master_entity_line_items', 'permissions', 'permissions'],
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
    this.initWizardGroupForm();
    this.loadWizardGroups();
    //this.loadWizardTypes();

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

  // ngAfterViewInit() {
  //   if (this.monacoEditor && this.monacoEditor._editorContainer) {
  //     const editorElement = this.monacoEditor._editorContainer.nativeElement;

  //     const resizeObserver = new ResizeObserver(() => {
  //       // Access the editor instance from the DOM element, if possible
  //       const monacoInstance = (editorElement as any).editorInstance;
  //       if (monacoInstance && typeof monacoInstance.layout === 'function') {
  //         monacoInstance.layout();
  //       }
  //     });

  //     resizeObserver.observe(editorElement);
  //   }
  // }

  // ngAfterViewInit() {
  //   if (this.monacoEditor && this.monacoEditor._editorContainer) {
  //     const editorElement = this.monacoEditor._editorContainer.nativeElement;

  //     // Try observing the window resize as a fallback
  //     window.addEventListener('resize', () => {
  //       console.log('Observing element:', editorElement);
  //       this.adjustEditorHeight(editorElement);
  //     });

  //     // Still, attempt to use ResizeObserver as well
  //     const resizeObserver = new ResizeObserver(() => {
  //       this.adjustEditorHeight(editorElement);
  //     });

  //     resizeObserver.observe(editorElement);
  //   }
  // }

  // private adjustEditorHeight(editorElement: any) {
  //   const newHeight = editorElement.clientHeight;
  //   editorElement.style.height = `${newHeight}px`;

  //   console.log('Adjusted Height:', newHeight);

  //   const monacoInstance = (editorElement as any).editorInstance;
  //   if (monacoInstance && typeof monacoInstance.layout === 'function') {
  //     monacoInstance.layout();
  //   }
  // }

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
      entityName: [''],
      entityType: ['', Validators.required],
      permissions: ['', [Validators.required, viewMandatoryValidator()]],
      primaryTable: [''],
      statusId: [1],
      isAdminModule: [false],
      associateTable: [''],
      wizardType: [''],
      wizardGroup: [''],
      dashboard_wizard_rows: [''],
      dashboard_wizard_columns: [''],
      dashboard_wizard_order_no: ['0.01', [this.decimalValidator]],
      queryInformation: [''],
      dashboard_wizard_options: [''],
      formInformation: [''],
      addQueryInformation: [''],
      editQueryInformation: [''],
      presetQueryInformation: [''],
      staticPageContent: [''],
      items: this.fb.array([]),
    });
  }

  initWizardGroupForm() {
    this.wizardGroupForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
    });
  }

  loadWizardGroups() {
    const params = {
      company_id: 1,
      print_query: true,
      primary_table: 'wizard_group',
      start_index: 0,
      limit_range: 1000,
      sort_columns: [['wizard_group.id', 'desc']],
      select_columns: [['wizard_group.*']],
    };

    this.gridApiService.getAllList(params).subscribe(
      (response) => {
        if (response.status && response.code === 200) {
          this.wizardGroups = response.data.records;
        }
      },
      (error) => {
        const key = 'error';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
      }
    );
  }

  addNewWizardGroup() {
    if (this.wizardGroupForm.valid) {
      const newGroupName = this.wizardGroupForm.get('name')?.value;
      const params = {
        action: ['insert'],
        table: ['wizard_group'],
        table_mapping: ['table1'],
        data: {
          table1: [
            {
              name: newGroupName,
              slug: newGroupName,
            },
          ],
        },
      };

      this.gridApiService.executeRecords(params).subscribe(
        (response) => {
          if (response.status && response.code === 200) {
            const key = 'record_inserted_successfully';
            const successMessage = this.translate.instant(key);
            this.toastr.success(successMessage);

            this.loadWizardGroups();
            this.cancelAddWizardGroup();
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
  }

  isWizardGroupFieldInvalid(fieldName: string): any {
    const field = this.wizardGroupForm.get(fieldName);
    return field?.invalid && (field.touched || field.dirty);
  }

  getWizardGroupErrorMessage(fieldName: string): string {
    const field = this.wizardGroupForm.get(fieldName);
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

  showAddNewWizardGroup() {
    this.showWizardGroupMenu = true;
  }

  cancelAddWizardGroup() {
    this.showWizardGroupMenu = false;
    this.wizardGroupForm.reset();
  }

  updateFormValidation(entityType: any) {
    this.form.clearValidators();

    const primaryTableControl = this.form.get('primaryTable');

    const itemsControl = this.form.get('items');

    if (entityType == commonConfig.ENTITY_TYPES.FORM_BUILDER_MODULE) {
      primaryTableControl?.setValidators([Validators.required, Validators.maxLength(100)]);
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
      primary_table: 'master_entities',
      start_index: 0,
      limit_range: 1,
      sort_columns: [['master_entities.id', 'desc']],
      select_columns: [
        ['master_entities.*'],
        ["COALESCE(Json_agg(DISTINCT jsonb_build_object('name', permissions.name)))", 'permissions'],
        [
          "CASE WHEN COUNT(master_entity_line_items.id) = 0 THEN null ELSE COALESCE(Json_agg(DISTINCT jsonb_build_object('id', master_entity_line_items.id,'field_name', master_entity_line_items.field_name,'display_name', master_entity_line_items.display_name,'order_no', master_entity_line_items.order_no,'is_grid_column', master_entity_line_items.is_grid_column,'is_searchable', master_entity_line_items.is_searchable,'is_sortable', master_entity_line_items.is_sortable,'field_type_id', master_entity_line_items.field_type_id))) END",
          'items',
        ],
      ],
      includes: [
        {
          table_name: 'permissions',
          join_type: 'INNER',
          join_condition: `master_entities.id = permissions.entity_id AND master_entities.uuid = '${id}'`,
        },
        {
          table_name: 'master_entity_line_items',
          join_type: 'LEFT',
          join_condition: `master_entities.id = master_entity_line_items.master_grid_id AND master_entities.uuid = '${id}'`,
        },
      ],
      group_by: ['master_entities.id'],
    };

    this.gridApiService.getAllList(params).subscribe(
      (response) => {
        if (response.status && response.code === 200) {
          const entity = response.data.records[0];
          this.existing_actions = this.populateSelectedActionTypes(entity.permissions);

          this.form.patchValue({
            name: entity.name,
            entityName: entity.entity_name,
            permissions: this.existing_actions,
            associateTable: entity.associated_tables ? this.prettyJSON(entity.associated_tables) : '',
            primaryTable: entity.primary_table && entity.primary_table != 'null' ? entity.primary_table : '',
            statusId: entity.status_id,
            isAdminModule: entity.is_admin_module,
            entityType: entity.entity_type,
            queryInformation: entity.query_information ? this.prettyJSON(entity.query_information) : '',
            formInformation: entity.form_information ? this.prettyJSON(entity.form_information) : '',
            addQueryInformation: entity.add_query_information ? this.prettyJSON(entity.add_query_information) : '',
            editQueryInformation: entity.edit_query_information ? this.prettyJSON(entity.edit_query_information) : '',
            presetQueryInformation: entity.preset_query_information ? this.prettyJSON(entity.preset_query_information) : '',
            staticPageContent: entity.static_page_content,
            wizardType: entity.dashboard_wizard_type,
            wizardGroup: entity.dashboard_wizard_group_id,
            dashboard_wizard_rows: entity.dashboard_wizard_rows,
            dashboard_wizard_columns: entity.dashboard_wizard_columns,
            dashboard_wizard_order_no: entity.dashboard_wizard_order_no,
            dashboard_wizard_options: entity.dashboard_wizard_options ? this.prettyJSON(entity.dashboard_wizard_options) : '',
          });

          const items = this.form.get('items') as FormArray;
          //items.clear();
          if (entity.items && entity.items.length > 0) {
            entity.items.forEach((item: any) => {
              items.push(
                this.fb.group({
                  fieldName: [item.field_name, Validators.required],
                  displayName: [item.display_name, Validators.required],
                  orderNo: [item.order_no, [Validators.required, Validators.min(0)]],
                  isGridColumn: [item.is_grid_column, Validators.required],
                  isSearchable: [item.is_searchable, Validators.required],
                  isSortable: [item.is_sortable, Validators.required],
                  fieldType: [item.field_type_id, Validators.required],
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
    const formDataName = commonConfig.PREFIX_SHORTCODE[formData.entityType] + '_' + formData.name;
    const entitySlug = this.localStorageService.generateSlugWithTimestamp(formDataName);

    const master = [
      {
        name: formData.name,
        entity_name: entitySlug,
        entity_type: formData.entityType,
        ...(formData.primaryTable && { primary_table: formData.primaryTable }),
        ...(formData.statusId && { status_id: formData.statusId }),
        ...(formData.isAdminModule && { is_admin_module: formData.isAdminModule ? formData.isAdminModule : false }),

        ...(formData.associateTable && { associated_tables: this.prepareJSON(formData.associateTable) }),
        ...(formData.queryInformation && { query_information: this.prepareJSON(formData.queryInformation) }),
        ...(formData.formInformation && { form_information: this.prepareJSON(formData.formInformation) }),
        ...(formData.addQueryInformation && { add_query_information: this.prepareJSON(formData.addQueryInformation) }),
        ...(formData.editQueryInformation && { edit_query_information: this.prepareJSON(formData.editQueryInformation) }),
        ...(formData.presetQueryInformation && { preset_query_information: this.prepareJSON(formData.presetQueryInformation) }),
        ...(formData.staticPageContent && { static_page_content: formData.staticPageContent }),
        ...(formData.wizardType && { dashboard_wizard_type: formData.wizardType }),
        ...(formData.wizardGroup && { dashboard_wizard_group_id: formData.wizardGroup }),
        ...(formData.dashboard_wizard_rows && { dashboard_wizard_rows: formData.dashboard_wizard_rows }),
        ...(formData.dashboard_wizard_columns && { dashboard_wizard_columns: formData.dashboard_wizard_columns }),
        ...(formData.dashboard_wizard_order_no && { dashboard_wizard_order_no: formData.dashboard_wizard_order_no }),
        ...(formData.dashboard_wizard_options && { dashboard_wizard_options: this.prepareJSON(formData.dashboard_wizard_options) }),
      },
    ];

    const permissions = formData.permissions.map((action_type_name: any, pindex: number) => ({
      entity_id: '@table1.id',
      name: action_type_name,
      slug: `${action_type_name}_${entitySlug}`,
      order_no: pindex + 1,
      status_id: commonConfig.STATUS.ACTIVE,
    }));

    if (formData.items && formData.items.length > 0) {
      const items = formData.items.map((item: any) => ({
        master_grid_id: '@table1.id',
        field_name: item.fieldName,
        display_name: item.displayName,
        order_no: item.orderNo,
        is_grid_column: item.isGridColumn,
        is_searchable: item.isSearchable,
        is_sortable: item.isSortable,
        field_type_id: item.fieldType,
      }));
      this.insert_json_schema.data['table3'] = items;
    }

    this.insert_json_schema.data['table1'] = master;
    this.insert_json_schema.data['table2'] = permissions;

    return this.insert_json_schema;
  }

  getEditParams(formData: any, id: any) {
    const master = [
      {
        name: formData.name,
        entity_type: formData.entityType,
        ...(formData.primaryTable ? { primary_table: formData.primaryTable } : { primary_table: null }),
        ...(formData.statusId ? { status_id: formData.statusId } : { status_id: null }),
        ...(formData.isAdminModule ? { is_admin_module: formData.isAdminModule } : { is_admin_module: false }),

        ...(formData.associateTable ? { associated_tables: this.prepareJSON(formData.associateTable) } : { associated_tables: null }),
        ...(formData.queryInformation ? { query_information: this.prepareJSON(formData.queryInformation) } : { query_information: null }),
        ...(formData.formInformation ? { form_information: this.prepareJSON(formData.formInformation) } : { form_information: null }),
        ...(formData.addQueryInformation ? { add_query_information: this.prepareJSON(formData.addQueryInformation) } : { add_query_information: null }),
        ...(formData.editQueryInformation ? { edit_query_information: this.prepareJSON(formData.editQueryInformation) } : { edit_query_information: null }),
        ...(formData.presetQueryInformation
          ? { preset_query_information: this.prepareJSON(formData.presetQueryInformation) }
          : { preset_query_information: null }),
        ...(formData.staticPageContent ? { static_page_content: formData.staticPageContent } : { static_page_content: null }),
        ...(formData.wizardType ? { dashboard_wizard_type: formData.wizardType } : { dashboard_wizard_type: null }),
        ...(formData.wizardGroup ? { dashboard_wizard_group_id: formData.wizardGroup } : { dashboard_wizard_group_id: null }),
        ...(formData.dashboard_wizard_rows ? { dashboard_wizard_rows: formData.dashboard_wizard_rows } : { dashboard_wizard_rows: null }),
        ...(formData.dashboard_wizard_columns ? { dashboard_wizard_columns: formData.dashboard_wizard_columns } : { dashboard_wizard_columns: null }),
        ...(formData.dashboard_wizard_order_no ? { dashboard_wizard_order_no: formData.dashboard_wizard_order_no } : { dashboard_wizard_order_no: null }),
        ...(formData.dashboard_wizard_options
          ? { dashboard_wizard_options: this.prepareJSON(formData.dashboard_wizard_options) }
          : { dashboard_wizard_options: null }),
      },
    ];

    this.update_json_schema.data['table1'] = master;
    this.update_json_schema.conditions['table1'] = [{ uuid: id }];

    this.update_json_schema.conditions['table2'] = [{ master_grid_id: '@table1.id' }];

    if (formData.items && formData.items.length > 0) {
      const items = formData.items.map((item: any) => ({
        master_grid_id: '@table1.id',
        field_name: item.fieldName,
        display_name: item.displayName,
        order_no: item.orderNo,
        is_grid_column: item.isGridColumn,
        is_searchable: item.isSearchable,
        is_sortable: item.isSortable,
        field_type_id: item.fieldType,
      }));

      this.update_json_schema.data['table3'] = items;
    }

    // Determine newly added items
    let newly_added_items: any[] = formData.permissions
      .filter((item: string) => !this.existing_actions.includes(item))
      .map((action_type_name: any) => ({
        entity_id: '@table1.id',
        name: action_type_name,
        slug: `${action_type_name}_${formData.entityName}`,
        order_no: '1',
        status_id: '1',
      }));

    // Determine removed items
    let removable_items = this.existing_actions
      .filter((item) => !formData.permissions.includes(item))
      .map((action_type_name: any) => ({
        entity_id: '@table1.id',
        name: action_type_name,
      }));

    this.update_json_schema.conditions['table4'] = removable_items;

    this.update_json_schema.data['table5'] = newly_added_items;

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
    return this.form.invalid || (this.form.value.entityType === commonConfig.ENTITY_TYPES.GRID_BUILDER_MODULE && this.itemsControls.length === 0);
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
