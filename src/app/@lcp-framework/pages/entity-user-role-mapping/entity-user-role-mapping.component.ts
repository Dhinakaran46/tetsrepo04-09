import { Component } from '@angular/core';
import { CommonSharedModule } from '../../shared/common/common.module';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { ToastrService } from 'ngx-toastr';
import { ApiResponce, GridApiService } from '../../service/common/grid.service';
import { OrderByControlPipe } from '../../pipes/order-by-control/order-by-control.pipe';
import { TranslateService } from '@ngx-translate/core';
import { LocalStorageService } from '../../service/common/local-storage.service';

export interface IRight {
  'permissions.id': number;
  'permissions.name': string;
  'permissions.slug': string;
  'permissions.order_no': number;
}

export interface IEntity {
  id: number;
  grid_name: string;
  entity_name: string;
  entity_type: any;
  is_admin_module: any;
  rights: IRight[];
}

@Component({
  selector: 'app-entity-user-role-mapping',
  standalone: true,
  imports: [CommonSharedModule, ReactiveFormsModule, OrderByControlPipe],
  templateUrl: './entity-user-role-mapping.component.html',
  styleUrl: './entity-user-role-mapping.component.scss',
})
export class EntityUserRoleMappingComponent {
  store: any;
  search: string = '';
  mappingForm!: FormGroup;
  entityList: any[] = [];
  userList: any[] = [];
  roleList: any[] = [];
  user_info: any;
  visibleEntitiesCount = 0;

  constructor(
    public storeData: Store<any>,
    public fb: FormBuilder,
    private toastr: ToastrService,
    private gridApiService: GridApiService,
    private translate: TranslateService,
    private localStorageService: LocalStorageService
  ) {
    this.initStore();
    this.mappingForm = this.fb.group({
      permission_type: ['role', Validators.required],
      user: [''],
      role: [''],
      all: [false],
      view: [false],
      add: [false],
      edit: [false],
      delete: [false],
      export: [false],
      details: [false],
      Approval: [false],
      assign: [false],
      entities: this.fb.array([]),
    });

    this.user_info = JSON.parse(this.localStorageService.getData('user_data'));
  }

  async initStore() {
    this.storeData
      .select((d) => d.index)
      .subscribe((d) => {
        this.store = d;
      });
  }

  ngOnInit() {
    this.resetComponent();
    this.mappingForm.get('permission_type')?.valueChanges.subscribe((value) => {
      this.onPermissionTypeChange(value);
    });
  }

  getTransformedEntityType(entityType: any) {
    return entityType
      .replace(/builder|module|_/g, ' ')
      .trim()
      .split(' ')
      .map((word: any) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  resetComponent() {
    this.mappingForm.reset({
      permission_type: 'role',
      user: '',
      role: '',
    });
    const entitiesArray = this.mappingForm.get('entities') as FormArray;
    entitiesArray.clear();
    this.onPermissionTypeChange(this.mappingForm.get('permission_type')?.value);
    this.search = '';
    this.getRoleList();
    this.getUserList();
    this.getEntityList();
  }

  populateEntities(data: IEntity[], selectedPermissions: number[] = []): void {
    let isSelected: any = {
      all: false,
      view: false,
      add: false,
      edit: false,
      delete: false,
      export: false,
      details: false,
      Approval: false,
      assign: false,
    };
    for (let key in isSelected) {
      this.mappingForm.get(key)?.setValue(isSelected[key]);
    }
    const entitiesArray = this.mappingForm.get('entities') as FormArray;
    entitiesArray.clear();
    data.forEach((entity: IEntity) => {
      let isSelectedEntity = false;
      const rightsArray: FormArray = new FormArray<FormGroup>([]); // Explicitly typing the FormArray
      entity.rights.forEach((right: IRight) => {
        const isSelectedRight = selectedPermissions.includes(right['permissions.id']);
        const name: string = right['permissions.name'];
        if (isSelectedRight && !isSelected[name]) {
          isSelected['all'] = true;
          isSelected[name] = true;
          isSelectedEntity = true;
        }
        rightsArray.push(
          this.fb.group({
            id: new FormControl(right['permissions.id']),
            name: new FormControl(right['permissions.name']),
            slug: new FormControl(right['permissions.slug']),
            order_no: new FormControl(right['permissions.order_no']),
            selected: new FormControl(isSelectedRight),
          })
        );
      });

      const entityGroup = this.fb.group({
        id: new FormControl(entity.id),
        grid_name: new FormControl(entity.grid_name),
        entity_name: new FormControl(entity.entity_name),
        entity_type: new FormControl(entity.entity_type),
        is_admin_module: new FormControl(entity.is_admin_module),
        rights: rightsArray,
        selected: new FormControl(isSelectedEntity),
      });

      entitiesArray.push(entityGroup);
    });
    for (let key in isSelected) {
      this.mappingForm.get(key)?.setValue(isSelected[key]);
    }
  }

  onEntitySelectedChange(entityIndex: number): void {
    const entitiesArray = this.mappingForm.get('entities') as FormArray;
    const entityGroup = entitiesArray.at(entityIndex) as FormGroup;
    const rightsArray = entityGroup.get('rights') as FormArray;
    const selected = entityGroup.get('selected')?.value;

    rightsArray.controls.forEach((rightControl: AbstractControl) => {
      (rightControl as FormGroup).get('selected')?.setValue(selected);
    });
    if (selected) {
      this.mappingForm.get('all')?.setValue(true);
      rightsArray.controls.forEach((rightControl, index: number) => {
        const selectedRightName = (rightControl as FormGroup).get('name')?.value;
        this.mappingForm.get(selectedRightName)?.setValue(true);
      });
    } else {
      this.updateAllCheckoboxValue();
      let viewSelect = false;
      let addSelect = false;
      let editSelect = false;
      let deleteSelect = false;
      let exportSelect = false;
      let detailsSelect = false;
      let ApprovalSelect = false;
      let assignSelect = false;
      for (let i = 0; i < entitiesArray.length; i++) {
        const entityControl = entitiesArray.at(i) as FormGroup;
        const rightsArrayForEntity = entityControl.get('rights') as FormArray; // Get rights for this entity
        if (entityControl.get('selected')?.value) {
          for (let j = 0; j < rightsArrayForEntity.length; j++) {
            const rightControl = rightsArrayForEntity.at(j) as FormGroup;
            if (rightControl.get('name')?.value === 'view' && rightControl.get('selected')?.value) {
              viewSelect = true;
            } else if (rightControl.get('name')?.value === 'add' && rightControl.get('selected')?.value) {
              addSelect = true;
            } else if (rightControl.get('name')?.value === 'edit' && rightControl.get('selected')?.value) {
              editSelect = true;
            } else if (rightControl.get('name')?.value === 'delete' && rightControl.get('selected')?.value) {
              deleteSelect = true;
            } else if (rightControl.get('name')?.value === 'export' && rightControl.get('selected')?.value) {
              exportSelect = true;
            } else if (rightControl.get('name')?.value === 'details' && rightControl.get('selected')?.value) {
              detailsSelect = true;
            } else if (rightControl.get('name')?.value === 'Approval' && rightControl.get('selected')?.value) {
              ApprovalSelect = true;
            } else if (rightControl.get('name')?.value === 'assign' && rightControl.get('selected')?.value) {
              assignSelect = true;
            }
          }
        }
        if (addSelect && editSelect && deleteSelect && exportSelect && detailsSelect && ApprovalSelect && assignSelect) break; // Exit the outer loop if a matching permission is found
      }
      this.mappingForm.get('view')?.setValue(viewSelect);
      this.mappingForm.get('add')?.setValue(addSelect);
      this.mappingForm.get('edit')?.setValue(editSelect);
      this.mappingForm.get('delete')?.setValue(deleteSelect);
      this.mappingForm.get('export')?.setValue(exportSelect);
      this.mappingForm.get('details')?.setValue(detailsSelect);
      this.mappingForm.get('Approval')?.setValue(ApprovalSelect);
      this.mappingForm.get('assign')?.setValue(assignSelect);
    }
  }

  onPermissionChange(entityIndex: number, rightIndex: number): void {
    const entitiesArray = this.mappingForm.get('entities') as FormArray;
    const entityGroup = entitiesArray.at(entityIndex) as FormGroup;
    const rightsArray = entityGroup.get('rights') as FormArray;
    const rightGroup = rightsArray.at(rightIndex) as FormGroup;
    const selectedRight = rightGroup.get('selected')?.value;
    const selectedRightName = rightGroup.get('name')?.value;

    let entitySelect = false;

    if (!selectedRight && selectedRightName === 'view') {
      rightsArray.controls.forEach((rightControl) => {
        (rightControl as FormGroup).get('selected')?.setValue(false);
      });
      entityGroup.get('selected')?.setValue(false);
    } else {
      let viewRightControlIndex: number = 0;
      rightsArray.controls.forEach((rightControl, index: number) => {
        entitySelect = (rightControl as FormGroup).get('selected')?.value ? true : entitySelect;
        if ((rightControl as FormGroup).get('name')?.value === 'view') {
          viewRightControlIndex = index;
        }
      });
      entityGroup.get('selected')?.setValue(entitySelect);
      (rightsArray.at(viewRightControlIndex) as FormGroup).get('selected')?.setValue(entitySelect);
      if (entitySelect) {
        this.mappingForm.get('view')?.setValue(true);
      }
    }

    // this.mappingForm.get('all')?.setValue(entitySelect || selectedRight || this.isAnyEntitySelected());
    if (entitySelect || selectedRight) {
      this.mappingForm.get('all')?.setValue(true);
    } else {
      this.updateAllCheckoboxValue();
    }

    if (!selectedRight) {
      let rightGroupSelect = false;
      for (let i = 0; i < entitiesArray.length; i++) {
        const entityControl = entitiesArray.at(i) as FormGroup;
        const rightsArrayForEntity = entityControl.get('rights') as FormArray; // Get rights for this entity
        if (entityControl.get('selected')?.value) {
          for (let j = 0; j < rightsArrayForEntity.length; j++) {
            const rightControl = rightsArrayForEntity.at(j) as FormGroup;
            if (rightControl.get('name')?.value === selectedRightName && rightControl.get('selected')?.value) {
              rightGroupSelect = true;
              break; // Exit the loop once rightGroupSelect is true
            }
          }
        }
        if (rightGroupSelect) break; // Exit the outer loop if a matching permission is found
      }
      this.mappingForm.get(selectedRightName)?.setValue(rightGroupSelect);
      if (!rightGroupSelect && selectedRightName === 'view') {
        this.mappingForm.get('add')?.setValue(rightGroupSelect);
        this.mappingForm.get('edit')?.setValue(rightGroupSelect);
        this.mappingForm.get('delete')?.setValue(rightGroupSelect);
        this.mappingForm.get('export')?.setValue(rightGroupSelect);
        this.mappingForm.get('details')?.setValue(rightGroupSelect);
        this.mappingForm.get('Approval')?.setValue(rightGroupSelect);
        this.mappingForm.get('assign')?.setValue(rightGroupSelect);
      }
    } else {
      this.mappingForm.get(selectedRightName)?.setValue(true);
    }
  }

  updateAllCheckoboxValue() {
    const entitiesArray = this.mappingForm.get('entities') as FormArray;
    let entitySelect = false;

    for (let i = 0; i < entitiesArray.length; i++) {
      const entityControl = entitiesArray.at(i) as FormGroup;
      if (entityControl.get('selected')?.value) {
        entitySelect = true;
        break; // Exit the loop once entitySelect is true
      }
    }

    this.mappingForm.get('all')?.setValue(entitySelect);
  }

  selectAll(controllerName: string): void {
    const selected = this.mappingForm.get(controllerName)?.value;
    const entitiesArray = this.mappingForm.get('entities') as FormArray;
    if (controllerName === 'all' || (controllerName === 'view' && !selected)) {
      entitiesArray.controls.forEach((entityControl) => {
        const entityGroup = entityControl as FormGroup;
        entityGroup.get('selected')?.setValue(selected);

        const rightsArray = entityGroup.get('rights') as FormArray;
        rightsArray.controls.forEach((rightControl) => {
          rightControl.get('selected')?.setValue(selected);
        });
      });
      this.mappingForm.get('add')?.setValue(selected);
      this.mappingForm.get('edit')?.setValue(selected);
      this.mappingForm.get('delete')?.setValue(selected);
      this.mappingForm.get('export')?.setValue(selected);
      this.mappingForm.get('details')?.setValue(selected);
      this.mappingForm.get('Approval')?.setValue(selected);
      this.mappingForm.get('assign')?.setValue(selected);
      this.mappingForm.get(controllerName === 'all' ? 'view' : 'all')?.setValue(selected);
    } else {
      let selectAll = false;

      entitiesArray.controls.forEach((entityControl) => {
        let entitySelect = false;
        const entityGroup = entityControl as FormGroup;

        const rightsArray = entityGroup.get('rights') as FormArray;
        let viewRightControlIndex: number = 0;
        rightsArray.controls.forEach((rightControl, index: number) => {
          if ((rightControl as FormGroup).get('name')?.value === controllerName) {
            rightControl.get('selected')?.setValue(selected);
          }
          if (!entitySelect && rightControl.get('selected')?.value) {
            entitySelect = true;
          }
          if ((rightControl as FormGroup).get('name')?.value === 'view') {
            viewRightControlIndex = index;
          }
        });
        entityGroup.get('selected')?.setValue(entitySelect);
        (rightsArray.at(viewRightControlIndex) as FormGroup).get('selected')?.setValue(entitySelect);
        if (!selectAll && entitySelect) {
          selectAll = true;
        }
      });
      this.mappingForm.get('all')?.setValue(selectAll);
      this.mappingForm.get('view')?.setValue(selectAll);
    }
  }

  getEntitiesControls() {
    return (this.mappingForm.get('entities') as FormArray).controls as FormGroup[];
  }

  getRightsControls(entity: FormGroup) {
    return (entity.get('rights') as FormArray).controls as FormGroup[];
  }

  onPermissionTypeChange(permissionType: string): void {
    const userControl = this.mappingForm.get('user');
    const roleControl = this.mappingForm.get('role');

    if (permissionType === 'user') {
      userControl?.setValidators([Validators.required]);
      roleControl?.clearValidators();
      this.getUserPermissionList();
    } else if (permissionType === 'role') {
      roleControl?.setValidators([Validators.required]);
      userControl?.clearValidators();
      this.getRolePermissionList();
    }

    userControl?.updateValueAndValidity();
    roleControl?.updateValueAndValidity();
  }

  getEntityList() {
    const param: any = {
      company_id: 1,
      print_query: false,
      primary_table: 'master_entities',
      start_index: 0,
      limit_range: 1000,
      sort_columns: [['master_entities.entity_name', 'asc']],
      search_all: [
        {
          column_name: 'master_entities.status_id',
          value: '1',
          operator: '=',
        },
        {
          column_name: 'permissions.status_id',
          value: '1',
          operator: '=',
        },
      ],
      select_columns: [
        ['master_entities.id'],
        ['master_entities.name', 'grid_name'],
        ['master_entities.entity_type', 'entity_type'],
        ['master_entities.is_admin_module', 'is_admin_module'],
        ['master_entities.entity_name'],
        [
          "json_agg(json_build_object('permissions.id', permissions.id, 'permissions.name', permissions.name, 'permissions.slug', permissions.slug,'permissions.order_no', permissions.order_no))",
          'rights',
        ],
      ],
      includes: [
        {
          table_name: 'permissions',
          join_type: 'INNER',
          join_condition: 'master_entities.id = permissions.entity_id',
        },
      ],
      group_by: ['master_entities.id', 'master_entities.name', 'master_entities.entity_name'],
    };

    if (this.search.length) {
      param.search_any = [
        {
          column_name: 'master_entities.name',
          value: '%' + this.search + '%',
          operator: 'LIKE',
        },
        {
          column_name: 'master_entities.entity_name',
          value: '%' + this.search + '%',
          operator: 'LIKE',
        },
      ];
    }
    this.gridApiService.getListData(param).subscribe(
      (response: ApiResponce) => {
        if (response.status) {
          this.entityList = response.data?.records || [];
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

  getVisibleIndex(currentIndex: number): number {
    this.visibleEntitiesCount = this.getEntitiesControls().reduce((count, entity, index) => {
      const isVisible = this.user_info.main.role === 'super_admin' || (this.user_info.main.role !== 'super_admin' && !entity.get('is_admin_module')?.value);
      return isVisible && index <= currentIndex ? count + 1 : count;
    }, 0);

    return this.visibleEntitiesCount - 1;
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

  selectedPermissions(): any[] {
    const selectedRights: any[] = [];
    const rights: number[] = [];
    const entitiesArray = this.mappingForm.get('entities') as FormArray;

    entitiesArray.controls.forEach((entityControl: AbstractControl) => {
      const entityGroup = entityControl as FormGroup;
      const rightsArray = entityGroup.get('rights') as FormArray;

      rightsArray.controls.forEach((rightControl: AbstractControl) => {
        const rightGroup = rightControl as FormGroup;
        if (rightGroup.get('selected')?.value) {
          rights.push(rightGroup.get('id')?.value);
          selectedRights.push({
            entity_id: entityGroup.get('id')?.value,
            right_id: rightGroup.get('id')?.value,
            permissions_name: rightGroup.get('name')?.value,
          });
        }
      });
    });
    return rights;
  }

  mapPermissions() {
    if (this.mappingForm.invalid) {
      const key = 'please_select_all_the_required_fields';
      const errorMessage = this.translate.instant(key);
      this.toastr.error(errorMessage, 'Error');
      return;
    }
    const rights = this.selectedPermissions();
    if (rights.length === 0) {
      const key = 'please_select_atleast_one_permission';
      const errorMessage = this.translate.instant(key);
      this.toastr.error(errorMessage, 'Error');
      return;
    }
    const permission_type = this.mappingForm.get('permission_type')?.value;
    const role_id = this.mappingForm.get('role')?.value;
    const user_id = this.mappingForm.get('user')?.value;
    if (permission_type === 'user') {
      this.executeUserMap(user_id, rights);
    } else {
      this.executeRoleMap(role_id, rights);
    }
  }

  executeUserMap(user_id: number, rights: number[]) {
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
    let data: any[] = [];
    rights.forEach((right_id) => {
      data.push({
        permission_id: right_id,
        user_id,
      });
    });
    if (data.length === 0) {
      const key = 'please_select_atleast_one_permission';
      const errorMessage = this.translate.instant(key);
      this.toastr.error(errorMessage, 'Error');
      return;
    }
    param.data.table2 = data;
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

  executeRoleMap(role_id: number, rights: number[]) {
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
    let data: any[] = [];
    rights.forEach((right_id) => {
      data.push({
        permission_id: right_id,
        role_id,
      });
    });
    if (data.length === 0) {
      const key = 'please_select_atleast_one_permission';
      const errorMessage = this.translate.instant(key);
      this.toastr.error(errorMessage, 'Error');
      return;
    }
    param.data.table2 = data;
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

  getUserPermissionList() {
    const user_id = this.mappingForm.get('user')?.value;
    if (user_id === '') {
      this.populateEntities(this.entityList, []);
      return;
    }
    const param: any = {
      company_id: 1,
      print_query: false,
      primary_table: 'user_permissions',
      start_index: 0,
      limit_range: 1000,
      sort_columns: [['user_permissions.permission_id', 'asc']],
      search_all: [
        {
          column_name: 'user_permissions.user_id',
          value: user_id,
          operator: '=',
        },
      ],
      select_columns: [['user_permissions.permission_id']],
    };
    this.gridApiService.getListData(param).subscribe(
      (response: ApiResponce) => {
        if (response.status) {
          const selected_permissions = response.data?.records.map((record: any) => record.permission_id) || [];
          this.populateEntities(this.entityList, selected_permissions);
        } else if (!response.status) {
          this.toastr.error(`Code: ${response.code} , ${response.message}`);
        }
      },
      (error: any) => {
        const key = 'error_getting_permissions_list';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
      }
    );
  }

  getRolePermissionList() {
    const role_id = this.mappingForm.get('role')?.value;
    if (role_id === '') {
      this.populateEntities(this.entityList, []);
      return;
    }
    const param: any = {
      company_id: 1,
      print_query: false,
      primary_table: 'role_permissions',
      start_index: 0,
      limit_range: 1000,
      sort_columns: [['role_permissions.permission_id', 'asc']],
      search_all: [
        {
          column_name: 'role_permissions.role_id',
          value: role_id,
          operator: '=',
        },
      ],
      select_columns: [['role_permissions.permission_id']],
    };
    this.gridApiService.getListData(param).subscribe(
      (response: ApiResponce) => {
        if (response.status) {
          const selected_permissions = response.data?.records.map((record: any) => record.permission_id) || [];
          this.populateEntities(this.entityList, selected_permissions);
        } else if (!response.status) {
          this.toastr.error(`Code: ${response.code} , ${response.message}`);
        }
      },
      (error: any) => {
        const key = 'error_getting_permissions_list';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
      }
    );
  }
}
