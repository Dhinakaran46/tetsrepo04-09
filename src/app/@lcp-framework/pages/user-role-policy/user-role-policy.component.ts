import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonSharedModule } from '../../shared/common/common.module';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { ApiResponce, GridApiService } from '../../service/common/grid.service';
import { OrderByControlPipe } from '../../pipes/order-by-control/order-by-control.pipe';
import { TranslateService } from '@ngx-translate/core';
import { LocalStorageService } from '../../service/common/local-storage.service';
import { MenuMapService } from '../../service/common/menu-map.service';
import { IconFolderComponent } from '../../shared/icon/icon-folder';
import { IconMinusComponent } from '../../shared/icon/icon-minus';
import { IconFolderPlusComponent } from '../../shared/icon/icon-folder-plus';
import { IconFolderMinusComponent } from '../../shared/icon/icon-folder-minus';
import { Title } from '@angular/platform-browser';
import { TableConfig, ClientDatatableComponent } from '../../components/client-datatable/client-datatable.component';
import { DatePipe } from '@angular/common';
import { TimezoneService } from '../../service/common/timezone.service';

interface IRolePolicy {
  role_id: number;
  policy_id: number;
}

interface IUserPolicy {
  user_id: number;
  policy_id: number;
}

@Component({
  selector: 'app-user-role-policy',
  standalone: true,
  imports: [CommonSharedModule, ReactiveFormsModule, ClientDatatableComponent],
  templateUrl: './user-role-policy.component.html',
  styleUrl: './user-role-policy.component.scss',
  providers: [DatePipe],
})
export class UserRolePolicyComponent {
  mappingForm!: FormGroup;
  policyList: any[] = [];
  tempPolicyList: any[] = [];
  roleList: any[] = [];
  userList: any[] = [];
  user_info: any;

  constructor(
    public fb: FormBuilder,
    private toastr: ToastrService,
    private gridApiService: GridApiService,
    public translate: TranslateService,
    private commonService: MenuMapService,
    private localStorageService: LocalStorageService,
    private titleService: Title,
    public datePipe: DatePipe,
    private timezoneService: TimezoneService,
    private cdr: ChangeDetectorRef
  ) {
    this.mappingForm = this.fb.group({
      policy_type: ['user', Validators.required],
      user: [''],
      role: [''],
    });
    this.user_info = JSON.parse(this.localStorageService.getData('user_data'));
  }

  ngOnInit() {
    const translateTitle = this.translate.instant('user_role_policy_map_entity');
    this.titleService.setTitle(translateTitle);
    this.resetComponent();
  }

  // Items Datatable Configuration
  policyTableConfig: TableConfig = {
    columns: [
      { key: 'isChecked', label: '', sortable: false, searchable: false, type: 'checkbox' },
      { key: 'id', label: 'ID', sortable: false, searchable: false, isHtmlValue: true, colFilterHide: true },
      { key: 'policyName', label: 'Policy Name', sortable: true, searchable: true, isHtmlValue: true },
      { key: 'slug', label: 'Slug', sortable: true, searchable: true, isHtmlValue: true },
      { key: 'policyDescription', label: 'Policy Description', sortable: true, searchable: true, isHtmlValue: true },
      { key: 'updatedBy', label: 'Updated By', sortable: true, searchable: true, isHtmlValue: true },
      { key: 'updatedAt', label: 'Updated At', sortable: true, searchable: true, isHtmlValue: true },
    ],
    pageSizes: [5, 10, 25, 50],
    defaultPageSize: 5,
    searchable: true,
    headerConfig: {
      showHeader: true,
      addButton: undefined,
      enableFilter: true,
      enableColumnSelector: true,
      enableExport: true,
    },
  };

  resetComponent() {
    this.mappingForm.reset({
      policy_type: 'user',
      user: '',
      role: '',
    });
    this.getUserList();
    this.getRoleList();
    this.getPolicyList();
  }

  mapPolicies() {
    if (this.mappingForm.invalid) {
      const key = 'please_select_all_the_required_fields';
      const errorMessage = this.translate.instant(key);
      this.toastr.error(errorMessage, 'Error');
      return;
    }
    const policy_type = this.mappingForm.get('policy_type')?.value;
    const role_id = this.mappingForm.get('role')?.value;
    const user_id = this.mappingForm.get('user')?.value;
    if (policy_type === 'user') {
      this.executeUserMap(user_id);
    } else {
      this.executeRoleMap(role_id);
    }
  }

  updateRadioButton() {
    this.mappingForm.patchValue({
      user: '',
      role: '',
    });
    this.getPolicyList();
  }

  getPolicyList() {
    const role_id = this.mappingForm.get('role')?.value;
    const user_id = this.mappingForm.get('user')?.value;
    const joinCondition: any[] = [
      ...(role_id && [
        {
          join_type: 'LEFT',
          table_name: 'role_policies',
          join_condition: `role_policies.role_id = ${role_id} AND role_policies.policy_id = policies.id`,
        },
      ]),
      ...(user_id && [
        {
          join_type: 'LEFT',
          table_name: 'user_policies',
          join_condition: `user_policies.user_id = ${user_id} AND user_policies.policy_id = policies.id`,
        },
      ]),
    ];
    const param: any = {
      company_id: 1,
      print_query: true,
      primary_table: 'policies',
      start_index: 0,
      limit_range: 1000,
      sort_columns: [['policies.name', 'asc']],
      group_by: [
        'policies.id',
        'updated_user.first_name',
        'updated_user.last_name',
        'updated_user.full_name',
        ...(role_id && ['role_policies.role_id']),
        ...(user_id && ['user_policies.user_id']),
      ],
      includes: [
        {
          join_type: 'LEFT',
          table_name: 'user_information as updated_user',
          join_condition: 'updated_user.user_id = policies.updated_by AND updated_user.company_id = policies.company_id',
        },
        ...joinCondition,
      ],
      search_all: [
        {
          column_name: 'policies.status_id',
          value: '1',
          operator: '=',
        },
      ],
      select_columns: [
        ['policies.id'],
        ['policies.name'],
        ['policies.uuid'],
        ['policies.slug'],
        ['policies.description'],
        ['updated_user.full_name', 'updated_by'],
        ['policies.updated_at'],
        ...(role_id && [['role_policies.role_id']]),
        ...(user_id && [['user_policies.user_id']]),
      ],
    };
    this.gridApiService.getListData(param).subscribe(
      (response: ApiResponce) => {
        if (response.status) {
          this.policyList = (response.data?.records || []).map((record: any) => {
            return {
              isChecked: record?.role_id || record?.user_id ? true : false,
              id: record.id,
              policyUUID: record.uuid,
              policyName: record.name,
              policyDescription: record?.description ?? '-',
              slug: record.slug,
              updatedBy: record.updated_by,
              updatedAt: this.formatDateTime(record.updated_at),
            };
          });
          this.tempPolicyList = this.policyList;
          setTimeout(() => this.cdr.detectChanges());
        } else {
          this.policyList = [];
          this.tempPolicyList = [];
          this.cdr.detectChanges();
          const key = response.message;
          const errorMessage = this.translate.instant(key);
          this.toastr.error(`Code: ${response.code} , ${errorMessage}`);
        }
      },
      (error: any) => {
        this.roleList = [];
        const key = 'error';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
      }
    );
  }

  getRoleList() {
    const param: any = {
      company_id: 1,
      print_query: false,
      primary_table: 'roles',
      start_index: 0,
      limit_range: 1000,
      sort_columns: [['roles.name', 'asc']],
      search_all: [
        {
          column_name: 'roles.status_id',
          value: '1',
          operator: '=',
        },
      ],
      select_columns: [['roles.id'], ['roles.name'], ['roles.uuid']],
    };
    this.gridApiService.getListData(param).subscribe(
      (response: ApiResponce) => {
        if (response.status) {
          this.roleList = response.data?.records || [];
          this.cdr.detectChanges();
        } else if (!response.status) {
          this.roleList = [];
          const key = response.message;
          const errorMessage = this.translate.instant(key);
          this.toastr.error(`Code: ${response.code} , ${errorMessage}`);
        }
      },
      (error: any) => {
        this.roleList = [];
        const key = 'error';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
      }
    );
  }

  formatDateTime(dateTime: any) {
    return this.timezoneService.transformDateTime(dateTime);
  }

  getUserList() {
    const param: any = {
      company_id: 1,
      print_query: false,
      primary_table: 'user_information',
      start_index: 0,
      limit_range: 1000,
      sort_columns: [['user_information.full_name', 'asc']],
      search_all: [
        {
          column_name: 'user_information.status_id',
          value: '1',
          operator: '=',
        },
        {
          value: ['super_admin', 'company_admin'],
          operator: 'NOT IN',
          column_name: 'user_information.role',
        },
      ],
      includes: [],
      select_columns: [['user_information.user_id', 'id'], ['user_information.full_name', 'name'], ['user_information.uuid']],
    };
    this.gridApiService.getListData(param).subscribe(
      (response: ApiResponce) => {
        if (response.status) {
          this.userList = response.data?.records || [];
        } else if (!response.status) {
          this.userList = [];
          const key = response.message;
          const errorMessage = this.translate.instant(key);
          this.toastr.error(`Code: ${response.code} , ${errorMessage}`);
        }
      },
      (error: any) => {
        this.userList = [];
        const key = 'error';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
      }
    );
  }

  executeUserMap(user_id: number) {
    let param: any = {
      action: ['hard_delete', 'insert'],
      table: ['user_policies', 'user_policies'],
      table_mapping: ['table1', 'table2'],
      conditions: {
        table1: [{ user_id: user_id }],
      },
      data: {
        table2: [],
      },
    };
    let selectedPolicies: IUserPolicy[] = this.policyList
      .filter((p) => p.isChecked)
      .map((p) => {
        return {
          user_id,
          policy_id: p.id,
        };
      });

    param.data.table2 = selectedPolicies;
    this.gridApiService.executeTransaction(param).subscribe(
      (response: ApiResponce) => {
        if (response.status) {
          const key = 'user_policy_mapping_successfully';
          const successMessage = this.translate.instant(key);
          this.toastr.success(successMessage);
        } else if (!response.status) {
          const key = response.message;
          const errorMessage = this.translate.instant(key);
          this.toastr.error(`Code: ${response.code} , ${errorMessage}`);
        }
      },
      (error: any) => {
        const key = 'error';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
      }
    );
  }

  executeRoleMap(role_id: number) {
    let param: any = {
      action: ['hard_delete', 'insert'],
      table: ['role_policies', 'role_policies'],
      table_mapping: ['table1', 'table2'],
      conditions: {
        table1: [{ role_id: role_id }],
      },
      data: {
        table2: [],
      },
    };
    let selectedPolicies: IRolePolicy[] = this.policyList
      .filter((p) => p.isChecked)
      .map((p) => {
        return {
          role_id,
          policy_id: p.id,
        };
      });

    param.data.table2 = selectedPolicies;
    this.gridApiService.executeTransaction(param).subscribe(
      (response: ApiResponce) => {
        if (response.status) {
          const key = 'role_policy_mapping_successfully';
          const successMessage = this.translate.instant(key);
          this.toastr.success(successMessage);
        } else if (!response.status) {
          const key = response.message;
          const errorMessage = this.translate.instant(key);
          this.toastr.error(`Code: ${response.code} , ${errorMessage}`);
        }
      },
      (error: any) => {
        const key = 'error_mapping_role_policies';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
      }
    );
  }

  onPolicyDataChange(data: any[]) {
    // If data is empty or undefined, use original data
    const itemsToUse = !data || data.length === 0 ? this.policyList : data;
    this.tempPolicyList = [...itemsToUse];
  }

  onPolicySortChange(sort: { column: string; direction: 'asc' | 'desc' }) {
    const items = [...this.tempPolicyList];
    items.sort((a, b) => {
      const aVal = a[sort.column];
      const bVal = b[sort.column];
      return sort.direction === 'asc' ? (aVal > bVal ? 1 : -1) : aVal < bVal ? 1 : -1;
    });
    this.onPolicyDataChange(items);
  }
}
