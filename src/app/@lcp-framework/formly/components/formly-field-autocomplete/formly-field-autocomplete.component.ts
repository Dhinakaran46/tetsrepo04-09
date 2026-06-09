import { Component, OnInit } from '@angular/core';
import { FieldType } from '@ngx-formly/core';
import { Observable, of, Subject } from 'rxjs';
import { map, debounceTime, switchMap, distinctUntilChanged, catchError, startWith, filter } from 'rxjs/operators';
import { GridApiService } from '../../../service/common/grid.service';
import { FormControl } from '@angular/forms';

@Component({
  standalone: false,
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
    this.initOnchanges(this);
    this.searchSubject.next(''); // Trigger initial search to load default options
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
                this.initializeOptions(); // Refresh options when any value changes
              });
            }
          } catch (error) {
            console.error(`Error evaluating 'refresh' field string for '${refreshKey}':`, error);
          }
        }
      });
    }
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
    const initialLoad$ = this.loadOptions(value, true);
    return initialLoad$.pipe(
      switchMap(() =>
        this.searchSubject.pipe(
          startWith(''),
          debounceTime(300),
          distinctUntilChanged(),
          switchMap((searchTerm) => this.loadOptions(searchTerm, false)),
          catchError(() => of([])) // Handle errors gracefully
        )
      )
    );
  }

  private loadOptions(searchTerm: string | any[], isInitialLoad: boolean = false): Observable<{ label: string; value: any }[]> {
    const { table: tableName, valueColumn, labelColumn, additionalColumns } = this.props;
    const additionalCols = additionalColumns?.length ? additionalColumns : [];

    let term: any = searchTerm;

    if (!term) {
      if (isInitialLoad && this.formControl.value !== null && this.formControl.value !== undefined && this.formControl.value !== '') {
        term = Array.isArray(this.formControl.value) ? this.formControl.value : [this.formControl.value];
      } else {
        term = '';
      }
    }

    if (typeof term === 'number' || (typeof term === 'string' && isInitialLoad && term)) {
      // Just in case it's a primitive ID, wrap it.
      // Actually, if it's a primitive string but not a user search, how to know?
      // Let's just wrap it if it's an exact match to formControl.value
      if (term === this.formControl.value) {
        term = [term];
      }
    }

    if (!tableName || !labelColumn || !valueColumn) {
      return of([]); // Return early if essential properties are missing
    }
    const searchCriteria = this.buildSearchCriteria(term, valueColumn, labelColumn);
    let searchConditions = this.props['search_all'] ? JSON.parse(JSON.stringify(this.props['search_all'])) : [];
    searchConditions = this.evaluateDynamicValues([...searchConditions, searchCriteria], this);
    const printQuery = this.props['print_query'] || false;
    const includes = this.props['includes'] || false;
    //const listParams = this.buildListParams(includes, printQuery, tableName, valueColumn, labelColumn, searchConditions, additionalCols);
    const groupBy = this.props['group_by'] || undefined;
    const listParams = this.buildListParams(includes, printQuery, tableName, valueColumn, labelColumn, searchConditions, additionalCols, groupBy);

    return this.gridApiService.getAllList(listParams).pipe(
      map((response) => this.transformResponse(response, valueColumn, labelColumn)),
      catchError(() => of([])) // Handle errors gracefully
    );
  }

  private buildSearchCriteria(searchTerm: string | any[], valueColumn: string, labelColumn: string) {
    const split = valueColumn.split('::');
    let searchValue: any = [];
    if (Array.isArray(searchTerm)) {
      searchValue = searchTerm.filter((item) => item !== null && item !== undefined);
    }
    return searchValue.length
      ? { value: searchValue, operator: 'IN', column_name: split[0] }
      : { value: `%${searchTerm || ''}%`, operator: 'ILIKE', column_name: labelColumn };
  }

  private buildListParams(
    includes: any,
    printQuery: any,
    tableName: string,
    valueColumn: string,
    labelColumn: string,
    searchConditions: any,
     additionalColumns: any[],
    groupBy?: any
  ) {
    return {
      company_id: 1,
      search_all: [...searchConditions],
      limit_range: 25,
      print_query: printQuery,
      includes: includes ? includes : undefined,
      group_by: groupBy ? groupBy : undefined,
      start_index: 0,
      sort_columns: [[labelColumn, 'asc']],
      primary_table: tableName,
      select_columns: [[valueColumn, 'value'], [labelColumn, 'label'], ...additionalColumns],
    };
  }

  private transformResponse(response: any, valueColumn: string, labelColumn: string): { label: string; value: any }[] {
    if (response.status && response.data?.records?.length > 0) {
      return response.data.records.map((record: any) => ({
        ...record,
        value: record[valueColumn] || record['value'],
        label: record[labelColumn] || record['label'],
      }));
    }
    return [];
  }

  override get formControl(): FormControl {
    return this.form.get(this.field.key as string) as FormControl;
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
    return (this.field as any).entityName || null;
  }

  getFieldKey(): string | undefined {
    if (this.field.key === undefined || this.field.key === null) {
      return undefined;
    }
    return String(this.field.key);
  }

  openNestedFormModal(entityName: string, fieldKey?: string) {
    // Don't open modal if entityName is empty
    if (!entityName || entityName.trim() === '') {
      console.warn('No entity name provided for nested form modal');
      return;
    }
    // Access the parent component's method through formState
    const componentInstance = this.options?.formState?.componentInstance;
    if (componentInstance && typeof componentInstance.openNestedFormModal === 'function') {
      componentInstance.openNestedFormModal(entityName, fieldKey);
    }
  }
}
