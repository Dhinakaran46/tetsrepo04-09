import { Component } from '@angular/core';
import { CommonSharedModule } from '../../shared/common/common.module';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { ToastrService } from 'ngx-toastr';
import { ApiResponce, GridApiService } from '../../service/common/grid.service';
import { OrderByControlPipe } from '../../pipes/order-by-control/order-by-control.pipe';
import { TranslateService } from '@ngx-translate/core';
import { LocalStorageService } from '../../service/common/local-storage.service';
import { MenuMapService } from '../../service/common/menu-map.service';
interface IRolePermission {
  role_id: number;
  permission_id: number;
}

interface IUserPermission {
  user_id: number;
  permission_id: number;
}

interface IPermissionEntity {
  id: number;
  name: string;
  entity_id: number;
  link_type: number;
  permission_id: number | null;
  permission_name: string | null;
  permission_value: string;
  entity_permission_id: number;
  entity_permission_name: string;
  entity_permission_value: string;
}

interface IPermission {
  id: number;
  parent_id: number | null;
  parent_name: string;
  permissions: IPermissionEntity[] | null; // Permission entities (actions like view, edit, etc.)
  children: IPermission[]; // Recursive relation for nested permissions
}

@Component({
  selector: 'app-user-role-permission',
  standalone: true,
  imports: [CommonSharedModule, ReactiveFormsModule, OrderByControlPipe],
  templateUrl: './user-role-permission.component.html',
  styleUrl: './user-role-permission.component.scss',
})
export class UserRolePermissionComponent {
  mappingForm!: FormGroup;
  entityList: any[] = [];
  roleList: any[] = [];
  userList: any[] = [];
  user_info: any;

  constructor(
    public fb: FormBuilder,
    private toastr: ToastrService,
    private gridApiService: GridApiService,
    private translate: TranslateService,
    private commonService: MenuMapService,
    private localStorageService: LocalStorageService
  ) {
    this.mappingForm = this.fb.group({
      permission_type: ['user', Validators.required],
      user: [''],
      role: [''],
      entities: this.fb.array([]),
    });
    this.user_info = JSON.parse(this.localStorageService.getData('user_data'));
  }

  ngOnInit() {
    this.resetComponent();
  }

  resetComponent() {
    this.mappingForm.reset({
      permission_type: 'user',
      user: '',
      role: '',
    });
    this.getEntityList();
    this.getUserList();
    this.getRoleList();
  }

  populateEntities(data: IPermission[]): void {
    const entitiesArray = this.mappingForm.get('entities') as FormArray;
    entitiesArray.clear();

    data.forEach((entity: IPermission) => {
      const rightsArray = new FormArray<FormGroup>([]);

      if (entity.permissions && entity.permissions.length > 0) {
        entity.permissions.forEach((right: IPermissionEntity) => {
          const isSelectedRight = right.entity_permission_value == 'true' && (right.permission_value == 'true' || !right.permission_id);
          rightsArray.push(
            this.fb.group({
              id: new FormControl(right.id),
              name: new FormControl(right.name),
              entity_id: new FormControl(right.entity_id),
              link_type: new FormControl(right.link_type),
              permission_id: new FormControl(right.permission_id),
              entity_permission_id: new FormControl(right.entity_permission_id),
              permission_value: new FormControl(right.permission_value == 'true'),
              entity_permission_value: new FormControl(right.entity_permission_value == 'true'),
              selected: new FormControl(isSelectedRight),
            })
          );
        });
      }

      const childrenArray = new FormArray<FormGroup>([]);
      if (!entity.permissions && entity.children && entity.children.length > 0) {
        this.addChildEntities(entity.children, childrenArray);
      }

      if (entity.permissions?.length || entity.children?.length) {
        const entityGroup = this.fb.group({
          id: new FormControl(entity.id),
          name: new FormControl(entity.parent_name),
          rights: rightsArray,
          children: childrenArray,
        });

        entitiesArray.push(entityGroup);
      }
    });
  }

  addChildEntities(children: IPermission[], parentArray: FormArray): void {
    children.forEach((child: IPermission) => {
      const rightsArray = new FormArray<FormGroup>([]);

      if (child.permissions && child.permissions.length > 0) {
        child.permissions.forEach((right: IPermissionEntity) => {
          const isSelectedRight = right.entity_permission_value == 'true' && (right.permission_value == 'true' || !right.permission_id);
          rightsArray.push(
            this.fb.group({
              id: new FormControl(right.id),
              name: new FormControl(right.permission_name ?? right.entity_permission_name),
              entity_id: new FormControl(right.entity_id),
              link_type: new FormControl(right.link_type),
              permission_id: new FormControl(right.permission_id),
              entity_permission_id: new FormControl(right.entity_permission_id),
              permission_value: new FormControl(right.permission_value == 'true'),
              entity_permission_value: new FormControl(right.entity_permission_value == 'true'),
              selected: new FormControl(isSelectedRight),
            })
          );
        });
      }

      const childrenArray = new FormArray<FormGroup>([]);
      if (!child.permissions && child.children && child.children.length > 0) {
        this.addChildEntities(child.children, childrenArray);
      }

      if (child.permissions?.length || child.children?.length) {
        const childGroup = this.fb.group({
          id: new FormControl(child.id),
          name: new FormControl(child.parent_name),
          rights: rightsArray,
          children: childrenArray,
        });

        parentArray.push(childGroup);
      }
    });
  }

  getEntitiesControls(): FormGroup[] {
    return (this.mappingForm.get('entities') as FormArray).controls as FormGroup[];
  }

  getRightsControls(entityGroup: FormGroup): FormGroup[] {
    return (entityGroup.get('rights') as FormArray).controls as FormGroup[];
  }

  getChildrenControls(entityGroup: FormGroup): FormGroup[] {
    return (entityGroup.get('children') as FormArray).controls as FormGroup[];
  }

  mapPermissions() {
    if (this.mappingForm.invalid) {
      const key = 'please_select_all_the_required_fields';
      const errorMessage = this.translate.instant(key);
      this.toastr.error(errorMessage, 'Error');
      return;
    }
    const permission_type = this.mappingForm.get('permission_type')?.value;
    const role_id = this.mappingForm.get('role')?.value;
    const user_id = this.mappingForm.get('user')?.value;
    if (permission_type === 'user') {
      this.executeUserMap(user_id);
    } else {
      this.executeRoleMap(role_id);
    }
  }

  selectedUserPermissions(entitiesArray: FormArray, selectedPermissions: IUserPermission[]): void {
    entitiesArray.controls.forEach((entityGroup: AbstractControl) => {
      const rightsArray = entityGroup.get('rights') as FormArray;

      // Collect selected rights from the current entity
      rightsArray.controls.forEach((rightControl: AbstractControl) => {
        if (rightControl.get('selected')?.value) {
          if (rightControl.get('permission_id')?.value) {
            selectedPermissions.push({
              user_id: 1, // or replace this with dynamic user_id if necessary
              permission_id: rightControl.get('permission_id')?.value,
            });
          }
          if (rightControl.get('entity_permission_id')?.value) {
            selectedPermissions.push({
              user_id: 1, // or replace this with dynamic user_id if necessary
              permission_id: rightControl.get('entity_permission_id')?.value,
            });
          }
        }
      });

      // Recursively collect selected rights from child entities
      const childrenArray = entityGroup.get('children') as FormArray;
      if (childrenArray && childrenArray.length > 0) {
        this.selectedUserPermissions(childrenArray, selectedPermissions);
      }
    });
  }

  selectedRolePermissions(entitiesArray: FormArray, selectedPermissions: IRolePermission[]): void {
    entitiesArray.controls.forEach((entityGroup: AbstractControl) => {
      const rightsArray = entityGroup.get('rights') as FormArray;

      // Collect selected rights from the current entity
      rightsArray.controls.forEach((rightControl: AbstractControl) => {
        if (rightControl.get('selected')?.value) {
          if (rightControl.get('permission_id')?.value) {
            selectedPermissions.push({
              role_id: 1, // or replace this with dynamic role_id if necessary
              permission_id: rightControl.get('permission_id')?.value,
            });
          }
          if (rightControl.get('entity_permission_id')?.value) {
            selectedPermissions.push({
              role_id: 1, // or replace this with dynamic role_id if necessary
              permission_id: rightControl.get('entity_permission_id')?.value,
            });
          }
        }
      });

      // Recursively collect selected rights from child entities
      const childrenArray = entityGroup.get('children') as FormArray;
      if (childrenArray && childrenArray.length > 0) {
        this.selectedRolePermissions(childrenArray, selectedPermissions);
      }
    });
  }

  getEntityList() {
    const permission_type = `${this.mappingForm.get('permission_type')?.value}wise`;
    const user_id = this.mappingForm.get('user')?.value || 0;
    const role_id = this.mappingForm.get('role')?.value || 0;
    const param: any = { proc_name: 'get_menu_permissions', params: { user_id, menu_id: 1 } };
    this.commonService.procedureCall(param).subscribe(
      (response: ApiResponce) => {
        if (response.status) {
          const records = (response.data.length && response.data[0].result) || [];
          this.entityList = this.mapPermissionsToHierarchy(records);
          this.populateEntities(this.entityList);
        } else if (!response.status) {
          this.entityList = [];
          const key = response.message;
          const errorMessage = this.translate.instant(key);
          this.toastr.error(`Code: ${response.code} , ${errorMessage}`);
        }
      },
      (error: any) => {
        this.entityList = [];
        const key = 'error';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
      }
    );
  }

  mapPermissionsToHierarchy(permissions: IPermission[]): IPermission[] {
    const permissionMap: { [key: number]: IPermission } = {};
    const hierarchy: IPermission[] = [];

    permissions.forEach((permission) => {
      permission.children = [];
      permissionMap[permission.id] = permission;
    });

    permissions.forEach((permission) => {
      if (permission.parent_id === null) {
        hierarchy.push(permission);
      } else {
        const parent = permissionMap[permission.parent_id];
        if (parent) {
          parent.children.push(permission);
        }
      }
    });

    return hierarchy;
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

  getUserList() {
    const param: any = {
      company_id: 1,
      print_query: false,
      primary_table: 'users',
      start_index: 0,
      limit_range: 1000,
      sort_columns: [["concat(user_details.first_name, ' ', user_details.last_name)", 'asc']],
      search_all: [
        {
          column_name: 'users.status_id',
          value: '1',
          operator: '=',
        },
      ],
      includes: [
        {
          table_name: 'user_details',
          join_type: 'INNER',
          join_condition: 'users.id = user_details.user_id',
        },
      ],
      select_columns: [['users.id'], ["concat(user_details.first_name, ' ', user_details.last_name)", 'name'], ['users.uuid']],
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
      table: ['user_permissions', 'user_permissions'],
      table_mapping: ['table1', 'table2'],
      conditions: {
        table1: [{ user_id: user_id }],
      },
      data: {
        table2: [],
      },
    };

    const selectedPermissions: IUserPermission[] = [];
    const entitiesArray = this.mappingForm.get('entities') as FormArray;
    this.selectedUserPermissions(entitiesArray, selectedPermissions);
    if (selectedPermissions.length === 0) {
      const key = 'please_select_atleast_one_permission';
      const errorMessage = this.translate.instant(key);
      this.toastr.error(errorMessage, 'Error');
      return;
    }
    console.log('Selected Permissions:', selectedPermissions);
    param.data.table2 = selectedPermissions;
    this.gridApiService.executeTransaction(param).subscribe(
      (response: ApiResponce) => {
        if (response.status) {
          const key = 'user_permission_mapping_successfully';
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
      table: ['role_permissions', 'role_permissions'],
      table_mapping: ['table1', 'table2'],
      conditions: {
        table1: [{ role_id: role_id }],
      },
      data: {
        table2: [],
      },
    };
    const selectedPermissions: IRolePermission[] = [];
    const entitiesArray = this.mappingForm.get('entities') as FormArray;
    this.selectedRolePermissions(entitiesArray, selectedPermissions);
    if (selectedPermissions.length === 0) {
      const key = 'please_select_atleast_one_permission';
      const errorMessage = this.translate.instant(key);
      this.toastr.error(errorMessage, 'Error');
      return;
    }
    param.data.table2 = selectedPermissions;
    this.gridApiService.executeTransaction(param).subscribe(
      (response: ApiResponce) => {
        if (response.status) {
          const key = 'role_permission_mapping_successfully';
          const successMessage = this.translate.instant(key);
          this.toastr.success(successMessage);
        } else if (!response.status) {
          const key = response.message;
          const errorMessage = this.translate.instant(key);
          this.toastr.error(`Code: ${response.code} , ${errorMessage}`);
        }
      },
      (error: any) => {
        const key = 'error_mapping_role_permissions';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
      }
    );
  }
}
