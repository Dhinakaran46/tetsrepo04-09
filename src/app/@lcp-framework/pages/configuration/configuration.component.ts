import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators, AbstractControl } from '@angular/forms';
import { GridApiService } from '../../service/common/grid.service';
import { LocalStorageService } from '../../service/common/local-storage.service';
import { NgSelectModule } from '@ng-select/ng-select';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { commonConfig } from '../../config/common.config';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../../environments/environment';
import Swal from 'sweetalert2';
import { MenuMapService } from '../../service/common/menu-map.service';
import { Title } from '@angular/platform-browser';
import { TIMEZONE_LIST } from '../../shared/timezone/timezone-list';
import { ChangeDetectorRef } from '@angular/core';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { FlatpickrDirective } from '../../directives/flatpickr.directive';
import { DynamicFontSizeDirective } from '../../directives/page-specific-font-size.directive';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { MenuModule } from 'headlessui-angular';

interface TabConfiguration {
  id: number;
  config_key: string;
  category_id: any;
  category_type_id: any;
  config_value: any;
  config_select_json?: any; // <-- new field
  config_value_type: string;
  config_field_type: string;
  display_config: any;
  order_no: any;
}

interface Tab {
  id: number;
  name: string;
  category_id: any;
  category_type_id: any;
  configurations: TabConfiguration[];
}

const DATETIME_FORMAT_LIST = [
  { value: 'yyyy-MM-dd HH:mm:ss', label: 'yyyy-MM-dd HH:mm:ss' },
  { value: 'MMM dd, yyyy HH:mm', label: 'MMM dd, yyyy HH:mm' },
  { value: 'dd/MM/yyyy HH:mm:ss', label: 'dd/MM/yyyy HH:mm:ss' },
  { value: 'MM/dd/yyyy h:mm a', label: 'MM/dd/yyyy h:mm a' },
  { value: 'EEEE, MMMM dd, yyyy', label: 'EEEE, MMMM dd, yyyy' },
  { value: "yyyy-MM-dd'T'HH:mm:ss.SSSZ", label: "yyyy-MM-dd'T'HH:mm:ss.SSSZ" },
  { value: 'dd-MMM-yyyy HH:mm:ss', label: 'dd-MMM-yyyy HH:mm:ss' },
];

@Component({
  selector: 'app-configuration',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgSelectModule,
    MonacoEditorModule,
    FlatpickrDirective,
    TranslateModule,
    DynamicFontSizeDirective,
    NgScrollbarModule,
    MenuModule,
  ],
  templateUrl: './configuration.component.html',
  styleUrls: ['./configuration.component.scss'],
})
export class ConfigurationComponent implements OnInit {
  userId: number | null = null;
  companyId: number | null = null;
  tabs: Tab[] = [];
  currentTab: string = '';
  allTabsForm: FormGroup;
  configForm: FormGroup;
  store: any;
  title_key: string = 'configuration';
  masterInfo: any;

  isMenuOpen = false;
  newConfigForm: FormGroup;

  gridpaginationdropdownList = ['5', '10', '15', '20', '25', '30', '40', '50', '60', '70', '80', '90', '100'];
  fieldTypeOptions = ['text', 'number', 'date', 'checkbox', 'file', 'multiselect', 'single_select', 'time', 'timezone', 'datetimeformat', 'json'];
  valueTypeOptions = ['static'];
  modalJsonEditorOptions = { theme: 'vs-dark', language: 'json', tabSize: 2, insertSpaces: true, minimap: { enabled: false }, automaticLayout: true };

  update_json_schema: any = {
    print_query: true,
    action: ['update', 'insert'],
    table: ['app_configurations', 'app_configurations'],
    table_mapping: ['table1', 'table2'],
    data: {
      table2: [],
    },
    conditions: {
      table1: [],
    },
  };
  insert_particular_schema: any = {
    print_query: true,
    action: ['insert'],
    table: ['app_configurations'],
    table_mapping: ['table1'],
    data: {
      table1: [],
    },
    conditions: {},
  };

  delete_json_schema: any = {
    // it will be removed
    action: ['hard_delete'],
    table: ['app_configurations'],
    table_mapping: ['table1'],
    conditions: {
      table1: [],
    },
  };

  commonConfig = commonConfig;
  apiUrl = localStorage.getItem('lcp_api_base_url') || environment.apiUrl;

  timezoneList = TIMEZONE_LIST;
  datetimeFormatList = DATETIME_FORMAT_LIST;

  // Track which config editors are open by index
  jsonEditorOpen: { [key: string]: boolean } = {};

  // For Add New Config modal
  jsonEditorOpenNew = false;

  constructor(
    private commonService: MenuMapService,
    private route: ActivatedRoute,
    public storeData: Store<any>,
    private gridApiService: GridApiService,
    public localStorageService: LocalStorageService,
    private fb: FormBuilder,
    private translate: TranslateService,
    private toastr: ToastrService,
    public router: Router,
    private titleService: Title,
    private cdr: ChangeDetectorRef // <-- Inject CDR
  ) {
    this.allTabsForm = this.fb.group({});
    this.configForm = this.fb.group({
      configurations: this.fb.array([]),
    });

    this.newConfigForm = this.fb.group({
      tab: ['', Validators.required],
      key: ['', Validators.required],
      order_no: ['', Validators.required],
      keyType: ['text', Validators.required],
      valueType: ['static', Validators.required],
      display_config: [false, Validators.required],
      value: [''], // Added to fix missing control error
      config_select_json: [''], // <-- new field
    });

    this.initStore();
  }

  ngOnInit() {
    this.title_key = this.route.snapshot.data['pageInfo'].fullEntity;
    const translateTitle = this.translate.instant(this.title_key);
    this.titleService.setTitle(translateTitle);
    const userData = this.localStorageService.getData('user_data');
    if (userData) {
      const parsedData = JSON.parse(userData);
      this.userId = parsedData.main?.id;
      this.companyId = parsedData.main?.company_id;
    }
    const pageInfo = this.route.snapshot.data['pageInfo'] || '';
    if (pageInfo) {
      this.masterInfo = pageInfo;
    }
    this.initializeUserData();
    this.loadAllItems('act1');
  }

  updateValueField(keyType: string): void {
    const valueControl = this.newConfigForm.get('value');
    if (valueControl) {
      switch (keyType) {
        case 'text':
        case 'number':
        case 'date':
        case 'time':
        case 'json':
          valueControl.setValidators([Validators.required]);
          break;
        case 'file':
        case 'checkbox':
        case 'single_select':
        case 'multiselect':
          valueControl.clearValidators();
          break;
        default:
          valueControl.clearValidators();
      }
      valueControl.updateValueAndValidity();
    }
  }

  async initStore() {
    this.storeData
      .select((d) => d.index)
      .subscribe((d) => {
        this.store = d;
      });
  }

  initializeUserData() {
    const userData = this.localStorageService.getData('user_data');
    if (userData) {
      const parsedData = JSON.parse(userData);
      this.userId = parsedData.main?.id;
      this.companyId = parsedData.main?.company_id;
    }
  }
  addNewItemFormArray(isFirstTime: boolean) {}

  prepareNewRecords() {}

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
    if (this.isMenuOpen) this.addNewItemFormArray(true);
  }

  getTabByName(tabName: string): FormGroup {
    return this.allTabsForm.get(tabName) as FormGroup;
  }

  loadAllItems(appCategoryTypeId: any) {
    if (!this.companyId) {
      console.error('Company ID is not available');
      return;
    }

    const payload = {
      company_id: this.companyId,
      print_query: true,
      primary_table: 'app_categories',
      start_index: 0,
      limit_range: 100,
      sort_columns: [['app_categories.id', 'asc']],
      search_all: [
        {
          column_name: 'app_categories.category_type_id',
          value: appCategoryTypeId,
          operator: '=',
        },
        {
          column_name: 'app_categories.status_id',
          value: 1,
          operator: '=',
        },
      ],
      select_columns: [
        ['app_categories.*'],
        [
          "CASE WHEN COUNT(app_configurations.id) = 0 THEN null ELSE COALESCE(Json_agg(DISTINCT jsonb_build_object('id', app_configurations.id,'display_config',app_configurations.display_config,'order_no',app_configurations.order_no,'config_key', app_configurations.config_key,'category_id', app_configurations.category_id,'category_type_id', app_configurations.category_type_id,'config_value', app_configurations.config_value,'config_file_value', app_configurations.config_file_value,'config_value_type', app_configurations.config_value_type,'config_field_type', app_configurations.config_field_type,'config_select_json',app_configurations.config_select_json))) END",
          'configurations',
        ],
      ],
      includes: [
        {
          table_name: 'app_configurations',
          join_type: 'INNER',
          join_condition: `app_categories.category_id = app_configurations.category_id`,
        },
      ],
      group_by: ['app_categories.id'],
    };

    this.gridApiService.getAllListConfiguration(payload).subscribe({
      next: (response: any) => {
        if (response.code === 200 && response.status) {
          this.tabs = response.data.records;

          let commonTabs: any = [];
          this.tabs.map(function (ielem) {
            commonTabs.push(...ielem.configurations);
          });

          this.tabs.map(function (ielem) {
            ielem.configurations.map(function (elem: any) {
              if (elem.config_field_type == 'multiselect' || elem.config_field_type == 'single_select') {
                try {
                  let options = [];
                  if (elem.config_select_json) {
                    // Always parse as string, since it may be a pretty-printed string
                    options = JSON.parse(typeof elem.config_select_json === 'string' ? elem.config_select_json : JSON.stringify(elem.config_select_json));
                  }
                  const idType = options.length > 0 && typeof options[0].id === 'number' ? 'number' : 'string';
                  let values = elem.config_value
                    ? elem.config_value.split(',').map((v: string) => {
                        if (idType === 'number') {
                          const n = Number(v);
                          return isNaN(n) ? v : n;
                        }
                        return v;
                      })
                    : [];
                  if (elem.config_field_type == 'single_select') {
                    elem.config_value = values.length > 0 ? values[0] : null;
                  } else {
                    elem.config_value = values;
                  }
                } catch {
                  elem.config_value = elem.config_field_type == 'multiselect' ? [] : null;
                }
              }
              if (elem.config_field_type == 'checkbox') {
                elem.config_value = elem.config_value == 'true' && true;
              }
            });
          });

          if (this.tabs.length > 0) {
            this.newConfigForm.get('tab')?.setValue(this.tabs[0].category_id + '_' + this.tabs[0].name);
          }
          this.initAllTabsForms();
          if (this.tabs.length > 0) {
            this.switchTab(this.currentTab?.length ? this.currentTab : this.tabs[0].name);
          }
        }
      },
      error: (error) => {
        const key = 'error';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
        console.error('Error fetching entity types:', error);
      },
    });
  }

  reloadCurrentPage() {
    this.router.navigate([this.router.url]).then(() => {
      window.location.reload();
    });
  }

  getconfig() {
    const procedureParams = { proc_name: 'get_configurations_values_v1', params: { categories: { '0': 'ac1', '1': 'ac2', '2': 'ac30' } } };

    this.commonService.unAuthProcedureCall(procedureParams).subscribe({
      next: (response: { code: number; status: boolean; data: any; message: string }) => {
        if (response.code === 200 && response.status && response.data) {
          const res = response.data?.[0]?.result?.data || [];

          if (Object.keys(res).length > 0) {
            localStorage.setItem('config', JSON.stringify(res));
            this.reloadCurrentPage();
          }
        } else {
          const key = 'error';
          const errorMessage = this.translate.instant(key);
          this.toastr.error(errorMessage, 'Error');
        }
      },
      error: (error) => {
        console.error('Error fetching data:', error);
        //this.loading = false;
      },
      complete: () => {
        //this.loading = false;
      },
    });
  }

  initAllTabsForms() {
    this.tabs.forEach((tab) => {
      this.allTabsForm.addControl(
        tab.name,
        this.fb.group({
          configurations: this.fb.array([]),
        })
      );
      this.initFormForTab(tab);
    });
  }

  initFormForTab(tab: Tab) {
    const configurationsArray = this.allTabsForm.get(tab.name)?.get('configurations') as FormArray;
    configurationsArray.clear();

    tab.configurations.forEach((config) => {
      const fg = this.createConfigFormGroup(config);
      // Always enable config_value for select/multiselect
      if (config.config_field_type === 'multiselect' || config.config_field_type === 'single_select') {
        fg.get('config_value')?.enable();
      }
      configurationsArray.push(fg);
    });
    // Force change detection after form controls are updated
    this.cdr.detectChanges();
  }

  createConfigFormGroup(config: TabConfiguration): FormGroup {
    // Parse and cache options if needed
    let selectOptions: any[] = [];
    if (config.config_field_type === 'multiselect' || config.config_field_type === 'single_select') {
      try {
        selectOptions = config.config_select_json
          ? JSON.parse(typeof config.config_select_json === 'string' ? config.config_select_json : JSON.stringify(config.config_select_json))
          : [];
      } catch {
        selectOptions = [];
      }
    }
    // Create the form group
    const fg = this.fb.group({
      id: [config.id],
      config_key: [config.config_key, Validators.required],
      category_id: [config.category_id],
      category_type_id: ['act1'],
      config_value: [config.config_value],
      config_select_json: [
        config.config_select_json
          ? typeof config.config_select_json === 'string'
            ? config.config_select_json
            : JSON.stringify(config.config_select_json, null, 2)
          : '',
      ],
      order_no: [config.order_no],
      config_value_type: [config.config_value_type, Validators.required],
      config_field_type: [config.config_field_type, Validators.required],

      display_config: [config.display_config, Validators.required],
    });
    // Attach to FormGroup for template access
    (fg as any)._selectOptions = selectOptions;
    return fg;
  }

  get configurationsArray(): FormArray {
    return this.configForm.get('configurations') as FormArray;
  }
  get currentTabConfigurationsArray(): FormArray {
    return this.allTabsForm.get(this.currentTab)?.get('configurations') as FormArray;
  }

  getConfigurationsArray(tabName: string): FormArray {
    const configurations: any = this.allTabsForm.get(tabName)?.get('configurations') as FormArray;
    configurations.controls.sort((a: any, b: any) => {
      const orderA = a.get('order_no')?.value || 0;
      const orderB = b.get('order_no')?.value || 0;
      return orderA - orderB; // Ascending order
    });
    return configurations;
  }

  onFileChange(event: Event, tabName: string, index: number) {
    const inputElement = event.target as HTMLInputElement;

    if (inputElement.files && inputElement.files.length > 0) {
      const pic = inputElement.files[0];
      this.gridApiService.uploadConfigPicture(pic).subscribe(
        (response: any) => {
          if (response.body && response.body.status) {
            const docNames: string = response.body.data;

            const configurationsArray = this.allTabsForm.get(tabName)?.get('configurations') as FormArray;
            const configControl = configurationsArray.at(index) as FormGroup;
            configControl.patchValue({ config_value: docNames });
          }

          // Handle success response
        },
        (error) => {
          const key = 'error';
          const errorMessage = this.translate.instant(key);
          this.toastr.error(errorMessage, 'Error');
          // Handle error response
        }
      );
    }
  }

  removeItem(tabName: string, index: number) {
    const configurationsArray = this.allTabsForm.get(tabName)?.get('configurations') as FormArray;
    const configControl = configurationsArray.at(index) as FormGroup;
    const id = configControl.get('id')?.value;

    Swal.fire({
      icon: 'warning',
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      showCancelButton: true,
      confirmButtonText: 'Delete',
      padding: '2em',
    }).then(async (result) => {
      if (result.value) {
        try {
          this.deleteRecords(id);
        } catch (error: any) {
          const key = 'error';
          const errorMessage = this.translate.instant(key);
          this.toastr.error(errorMessage, error.message);
        }
      }
    });
  }

  deleteRecords(id: any) {
    this.delete_json_schema.conditions['table1'] = [{ id: id }];

    this.gridApiService.executeRecords(this.delete_json_schema).subscribe(
      (response: any) => {
        if (response.status && response.code === 200) {
          const key = 'record_deleted_successfully';
          const successMessage = this.translate.instant(key);
          this.toastr.success(successMessage);
          this.loadAllItems('act1');
        } else {
          const key = 'record_failed_deleted';
          const errorMessage = this.translate.instant(key);
          this.toastr.error(errorMessage, 'Error');
        }
      },
      (error: any) => {
        const key = 'record_failed_deleted';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
      }
    );
  }

  saveChanges() {
    let hasInvalidJson = false;
    Object.keys(this.allTabsForm.controls).forEach((tabName) => {
      const configs = this.allTabsForm.get(tabName)?.get('configurations')?.value;
      if (configs) {
        configs.forEach((cfg: any) => {
          if ((cfg.config_field_type === 'multiselect' || cfg.config_field_type === 'single_select') && !this.isValidJson(cfg.config_select_json)) {
            hasInvalidJson = true;
          }
        });
      }
    });
    if (hasInvalidJson) {
      this.toastr.error('Invalid JSON in select options. Please fix before saving.', 'Error');
      return;
    }
    if (this.allTabsForm.valid) {
      const allConfigurations: { [tabName: string]: any } = {};
      const postData: any = [];
      Object.keys(this.allTabsForm.controls).forEach((tabName) => {
        allConfigurations[tabName] = this.allTabsForm.get(tabName)?.get('configurations')?.value;
        postData.push(...this.allTabsForm.get(tabName)?.get('configurations')?.value);
      });

      const updateItems = postData.filter((item: any) => item.id);
      const insertItems = postData.filter((item: any) => !item.id);

      const update_conds = updateItems.map((item: any) => ({
        id: item.id,
      }));

      updateItems.map(function (elem: any) {
        if (elem.config_field_type == 'multiselect' || elem.config_field_type == 'single_select') {
          elem.config_value = elem.config_value.toString();
        }
      });

      insertItems.map(function (elem: any) {
        if (elem.config_field_type == 'multiselect' || elem.config_field_type == 'single_select') {
          elem.config_value = elem.config_value.toString();
        }
      });

      // Before sending to backend, ensure config_select_json is either null or valid JSON string
      const fixConfigSelectJson = (item: any) => {
        if (item.config_select_json === '' || item.config_select_json == null) {
          item.config_select_json = null;
        }
        return item;
      };
      updateItems.forEach(fixConfigSelectJson);
      insertItems.forEach(fixConfigSelectJson);

      this.update_json_schema.conditions['table1'] = update_conds;

      this.update_json_schema.data['table1'] = updateItems;
      this.update_json_schema.data['table2'] = insertItems;

      this.gridApiService.executeRecordsConfig(this.update_json_schema).subscribe(
        (response: any) => {
          if (response.status && response.code === 200) {
            const key = 'record_updated_successfully';
            const successMessage = this.translate.instant(key);
            this.toastr.success(successMessage);
            //this.getconfig();

            this.loadAllItems('act1');
          } else {
            const key = 'record_failed_updated';
            const errorMessage = this.translate.instant(key);
            this.toastr.error(errorMessage, 'Error');
          }
        },
        (error: any) => {
          const key = 'record_failed_inserted';
          const errorMessage = this.translate.instant(key);
          this.toastr.error(errorMessage, 'Error');
        }
      );
    } else {
      console.warn('Form is invalid');
    }
  }

  onSubmitNewConfig() {
    const newConfig = this.newConfigForm.value;
    if ((newConfig.keyType === 'multiselect' || newConfig.keyType === 'single_select') && !this.isValidJson(newConfig.config_select_json)) {
      this.toastr.error('Invalid JSON in select options. Please fix before saving.', 'Error');
      return;
    }

    const extracttab = newConfig.tab.split('_');

    let config_value = newConfig.value;
    if (newConfig.keyType === 'multiselect') {
      config_value = Array.isArray(config_value) ? config_value.join(',') : '';
    }
    if (newConfig.keyType === 'single_select') {
      config_value = config_value != null ? config_value.toString() : '';
    }
    // Ensure config_select_json is null if empty string
    let config_select_json = newConfig.config_select_json;
    if (config_select_json === '' || config_select_json == null) {
      config_select_json = null;
    }
    this.insert_particular_schema.data['table1'] = [
      {
        order_no: newConfig.order_no,
        category_id: extracttab[0],
        category_type_id: 'act1',
        config_key: newConfig.key,
        config_field_type: newConfig.keyType,

        config_value_type: newConfig.valueType,
        display_config: newConfig.display_config,
        config_select_json: config_select_json,
        config_value: config_value,
      },
    ];

    this.gridApiService.executeRecordsConfig(this.insert_particular_schema).subscribe(
      (response: any) => {
        if (response.status && response.code === 200) {
          const key = 'record_updated_successfully';
          const successMessage = this.translate.instant(key);
          this.toastr.success(successMessage);

          this.newConfigForm.reset();
          this.toggleMenu();
          this.loadAllItems('act1');
        } else {
          const key = 'record_failed_updated';
          const errorMessage = this.translate.instant(key);
          this.toastr.error(errorMessage, 'Error');
        }
      },
      (error: any) => {
        const key = 'record_failed_inserted';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
      }
    );
  }

  switchTab(tabName: string) {
    this.currentTab = tabName;
  }

  getInputType(fieldType: string): string {
    switch (fieldType) {
      case 'text':
      case 'multiselect':
      case 'single_select':
        return 'text';
      case 'number':
        return 'number';
      case 'date':
        return 'date';
      case 'checkbox':
        return 'checkbox';
      case 'file':
        return 'file';
      case 'time':
        return 'time';
      default:
        return 'text';
    }
  }

  onFieldTypeChange(tabName: string, index: number) {
    const configurationsArray = this.allTabsForm.get(tabName)?.get('configurations') as FormArray;
    const configControl = configurationsArray.at(index) as FormGroup;
    const newFieldType = configControl.get('config_field_type')?.value;
  }

  // Helper to parse config_select_json for ng-select
  parseConfigSelectJson(jsonString: string | null | undefined): any[] | null {
    if (!jsonString) return null;
    try {
      const parsed = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
      if (Array.isArray(parsed)) return parsed;
      return null;
    } catch {
      return null;
    }
  }

  // Helper to validate config_select_json
  isValidJson(jsonString: string | null | undefined): boolean {
    if (!jsonString) return true;
    try {
      const parsed = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
      return Array.isArray(parsed);
    } catch {
      return false;
    }
  }

  // Helper to get select options for a config FormGroup
  getSelectOptions(config: AbstractControl) {
    return (config as any)._selectOptions;
  }

  openJsonEditor(index: number) {
    this.jsonEditorOpen[index] = true;
  }

  applyJson(index: number, config: AbstractControl) {
    const jsonValue = config.get('config_select_json')?.value;
    try {
      const parsed = JSON.parse(jsonValue);
      (config as any)._selectOptions = Array.isArray(parsed) ? parsed : [];
      this.jsonEditorOpen[index] = false;
      this.cdr.detectChanges();
    } catch {
      this.toastr.error('Invalid JSON format', 'Error');
    }
  }

  // For Add New Config modal
  applyJsonNew() {
    // No need to cache options, just close the editor
    this.jsonEditorOpenNew = false;
    // Optionally, you could validate JSON here and show a toast if invalid
    try {
      const jsonValue = this.newConfigForm.get('config_select_json')?.value;
      if (jsonValue) {
        JSON.parse(jsonValue); // will throw if invalid
      }
    } catch {
      this.toastr.error('Invalid JSON format', 'Error');
    }
  }

  cancelJsonNew() {
    this.jsonEditorOpenNew = false;
  }
}
