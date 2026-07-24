import { ChangeDetectorRef, Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';

import { CommonSharedModule } from '../../shared/common/common.module';
import { DataTableComponent } from '../../components/datatable/datatable.component';
import { LoaderComponent } from '../../components/loader/loader.component';
import { GridApiService } from '../../service/common/grid.service';
import { TimezoneService } from '../../service/common/timezone.service';

interface TenantRecord {
  id: number;
  uuid: string;
  code: string;
  company_name: string;
  no_of_companies: number;
  owner_first_name: string;
  owner_last_name?: string | null;
  owner_email: string;
  owner_mobile: string;
  process_status: string;
  registration_status: string;
  created_at: string;
}

@Component({
  selector: 'app-tenants',
  standalone: true,
  imports: [CommonSharedModule, DataTableComponent, LoaderComponent],
  templateUrl: './tenants.component.html',
  styleUrl: './tenants.component.scss',
})
export class TenantsComponent implements OnInit {
  @ViewChild('statusTemplate') statusTemplate!: TemplateRef<any>;
  @ViewChild('actionTemplate') actionTemplate!: TemplateRef<any>;

  title = 'Tenants';
  masterInfo: any = { permissions: {}, children: {}, entity_configurations: {}, Listname: 'tenants_grid' };

  headercolumns: any[] = [];
  selectcolumns: any[] = [];
  items: any[] = [];
  totalItems = 0;
  currentPage = 1;
  resultsPerPage = 10;
  column: any = '';
  query: any = '';
  gridloading = true;

  readonly statusBadgeClass: Record<string, string> = {
    submitted: 'badge-outline-secondary',
    under_approval: 'badge-outline-warning',
    approved: 'badge-outline-success',
    rejected: 'badge-outline-danger',
    created: 'badge-outline-secondary',
    not_appear: 'badge-outline-secondary',
  };

  private allTenants: TenantRecord[] = [];

  constructor(
    private gridApiService: GridApiService,
    private toastr: ToastrService,
    private translate: TranslateService,
    private titleService: Title,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private timezoneService: TimezoneService
  ) {
    console.log('coming');
  }

  ngOnInit(): void {
    const pageInfo = this.route.snapshot.data?.['pageInfo'];
    this.title = pageInfo?.fullEntity || 'Tenants';
    this.titleService.setTitle(this.translate.instant(this.title));

    this.fetchTenants();
  }

  fetchTenants(): void {
    this.gridloading = true;
    this.gridApiService.getTenants().subscribe({
      next: (response: any) => {
        const responseBody = response?.body || response;
        this.allTenants = (responseBody?.data || []) as TenantRecord[];
        this.totalItems = this.allTenants.length;
        this.currentPage = 1;
        this.setHeader();
        this.applyPagination();
        this.gridloading = false;
        this.cdr.markForCheck();
      },
      error: (error: any) => {
        this.gridloading = false;
        this.toastr.error(this.getApiErrorMessage(error), 'Error');
        this.cdr.markForCheck();
      },
    });
  }

  private setHeader(): void {
    this.headercolumns = [
      {
        header: 'table_column_sno',
        field_value: 'S.No',
        is_sortable: 'false',
        column_order: '0.00',
        column_width: '40px',
        is_searchable: 'false',
        is_grid_column: 'true',
      },
      {
        header: 'company_name',
        field_value: 'Tenant Name',
        is_sortable: 'false',
        column_order: '1.00',
        column_width: '2.00',
        is_searchable: 'false',
        is_grid_column: 'true',
      },
      {
        header: 'owner_name',
        field_value: 'Owner Name',
        is_sortable: 'false',
        column_order: '2.00',
        column_width: '1.50',
        is_searchable: 'false',
        is_grid_column: 'true',
      },
      {
        header: 'owner_email',
        field_value: 'Email',
        is_sortable: 'false',
        column_order: '3.00',
        column_width: '2.00',
        is_searchable: 'false',
        is_grid_column: 'true',
      },
      {
        header: 'owner_mobile',
        field_value: 'Mobile',
        is_sortable: 'false',
        column_order: '4.00',
        column_width: '1.00',
        is_searchable: 'false',
        is_grid_column: 'true',
      },
      {
        header: 'no_of_companies',
        field_value: 'Companies',
        is_sortable: 'false',
        column_order: '5.00',
        column_width: '1.00',
        is_searchable: 'false',
        is_grid_column: 'true',
      },
      {
        header: 'process_status',
        field_value: 'Status',
        is_sortable: 'false',
        column_order: '6.00',
        column_width: '1.00',
        is_searchable: 'false',
        is_grid_column: 'true',
        customTemplate: this.statusTemplate,
      },
      {
        header: 'created_at',
        field_value: 'Created At',
        is_sortable: 'false',
        column_order: '7.00',
        column_width: '1.50',
        is_searchable: 'false',
        is_grid_column: 'true',
      },
      {
        header: 'table_column_action',
        field_value: 'Action',
        is_sortable: 'false',
        column_order: '8.00',
        column_width: '1.20',
        is_searchable: 'false',
        is_grid_column: 'true',
        customTemplate: this.actionTemplate,
      },
    ];
  }

  private applyPagination(): void {
    const start = (this.currentPage - 1) * this.resultsPerPage;
    this.items = this.allTenants.slice(start, start + this.resultsPerPage).map((tenant, index) => ({
      ...tenant,
      table_column_sno: start + index + 1,
      owner_name: [tenant.owner_first_name, tenant.owner_last_name].filter(Boolean).join(' ') || '-',
      created_at: this.timezoneService.transformDateTime(tenant.created_at) || tenant.created_at,
    }));
  }

  onPageChange(event: { page: number; start_index: number; skipFetch?: boolean }): void {
    this.currentPage = event.page;
    if (event?.skipFetch) return;
    this.applyPagination();
  }

  onResultsPerPageChange(event: { resultsPerPage: number; start_index: number; skipFetch?: boolean }): void {
    this.currentPage = 1;
    this.resultsPerPage = event.resultsPerPage;
    if (event?.skipFetch) return;
    this.applyPagination();
  }

  isActionable(item: TenantRecord): boolean {
    return item.process_status !== 'approved' && item.process_status !== 'rejected';
  }

  approveTenant(item: TenantRecord): void {
    Swal.fire({
      icon: 'question',
      title: 'Approve tenant?',
      text: `Approve "${item.company_name}" and start company setup?`,
      showCancelButton: true,
      confirmButtonText: 'Approve',
      cancelButtonText: 'Cancel',
      padding: '2em',
    }).then((result) => {
      if (!result.isConfirmed) return;

      this.gridApiService.approveTenant(item.id).subscribe({
        next: (response: any) => {
          const responseBody = response?.body || response;
          this.toastr.success(responseBody?.message || 'Tenant approved successfully.', 'Success');
          this.fetchTenants();
        },
        error: (error: any) => {
          this.toastr.error(this.getApiErrorMessage(error), 'Error');
        },
      });
    });
  }

  rejectTenant(item: TenantRecord): void {
    Swal.fire({
      icon: 'warning',
      title: 'Reject tenant?',
      text: `Reject "${item.company_name}"?`,
      showCancelButton: true,
      confirmButtonText: 'Reject',
      cancelButtonText: 'Cancel',
      padding: '2em',
    }).then((result) => {
      if (!result.isConfirmed) return;

      this.gridApiService.rejectTenant(item.id).subscribe({
        next: (response: any) => {
          const responseBody = response?.body || response;
          this.toastr.success(responseBody?.message || 'Tenant rejected.', 'Success');
          this.fetchTenants();
        },
        error: (error: any) => {
          this.toastr.error(this.getApiErrorMessage(error), 'Error');
        },
      });
    });
  }

  private getApiErrorMessage(error: any): string {
    const responseError = error?.error;
    if (typeof responseError === 'string') return responseError;

    const dataMessage = typeof responseError?.data === 'string' ? responseError.data : responseError?.data?.message;

    return responseError?.message || responseError?.errors?.message || dataMessage || error?.message || 'Something went wrong.';
  }
}
