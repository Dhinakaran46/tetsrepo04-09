import { ChangeDetectorRef, Component, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { GridApiService } from '../../service/common/grid.service';
import { MenuMapService } from '../../service/common/menu-map.service';
import { LocalStorageService } from '../../service/common/local-storage.service';
import { Title } from '@angular/platform-browser';
import { Store } from '@ngrx/store';
import { FormlyConfigModule } from '../../formly/formly-config.module';
import { CommonSharedModule } from '../../shared/common/common.module';
import { LoaderComponent } from '../../components/loader/loader.component';
import { DatePipe, Location, CommonModule } from '@angular/common';
import { commonConfig } from '../../config/common.config';

interface SearchCondition {
  id: string;
  label: string;
  value: string;
}
interface SearchConditions {
  [key: number]: SearchCondition[];
}

interface InputTypes {
  [key: number]: string;
}

@Component({
  selector: 'app-policy',
  standalone: true,
  imports: [CommonSharedModule, ReactiveFormsModule, LoaderComponent, FormlyConfigModule, CommonModule],
  templateUrl: './policy.component.html',
  styleUrl: './policy.component.scss',
  providers: [DatePipe],
})
export class PolicyComponent implements OnInit {
  policyForm!: FormGroup;
  userData: any;
  store: any;
  loading = false;
  unique_id!: string | null;
  entityList: any[] = [];
  lineItemData: any[] = [];
  dropdownOpen = false;
  filterConditions: Array<{ field: string; operator: string; value: string; clause_type: string }> = [];
  field_types = commonConfig.field_types;
  inputTypes: InputTypes = commonConfig.field_type;
  searchConditions: SearchConditions = commonConfig.search_conditions;
  filteredColumns: any[] = [];
  selectedColumnType: any = 1;
  title: any = '';

  constructor(
    public fb: FormBuilder,
    public router: Router,
    private route: ActivatedRoute,
    private toastr: ToastrService,
    private gridApiService: GridApiService,
    public translate: TranslateService,
    private commonService: MenuMapService,
    private localStorageService: LocalStorageService,
    private titleService: Title,
    public storeData: Store<any>,
    public location: Location,
    public datePipe: DatePipe,
    public cdr: ChangeDetectorRef
  ) {
    this.route.paramMap.subscribe((params) => {
      this.unique_id = params.get('id');
    });
    this.userData = JSON.parse(this.localStorageService.getData('user_data'))?.main || {};
    this.policyForm = this.fb.group({
      policy_id: [''],
      policy_name: ['', [Validators.required]],
      policy_description: [''],
      entity_id: ['', [Validators.required]],
      entity_name: [{ value: '', disabled: true }, [Validators.required]],
      primary_table: [{ value: '', disabled: true }, [Validators.required]],
      operator: ['OR'],
      status_id: [1],
    });
    this.addCondition();
    if (this.unique_id) {
      this.getPolicyData();
    } else {
      this.getEntityList();
    }
  }

  ngOnInit() {
    this.initStore();
    this.resetComponent();

    const pageInfo = this.route.snapshot.data['pageInfo'] || '';
    if (pageInfo) {
      const translateTitle = this.translate.instant(pageInfo.fullEntity);
      this.titleService.setTitle(translateTitle);
      this.title = pageInfo.fullEntity;
    } else {
      this.title = 'Default Title';
    }
  }

  capitalizeFirstLetter(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  ngOnDestroy() {
    // Unsubscribe from all subscriptions
  }

  async initStore() {
    this.storeData
      .select((d) => d.index)
      .subscribe((d) => {
        this.store = d;
      });
  }

  resetComponent() {
    this.policyForm.patchValue({
      policy_id: '',
      policy_name: '',
      policy_description: '',
      entity_id: '',
      entity_name: '',
      primary_table: '',
      operator: 'AND',
      status_id: 1,
    });
  }

  getEntityList() {
    const payload = {
      includes: [],
      company_id: 1,
      search_all: [
        {
          value: '1',
          operator: '=',
          column_name: 'master_entities.status_id',
        },
        {
          value: 'grid_builder_module',
          operator: '=',
          column_name: 'master_entities.entity_type',
        },
      ],
      limit_range: 1000,
      print_query: true,
      start_index: 0,
      sort_columns: [['master_entities.name', 'asc']],
      primary_table: 'master_entities',
      select_columns: [
        ['master_entities.id', 'value'],
        ['master_entities.name', 'label'],
      ],
    };
    this.loading = true;
    this.commonService.getCommonList(payload).subscribe({
      next: (response: any) => {
        if (response.code === 200 && response.status) {
          this.entityList = response.data.records;
          console.log('response', this.entityList);
          this.loading = false;
        } else {
          this.loading = false;
        }
      },
      error: (error) => {
        console.error('Error fetching URL details:', error);
        this.loading = false;
      },
    });
  }

  getEntityData() {
    console.log('entity', this.policyForm.getRawValue());
    this.filterConditions = [];
    this.addCondition();
    const entityId = this.policyForm.get('entity_id')?.value || null;
    if (entityId || this.unique_id) {
      const payload = {
        group_by: ['master_entities.id'],
        includes: [
          {
            join_type: 'LEFT',
            table_name: 'master_entity_line_items',
            join_condition:
              'master_entity_line_items.master_grid_id = master_entities.id AND master_entity_line_items.status_id = 1 AND master_entity_line_items.is_searchable = true',
          },
          {
            join_type: 'INNER',
            table_name: 'field_types',
            join_condition: 'field_types.id = master_entity_line_items.field_type_id AND field_types.status_id = 1',
          },
        ],
        company_id: 1,
        search_all: [
          {
            value: Number(entityId),
            operator: '=',
            column_name: 'master_entities.id',
          },
          {
            value: '1',
            operator: '=',
            column_name: 'master_entities.status_id',
          },
        ],
        limit_range: 1,
        print_query: true,
        start_index: 0,
        sort_columns: [['master_entities.id', 'asc']],
        primary_table: 'master_entities',
        select_columns: [
          ['master_entities.id', 'entity_id'],
          ['master_entities.name', 'entity_name'],
          ['master_entities.primary_table', 'primary_table'],
          [
            `
              COALESCE(
                JSON_AGG(
                  JSON_BUILD_OBJECT(
                    'id',
                    master_entity_line_items.id,
                    'display_name',
                    master_entity_line_items.display_name,
                    'field',
                    master_entity_line_items.field_name,
                    'clause_type',
                    master_entity_line_items.clause_type,
                    'field_type_id',
                    master_entity_line_items.field_type_id,
                    'entity_id',
                    master_entity_line_items.master_grid_id,
                    'field_type',
                    field_types.field_type
                  ) ORDER BY master_entity_line_items.order_no ASC 
                ) FILTER (WHERE master_entity_line_items.field_name IS NOT NULL),
                '[]'
              )
            `,
            'lineItems',
          ],
        ],
      };
      this.loading = true;
      this.commonService.getCommonList(payload).subscribe({
        next: (response: any) => {
          if (response.code === 200 && response.status) {
            this.loading = false;
            if (response.data.records) {
              this.policyForm.patchValue({
                entity_id: response.data.records[0].entity_id,
                entity_name: response.data.records[0].entity_name,
                primary_table: response.data.records[0].primary_table,
              });
              this.lineItemData = response.data.records[0].lineItems;
              // this.cdr.detectChanges();
              if (this.lineItemData.length > 0) {
                const translationKeys = this.lineItemData.map((col: any) => `GRIDS.${this.title}.fields.${this.translate.instant(col.display_name)}`);
                //const allowedFieldTypes = [3, 4];

                this.translate.get(translationKeys).subscribe((translations) => {
                  this.filteredColumns = this.lineItemData.map((col) => {
                    if (translations[`GRIDS.${this.title}.fields.${this.translate.instant(col.display_name)}`].includes('.')) {
                      return {
                        colSearchHide: false,
                        ...col,
                        title: this.capitalizeFirstLetter(this.translate.instant(col.display_name)),
                      };
                    } else {
                      return {
                        colSearchHide: false,
                        ...col,
                        title: translations[`GRIDS.${this.title}.fields.${col.display_name}`],
                      };
                    }
                  });
                });
              }
              console.log('this.lineItemData ', this.lineItemData, this.policyForm.getRawValue());
            } else {
              const key = 'failed_to_fetch_the_entity_details';
              const errorMessage = this.translate.instant(key);
              this.toastr.error(errorMessage, 'Error');
            }
          } else {
            this.loading = false;
          }
        },
        error: (error) => {
          this.loading = false;
          console.error('Error fetching URL details:', error);
        },
      });
    } else {
      this.loading = false;
      this.policyForm.patchValue({
        entity_id: '',
        entity_name: '',
        primary_table: '',
      });
    }
  }

  getPolicyData() {
    if (this.unique_id) {
      const payload = {
        group_by: ['policies.id', 'master_entities.primary_table', 'master_entities.name'],
        includes: [
          {
            join_type: 'LEFT',
            table_name: 'master_entities',
            join_condition: 'master_entities.id = policies.entity_id',
          },
          {
            join_type: 'LEFT',
            table_name: 'master_entity_line_items',
            join_condition:
              'master_entity_line_items.master_grid_id = master_entities.id AND master_entity_line_items.status_id = 1 AND master_entity_line_items.is_searchable = true',
          },
          {
            join_type: 'INNER',
            table_name: 'field_types',
            join_condition: 'field_types.id = master_entity_line_items.field_type_id AND field_types.status_id = 1',
          },
        ],
        company_id: 1,
        search_all: [
          {
            value: this.unique_id,
            operator: '=',
            column_name: 'policies.uuid',
          },
          {
            value: '3',
            operator: '!=',
            column_name: 'policies.status_id',
          },
        ],
        limit_range: 1,
        print_query: true,
        start_index: 0,
        sort_columns: [['policies.id', 'asc']],
        primary_table: 'policies',
        select_columns: [
          ['policies.id', 'policy_id'],
          ['policies.name', 'policy_name'],
          ['policies.description', 'policy_description'],
          ['policies.operator', 'operator'],
          ['policies.entity_id', 'entity_id'],
          ['policies.status_id', 'status_id'],
          ['master_entities.name', 'entity_name'],
          ['master_entities.primary_table', 'primary_table'],
          [
            `
              COALESCE
              (
                (
                    SELECT
                        JSON_AGG(
                            JSON_BUILD_OBJECT(
                                'id', policy_line_items.id,
                                'policy_id', policy_line_items.policy_id,
                                'column_name', policy_line_items.column_name,
                                'clause_type', policy_line_items.clause_type,
                                'condition', policy_line_items.condition,
                                'column_value', policy_line_items.column_value
                            ) ORDER BY policy_line_items.column_value ASC
                        )
                    FROM
                        policy_line_items
                    WHERE
                        policy_line_items.policy_id = policies.id
                        AND policy_line_items.status_id = 1
                ),
                '[]'
              )
            `,
            'policyLineItems',
          ],
          [
            `
              COALESCE(
                JSON_AGG(
                  JSON_BUILD_OBJECT(
                    'id',
                    master_entity_line_items.id,
                    'display_name',
                    master_entity_line_items.display_name,
                    'field',
                    master_entity_line_items.field_name,
                    'clause_type',
                    master_entity_line_items.clause_type,
                    'field_type_id',
                    master_entity_line_items.field_type_id,
                    'entity_id',
                    master_entity_line_items.master_grid_id,
                    'field_type',
                    field_types.field_type
                  ) ORDER BY master_entity_line_items.field_name ASC 
                ) FILTER (WHERE master_entity_line_items.id IS NOT NULL),
                '[]'
              )
            `,
            'lineItems',
          ],
        ],
      };
      this.loading = true;
      this.commonService.getCommonList(payload).subscribe({
        next: (response: any) => {
          if (response.code === 200 && response.status) {
            this.loading = false;
            if (response.data.records) {
              const data = response.data.records[0];
              this.policyForm.patchValue({
                policy_id: data.policy_id,
                policy_name: data.policy_name,
                policy_description: data.policy_description,
                operator: data.operator,
                entity_id: data.entity_id,
                entity_name: data.entity_name,
                primary_table: data.primary_table,
                status_id: data.status_id,
              });
              this.lineItemData = data.lineItems;
              const policyLineItems: any[] = data.policyLineItems;
              console.log('data====>', this.policyForm.getRawValue(), this.lineItemData, policyLineItems);

              if (this.lineItemData.length) {
                const translationKeys = this.lineItemData.map((col: any) => `GRIDS.${this.title}.fields.${this.translate.instant(col.display_name)}`);

                this.translate.get(translationKeys).subscribe((translations) => {
                  this.filteredColumns = this.lineItemData.map((col) => {
                    if (translations[`GRIDS.${this.title}.fields.${this.translate.instant(col.display_name)}`].includes('.')) {
                      return {
                        colSearchHide: false,
                        ...col,
                        title: this.capitalizeFirstLetter(this.translate.instant(col.display_name)),
                      };
                    } else {
                      return {
                        colSearchHide: false,
                        ...col,
                        title: translations[`GRIDS.${this.title}.fields.${col.display_name}`],
                      };
                    }
                  });
                });
                if (policyLineItems.length) {
                  this.filterConditions = policyLineItems.map((lineItem) => {
                    return {
                      field: lineItem.column_name,
                      operator: lineItem.condition,
                      value: lineItem.column_value,
                      clause_type: lineItem.clause_type,
                    };
                  });
                  console.log('this.filterConditions', this.filterConditions);
                }
              }
            } else {
              const key = 'failed_to_fetch_the_policy_details';
              const errorMessage = this.translate.instant(key);
              this.toastr.error(errorMessage, 'Error');
            }
          } else {
            this.loading = false;
          }
        },
        error: (error) => {
          this.loading = false;
          console.error('Error fetching URL details:', error);
        },
      });
    } else {
      this.loading = false;
      const key = 'invalid_policy';
      const errorMessage = this.translate.instant(key);
      this.toastr.error(errorMessage, 'Error');
    }
  }

  upsertPolicy(exit: boolean = false) {
    const policyData = this.policyForm.getRawValue();

    const policyPayload = {
      name: policyData.policy_name?.trim(),
      description: policyData.policy_description?.length ? policyData.policy_description : null,
      entity_id: Number(policyData.entity_id),
      operator: policyData.operator || 'AND',
      status_id: Number(policyData.status_id) || 1,
      ...(!this.unique_id && {
        created_at: true,
        created_by: true,
      }),
      updated_by: true,
      updated_at: true,
    };

    const policyLineItemData = this.filterConditions
      .filter((condition) => condition.field !== '' && condition.operator !== '' && condition.clause_type !== '')
      .map((condition) => {
        return {
          policy_id: '@table1.id',
          clause_type: condition.clause_type,
          column_name: condition.field,
          column_value: condition.value?.trim() || '',
          condition: condition.operator,
          status_id: 1,
          created_at: true,
          created_by: true,
          updated_by: true,
          updated_at: true,
        };
      });

    const payload: any = {
      data: {
        table1: [policyPayload],
        ...(policyLineItemData.length && { table3: policyLineItemData }),
      },
      table: ['policies', 'policy_line_items', ...(policyLineItemData.length ? ['policy_line_items'] : [])],
      action: [...(this.unique_id ? ['update'] : ['insert']), 'hard_delete', ...(policyLineItemData.length ? ['insert'] : [])],
      table_mapping: ['table1', 'table2', ...(policyLineItemData.length ? ['table3'] : [])],
      conditions: {
        ...(this.unique_id && {
          table1: [
            {
              uuid: this.unique_id,
              status_id: {
                operator: '!=',
                value: 3,
              },
            },
          ],
        }),
        table2: [
          {
            policy_id: '@table1.id',
          },
        ],
      },
    };

    this.loading = true;
    this.gridApiService.executeRecords(payload).subscribe({
      next: (response: any) => {
        this.loading = false;
        if (response.code === 200 && response.status) {
          const key = this.unique_id ? 'policy_created_successfully' : 'policy_updated_successfully';
          const successMessage = this.translate.instant(key);
          this.toastr.success(successMessage);
          if (exit || !this.unique_id) {
            this.location.back();
            return;
          }
          this.resetComponent();
          this.getPolicyData();
        } else {
          const key = this.unique_id ? 'failed_to_create_the_policy' : 'failed_to_update_the_policy';
          const errorMessage = this.translate.instant(key);
          this.toastr.error(errorMessage, 'Error');
        }
      },
      error: (error) => {
        this.loading = false;
        console.error('Error fetching URL details:', error);
        const key = 'record_failed_inserted';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
      },
    });
    console.log('policy update', policyPayload, policyLineItemData);
  }

  toggleDropdown() {
    this.dropdownOpen = !this.dropdownOpen;
  }

  onOptionSelect() {
    this.dropdownOpen = false; // Close the dropdown after selection
  }

  mapConditionToSQL = (condition: any) => {
    switch (condition) {
      case 'contains':
        return 'ILIKE';
      case 'not_contains':
        return 'NOT ILIKE';
      case 'starts_with':
        return 'ILIKE';
      case 'ends_with':
        return 'ILIKE';
      case 'is_empty':
        return '=';
      case 'is_not_empty':
        return '<>';
      case 'is_null':
        return 'IS NULL';
      case 'is_not_null':
        return 'IS NOT NULL';
      default:
        return condition;
    }
  };

  formatDateTime(dateTime: any) {
    const date = new Date(dateTime);
    const formattedDate = this.datePipe.transform(date, 'yyyy-MM-dd HH:mm:ss.SSSZ');
    return formattedDate;
  }
  formatDate(dateTime: any) {
    const date = new Date(dateTime);
    const formattedDate = this.datePipe.transform(date, 'yyyy-MM-dd');
    return formattedDate;
  }

  /* advanced search filter functions */
  getOperatorsForColumn(column: string): SearchCondition[] {
    const columnType = this.filteredColumns.find((col) => col.field === column)?.field_type_id;
    return this.searchConditions[columnType] || [];
  }

  getInputTypeForColumn(column: string): string {
    const columnType = this.filteredColumns.find((col) => col.field === column)?.field_type_id;
    return this.inputTypes[columnType] || 'text';
  }

  onColumnChange(event: Event, index: number) {
    const target = event.target as HTMLSelectElement;
    const column = target.value;
    this.filterConditions[index].field = column;
    const data = this.filteredColumns.find((col) => col.field === column);
    const columnType = data?.field_type_id;
    this.filterConditions[index].clause_type = data?.clause_type || 'where';
    this.filterConditions[index].operator = this.searchConditions[columnType][0].value;
    this.filterConditions[index].value = '';
  }

  addCondition() {
    if (this.filterConditions.length && this.filterConditions.filter((condition) => condition.field === '' || condition.operator === '').length) {
      return;
    }
    this.filterConditions.push({
      field: '',
      operator: '',
      value: '',
      clause_type: '',
    });
  }

  removeCondition(index: number) {
    this.filterConditions.splice(index, 1);
  }

  getConditionValue(index: number): string | null {
    const value = this.filterConditions[index].value;
    if (value) {
      const type = this.getInputTypeForColumn(this.filterConditions[index].field);
      if (type === 'datetime-local') {
        return this.datePipe.transform(value, 'yyyy-MM-ddTHH:mm:ss');
      } else if (type === 'date') {
        return this.datePipe.transform(value, 'yyyy-MM-dd');
      }
    }
    return value;
  }

  setConditionValue(index: number, value: string): void {
    const type = this.getInputTypeForColumn(this.filterConditions[index].field);
    if (type === 'datetime-local' || type === 'date') {
      this.filterConditions[index].value = value;
    } else {
      this.filterConditions[index].value = value;
    }
  }

  getPlaceholderForColumn(column: string): string {
    const columnType = this.getInputTypeForColumn(column);
    switch (columnType) {
      case 'number':
        return 'Enter a number';
      case 'date':
      case 'datetime-local':
        return 'YYYY-MM-DD';
      default:
        return 'Enter a value';
    }
  }

  getMinValueForColumn(column: string): string | null {
    const columnType = this.getInputTypeForColumn(column);
    if (columnType === 'date' || columnType === 'datetime-local') {
      return '1900-01-01';
    }
    return null;
  }

  getMaxValueForColumn(column: string): string | null {
    const columnType = this.getInputTypeForColumn(column);
    if (columnType === 'date' || columnType === 'datetime-local') {
      return '2099-12-31';
    }
    return null;
  }

  getPatternForColumn(column: string): string | undefined {
    const columnType = this.getInputTypeForColumn(column);
    switch (columnType) {
      case 'email':
        return '[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$';
      case 'tel':
        return '[0-9]{10}';
      default:
        return undefined;
    }
  }
}
