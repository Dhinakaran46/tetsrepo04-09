import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { CommonSharedModule } from '../../shared/common/common.module';
import { AuthService } from '../../service/common/auth.service';
import { LocalStorageService } from '../../service/common/local-storage.service';
import { LanguageService } from '../../service/common/language.service';
import { MenuLoadService } from '../../service/common/menu-load.service';
import { TimezoneService } from '../../service/common/timezone.service';
import { RouteUpdateService } from '../../service/common/route-update.service';
import { switchMap } from 'rxjs';

@Component({
  selector: 'app-company-selection',
  standalone: true,
  imports: [CommonSharedModule],
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

  constructor(
    private router: Router,
    private toastr: ToastrService,
    private authService: AuthService,
    private localstore: LocalStorageService,
    private languageService: LanguageService,
    private menuLoadService: MenuLoadService,
    private timezoneService: TimezoneService,
    private routeUpdateService: RouteUpdateService
  ) {}

  ngOnInit(): void {
    this.config = this.parseJson(this.localstore.getData('config'), {});
    this.userInfo = this.parseJson(this.localstore.getData('user_data'), null);
    this.currentCompanyId = Number(this.userInfo?.main?.company_id || 0);
    this.companies = this.normalizeCompanies(this.userInfo?.main?.companies || this.userInfo?.companies || []);
    this.selectedCompanyId = this.localstore.getData('company_selection_pending') === 'true' && this.companies.length > 1
      ? 0
      : this.currentCompanyId;

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

  companyInitials(company: any): string {
    const source = String(company?.name || company?.code || 'C').trim();
    const words = source.split(/\s+/).filter(Boolean);
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
  }

  companyTenantLabel(company: any): string {
    return (
      company?.tenant_name ||
      company?.tenant_code ||
      (company?.tenant_id ? `Tenant ${company.tenant_id}` : '')
    );
  }

  private storeSwitchedUser(switchedUser: any, selectedCompany: any): void {
    const companies = switchedUser.companies?.length ? switchedUser.companies : this.companies;
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
      },
      permissions: permissionsObj,
      user_id: switchedUser.id,
      company: {
        ...(this.userInfo?.company || {}),
        id: Number(switchedUser.company_id || selectedCompany.id),
        name: switchedUser.company_name || selectedCompany.name,
        code: switchedUser.company_code || selectedCompany.code,
      },
    };

    this.localstore.storeData('base_app_url', JSON.stringify(switchedUser.base_app_url));
    this.localstore.storeData('version_info', JSON.stringify(switchedUser.version_info));
    if (switchedUser.theme_info) {
      this.localstore.storeData('theme_info', JSON.stringify(switchedUser.theme_info));
    }

    const payload = JSON.stringify(nextUserInfo);
    if (this.config?.encrypt_local_storage === 'true') {
      this.localstore.storeDataEncrypted('user_data', payload);
    } else {
      this.localstore.storeData('user_data', payload);
    }

    this.localstore.removeData('menuList');
    this.localstore.removeData('unorgmenuList');
    this.localstore.removeData('menu_id');

    const languageCode = this.languageService.getSavedLanguageCode();
    this.languageService.serviceChangeLanguage(Number(switchedUser.company_id || selectedCompany.id), languageCode.toLowerCase());
  }

  private finalizeCompanySelection(companyId: number, userId: number): void {
    const permissions = this.parseJson(this.localstore.getData('user_data'), null)?.permissions || {};
    this.routeUpdateService.setPermissionsList(permissions);
    this.localstore.removeData('company_selection_pending');
    this.localstore.storeData('selected_company_id', String(companyId));
    this.localstore.removeData('menuList');
    this.localstore.removeData('unorgmenuList');
    this.localstore.removeData('menu_id');

    this.menuLoadService.fetchConfigData(companyId, userId).pipe(
      switchMap(() => this.menuLoadService.fetchMenuData(companyId))
    ).subscribe({
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
