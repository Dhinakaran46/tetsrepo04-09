import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { GridApiService } from '../../service/common/grid.service';
import { LocalStorageService } from '../../service/common/local-storage.service';
import { NgSelectModule } from '@ng-select/ng-select';
import { CommonSharedModule } from '../../shared/common/common.module';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';

interface TabConfiguration {
  id: number;
  config_key: string;
  category_id: any;
  config_value: any;
  config_file_value: any;
  config_value_type: string;
  config_field_type: string;
  order_no: any;
}

interface Tab {
  id: number;
  name: string;
  category_id: any;
  configurations: TabConfiguration[];
}

@Component({
  selector: 'app-configuration',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgSelectModule, CommonSharedModule],
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
  fieldTypeOptions = ['text', 'number', 'date', 'checkbox', 'file', 'select', 'time'];
  valueTypeOptions = ['static'];

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

  constructor(
    private route: ActivatedRoute,
    public storeData: Store<any>,
    private gridApiService: GridApiService,
    public localStorageService: LocalStorageService,
    private fb: FormBuilder,
    private translate: TranslateService,
    private toastr: ToastrService,
    public router: Router
  ) {
    this.allTabsForm = this.fb.group({});
    this.configForm = this.fb.group({
      configurations: this.fb.array([]),
    });

    this.newConfigForm = this.fb.group({
      tab: ['', Validators.required],
      key: ['', Validators.required],
      value: ['', Validators.required],
      order_no: ['', Validators.required],
      keyType: ['text', Validators.required],
      valueType: ['static', Validators.required],
    });

    this.initStore();
  }

  ngOnInit() {
    this.title_key = this.route.snapshot.data['pageInfo'].fullEntity;
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
    this.newConfigForm.get('keyType')?.valueChanges.subscribe((keyType) => {
      this.updateValueField(keyType);
    });
  }

  updateValueField(keyType: string): void {
    const valueControl = this.newConfigForm.get('value');
    if (valueControl) {
      switch (keyType) {
        case 'text':
        case 'number':
        case 'date':
        case 'time':
          valueControl.setValidators([Validators.required]);
          break;
        case 'file':
        case 'checkbox':
        case 'single_select':
        case 'select':
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
  addNewItemFormArray(isFirstTime: boolean) {
    console.log(isFirstTime);
  }

  prepareNewRecords() {
    console.log('working');
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
    if (this.isMenuOpen) this.addNewItemFormArray(true);
  }
  onSubmitNewConfig() {
    const newConfig = this.newConfigForm.value;
    console.log(newConfig);
    const extracttab = newConfig.tab.split('_');

    const tab = this.getTabByName(extracttab[1]);
    const configurations = tab.get('configurations') as FormArray;

    configurations.push(
      this.fb.group({
        order_no: [newConfig.order_no],
        category_id: [extracttab[0]],
        config_key: [newConfig.key],
        config_value: [newConfig.value],
        config_field_type: [newConfig.keyType],
        config_value_type: [newConfig.valueType],
      })
    );

    this.newConfigForm.reset();
    this.toggleMenu();
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
      ],
      select_columns: [
        ['app_categories.*'],
        [
          "CASE WHEN COUNT(app_configurations.id) = 0 THEN null ELSE COALESCE(Json_agg(DISTINCT jsonb_build_object('id', app_configurations.id,'order_no',app_configurations.order_no,'config_key', app_configurations.config_key,'category_id', app_configurations.category_id,'config_value', app_configurations.config_value,'config_file_value', app_configurations.config_file_value,'config_value_type', app_configurations.config_value_type,'config_field_type', app_configurations.config_field_type))) END",
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

    this.gridApiService.getAllList(payload).subscribe({
      next: (response: any) => {
        if (response.code === 200 && response.status) {
          this.tabs = response.data.records;
          if (this.tabs[1].configurations) {
            this.tabs[1].configurations.map(function (elem: any) {
              console.log(elem);
              if (elem.config_field_type == 'select') {
                elem.config_value = elem.config_value.split(',');
              }
            });
            this.tabs[0].configurations.map(function (elem: any) {
              console.log(elem);
              if (elem.config_field_type == 'select') {
                elem.config_value = elem.config_value.split(',');
              }
            });
          }
          if (this.tabs.length > 0) {
            this.newConfigForm.get('tab')?.setValue(this.tabs[0].category_id + '_' + this.tabs[0].name);
          }
          this.initAllTabsForms();
          if (this.tabs.length > 0) {
            this.switchTab(this.tabs[0].name);
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
      configurationsArray.push(this.createConfigFormGroup(config));
    });
  }

  createConfigFormGroup(config: TabConfiguration): FormGroup {
    return this.fb.group({
      id: [config.id],
      config_key: [config.config_key, Validators.required],
      category_id: [config.category_id],
      config_value: [config.config_value],
      config_file_value: [config.config_file_value],
      order_no: [config.order_no],
      config_value_type: [config.config_value_type, Validators.required],
      config_field_type: [config.config_field_type, Validators.required],
    });
  }

  get configurationsArray(): FormArray {
    return this.configForm.get('configurations') as FormArray;
  }
  get currentTabConfigurationsArray(): FormArray {
    return this.allTabsForm.get(this.currentTab)?.get('configurations') as FormArray;
  }

  getConfigurationsArray(tabName: string): FormArray {
    return this.allTabsForm.get(tabName)?.get('configurations') as FormArray;
  }

  onFileChange(event: Event, tabName: string, index: number) {
    const element = event.target as HTMLInputElement;
    const file = element.files ? element.files[0] : null;
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const configurationsArray = this.allTabsForm.get(tabName)?.get('configurations') as FormArray;
        const configControl = configurationsArray.at(index) as FormGroup;
        configControl.patchValue({ config_value: e.target.result });
      };
      reader.readAsDataURL(file);
    }
  }

  saveChanges() {
    if (this.allTabsForm.valid) {
      const allConfigurations: { [tabName: string]: any } = {};
      const postData: any = [];
      Object.keys(this.allTabsForm.controls).forEach((tabName) => {
        allConfigurations[tabName] = this.allTabsForm.get(tabName)?.get('configurations')?.value;
        postData.push(...this.allTabsForm.get(tabName)?.get('configurations')?.value);
      });
      console.log(postData);
      console.log('All configurations to be sent:', allConfigurations);

      const updateItems = postData.filter((item: any) => item.id);
      const insertItems = postData.filter((item: any) => !item.id);

      const update_conds = updateItems.map((item: any) => ({
        id: item.id,
      }));

      updateItems.map(function (elem: any) {
        if (elem.config_field_type == 'select') {
          elem.config_value = elem.config_value.toString();
        }
        if (elem.config_field_type == 'file') {
          elem.config_file_value = elem.config_value;
          elem.config_value = '';
        }
      });

      insertItems.map(function (elem: any) {
        if (elem.config_field_type == 'select') {
          elem.config_value = elem.config_value.toString();
        }
        if (elem.config_field_type == 'file') {
          elem.config_file_value = elem.config_value;
          elem.config_value = '';
        }
      });

      this.update_json_schema.conditions['table1'] = update_conds;

      this.update_json_schema.data['table1'] = updateItems;
      this.update_json_schema.data['table2'] = insertItems;
      console.log(this.update_json_schema);
      this.gridApiService.executeRecords(this.update_json_schema).subscribe(
        (response: any) => {
          if (response.status && response.code === 200) {
            console.log(response);
            const key = 'record_updated_successfully';
            const successMessage = this.translate.instant(key);
            this.toastr.success(successMessage);

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
      console.log('Form is invalid');
    }
  }

  switchTab(tabName: string) {
    this.currentTab = tabName;
  }

  getInputType(fieldType: string): string {
    switch (fieldType) {
      case 'text':
      case 'select':
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

    configControl.get('config_value')?.setValue(null);

    switch (newFieldType) {
      case 'number':
        configControl.patchValue({ config_value_type: 'number' });
        break;
      case 'checkbox':
        configControl.patchValue({ config_value_type: 'boolean' });
        break;
      case 'date':
      case 'time':
        configControl.patchValue({ config_value_type: 'date' });
        break;
      case 'file':
        configControl.patchValue({ config_value_type: 'file' });
        break;
      default:
        configControl.patchValue({ config_value_type: 'string' });
    }
  }
}
