import { Component, OnInit } from '@angular/core';
import { FieldType } from '@ngx-formly/core';
import { Observable, of, Subject } from 'rxjs';
import { map, debounceTime, switchMap, distinctUntilChanged, catchError, startWith, filter } from 'rxjs/operators';
import { GridApiService } from '../../../service/common/grid.service';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'app-formly-field-autocomplete',
  templateUrl: './formly-field-autocomplete.component.html',
  styleUrls: ['./formly-field-autocomplete.component.scss'],
})
export class FormlyFieldAutocompleteComponent extends FieldType implements OnInit {
  options$: Observable<{ label: string; value: any }[]> | undefined;
  public searchSubject = new Subject<string>(); // Change from private to public

  constructor(private gridApiService: GridApiService) {
    super();
  }

  ngOnInit() {
    this.initializeOptions();
    this.searchSubject.next(''); // Trigger initial search to load default options
  }

  private initializeOptions() {
    this.options$ = this.formControl.valueChanges.pipe(
      filter(() => this.formControl.pristine),
      startWith(this.formControl.value),
      switchMap((value) => this.initializeAndSearchOptions(value)),
      catchError(() => of([])) // Handle errors gracefully
    );
  }

  private initializeAndSearchOptions(value: any): Observable<{ label: string; value: any }[]> {
    const initialLoad$ = this.loadOptions(value);
    return initialLoad$.pipe(
      switchMap(() =>
        this.searchSubject.pipe(
          startWith(''),
          debounceTime(300),
          distinctUntilChanged(),
          switchMap((searchTerm) => this.loadOptions(searchTerm)),
          catchError(() => of([])) // Handle errors gracefully
        )
      )
    );
  }

  private loadOptions(searchTerm: string | any[]): Observable<{ label: string; value: any }[]> {
    const { table: tableName, valueColumn, labelColumn } = this.props;
    searchTerm = searchTerm ? searchTerm : this.formControl.value && Array.isArray(this.formControl.value) ? this.formControl.value : [this.formControl.value];
    if (!tableName || !labelColumn || !valueColumn || !searchTerm || !searchTerm.length) {
      return of([]); // Return early if essential properties are missing
    }

    const searchCriteria = this.buildSearchCriteria(searchTerm, valueColumn, labelColumn);
    const listParams = this.buildListParams(tableName, valueColumn, labelColumn, searchCriteria);

    return this.gridApiService.getAllList(listParams).pipe(
      map((response) => this.transformResponse(response, valueColumn, labelColumn)),
      catchError(() => of([])) // Handle errors gracefully
    );
  }

  private buildSearchCriteria(searchTerm: string | any[], valueColumn: string, labelColumn: string) {
    const split = valueColumn.split('::');
    return typeof searchTerm === 'string'
      ? { value: `%${searchTerm}%`, operator: 'ILIKE', column_name: labelColumn }
      : { value: searchTerm, operator: 'IN', column_name: split[0] };
  }

  private buildListParams(tableName: string, valueColumn: string, labelColumn: string, searchCriteria: any) {
    return {
      company_id: 1,
      search_all: [{ value: '1', operator: '=', column_name: 'status_id' }, searchCriteria],
      limit_range: 25,
      print_query: false,
      start_index: 0,
      sort_columns: [[labelColumn, 'asc']],
      primary_table: tableName,
      select_columns: [
        [valueColumn, 'value'],
        [labelColumn, 'label'],
      ],
    };
  }

  private transformResponse(response: any, valueColumn: string, labelColumn: string): { label: string; value: any }[] {
    if (response.status && response.data?.records?.length > 0) {
      return response.data.records.map((record: any) => ({
        value: record[valueColumn] || record['value'],
        label: record[labelColumn] || record['label'],
      }));
    }
    return [];
  }

  override get formControl(): FormControl {
    return this.form.get(this.field.key as string) as FormControl;
  }
}
