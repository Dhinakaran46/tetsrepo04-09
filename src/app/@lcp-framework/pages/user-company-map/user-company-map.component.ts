import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ToastrService } from 'ngx-toastr';
import { CommonSharedModule } from '../../shared/common/common.module';
import {
  UserCompanyMapCompany,
  UserCompanyMapService,
  UserCompanyMapUser,
} from '../../service/common/user-company-map.service';

@Component({
  selector: 'app-user-company-map',
  standalone: true,
  imports: [CommonSharedModule],
  templateUrl: './user-company-map.component.html',
  styleUrl: './user-company-map.component.scss',
})
export class UserCompanyMapComponent implements OnInit {
  users: UserCompanyMapUser[] = [];
  companies: UserCompanyMapCompany[] = [];
  selectedUser: UserCompanyMapUser | null = null;
  userSearch = '';
  companySearch = '';
  loadingUsers = false;
  loadingCompanies = false;
  saving = false;

  constructor(
    private userCompanyMapService: UserCompanyMapService,
    private toastr: ToastrService,
    private titleService: Title,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.titleService.setTitle('User Company Mapping');
    this.loadUsers();
  }

  get filteredUsers(): UserCompanyMapUser[] {
    const search = this.userSearch.trim().toLowerCase();
    if (!search) return this.users;

    return this.users.filter((user) =>
      [
        user.full_name,
        user.email,
        user.username,
        user.role,
        String(user.tenant_id),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search)),
    );
  }

  get filteredCompanies(): UserCompanyMapCompany[] {
    const search = this.companySearch.trim().toLowerCase();
    if (!search) return this.companies;

    return this.companies.filter((company) =>
      [company.name, company.code, String(company.tenant_id)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search)),
    );
  }

  get selectedCompanies(): UserCompanyMapCompany[] {
    return this.companies.filter((company) => company.mapped);
  }

  get invalidSelectedCompanies(): UserCompanyMapCompany[] {
    return this.selectedCompanies.filter((company) => !company.selected_role_ids?.length);
  }

  get canSave(): boolean {
    return (
      Boolean(this.selectedUser) &&
      Boolean(this.selectedCompanies.length) &&
      !this.loadingCompanies &&
      !this.saving &&
      !this.invalidSelectedCompanies.length
    );
  }

  get allVisibleCompaniesSelected(): boolean {
    return Boolean(this.filteredCompanies.length) && this.filteredCompanies.every((company) => company.mapped);
  }

  loadUsers(): void {
    this.loadingUsers = true;
    this.userCompanyMapService.getUsers().subscribe({
      next: (response: any) => {
        this.users = response?.data?.records || [];
        this.loadingUsers = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.loadingUsers = false;
        this.toastr.error(error?.message || 'Unable to load users', 'Error');
        this.cdr.detectChanges();
      },
    });
  }

  selectUser(user: UserCompanyMapUser): void {
    this.selectedUser = user;
    this.companySearch = '';
    this.loadCompanies(user.id);
  }

  loadCompanies(tenantUserId: number): void {
    this.loadingCompanies = true;
    this.companies = [];
    this.userCompanyMapService.getCompanies(tenantUserId).subscribe({
      next: (response: any) => {
        this.companies = (response?.data?.records || []).map((company: UserCompanyMapCompany) => ({
          ...company,
          selected_role_ids: company.selected_role_ids || [],
        }));
        this.loadingCompanies = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.loadingCompanies = false;
        this.toastr.error(error?.message || 'Unable to load companies', 'Error');
        this.cdr.detectChanges();
      },
    });
  }

  toggleCompany(company: UserCompanyMapCompany, checked: boolean): void {
    company.mapped = checked;
    if (!checked) {
      company.selected_role_ids = [];
    }
  }

  toggleAllVisibleCompanies(checked: boolean): void {
    this.filteredCompanies.forEach((company) => {
      company.mapped = checked;
      if (!checked) {
        company.selected_role_ids = [];
      }
    });
  }

  hasCompanyRoleError(company: UserCompanyMapCompany): boolean {
    return company.mapped && !company.selected_role_ids?.length;
  }

  roleLabel(company: UserCompanyMapCompany): string {
    const count = company.selected_role_ids?.length || 0;
    return count ? `${count} role${count > 1 ? 's' : ''}` : 'No role selected';
  }

  async save(): Promise<void> {
    if (!this.selectedUser || this.saving) return;

    if (this.invalidSelectedCompanies.length) {
      this.toastr.error('Every selected company must have at least one role.', 'Validation');
      return;
    }

    const mappings = this.selectedCompanies.map((company) => ({
      company_id: company.company_id,
      role_ids: company.selected_role_ids,
    }));

    if (!mappings.length) {
      this.toastr.error('At least one company must be selected.', 'Validation');
      return;
    }

    this.saving = true;
    this.userCompanyMapService
      .saveCompanies(this.selectedUser.id, {
        mappings,
      })
      .subscribe({
        next: (response: any) => {
          this.saving = false;
          this.toastr.success(response?.message || 'Company access saved successfully', 'Success');
          this.companies = (response?.data?.records || this.companies).map((company: UserCompanyMapCompany) => ({
            ...company,
            selected_role_ids: company.selected_role_ids || [],
          }));
          this.loadUsers();
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.saving = false;
          this.toastr.error(error?.message || 'Unable to save company access', 'Error');
          this.cdr.detectChanges();
        },
      });
  }
}
