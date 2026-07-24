import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HostListener } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { GridApiService } from '../../service/common/grid.service';

interface LovOption {
  id: number;
  code: string;
  name: string;
}

interface CurrencyOption extends LovOption {
  symbol?: string | null;
}

@Component({
  selector: 'app-tenant-registeration',
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './tenant-registeration.component.html',
  styleUrl: './tenant-registeration.component.scss',
})
export class TenantRegisterationComponent implements OnInit {
  currentStep = 1;
  termsAccepted = false;
  termsTouched = false;
  registrationSubmitted = false;
  registrationReference = '';
  primaryCompanyTouched = false;
  companyCountTouched = false;
  logoPreviewUrls: string[] = [];
  isSubmitting = false;
  submitError = '';

  readonly steps = [
    { id: 1, label: 'Tenant & User Info' },
    { id: 2, label: 'Company Setup' },
    { id: 3, label: 'Complete' },
  ];

  businessTypes: LovOption[] = [
    { id: 1, code: 'DISTRIBUTOR', name: 'Distributor' },
    { id: 2, code: 'RETAILER', name: 'Retailer' },
    { id: 3, code: 'WHOLESALER', name: 'Wholesaler' },
    { id: 4, code: 'MANUFACTURER', name: 'Manufacturer' },
  ];

  employeeSizes: LovOption[] = [
    { id: 5, code: '1_10', name: '1 - 10' },
    { id: 6, code: '11_50', name: '11 - 50' },
    { id: 7, code: '51_200', name: '51 - 200' },
    { id: 8, code: '201_500', name: '201 - 500' },
    { id: 9, code: '500_PLUS', name: '500+' },
  ];

  countries: LovOption[] = [
    { id: 10, code: 'IN', name: 'India' },
    { id: 11, code: 'AE', name: 'United Arab Emirates' },
    { id: 12, code: 'US', name: 'United States' },
  ];

  currencies: CurrencyOption[] = [];
  currencySearches: string[] = [];
  openCurrencyPickerIndex: number | null = null;

  readonly tenantForm = this.fb.group({
    firstName: ['', Validators.required],
    lastName: [''],
    designation: [''],
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    mobileNumber: ['', Validators.required],
    countryId: [null as number | null, Validators.required],
    address: [''],
    businessTypeId: [null as number | null, Validators.required],
    employeeSizeId: [null as number | null, Validators.required],
    companyName: ['', Validators.required],
    noOfCompanies: [1, [Validators.required, Validators.min(1), Validators.max(5)]],
  });

  readonly companySetupForm = this.fb.group({
    companies: this.fb.array([]),
  });

  constructor(private fb: FormBuilder, private gridApiService: GridApiService, private toastr: ToastrService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadLovOptions();
  }

  get companies(): FormArray {
    return this.companySetupForm.get('companies') as FormArray;
  }

  get maxCompanies(): number {
    const count = Number(this.tenantForm.controls.noOfCompanies.value || 1);
    return Math.min(Math.max(count, 1), 5);
  }

  goToStep(step: number): void {
    if (!this.registrationSubmitted && step <= this.currentStep) {
      this.currentStep = step;
      this.termsTouched = false;
    }
  }

  nextStep(): void {
    if (this.registrationSubmitted) return;

    if (this.currentStep === 1 && this.tenantForm.invalid) {
      this.tenantForm.markAllAsTouched();
      return;
    }

    if (this.currentStep === 1) {
      this.ensureInitialCompany();
      this.ensurePrimaryCompany();
    }

    if (this.currentStep === 2) {
      this.primaryCompanyTouched = true;
      this.companyCountTouched = true;
      if (!this.hasRequiredCompanyCount()) {
        this.openFirstCompany();
        return;
      }
      if (this.companySetupForm.invalid) {
        this.openFirstInvalidCompany();
        return;
      }

      if (!this.hasPrimaryCompany()) {
        this.openFirstCompany();
        return;
      }

      this.collapseCompaniesWithoutVisibleErrors();
    }

    if (this.currentStep === 3) {
      this.submitRegistration();
      return;
    }

    if (this.currentStep < this.steps.length) {
      this.currentStep += 1;
      this.termsTouched = false;
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep -= 1;
      this.termsTouched = false;
    }
  }

  cancel(): void {
    this.tenantForm.reset({
      noOfCompanies: 1,
    });
    this.clearLogoPreviews();
    this.companies.clear();
    this.resetCompletionState();
    this.currentStep = 1;
  }

  registerAnother(): void {
    this.cancel();
  }

  isInvalid(controlName: keyof typeof this.tenantForm.controls): boolean {
    const control = this.tenantForm.controls[controlName];
    return control.invalid && (control.touched || control.dirty);
  }

  addCompany(): void {
    if (this.companies.length >= this.maxCompanies) return;

    this.companies.controls.forEach((company) => company.patchValue({ isOpen: false }));
    this.companies.push(this.createCompanyGroup(this.companies.length));
  }

  deleteCompany(index: number): void {
    if (index === 0) return;
    const wasPrimary = Boolean(this.companies.at(index).get('isPrimary')?.value);
    this.revokeLogoPreview(index);
    this.companies.removeAt(index);
    this.logoPreviewUrls.splice(index, 1);
    this.currencySearches.splice(index, 1);
    this.openCurrencyPickerIndex = null;
    if (wasPrimary) {
      this.primaryCompanyTouched = true;
    }
  }

  toggleCompany(index: number): void {
    const company = this.companies.at(index);
    company.patchValue({ isOpen: !company.get('isOpen')?.value });
  }

  companyTitle(index: number): string {
    const company = this.companies.at(index);
    return company.get('name')?.value || (index === 0 ? this.tenantForm.controls.companyName.value : `Company ${index + 1}`) || `Company ${index + 1}`;
  }

  companyInvalid(index: number, controlName: string): boolean {
    const control = this.companies.at(index).get(controlName);
    return Boolean(control?.invalid && (control.touched || control.dirty));
  }

  companyHasVisibleError(index: number): boolean {
    const company = this.companies.at(index);
    return company.invalid && (company.touched || company.dirty);
  }

  hasPrimaryCompany(): boolean {
    return this.companies.controls.some((company) => Boolean(company.get('isPrimary')?.value));
  }

  primaryCompanyInvalid(): boolean {
    return this.primaryCompanyTouched && !this.hasPrimaryCompany();
  }

  hasRequiredCompanyCount(): boolean {
    return this.companies.length === this.maxCompanies;
  }

  companyCountInvalid(): boolean {
    return this.companyCountTouched && !this.hasRequiredCompanyCount();
  }

  isCurrencySelected(companyIndex: number, currencyId: number): boolean {
    return (this.companies.at(companyIndex)?.get('currencyIds')?.value || []).some((selectedId: number) => Number(selectedId) === Number(currencyId));
  }

  isDefaultCurrency(companyIndex: number, currencyId: number): boolean {
    return Number(this.companies.at(companyIndex)?.get('defaultCurrencyId')?.value) === Number(currencyId);
  }

  toggleCurrency(companyIndex: number, currencyId: number, checked: boolean): void {
    const company = this.companies.at(companyIndex);
    const currencyIds = company.get('currencyIds');
    const defaultCurrencyId = company.get('defaultCurrencyId');
    const selected = new Set((currencyIds?.value || []).map((id: number) => Number(id)));

    if (checked) {
      selected.add(currencyId);
    } else {
      selected.delete(currencyId);
      if (this.isDefaultCurrency(companyIndex, currencyId)) {
        defaultCurrencyId?.setValue(null);
        defaultCurrencyId?.markAsTouched();
      }
    }

    currencyIds?.setValue([...selected]);
    currencyIds?.markAsDirty();
    currencyIds?.markAsTouched();
  }

  selectDefaultCurrency(companyIndex: number, currencyId: number): void {
    if (!this.isCurrencySelected(companyIndex, currencyId)) {
      this.toggleCurrency(companyIndex, currencyId, true);
    }
    const control = this.companies.at(companyIndex).get('defaultCurrencyId');
    control?.setValue(currencyId);
    control?.markAsDirty();
    control?.markAsTouched();
  }

  onDefaultCurrencyChange(companyIndex: number, value: unknown): void {
    const currencyId = Number(value);
    if (Number.isInteger(currencyId) && currencyId > 0) {
      this.selectDefaultCurrency(companyIndex, currencyId);
      return;
    }

    const control = this.companies.at(companyIndex).get('defaultCurrencyId');
    control?.setValue(null);
    control?.markAsTouched();
  }

  selectedCurrencies(companyIndex: number): CurrencyOption[] {
    return this.currencies.filter((currency) => this.isCurrencySelected(companyIndex, currency.id));
  }

  filteredCurrencies(companyIndex: number): CurrencyOption[] {
    const search = (this.currencySearches[companyIndex] || '').trim().toLowerCase();
    if (!search) return this.currencies;

    return this.currencies.filter((currency) =>
      [currency.code, currency.name, currency.symbol].filter(Boolean).some((value) => String(value).toLowerCase().includes(search))
    );
  }

  defaultCurrency(companyIndex: number): CurrencyOption | undefined {
    return this.currencies.find((currency) => this.isDefaultCurrency(companyIndex, currency.id));
  }

  toggleCurrencyPicker(companyIndex: number): void {
    if (this.openCurrencyPickerIndex === companyIndex) {
      this.closeCurrencyPicker();
    } else {
      this.openCurrencyPickerIndex = companyIndex;
    }
  }

  closeCurrencyPicker(): void {
    if (this.openCurrencyPickerIndex !== null) {
      this.currencySearches[this.openCurrencyPickerIndex] = '';
    }
    this.openCurrencyPickerIndex = null;
  }

  updateCurrencySearch(companyIndex: number, value: string): void {
    this.currencySearches[companyIndex] = value;
  }

  @HostListener('document:click', ['$event'])
  closeCurrencyPickerOnOutsideClick(event: MouseEvent): void {
    if (this.openCurrencyPickerIndex === null) return;
    const target = event.target as HTMLElement | null;
    if (!target?.closest('[data-currency-picker]')) {
      this.closeCurrencyPicker();
    }
  }

  removeCurrency(companyIndex: number, currencyId: number): void {
    this.toggleCurrency(companyIndex, currencyId, false);
  }

  selectPrimaryCompany(index: number, checked: boolean): void {
    this.primaryCompanyTouched = true;
    this.companies.controls.forEach((company, companyIndex) => {
      company.patchValue({ isPrimary: checked && companyIndex === index }, { emitEvent: false });
      company.get('isPrimary')?.markAsDirty();
      company.get('isPrimary')?.markAsTouched();
    });
  }

  companyLogoFileName(index: number): string {
    const logo = this.companies.at(index).get('logo')?.value;
    return logo instanceof File ? logo.name : '';
  }

  onCompanyLogoChange(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    const logoControl = this.companies.at(index).get('logo');

    this.revokeLogoPreview(index);
    logoControl?.setValue(file);
    logoControl?.markAsDirty();
    logoControl?.markAsTouched();
    this.logoPreviewUrls[index] = file ? URL.createObjectURL(file) : '';
  }

  get tenantDisplayName(): string {
    return [this.tenantForm.controls.firstName.value, this.tenantForm.controls.lastName.value].filter(Boolean).join(' ') || '-';
  }

  get tenantBusinessTypeName(): string {
    return this.getLovName(this.businessTypes, this.tenantForm.controls.businessTypeId.value);
  }

  get tenantEmployeeSizeName(): string {
    return this.getLovName(this.employeeSizes, this.tenantForm.controls.employeeSizeId.value);
  }

  get tenantCountryName(): string {
    return this.getLovName(this.countries, this.tenantForm.controls.countryId.value);
  }

  get submitButtonLabel(): string {
    if (this.isSubmitting && this.currentStep === this.steps.length) {
      return 'Submitting registration...';
    }
    if (this.isSubmitting) {
      return 'Submitting...';
    }
    if (this.currentStep === this.steps.length) {
      return 'Submit Request';
    }
    return this.currentStep === 2 ? 'Next: Review' : 'Next Step';
  }

  companyBusinessTypeName(index: number): string {
    return this.getLovName(this.businessTypes, this.companies.at(index).get('businessTypeId')?.value);
  }

  companyEmployeeSizeName(index: number): string {
    return this.getLovName(this.employeeSizes, this.companies.at(index).get('employeeSizeId')?.value);
  }

  acceptTerms(checked: boolean): void {
    this.termsAccepted = checked;
    this.termsTouched = true;
  }

  private loadLovOptions(): void {
    this.gridApiService
      .getLovValues({
        scope: 'global',
        codes: ['business_type', 'employee_size', 'country'],
      })
      .pipe(catchError(() => of(null)))
      .subscribe((response: any) => {
        const lovTypes = response?.data || [];
        if (!lovTypes.length) return;

        const normalizeLovCode = (value: string) =>
          String(value || '')
            .trim()
            .toLowerCase()
            .replace(/[-\s]+/g, '_');
        const byType = (type: string) => {
          const lovType = lovTypes.find((record: any) => normalizeLovCode(record.code) === type);
          return (lovType?.values || []).map((record: any) => ({
            id: Number(record.id),
            code: record.code,
            name: record.name,
          }));
        };

        this.businessTypes = byType('business_type') || this.businessTypes;
        this.employeeSizes = byType('employee_size') || this.employeeSizes;
        this.countries = byType('country') || this.countries;
      });

    this.gridApiService
      .getTenantRegistrationCurrencies()
      .pipe(catchError(() => of(null)))
      .subscribe((response: any) => {
        const records = response?.data || [];
        this.currencies = records.map((record: any) => ({
          id: Number(record.id),
          code: String(record.code || ''),
          name: String(record.name || ''),
          symbol: record.symbol || null,
        }));
        this.companies.controls.forEach((_, index) => this.applyInitialCurrencySelection(index));
        this.cdr.detectChanges();
      });
  }

  private applyInitialCurrencySelection(companyIndex: number): void {
    if (!this.currencies.length) return;
    const company = this.companies.at(companyIndex);
    if (!company || (company.get('currencyIds')?.value || []).length) return;

    const usd = this.currencies.find((currency) => currency.code.trim().toUpperCase() === 'USD');
    const initialCurrency = usd || this.currencies[0];
    company.patchValue({
      currencyIds: [initialCurrency.id],
      defaultCurrencyId: initialCurrency.id,
    });
  }

  private openFirstInvalidCompany(): void {
    this.companySetupForm.markAllAsTouched();
    const invalidIndex = this.companies.controls.findIndex((company) => company.invalid);
    if (invalidIndex === -1) return;

    this.companies.controls.forEach((company, index) => {
      company.patchValue({ isOpen: index === invalidIndex });
    });
  }

  private openFirstCompany(): void {
    this.companies.controls.forEach((company, index) => {
      company.patchValue({ isOpen: index === 0 });
    });
  }

  private collapseCompaniesWithoutVisibleErrors(): void {
    this.companies.controls.forEach((company, index) => {
      if (!this.companyHasVisibleError(index)) {
        company.patchValue({ isOpen: false });
      }
    });
  }

  private submitRegistration(): void {
    this.termsTouched = true;
    this.companyCountTouched = true;
    this.submitError = '';
    if (!this.termsAccepted || this.isSubmitting) return;
    if (!this.hasRequiredCompanyCount()) {
      this.currentStep = 2;
      this.openFirstCompany();
      this.submitError = `Please configure exactly ${this.maxCompanies} compan${this.maxCompanies === 1 ? 'y' : 'ies'} before submitting.`;
      return;
    }

    this.isSubmitting = true;
    this.cdr.detectChanges();
    this.gridApiService.createTenantRegistration(this.buildRegistrationFormData()).subscribe({
      next: (response: any) => {
        const responseBody = response?.body || response;

        if (responseBody?.status === true && Number(responseBody?.code || 0) >= 200 && Number(responseBody?.code || 0) < 300) {
          this.isSubmitting = false;
          this.submitError = '';
          this.registrationReference = responseBody?.data?.reference || `REG-${Math.floor(100000 + Math.random() * 900000)}`;
          this.registrationSubmitted = true;
          this.toastr.success(responseBody?.message || 'Tenant registration submitted successfully. Company setup will continue in the background.', 'Success');
          this.cdr.detectChanges();
          return;
        }

        this.isSubmitting = false;
        const message = responseBody?.message || 'Unable to submit tenant registration.';
        this.submitError = message;
        this.toastr.error(message, 'Error');
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        this.isSubmitting = false;
        const message = this.getApiErrorMessage(error);
        this.submitError = message;
        this.toastr.error(message, 'Error');
        this.cdr.detectChanges();
      },
    });
  }

  private resetCompletionState(): void {
    this.termsAccepted = false;
    this.termsTouched = false;
    this.primaryCompanyTouched = false;
    this.companyCountTouched = false;
    this.isSubmitting = false;
    this.submitError = '';
    this.registrationSubmitted = false;
    this.registrationReference = '';
    this.currencySearches = [];
    this.openCurrencyPickerIndex = null;
  }

  private buildRegistrationFormData(): FormData {
    const tenantValue = this.tenantForm.getRawValue();
    const companies = this.companies.controls.map((company, index) => {
      const companyValue = company.getRawValue();
      const logo = companyValue.logo;

      return {
        code: companyValue.code,
        name: companyValue.name,
        tradeName: companyValue.tradeName,
        corporateEmail: companyValue.corporateEmail,
        taxRegistrationNumber: companyValue.taxRegistrationNumber,
        registrationNumber: companyValue.registrationNumber,
        address: companyValue.address,
        mobileNo: companyValue.mobileNo,
        website: companyValue.website,
        isPrimary: companyValue.isPrimary,
        businessTypeId: companyValue.businessTypeId,
        employeeSizeId: companyValue.employeeSizeId,
        countryId: companyValue.countryId,
        currencyIds: companyValue.currencyIds,
        defaultCurrencyId: companyValue.defaultCurrencyId,
        logoFileKey: logo instanceof File ? `company_logo_${index}` : null,
      };
    });

    const formData = new FormData();
    formData.append(
      'registration',
      JSON.stringify({
        firstName: tenantValue.firstName,
        lastName: tenantValue.lastName,
        designation: tenantValue.designation,
        email: tenantValue.email,
        password: tenantValue.password,
        mobileNumber: tenantValue.mobileNumber,
        countryId: tenantValue.countryId,
        address: tenantValue.address,
        businessTypeId: tenantValue.businessTypeId,
        employeeSizeId: tenantValue.employeeSizeId,
        companyName: tenantValue.companyName,
        noOfCompanies: tenantValue.noOfCompanies,
        companies,
      })
    );

    this.companies.controls.forEach((company, index) => {
      const logo = company.get('logo')?.value;
      if (logo instanceof File) {
        formData.append(`company_logo_${index}`, logo, logo.name);
      }
    });

    return formData;
  }

  private ensureInitialCompany(): void {
    while (this.companies.length > this.maxCompanies) {
      this.revokeLogoPreview(this.companies.length - 1);
      this.logoPreviewUrls.splice(this.companies.length - 1, 1);
      this.companies.removeAt(this.companies.length - 1);
    }

    if (!this.companies.length) {
      this.companies.push(this.createCompanyGroup(0));
    }
  }

  private ensurePrimaryCompany(): void {
    if (!this.companies.length) {
      this.companies.push(this.createCompanyGroup(0));
      return;
    }

    const primaryCompany = this.companies.at(0);
    const patch: any = {};

    if (!primaryCompany.get('name')?.value) patch.name = this.tenantForm.controls.companyName.value || '';
    if (!primaryCompany.get('corporateEmail')?.value) patch.corporateEmail = this.tenantForm.controls.email.value || '';
    if (!primaryCompany.get('businessTypeId')?.value) patch.businessTypeId = this.tenantForm.controls.businessTypeId.value;
    if (!primaryCompany.get('employeeSizeId')?.value) patch.employeeSizeId = this.tenantForm.controls.employeeSizeId.value;
    if (!primaryCompany.get('countryId')?.value) patch.countryId = this.tenantForm.controls.countryId.value;
    if (!primaryCompany.get('address')?.value) patch.address = this.tenantForm.controls.address.value || '';

    primaryCompany.patchValue(patch);
  }

  private createCompanyGroup(index: number) {
    const initialCurrency = this.currencies.find((currency) => currency.code.trim().toUpperCase() === 'USD') || this.currencies[0];
    return this.fb.group({
      code: ['', Validators.required],
      name: [index === 0 ? this.tenantForm.controls.companyName.value || '' : '', Validators.required],
      tradeName: [''],
      corporateEmail: [index === 0 ? this.tenantForm.controls.email.value || '' : '', [Validators.email]],
      taxRegistrationNumber: [''],
      registrationNumber: [''],
      address: [index === 0 ? this.tenantForm.controls.address.value || '' : ''],
      mobileNo: [''],
      website: [''],
      logo: [null as File | null],
      isPrimary: [false],
      businessTypeId: [index === 0 ? this.tenantForm.controls.businessTypeId.value : null],
      employeeSizeId: [index === 0 ? this.tenantForm.controls.employeeSizeId.value : null],
      countryId: [index === 0 ? this.tenantForm.controls.countryId.value : null, Validators.required],
      currencyIds: [[...(initialCurrency ? [initialCurrency.id] : [])] as number[], Validators.required],
      defaultCurrencyId: [initialCurrency?.id || (null as number | null), Validators.required],
      isOpen: [true],
    });
  }

  private getLovName(options: LovOption[], id: unknown): string {
    return options.find((option) => Number(option.id) === Number(id))?.name || '-';
  }

  private getApiErrorMessage(error: any): string {
    const responseError = error?.error;
    if (typeof responseError === 'string') return responseError;

    const dataMessage = typeof responseError?.data === 'string' ? responseError.data : responseError?.data?.message;

    return responseError?.message || responseError?.errors?.message || dataMessage || error?.message || 'Unable to submit tenant registration.';
  }

  private revokeLogoPreview(index: number): void {
    const previewUrl = this.logoPreviewUrls[index];
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  }

  private clearLogoPreviews(): void {
    this.logoPreviewUrls.forEach((previewUrl) => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    });
    this.logoPreviewUrls = [];
  }
}
