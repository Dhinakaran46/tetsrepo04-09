import { Component, OnInit } from '@angular/core';
import { FieldType } from '@ngx-formly/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { GridApiService } from '../../../service/common/grid.service';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'app-formly-field-select-from-db',
  templateUrl: './formly-field-select-from-db.component.html',
  styleUrls: ['./formly-field-select-from-db.component.scss'],
})
export class FormlyFieldSelectFromDbComponent extends FieldType implements OnInit {
  options$: Observable<{ value: any; label: string }[]> | undefined;
  table = this.props['table'];
  labelColumn = this.props['labelColumn'];
  valueColumn = this.props['valueColumn'];

  constructor(private gridApiService: GridApiService) {
    super();
  }

  ngOnInit() {
    // Delay evaluation until the form field is fully initialized
    this.initOptions();
    this.initOnchanges(this);
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
      // console.log('this.form', this.field.parent?.parent?.parent?.model?.unique_id);

      let search_all = this.props['search_all']
        ? this.props['search_all']
        : [
            {
              value: '1',
              operator: '=',
              column_name: 'status_id',
            },
          ];

      search_all = this.evaluateDynamicValues(search_all, this);

      const limit_range = this.props['limit_range'] ? this.props['limit_range'] : 1000;
      const print_query = this.props['print_query'] ? this.props['print_query'] : false;
      const sort_columns = this.props['sort_columns'] ? this.props['sort_columns'] : [[labelColumn, 'asc']];
      const includes = this.props['includes'] ? this.props['includes'] : [];

      const listParams = {
        company_id: 1,
        search_all,
        limit_range,
        print_query,
        start_index: 0,
        sort_columns,
        primary_table: tableName,
        select_columns: [
          [valueColumn, 'value'],
          [labelColumn, 'label'],
        ],
        includes,
      };

      this.options$ = this.gridApiService.getAllList(listParams).pipe(
        map((response: any) => {
          if (response.status && response.data?.records?.length > 0) {
            return response.data.records.map((record: any) => ({
              value: record[valueColumn] || record['value'],
              label: record[labelColumn] || record['label'],
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
}
