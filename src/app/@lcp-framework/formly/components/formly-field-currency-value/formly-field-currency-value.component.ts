import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { FieldType } from '@ngx-formly/core';
import { Observable, of, BehaviorSubject, Subscription } from 'rxjs';
import { map, tap, shareReplay, catchError } from 'rxjs/operators';
import { GridApiService } from '../../../service/common/grid.service';
import { LocalStorageService } from '../../../service/common/local-storage.service';
import { FormControl, FormGroup } from '@angular/forms';

/**
 * Formly type: 'currency-value'
 *
 * Renders a single combined field with:
 *   - Left: ng-select dropdown for currency (select-from-db style)
 *   - Right: number input for the contract value
 *
 * Props expected:
 *   currencyKey       – formGroup key for currency_id        (default: 'currency_id')
 *   valueKey          – formGroup key for contract_value     (default: 'contract_value')
 *   label             – combined field label
 *   required          – marks both inputs required
 *   valuePlaceholder  – placeholder for the number input
 *   clearable         – whether the select is clearable
 *   primary_table, valueColumn, labelColumn, includes, search_all, sort_columns, company_id, limit_range
 *                     – forwarded to the GridApiService query (same as select-from-db)
 */
@Component({
  standalone: false,
  selector: 'app-formly-field-currency-value',
  templateUrl: './formly-field-currency-value.component.html',
  styleUrls: ['./formly-field-currency-value.component.scss'],
})
export class FormlyFieldCurrencyValueComponent
  extends FieldType
  implements OnInit, OnDestroy
{
  currencyOptions: { value: any; label: string }[] = [];
  isLoading = false;
  loadError = false;

  private subs = new Subscription();
  private user_info: any = null;
  private fallbackCurrencyControl = new FormControl(null);
  private fallbackValueControl = new FormControl(null);

  constructor(
    private gridApiService: GridApiService,
    private localStorageService: LocalStorageService,
    private cdr: ChangeDetectorRef
  ) {
    super();
  }

  get currencyKey(): string {
    return this.props['currencyKey'] ?? 'currency_id';
  }

  get valueKey(): string {
    return this.props['valueKey'] ?? 'contract_value';
  }

  get currencyControl(): FormControl {
    return (this.form?.get(this.currencyKey) as FormControl) ?? this.fallbackCurrencyControl;
  }

  get valueControl(): FormControl {
    return (this.form?.get(this.valueKey) as FormControl) ?? this.fallbackValueControl;
  }

  get isRequired(): boolean {
    return !!this.props['required'];
  }

  get valuePlaceholder(): string {
    return this.props['valuePlaceholder'] ?? 'Enter value';
  }

  get isClearable(): boolean {
    return !!this.props['clearable'];
  }

  get selectedCurrencyCode(): string {
    const control = this.currencyControl;
    if (!control?.value || !this.currencyOptions.length) return '';
    const found = this.currencyOptions.find((o) => o.value == control.value);
    if (!found) return '';
    // Extract code from label like "USD - US Dollar" → "USD"
    const code = found.label.split(' ')[0];
    return code ? ` (${code})` : '';
  }

  ngOnInit(): void {
    this.user_info = JSON.parse(
      this.localStorageService.getData('user_data') ?? '{}'
    );
    this.ensureControls();
    this.loadCurrencyOptions();
  }

  private ensureControls(): void {
    const formGroup = this.form;
    if (!(formGroup instanceof FormGroup)) return;
    if (!formGroup.get(this.currencyKey)) {
      formGroup.addControl(this.currencyKey, this.fallbackCurrencyControl);
    }
    if (!formGroup.get(this.valueKey)) {
      formGroup.addControl(this.valueKey, this.fallbackValueControl);
    }
  }

  private loadCurrencyOptions(): void {
    const p = this.props;
    const tableName = p['primary_table'];
    const valueColumn = p['valueColumn'] ?? (p['select_columns']?.[0]?.[0]);
    const labelColumn = p['labelColumn'] ?? (p['select_columns']?.[1]?.[0]);

    if (!tableName) {
      this.isLoading = false;
      return;
    }

    const companyId = p['company_id'] ?? this.user_info?.main?.current_company_id ?? 1;

    // Build payload in the same format as select-from-db
    const payload: any = {
      company_id: companyId,
      primary_table: tableName,
      select_columns: [
        [valueColumn, 'value'],
        [labelColumn, 'label'],
        [`${tableName}.uuid`, 'uuid'],
      ],
      sort_columns: p['sort_columns'] ?? [[labelColumn, 'asc']],
      search_all: p['search_all'] ?? [],
      includes: p['includes'] ?? [],
      limit_range: p['limit_range'] ?? 200,
      start_index: 0,
      print_query: true,
    };

    this.isLoading = true;
    this.loadError = false;

    const sub = this.gridApiService
      .getAllList(payload)
      .pipe(
        catchError(() => of({ status: false, data: { records: [] } }))
      )
      .subscribe((res: any) => {
        if (res?.status && res?.data?.records?.length > 0) {
          this.currencyOptions = res.data.records.map((record: any) => ({
            value: record['value'] ?? record[valueColumn] ?? record['id'],
            label: record['label'] ?? record[labelColumn] ?? record['name'] ?? '',
          }));
        } else {
          this.currencyOptions = [];
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      });

    this.subs.add(sub);
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}
