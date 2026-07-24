import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HostListener } from '@angular/core';
import { ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
import { ToastrService } from 'ngx-toastr';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonSharedModule } from '../../shared/common/common.module';
import { AuthService } from '../../service/common/auth.service';
import { LocalStorageService } from '../../service/common/local-storage.service';
import { LanguageService } from '../../service/common/language.service';
import { MenuLoadService } from '../../service/common/menu-load.service';
import { TimezoneService } from '../../service/common/timezone.service';
import { RouteUpdateService } from '../../service/common/route-update.service';
import { GridApiService } from '../../service/common/grid.service';
import { catchError, forkJoin, of, switchMap } from 'rxjs';

interface LovOption {
  id: number;
  code: string;
  name: string;
}

interface CurrencyOption extends LovOption {
  symbol?: string | null;
}

@Component({
  selector: 'app-company-selection',
  standalone: true,
  imports: [CommonSharedModule, ReactiveFormsModule, OverlayModule],
  templateUrl: './company-selection.component.html',
  styleUrl: './company-selection.component.scss',
})
export class CompanySelectionComponent implements OnInit {
  userInfo: any = null;
  companies: any[] = [];
  currentCompanyId = 0;
  selectedCompanyId = 0;
  loadingCompanyId = 0;
  searchTerm = '';
  config: any = null;

  showAddCompanyModal = false;
  isAddingCompany = false;
  addCompanyError = '';
  addCompanyLogoPreviewUrl = '';
  businessTypes: LovOption[] = [];
  employeeSizes: LovOption[] = [];
  countries: LovOption[] = [];
  currencies: CurrencyOption[] = [];
  currencySearch = '';
  showCurrencyPicker = false;
  currencyOverlayWidth = 360;
  readonly currencyOverlayPositions: ConnectedPosition[] = [
    {
      originX: 'start',
      originY: 'bottom',
      overlayX: 'start',
      overlayY: 'top',
      offsetY: 8,
    },
    {
      originX: 'start',
      originY: 'top',
      overlayX: 'start',
      overlayY: 'bottom',
      offsetY: -8,
    },
  ];
  private addCompanyOptionsLoaded = false;
  private addCompanyOptionsLoading = false;
  private addCompanyOptionsCallbacks: Array<() => void> = [];

  readonly addCompanyForm = this.fb.group({
    code: ['', Validators.required],
    name: ['', Validators.required],
    tradeName: [''],
    corporateEmail: ['', [Validators.email]],
    taxRegistrationNumber: [''],
    registrationNumber: [''],
    address: [''],
    mobileNo: [''],
    website: [''],
    logo: [null as File | null],
    businessTypeId: [null as number | null],
    employeeSizeId: [null as number | null],
    countryId: [null as number | null, Validators.required],
    currencyIds: [[] as number[], Validators.required],
    defaultCurrencyId: [null as number | null, Validators.required],
  });

  constructor(
    private router: Router,
    private toastr: ToastrService,
    private authService: AuthService,
    private localstore: LocalStorageService,
    private languageService: LanguageService,
    private menuLoadService: MenuLoadService,
    private timezoneService: TimezoneService,
    private routeUpdateService: RouteUpdateService,
    private gridApiService: GridApiService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.config = this.parseJson(this.localstore.getData('config'), {});
    this.userInfo = this.parseJson(this.localstore.getData('user_data'), null);
    this.currentCompanyId = Number(this.userInfo?.main?.company_id || 0);
    this.companies = this.normalizeCompanies(this.userInfo?.main?.companies || this.userInfo?.companies || []);
    this.selectedCompanyId = this.localstore.getData('company_selection_pending') === 'true' && this.companies.length > 1 ? 0 : this.currentCompanyId;

    if (this.companies.length <= 1) {
      this.localstore.removeData('company_selection_pending');
      this.router.navigate(['/dashboard']);
    }

    this.loadAddCompanyLovOptions();
  }

  selectCompany(company: any): void {
    const companyId = Number(company?.id || 0);
    if (!companyId || this.loadingCompanyId) return;
    this.selectedCompanyId = companyId;

    if (companyId === this.currentCompanyId) {
      this.storeSelectedCompanyContext(company);
      this.finalizeCompanySelection(companyId, this.userInfo?.main?.id);
      return;
    }

    this.loadingCompanyId = companyId;
    this.authService.switchCompany(companyId).subscribe({
      next: (response: any) => {
        if (!response?.status || !response?.data?.token) {
          this.toastr.error(response?.message || 'Unable to switch company', 'Error');
          this.loadingCompanyId = 0;
          return;
        }

        this.storeSwitchedUser(response.data, company);
        this.finalizeCompanySelection(Number(response.data.company_id || companyId), response.data.id);
      },
      error: (error: any) => {
        this.loadingCompanyId = 0;
        this.toastr.error(error?.message || 'Unable to switch company', 'Error');
      },
    });
  }

  get filteredCompanies(): any[] {
    const search = this.searchTerm.trim().toLowerCase();
    if (!search) return this.companies;

    return this.companies.filter((company: any) => {
      const name = String(company?.name || '').toLowerCase();
      const code = String(company?.code || '').toLowerCase();
      const tenant = this.companyTenantLabel(company).toLowerCase();
      return name.includes(search) || code.includes(search) || tenant.includes(search);
    });
  }

  get groupedFilteredCompanies(): any[] {
    const groups = new Map<string, any>();

    for (const company of this.filteredCompanies) {
      const tenantLabel = this.companyTenantLabel(company) || 'Unassigned Tenant';
      const tenantCompanyName = this.companyTenantCompanyName(company);
      const tenantKey = String(company?.tenant_id || company?.tenant_code || tenantLabel).toLowerCase();

      if (!groups.has(tenantKey)) {
        groups.set(tenantKey, {
          tenantKey,
          tenantLabel,
          tenantCompanyName,
          companies: [] as any[],
        });
      }

      groups.get(tenantKey).companies.push(company);
    }

    return Array.from(groups.values());
  }

  get currentCompany(): any {
    if (this.isSelectionPending) return null;
    return this.companies.find((company: any) => company.id === this.currentCompanyId) || null;
  }

  get hasSearch(): boolean {
    return this.searchTerm.trim().length > 0;
  }

  get isSelectionPending(): boolean {
    return this.localstore.getData('company_selection_pending') === 'true' && this.companies.length > 1 && !this.selectedCompanyId;
  }

  clearSearch(): void {
    this.searchTerm = '';
  }

  backToLogin(): void {
    this.localstore.clearAllExceptRememberMe();
    this.router.navigate(['/login']);
  }

  companyInitials(company: any): string {
    const source = String(company?.name || company?.code || 'C').trim();
    const words = source.split(/\s+/).filter(Boolean);
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
  }

  companyTenantLabel(company: any): string {
    return company?.tenant_name || company?.tenant_code || (company?.tenant_id ? `Tenant ${company.tenant_id}` : '');
  }

  companyTenantCompanyName(company: any): string {
    return String(company?.tenant_company_name || company?.tenant?.company_name || company?.tenant_name || '');
  }

  tenantGroupClass(index: number): string {
    const palette = ['tenant-tone-1', 'tenant-tone-2', 'tenant-tone-3', 'tenant-tone-4'];
    return palette[index % palette.length];
  }

  openAddCompanyModal(): void {
    const showModal = () => {
      this.resetAddCompanyForm();
      this.addCompanyError = '';
      this.currencySearch = '';
      this.showCurrencyPicker = false;
      this.showAddCompanyModal = true;
    };

    if (this.addCompanyOptionsLoaded) {
      showModal();
      return;
    }

    this.loadAddCompanyLovOptions(showModal);
  }

  closeAddCompanyModal(): void {
    if (this.isAddingCompany) return;
    this.showAddCompanyModal = false;
    this.addCompanyError = '';
    this.currencySearch = '';
    this.showCurrencyPicker = false;
    this.revokeAddCompanyLogoPreview();
    this.resetAddCompanyForm();
  }

  isAddCompanyInvalid(controlName: keyof typeof this.addCompanyForm.controls): boolean {
    const control = this.addCompanyForm.controls[controlName];
    return control.invalid && (control.touched || control.dirty);
  }

  addCompanyLogoFileName(): string {
    const logo = this.addCompanyForm.controls.logo.value;
    return logo instanceof File ? logo.name : '';
  }

  onAddCompanyLogoChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;

    this.revokeAddCompanyLogoPreview();
    this.addCompanyForm.patchValue({ logo: file });
    this.addCompanyForm.controls.logo.markAsDirty();
    this.addCompanyLogoPreviewUrl = file ? URL.createObjectURL(file) : '';
  }

  isCurrencySelected(currencyId: number): boolean {
    return (this.addCompanyForm.controls.currencyIds.value || []).some((selectedId: number) => Number(selectedId) === Number(currencyId));
  }

  isDefaultCurrency(currencyId: number): boolean {
    return Number(this.addCompanyForm.controls.defaultCurrencyId.value) === Number(currencyId);
  }

  get selectedCurrencies(): CurrencyOption[] {
    return this.currencies.filter((currency) => this.isCurrencySelected(currency.id));
  }

  get filteredCurrencies(): CurrencyOption[] {
    const search = this.currencySearch.trim().toLowerCase();
    if (!search) return this.currencies;
    return this.currencies.filter((currency) =>
      [currency.code, currency.name, currency.symbol].filter(Boolean).some((value) => String(value).toLowerCase().includes(search))
    );
  }

  toggleCurrency(currencyId: number, checked: boolean): void {
    const selected = new Set((this.addCompanyForm.controls.currencyIds.value || []).map((id: number) => Number(id)));
    if (checked) {
      selected.add(currencyId);
    } else {
      selected.delete(currencyId);
      if (this.isDefaultCurrency(currencyId)) {
        this.addCompanyForm.controls.defaultCurrencyId.setValue(null);
        this.addCompanyForm.controls.defaultCurrencyId.markAsTouched();
      }
    }
    this.addCompanyForm.controls.currencyIds.setValue([...selected]);
    this.addCompanyForm.controls.currencyIds.markAsDirty();
    this.addCompanyForm.controls.currencyIds.markAsTouched();
  }

  removeCurrency(currencyId: number): void {
    this.toggleCurrency(currencyId, false);
  }

  selectDefaultCurrency(value: unknown): void {
    const currencyId = Number(value);
    if (Number.isInteger(currencyId) && currencyId > 0) {
      if (!this.isCurrencySelected(currencyId)) this.toggleCurrency(currencyId, true);
      this.addCompanyForm.controls.defaultCurrencyId.setValue(currencyId);
      this.addCompanyForm.controls.defaultCurrencyId.markAsDirty();
      this.addCompanyForm.controls.defaultCurrencyId.markAsTouched();
      return;
    }
    this.addCompanyForm.controls.defaultCurrencyId.setValue(null);
    this.addCompanyForm.controls.defaultCurrencyId.markAsTouched();
  }

  toggleCurrencyPicker(event?: MouseEvent): void {
    if (this.showCurrencyPicker) {
      this.closeCurrencyPicker();
      return;
    }
    const trigger = event?.currentTarget as HTMLElement | null;
    this.currencyOverlayWidth = Math.max(trigger?.getBoundingClientRect().width || 360, 300);
    this.showCurrencyPicker = true;
  }

  closeCurrencyPicker(): void {
    this.showCurrencyPicker = false;
    this.currencySearch = '';
  }

  @HostListener('document:click', ['$event'])
  closeCurrencyPickerOnOutsideClick(event: MouseEvent): void {
    if (!this.showCurrencyPicker) return;
    const target = event.target as HTMLElement | null;
    if (!target?.closest('[data-currency-picker]')) {
      this.closeCurrencyPicker();
    }
  }

  submitAddCompany(): void {
    if (this.isAddingCompany) return;
    this.addCompanyError = '';

    if (this.addCompanyForm.invalid) {
      this.addCompanyForm.markAllAsTouched();
      return;
    }

    this.isAddingCompany = true;
    const formValue = this.addCompanyForm.getRawValue();
    const logo = formValue.logo;

    const formData = new FormData();
    formData.append(
      'company',
      JSON.stringify({
        code: formValue.code,
        name: formValue.name,
        tradeName: formValue.tradeName,
        corporateEmail: formValue.corporateEmail,
        taxRegistrationNumber: formValue.taxRegistrationNumber,
        registrationNumber: formValue.registrationNumber,
        address: formValue.address,
        mobileNo: formValue.mobileNo,
        website: formValue.website,
        businessTypeId: formValue.businessTypeId,
        employeeSizeId: formValue.employeeSizeId,
        countryId: formValue.countryId,
        currencyIds: formValue.currencyIds,
        defaultCurrencyId: formValue.defaultCurrencyId,
        logoFileKey: logo instanceof File ? 'company_logo' : null,
      })
    );

    if (logo instanceof File) {
      formData.append('company_logo', logo, logo.name);
    }

    this.gridApiService.addTenantCompany(formData).subscribe({
      next: (response: any) => {
        this.isAddingCompany = false;
        const responseBody = response?.body || response;

        if (!responseBody?.status) {
          const message = responseBody?.message || 'Unable to add company.';
          this.addCompanyError = message;
          this.toastr.error(message, 'Error');
          return;
        }

        this.toastr.success(responseBody?.message || 'Company added successfully. Company setup will continue in the background.', 'Success');
        this.applyAddedCompanies(responseBody?.data?.companies);
        this.showAddCompanyModal = false;
        this.revokeAddCompanyLogoPreview();
        this.resetAddCompanyForm();
      },
      error: (error: any) => {
        this.isAddingCompany = false;
        const message = this.getApiErrorMessage(error);
        this.addCompanyError = message;
        this.toastr.error(message, 'Error');
      },
    });
  }

  private storeSwitchedUser(switchedUser: any, selectedCompany: any): void {
    const companies = switchedUser.companies?.length ? switchedUser.companies : this.companies;
    const companyId = Number(switchedUser.company_id || selectedCompany.id);
    const companyFromList = companies.find((company: any) => Number(company?.id || company?.company_id) === companyId);
    const selectedCompanyTenantId = Number(
      switchedUser.company_tenant_id ||
        switchedUser.selected_company_tenant_id ||
        selectedCompany.tenant_id ||
        companyFromList?.tenant_id ||
        this.userInfo?.company?.tenant_id ||
        0
    );
    const permissionsObj = (switchedUser.permissions || []).reduce((acc: any, permission: any) => {
      acc[permission.slug] = permission.accessible;
      return acc;
    }, {});
    this.routeUpdateService.setPermissionsList(permissionsObj);

    const nextUserInfo = {
      ...this.userInfo,
      main: {
        ...switchedUser,
        companies,
        selected_company_id: companyId,
        selected_company_tenant_id: selectedCompanyTenantId || switchedUser.selected_company_tenant_id,
      },
      permissions: permissionsObj,
      user_id: switchedUser.id,
      company: {
        ...(this.userInfo?.company || {}),
        id: companyId,
        name: switchedUser.company_name || selectedCompany.name,
        code: switchedUser.company_code || selectedCompany.code,
        tenant_id: selectedCompanyTenantId || selectedCompany.tenant_id,
        tenant_name: switchedUser.tenant_name || selectedCompany.tenant_name || companyFromList?.tenant_name,
        tenant_code: switchedUser.tenant_code || selectedCompany.tenant_code || companyFromList?.tenant_code,
      },
    };

    this.persistUserInfo(nextUserInfo);
    this.userInfo = nextUserInfo;
    this.localstore.storeData('base_app_url', JSON.stringify(switchedUser.base_app_url));
    this.localstore.storeData('version_info', JSON.stringify(switchedUser.version_info));
    if (switchedUser.theme_info) {
      this.localstore.storeData('theme_info', JSON.stringify(switchedUser.theme_info));
    }

    this.localstore.removeData('menuList');
    this.localstore.removeData('unorgmenuList');
    this.localstore.removeData('menu_id');

    const languageCode = this.languageService.getSavedLanguageCode();
    this.languageService.serviceChangeLanguage(companyId, languageCode.toLowerCase());
  }

  private storeSelectedCompanyContext(selectedCompany: any): void {
    const companies = this.userInfo?.main?.companies?.length ? this.userInfo.main.companies : this.companies;
    const companyId = Number(selectedCompany?.id || this.currentCompanyId || this.userInfo?.main?.company_id || 0);
    const companyFromList = companies.find((company: any) => Number(company?.id || company?.company_id) === companyId);
    const selectedCompanyTenantId = Number(
      selectedCompany?.tenant_id ||
        companyFromList?.tenant_id ||
        this.userInfo?.company?.tenant_id ||
        this.userInfo?.main?.selected_company_tenant_id ||
        this.userInfo?.main?.company_tenant_id ||
        0
    );

    const nextUserInfo = {
      ...this.userInfo,
      main: {
        ...(this.userInfo?.main || {}),
        companies,
        company_id: companyId,
        selected_company_id: companyId,
        selected_company_tenant_id: selectedCompanyTenantId || this.userInfo?.main?.selected_company_tenant_id,
      },
      company: {
        ...(this.userInfo?.company || {}),
        id: companyId,
        name: selectedCompany?.name || companyFromList?.name || this.userInfo?.company?.name,
        code: selectedCompany?.code || companyFromList?.code || this.userInfo?.company?.code,
        tenant_id: selectedCompanyTenantId || selectedCompany?.tenant_id || companyFromList?.tenant_id,
        tenant_name: selectedCompany?.tenant_name || companyFromList?.tenant_name || this.userInfo?.company?.tenant_name,
        tenant_code: selectedCompany?.tenant_code || companyFromList?.tenant_code || this.userInfo?.company?.tenant_code,
      },
    };

    this.persistUserInfo(nextUserInfo);
    this.userInfo = nextUserInfo;
  }

  private persistUserInfo(userInfo: any): void {
    const payload = JSON.stringify(userInfo);
    if (this.config?.encrypt_local_storage === 'true') {
      this.localstore.storeDataEncrypted('user_data', payload);
    } else {
      this.localstore.storeData('user_data', payload);
    }
  }

  private finalizeCompanySelection(companyId: number, userId: number): void {
    const permissions = this.parseJson(this.localstore.getData('user_data'), null)?.permissions || {};
    this.routeUpdateService.setPermissionsList(permissions);
    this.localstore.removeData('company_selection_pending');
    this.localstore.storeData('selected_company_id', String(companyId));
    this.localstore.removeData('menuList');
    this.localstore.removeData('unorgmenuList');
    this.localstore.removeData('menu_id');

    this.menuLoadService
      .fetchConfigData(companyId, userId)
      .pipe(switchMap(() => this.menuLoadService.fetchMenuData(companyId)))
      .subscribe({
        next: () => {
          this.timezoneService.reloadConfig();
          this.routeUpdateService.addDynamicRoutes();
          this.redirectToApplicationRoot();
        },
        error: () => {
          this.redirectToApplicationRoot();
        },
      });
  }

  private redirectToApplicationRoot(): void {
    window.location.href = `${window.location.origin}${this.getApplicationBasePath()}#/`;
  }

  private getApplicationBasePath(): string {
    const path = window.location.pathname || '/';
    const normalizedPath = path.replace(/\/index\.html?$/i, '/');
    return normalizedPath.endsWith('/') ? normalizedPath : `${normalizedPath}/`;
  }

  private loadAddCompanyLovOptions(onLoaded?: () => void): void {
    if (onLoaded) this.addCompanyOptionsCallbacks.push(onLoaded);
    if (this.addCompanyOptionsLoaded) {
      this.flushAddCompanyOptionsCallbacks();
      return;
    }
    if (this.addCompanyOptionsLoading) return;

    this.addCompanyOptionsLoading = true;
    forkJoin({
      lovResponse: this.gridApiService
        .getLovValues({
          scope: 'global',
          codes: ['business_type', 'employee_size', 'country'],
        })
        .pipe(catchError(() => of(null))),
      currencyResponse: this.gridApiService.getTenantRegistrationCurrencies().pipe(catchError(() => of(null))),
    }).subscribe(({ lovResponse, currencyResponse }: any) => {
      const lovTypes = lovResponse?.data || [];
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

      if (lovTypes.length) {
        this.businessTypes = byType('business_type') || this.businessTypes;
        this.employeeSizes = byType('employee_size') || this.employeeSizes;
        this.countries = byType('country') || this.countries;
      }

      this.currencies = (currencyResponse?.data || []).map((record: any) => ({
        id: Number(record.id),
        code: String(record.code || ''),
        name: String(record.name || ''),
        symbol: record.symbol || null,
      }));
      this.addCompanyOptionsLoading = false;
      this.addCompanyOptionsLoaded = this.currencies.length > 0;
      this.flushAddCompanyOptionsCallbacks();
    });
  }

  private flushAddCompanyOptionsCallbacks(): void {
    const callbacks = this.addCompanyOptionsCallbacks.splice(0);
    callbacks.forEach((callback) => callback());
  }

  private applyInitialCurrencySelection(): void {
    if (!this.currencies.length || (this.addCompanyForm.controls.currencyIds.value || []).length) return;
    const initialCurrency = this.currencies.find((currency) => currency.code.trim().toUpperCase() === 'USD') || this.currencies[0];
    this.addCompanyForm.patchValue({
      currencyIds: [initialCurrency.id],
      defaultCurrencyId: initialCurrency.id,
    });
  }

  private resetAddCompanyForm(): void {
    this.addCompanyForm.reset({
      currencyIds: [],
      defaultCurrencyId: null,
    });
    this.applyInitialCurrencySelection();
  }

  private applyAddedCompanies(companies: any[]): void {
    if (!Array.isArray(companies) || !companies.length) return;

    this.companies = this.normalizeCompanies(companies);

    const nextUserInfo = {
      ...this.userInfo,
      main: {
        ...(this.userInfo?.main || {}),
        companies,
      },
    };

    this.persistUserInfo(nextUserInfo);
    this.userInfo = nextUserInfo;
  }

  private revokeAddCompanyLogoPreview(): void {
    if (this.addCompanyLogoPreviewUrl) {
      URL.revokeObjectURL(this.addCompanyLogoPreviewUrl);
      this.addCompanyLogoPreviewUrl = '';
    }
  }

  private getApiErrorMessage(error: any): string {
    const responseError = error?.error;
    if (typeof responseError === 'string') return responseError;

    const dataMessage = typeof responseError?.data === 'string' ? responseError.data : responseError?.data?.message;

    return responseError?.message || responseError?.errors?.message || dataMessage || error?.message || 'Unable to add company.';
  }

  private normalizeCompanies(companies: any[]): any[] {
    if (!Array.isArray(companies)) return [];
    return companies
      .map((company: any) => ({
        id: Number(company?.id || company?.company_id || 0),
        name: String(company?.name || company?.company_name || company?.code || 'Company'),
        code: company?.code || company?.company_code || '',
        is_primary: Boolean(company?.is_primary),
        tenant_id: company?.tenant_id,
        tenant_name: company?.tenant_name || company?.tenant?.name || '',
        tenant_code: company?.tenant_code || company?.tenant?.code || '',
        tenant_company_name: company?.tenant_company_name || company?.tenant?.company_name || '',
      }))
      .filter((company: any) => company.id);
  }

  private parseJson(raw: any, fallback: any): any {
    try {
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }
}
