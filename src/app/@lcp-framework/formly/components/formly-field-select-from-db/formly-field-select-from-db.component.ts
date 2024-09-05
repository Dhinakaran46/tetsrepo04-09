import { Component, OnInit } from '@angular/core';
import { FieldType } from '@ngx-formly/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { GridApiService } from '../../../service/common/grid.service';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'app-formly-field-select-from-db',
  templateUrl: './formly-field-select-from-db.component.html',
  styleUrl: './formly-field-select-from-db.component.scss',
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
    const tableName = this.props['table'];
    const valueColumn = this.props['valueColumn'];
    const labelColumn = this.props['labelColumn'];
    if (tableName && labelColumn && valueColumn) {
      const listParams = {
        company_id: 1,
        search_all: [
          {
            value: '1',
            operator: '=',
            column_name: 'status_id',
          },
        ],
        limit_range: 1000,
        print_query: false,
        start_index: 0,
        sort_columns: [[labelColumn, 'asc']],
        primary_table: tableName,
        select_columns: [
          [valueColumn, 'value'],
          [labelColumn, 'label'],
        ],
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
}
