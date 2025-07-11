import { Component, OnInit } from '@angular/core';
import { FieldType } from '@ngx-formly/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { GridApiService } from '../../../service/common/grid.service';
import { FormControl, FormGroup } from '@angular/forms';
import { LocalStorageService } from '../../../service/common/local-storage.service';

@Component({
  selector: 'app-formly-field-select-from-db',
  templateUrl: './formly-field-select-from-db.component.html',
  styleUrls: ['./formly-field-select-from-db.component.scss'],
})
export class FormlyFieldSelectFromDbComponent extends FieldType implements OnInit {
  options$: Observable<{ value: any; label: string }[]> | undefined;
  labelControl: FormControl | undefined;
  policyData: any = null;
  user_info: any = null;

  constructor(private gridApiService: GridApiService, private localStorageService: LocalStorageService) {
    super();
  }

  ngOnInit() {
    this.user_info = JSON.parse(this.localStorageService.getData('user_data'));
    if (this.user_info.main?.policies) {
      this.policyData = this.user_info.main?.policies || null;
    }
    this.initOptions();
    this.initOnchanges(this);
    this.createLabelControl();
  }

  createLabelControl() {
    const labelControlName = `${this.field.key}_label`;
    if (this.field.parent?.formControl?.get(labelControlName)) {
      const labelControl = this.field.parent?.formControl?.get(labelControlName) as FormControl;
      this.formControl.valueChanges?.subscribe((newValue) => {
        if (newValue == null) {
          // If the value is null, set the label control to null as well
          labelControl.setValue(null);
        } else {
          // Subscribe to the options$ observable to find the matching label
          this.options$?.subscribe((options) => {
            const selectedOption = options.find((option) => option.value === newValue);
            if (selectedOption) {
              labelControl.setValue(selectedOption.label); // Update the label control with the corresponding label
            } else {
              labelControl.setValue(null); // If no match, set the label to null
            }
          });
        }
      });
    }
  }

  initOnchanges(context: any) {
    const refreshKeys: string[] = Array.isArray(this.props['refresh']) ? this.props['refresh'] : [this.props['refresh']];

    if (refreshKeys.length) {
      refreshKeys.forEach((refreshKey) => {
        if (refreshKey) {
          try {
            // Safely evaluate the expression passed in 'refresh' key
            const getControlFunction = new Function('context', `with(context) { return ${refreshKey.replace(/this\./g, 'context.')}; }`);

            // Evaluate 'refresh' field string in the context of the current class
            const parentFormControl = getControlFunction(this) as FormControl | undefined;

            if (parentFormControl) {
              parentFormControl.valueChanges?.subscribe((newValue) => {
                this.initOptions(); // Refresh options when any value changes
              });
            }
          } catch (error) {
            console.error(`Error evaluating 'refresh' field string for '${refreshKey}':`, error);
          }
        }
      });
    }
  }

  initOptions() {
    const tableName = this.props['table'] || this.props['primary_table'];
    const valueColumn = this.props['valueColumn'];
    const labelColumn = this.props['labelColumn'];

    if (tableName && labelColumn && valueColumn) {
      const updatedSearchAll = this.props['search_all']
        ? JSON.parse(JSON.stringify(this.props['search_all']))
        : [
            {
              value: '1',
              operator: '=',
              column_name: 'status_id',
            },
          ];

      const search_all = this.evaluateDynamicValues(updatedSearchAll, this);

      const limit_range = this.props['limit_range'] ? this.props['limit_range'] : 1000;
      const print_query = this.props['print_query'] ? this.props['print_query'] : false;
      const sort_columns = this.props['sort_columns'] ? this.props['sort_columns'] : [[labelColumn, 'asc']];
      const includes = this.props['includes'] ? this.props['includes'] : [];

      const listParams = this.localStorageService.replaceUniqueId(
        this.localStorageService.formatPayloadWithPolicyConditions(
          {
            company_id: 1,
            search_all,
            limit_range,
            print_query:true,
            start_index: 0,
            sort_columns,
            primary_table: tableName,
            select_columns: [
              [valueColumn, 'value'],
              [labelColumn, 'label'],
              ["uuid", 'uuid'],
            ],
            includes,
          },
          this.policyData,
          (this.field as any)?.attached_policies || []
        ),
        '$session_user_id',
        this.user_info.main.id
      );

      let hasSetFirstValue = false;
      console.log(listParams);
      this.options$ = this.gridApiService.getAllList(listParams).pipe(
        map((response: any) => {
          if (response.status && response.data?.records?.length > 0) {
            if (this.field.props && this.field.props['selectFirst'] && !hasSetFirstValue && !this.formControl.value) {
              this.formControl.setValue(response.data.records[0].value ?? null, { emitEvent: true });
              hasSetFirstValue = true; // Prevent subsequent value setting
            }
            return response.data.records.map((record: any) => ({
              value: record[valueColumn] || record['value'],
              label: record[labelColumn] || record['label'],
              uuid: record['uuid'] || record['uuid'],
            }));
          }
          return [];
        })
      );
    }
  }

  // Cast formControl to FormControl explicitly
  override get formControl(): FormControl {
    return this.form.get(this.field.key as string) as FormControl;
  }

  get static_options$(): Observable<any[]> {
    if (Array.isArray(this.to.options)) {
      return of(this.to.options);
    }
    return this.to.options as Observable<any[]>; // Assume it's already an Observable
  }

  evaluateDynamicValues(search_all: any[], context: any): any[] {
    return search_all.map((item) => {
      if (typeof item.value === 'string' && item.value.startsWith('this.')) {
        try {
          // Safely evaluate the expression and catch undefined properties
          const dynamicValue = new Function(
            'context',
            `with(context) { try { return ${item.value.replace(/this\./g, 'context.')}; } catch (e) { return null; } }`
          );
          const evaluatedValue = dynamicValue(context);

          if (evaluatedValue !== undefined) {
            item.value = evaluatedValue; // Replace value with the dynamically evaluated result
          } else {
            console.log('undefined evaluatedValue', item.value);
            item.value = null;
          }
        } catch (error) {
          console.error(`Error evaluating value: ${item.value}`, error);
        }
      }
      return item;
    });
  }

  // Methods for entityName functionality
  getAddEditForm(): string | null {
    // Support both legacy entityName and new modal config
    if ((this.field as any).modal && (this.field as any).modal.entityName) {
      return (this.field as any).modal.entityName;
    }
    return (this.field as any).entityName || null;
  }

  getModalConfig(): any {
    return (this.field as any).modal || null;
  }

  getFieldKey(): string | undefined {
    if (this.field.key === undefined || this.field.key === null) {
      return undefined;
    }
    return String(this.field.key);
  }

  openNestedFormModal(entityName: string, fieldKey?: string, modalConfig?: any, uuid?: string | null) {
    const modalCfg = modalConfig ?? this.getModalConfig();
    // Access the parent component's method through formState
    const componentInstance = this.options?.formState?.componentInstance;
    if (componentInstance && typeof componentInstance.openNestedFormModal === 'function') {
      // Always send entityType as 'popup_add' from here
      componentInstance.openNestedFormModal(entityName, fieldKey, modalCfg, uuid, 'popup_add');
    }
  }

  onEditOption(option: any) {
    console.log(option)
    console.log(this.to['enable_edit'])
    if (!this.to['enable_edit']) return;
    const entityName = this.getAddEditForm();
    const fieldKey = this.getFieldKey();
    const modalConfig = this.getModalConfig();
    console.log(entityName);
    console.log(fieldKey);
    console.log(modalConfig);
    // Access the parent component's method through formState
    const componentInstance = this.options?.formState?.componentInstance;
    if (componentInstance && typeof componentInstance.openNestedFormModal === 'function') {
      // Call openNestedFormModal with uuid for edit mode, entityType as 'popup_edit'
      componentInstance.openNestedFormModal(entityName, fieldKey, modalConfig, option.uuid, 'popup_edit');
    }
  }
}
