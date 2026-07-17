import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
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
import { catchError, of, switchMap } from 'rxjs';

interface LovOption {
  id: number;
  code: string;
  name: string;
}

@Component({
  selector: 'app-company-selection',
  standalone: true,
  imports: [CommonSharedModule, ReactiveFormsModule],
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
    this.showAddCompanyModal = true;
    this.addCompanyError = '';
    if (!this.businessTypes.length && !this.employeeSizes.length && !this.countries.length) {
      this.loadAddCompanyLovOptions();
    }
  }

  closeAddCompanyModal(): void {
    if (this.isAddingCompany) return;
    this.showAddCompanyModal = false;
    this.addCompanyError = '';
    this.revokeAddCompanyLogoPreview();
    this.addCompanyForm.reset();
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

        this.toastr.success(
          responseBody?.message || 'Company added successfully. Company setup will continue in the background.',
          'Success'
        );
        this.applyAddedCompanies(responseBody?.data?.companies);
        this.showAddCompanyModal = false;
        this.revokeAddCompanyLogoPreview();
        this.addCompanyForm.reset();
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
          window.location.href = '/';
        },
        error: () => {
          window.location.href = '/';
        },
      });
  }

  private loadAddCompanyLovOptions(): void {
    this.gridApiService
      .getLovValues({
        scope: 'global',
        codes: ['business_type', 'employee_size', 'country'],
      })
      .pipe(catchError(() => of(null)))
      .subscribe((response: any) => {
        const lovTypes = response?.data || [];
        if (!lovTypes.length) return;

        const normalizeLovCode = (value: string) => String(value || '').trim().toLowerCase().replace(/[-\s]+/g, '_');
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
