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
import { IconFolderComponent } from '../../shared/icon/icon-folder';
import { IconMinusComponent } from '../../shared/icon/icon-minus';
import { IconFolderPlusComponent } from '../../shared/icon/icon-folder-plus';
import { IconFolderMinusComponent } from '../../shared/icon/icon-folder-minus';
import { Title } from '@angular/platform-browser';
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
  child_entity_name: any;
}

interface IPermission {
  id: number;
  parent_id: number | null;
  parent_name: string;
  menu_img: any;
  expanded: any;
  permissions: IPermissionEntity[] | null; // Permission entities (actions like view, edit, etc.)
  children: IPermission[]; // Recursive relation for nested permissions
}

@Component({
  selector: 'app-user-role-permission',
  standalone: true,
  imports: [
    CommonSharedModule,
    ReactiveFormsModule,
    OrderByControlPipe,
    IconFolderComponent,
    IconMinusComponent,
    IconFolderPlusComponent,
    IconFolderMinusComponent,
  ],
  templateUrl: './user-role-permission.component.html',
  styleUrl: './user-role-permission.component.scss',
})
export class UserRolePermissionComponent {
  mappingForm!: FormGroup;
  entityList: any[] = [];
  roleList: any[] = [];
  userList: any[] = [];
  user_info: any;

  order_permissions = ['view', 'add', 'edit', 'details', 'delete', 'export_excel', 'export_pdf', 'assign', 'reset_password'];

  constructor(
    public fb: FormBuilder,
    private toastr: ToastrService,
    private gridApiService: GridApiService,
    public translate: TranslateService,
    private commonService: MenuMapService,
    private localStorageService: LocalStorageService,
    private titleService: Title
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
    const translateTitle = this.translate.instant('entity_user_role_map_page');
    this.titleService.setTitle(translateTitle);
    this.resetComponent();
  }

  resetComponent() {
    this.mappingForm.reset({
      permission_type: 'user',
      user: '',
      role: '',
    });
    this.getActionTypes();
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
              child_entity_name: new FormControl(right.child_entity_name),
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
          menu_img: new FormControl(entity.menu_img),
          expanded: [true],
          rights: rightsArray,
          children: childrenArray,
        });

        entitiesArray.push(entityGroup);
      }
    });

    this.loadDashboardWizards();
  }

  async loadDashboardWizards() {
    const entitiesArray = this.mappingForm.get('entities') as FormArray;
    const permission_type = `${this.mappingForm.get('permission_type')?.value}`;
    const user_id = this.mappingForm.get('user')?.value || 0;
    const role_id = this.mappingForm.get('role')?.value || 0;

    const params = {
      company_id: 1,
      primary_table: 'wizard_group',
      sort_columns: [['wizard_group.id', 'asc']],
      limit_range: 1000,
      print_query: true,
      search_all: [
        {
          value: 1,
          operator: '=',
          column_name: 'wizard_group.status_id',
        },
      ],
      select_columns: [
        ['wizard_group.id', 'id'],
        ['wizard_group.name', 'name'],
        [
          `CASE
            WHEN COUNT(subquery.id) = 0 THEN null
            ELSE COALESCE(
                Json_agg(
                    subquery.jsonb_object
                    ORDER BY subquery.order_no
                )
            )
        END`,
          'cards',
        ],
      ],
      includes: [
        {
          table_name: `LATERAL (
              SELECT
                DISTINCT ON (master_entities.id)
                master_entities.id,
                jsonb_build_object(
                  'id', master_entities.id,
                  'title', master_entities.name,
                  'type', master_entities.dashboard_wizard_type,
                  'order_no', master_entities.dashboard_wizard_order_no,
                  'entity_name', master_entities.entity_name,
                  'permission_id', permissions.id,
                  'dasboard_grid', master_entities.dashboard_grid,
                  'has_permission',
                    CASE
                      WHEN '${permission_type}' = 'user' THEN
                        CASE
                          WHEN EXISTS (
                            SELECT 1
                            FROM user_permissions
                            WHERE user_permissions.permission_id = permissions.id
                            AND user_permissions.user_id = ${user_id}
                          ) THEN true
                          ELSE false
                        END
                      WHEN '${permission_type}' = 'role' THEN
                        CASE
                          WHEN EXISTS (
                            SELECT 1
                            FROM role_permissions
                            WHERE role_permissions.permission_id = permissions.id
                            AND role_permissions.role_id = ${role_id}
                          ) THEN true
                          ELSE false
                        END
                      ELSE false
                    END
                ) AS jsonb_object,
                master_entities.dashboard_wizard_order_no AS order_no
              FROM
                master_entities
              LEFT JOIN
                permissions ON permissions.entity_id = master_entities.id
              WHERE
                master_entities.dashboard_wizard_group_id = wizard_group.id AND master_entities.status_id = 1
              ORDER BY
                master_entities.id, master_entities.dashboard_wizard_order_no
            ) AS subquery`,
          join_type: 'LEFT',
          join_condition: 'TRUE',
        },
      ],
      group_by: ['wizard_group.id'],
    };

    this.gridApiService.getAllList(params).subscribe(
      async (response) => {
        if (response.status && response.code === 200) {
          const dashboardItems = response.data.records;

          let dashboard: any = this.fb.group({
            id: new FormControl(7777),
            name: new FormControl('dashboard'),
            menu_img: new FormControl('fa-gauge'),
            expanded: [true],
            children: this.fb.array([]), // Use FormArray for children
            rights: this.fb.array([]),
          });

          dashboardItems.map((elem: any, index: any) => {
            if (elem.cards) {
              let tab: any = this.fb.group({
                id: new FormControl(7777 + index),
                name: new FormControl(elem.name),
                menu_img: new FormControl('fa-folder-open'),
                expanded: [true],
                children: this.fb.array([]), // Use FormArray for children
                rights: this.fb.array([]),
              });

              elem.cards.map((ielem: any) => {
                let card: any = this.fb.group({
                  id: new FormControl(ielem.id),
                  name: new FormControl(ielem.entity_name),
                  menu_img: ielem.type == 'chart' ? new FormControl('fa-chart-simple') : new FormControl('fa-palette'),
                  // menu_img: ielem.dashboard_grid
                  //     ? new FormControl('fa-table-cells')
                  //     : ielem.type === 'chart'
                  //       ? new FormControl('fa-chart-simple')
                  //       : new FormControl('fa-palette'),
                  expanded: [true],
                  children: this.fb.array([]), // If card has children, it's an array
                  rights: this.fb.array([
                    this.fb.group({
                      entity_id: new FormControl(ielem.id),
                      entity_permission_id: new FormControl(ielem.permission_id),
                      child_entity_name: new FormControl(ielem.child_entity_name),
                      permission_id: new FormControl(ielem.permission_id),
                      name: new FormControl('view'),
                      permission_value: new FormControl(ielem.has_permission),
                      entity_permission_value: new FormControl(ielem.has_permission),
                      dashboard_grid: new FormControl(ielem.dasboard_grid),
                      link_type: new FormControl(1),
                      id: new FormControl(ielem.id),
                      selected: new FormControl(ielem.has_permission),
                    }),
                  ]),
                });

                // Add card to tab's children (FormArray)
                (tab.get('children') as FormArray).push(card);
              });

              // Add tab to dashboard's children (FormArray)
              (dashboard.get('children') as FormArray).push(tab);
            }
          });

          // Finally, push the dashboard object to entitiesArray
          //entitiesArray.push(dashboard);
          if (entitiesArray && entitiesArray.controls.length > 0) {
            // Insert the dashboard at the first position

            if (dashboard.get('children').length > 0) {
              entitiesArray.insert(0, dashboard);
            }
          }
        }
      },
      (error) => {
        const key = 'failed_to_load';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
      }
    );
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
              name: new FormControl(right.permission_name),
              entity_id: new FormControl(right.entity_id),
              link_type: new FormControl(right.link_type),
              permission_id: new FormControl(right.permission_id),
              entity_permission_id: new FormControl(right.entity_permission_id),
              child_entity_name: new FormControl(right.child_entity_name),
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
          menu_img: new FormControl(child.menu_img),
          expanded: [true],
          rights: rightsArray,
          children: childrenArray,
        });

        parentArray.push(childGroup);
      }
    });
  }

  getRightsControls(entityGroup: FormGroup): FormGroup[] {
    return (entityGroup.get('rights') as FormArray).controls as FormGroup[];
  }
  onCheckboxChange(rightGroup: FormGroup, event: Event, parentGroup: FormGroup) {
    const rightsArray = parentGroup.get('rights') as FormArray;
    const viewControl: any = rightsArray.at(0).get('selected'); // Assuming 'View' is at index 0
    const isChecked = rightGroup.get('selected')?.value;

    const entityId = rightGroup.get('entity_id')?.value;

    if (rightGroup.get('name')?.value === 'view') {
      if (!isChecked) {
        // If "View" is unchecked, uncheck all other checkboxes
        rightsArray.controls.forEach((control) => {
          control.get('selected')?.setValue(false);
        });
      }
    } else {
      if (isChecked) {
        // If checking a checkbox other than "View", check the "View" checkbox
        if (rightGroup.get('name')?.value !== 'view') {
          viewControl.setValue(true); // Check the "View" checkbox
        }
      } else {
        // Check if any checkboxes other than "View" are checked
        const otherChecked = rightsArray.controls.some((control, index) => {
          const isView = index === 0; // Change this if the View checkbox is at a different index
          return control.get('selected')?.value && !isView;
        });
      }
    }

    // If the permission name is 'child_details', match its entity_id with other checkboxes from all entity groups
    /*if (rightGroup.get('name')?.value === 'child_details') {
      const entityIdToMatch = rightGroup.get('entity_id')?.value;

      // Iterate over all entityGroups (getEntitiesControls)
      this.getEntitiesControls().forEach((entityGroup: FormGroup) => {
        

        // Check the rights and children recursively
        this.checkEntityIdInRightsAndChildren(entityGroup, entityIdToMatch, isChecked);
      });
    }*/
  }

  checkEntityIdInRightsAndChildren(entityGroup: FormGroup, entityIdToMatch: any, isChecked: boolean) {
    // Access rights and children as form arrays
    const rightsArray = entityGroup.get('rights');
    const childrenArray = entityGroup.get('children');

    // Check rights array for matching entity_id
    if (rightsArray instanceof FormArray) {
      rightsArray.controls.forEach((right: AbstractControl) => {
        const rightFormGroup = right as FormGroup;
        const rightEntityId = rightFormGroup.get('entity_id')?.value;
        if (rightEntityId === entityIdToMatch) {
          if (isChecked) {
          } else {
          }
          rightFormGroup.get('selected')?.setValue(isChecked);

          // Apply view checkbox logic for parent rights
          this.applyViewCheckboxLogic(rightsArray, rightFormGroup, isChecked);
        }
      });
    }

    // Check children array
    if (childrenArray instanceof FormArray) {
      childrenArray.controls.forEach((child: AbstractControl) => {
        const childFormGroup = child as FormGroup;
        const childEntityId = childFormGroup.get('entity_id')?.value;

        // Check if this child's entity_id matches
        if (childEntityId === entityIdToMatch) {
          if (isChecked) {
          } else {
          }
          childFormGroup.get('selected')?.setValue(isChecked);
        }

        // Check this child's rights array
        const childRightsArray = childFormGroup.get('rights');
        if (childRightsArray instanceof FormArray) {
          childRightsArray.controls.forEach((childRight: AbstractControl) => {
            const childRightFormGroup = childRight as FormGroup;
            const childRightEntityId = childRightFormGroup.get('entity_id')?.value;
            if (childRightEntityId === entityIdToMatch) {
              if (isChecked) {
              } else {
              }
              childRightFormGroup.get('selected')?.setValue(isChecked);

              // Apply view checkbox logic for child rights
              this.applyViewCheckboxLogic(childRightsArray, childRightFormGroup, isChecked);
            }
          });
        }

        // Recurse through grandchildren if they exist
        const grandChildrenArray = childFormGroup.get('children');
        if (grandChildrenArray instanceof FormArray && grandChildrenArray.length > 0) {
          this.checkEntityIdInRightsAndChildren(childFormGroup, entityIdToMatch, isChecked);
        }
      });
    }
  }

  applyViewCheckboxLogic(rightsArray: FormArray, rightGroup: FormGroup, isChecked: boolean) {
    const viewControl = rightsArray.at(0)?.get('selected'); // Assuming 'View' is at index 0
    const rightName = rightGroup.get('name')?.value;

    if (rightName === 'view') {
      if (!isChecked) {
        // If "View" is unchecked, uncheck all other checkboxes in this rights array
        rightsArray.controls.forEach((control) => {
          control.get('selected')?.setValue(false);
        });
      }
    } else {
      if (isChecked) {
        // If checking a checkbox other than "View", check the "View" checkbox
        viewControl?.setValue(true);
      } else {
        // Check if any checkboxes other than "View" are checked
        const otherChecked = rightsArray.controls.some((control, index) => {
          const isView = control.get('name')?.value === 'view';
          return control.get('selected')?.value && !isView;
        });

        // Optional: If no other checkboxes are checked, you might want to uncheck view too
        // Uncomment the following if you want this behavior:
        // if (!otherChecked && viewControl) {
        //   viewControl.setValue(false);
        // }
      }
    }
  }

  getSortedRightsControls(entityGroup: FormGroup) {
    const rightsControls = this.getRightsControls(entityGroup);

    if (rightsControls) {
      return rightsControls.sort((a, b) => {
        const aName = a.get('name')?.value;
        const bName = b.get('name')?.value;

        const aIndex = this.order_permissions.indexOf(aName);
        const bIndex = this.order_permissions.indexOf(bName);

        return aIndex - bIndex; // Sorting in ascending order
      });
    } else {
      return [];
    }
  }

  getChildrenControls(entityGroup: FormGroup): FormGroup[] {
    return (entityGroup.get('children') as FormArray).controls as FormGroup[];
  }

  isDashboardTab(group: FormGroup): boolean {
    return group.get('menu_img')?.value === 'fa-folder-open';
  }

  isDashboardTabAllChecked(tabGroup: FormGroup): boolean {
    const tabChildren = this.getChildrenControls(tabGroup);
    return tabChildren.length > 0 && tabChildren.every((child) => this.isAllChecked(child));
  }

  toggleDashboardTabRights(tabGroup: FormGroup, checked: boolean): void {
    const tabChildren = this.getChildrenControls(tabGroup);
    tabChildren.forEach((child) => this.toggleAllRightsO(child, checked));
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
              user_id: this.mappingForm.get('user')?.value, // or replace this with dynamic user_id if necessary
              permission_id: rightControl.get('permission_id')?.value,
            });
          }

          if (rightControl.get('entity_permission_id')?.value) {
            selectedPermissions.push({
              user_id: this.mappingForm.get('user')?.value, // or replace this with dynamic user_id if necessary
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

  toggleExpand(entityGroup: FormGroup) {
    const isExpanded = entityGroup.get('expanded')?.value;
    entityGroup.get('expanded')?.setValue(!isExpanded);
  }

  // Ensure that each entity group has an 'expanded' property

  getEntitiesControls(): FormGroup[] {
    return (this.mappingForm.get('entities') as FormArray).controls as FormGroup[];
  }

  selectedRolePermissions(entitiesArray: FormArray, selectedPermissions: IRolePermission[]): void {
    entitiesArray.controls.forEach((entityGroup: AbstractControl) => {
      const rightsArray = entityGroup.get('rights') as FormArray;

      // Collect selected rights from the current entity
      rightsArray.controls.forEach((rightControl: AbstractControl) => {
        if (rightControl.get('selected')?.value) {
          if (rightControl.get('permission_id')?.value) {
            selectedPermissions.push({
              role_id: this.mappingForm.get('role')?.value, // or replace this with dynamic role_id if necessary
              permission_id: rightControl.get('permission_id')?.value,
            });
          }
          if (rightControl.get('entity_permission_id')?.value) {
            selectedPermissions.push({
              role_id: this.mappingForm.get('role')?.value, // or replace this with dynamic role_id if necessary
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

  getActionTypes() {
    const param: any = {
      company_id: 1,
      print_query: false,
      primary_table: 'action_types',
      start_index: 0,
      limit_range: 100,
      sort_columns: [['action_types.id', 'asc']],

      select_columns: [['action_types.id'], ['action_types.name', 'name'], ['action_types.description', 'description']],
    };
    this.gridApiService.getListData(param).subscribe(
      (response: ApiResponce) => {
        if (response.status) {
          if (response.data?.records) {
            let finalList: any = [];
            response.data?.records.map(function (elem: any) {
              finalList.push(elem.name);
            });
            this.order_permissions = finalList;
          }

          //this.order_permissions = response.data?.records || [];
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
  getEntityList() {
    const permission_type = `${this.mappingForm.get('permission_type')?.value}wise`;
    const user_id = this.mappingForm.get('user')?.value || 0;
    const role_id = this.mappingForm.get('role')?.value || 0;
    const param: any = { proc_name: 'get_menu_permissions', params: { user_id, menu_id: 1, role_id, permission_type } };
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
      permission.permissions = typeof permission.permissions === 'string' ? JSON.parse(permission.permissions) : permission.permissions;
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
        {
          value: ['super_admin', 'company_admin'],
          operator: 'NOT IN',
          column_name: 'users.role',
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

    let selectedPermissions: IUserPermission[] = [];
    const entitiesArray = this.mappingForm.get('entities') as FormArray;
    this.selectedUserPermissions(entitiesArray, selectedPermissions);
    if (selectedPermissions.length === 0) {
      const key = 'please_select_atleast_one_permission';
      const errorMessage = this.translate.instant(key);
      this.toastr.error(errorMessage, 'Error');
      return;
    }

    const uniqueData = selectedPermissions.filter(
      (item, index, self) => index === self.findIndex((t) => t.user_id === item.user_id && t.permission_id === item.permission_id)
    );

    param.data.table2 = uniqueData;
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
    let selectedPermissions: IRolePermission[] = [];
    const entitiesArray = this.mappingForm.get('entities') as FormArray;
    this.selectedRolePermissions(entitiesArray, selectedPermissions);
    if (selectedPermissions.length === 0) {
      const key = 'please_select_atleast_one_permission';
      const errorMessage = this.translate.instant(key);
      this.toastr.error(errorMessage, 'Error');
      return;
    }

    const uniqueData = selectedPermissions.filter(
      (item, index, self) => index === self.findIndex((t) => t.role_id === item.role_id && t.permission_id === item.permission_id)
    );

    param.data.table2 = uniqueData;
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

  isAllChecked(group: FormGroup): boolean {
    const rightsArray = group.get('rights') as FormArray;
    return rightsArray && rightsArray.length > 0 && rightsArray.controls.every((control) => control.get('selected')?.value);
  }

  toggleAllRights(group: FormGroup, checked: boolean): void {
    const rightsArray = group.get('rights') as FormArray;
    rightsArray.controls.forEach((control: AbstractControl) => {
      control.get('selected')?.setValue(checked);
    });

    // Optionally, ensure "view" is always selected when any other is selected
    if (checked) {
      const viewControl = rightsArray.controls.find((c) => c.get('name')?.value === 'view');
      if (viewControl) {
        viewControl.get('selected')?.setValue(true);
      }
    }
  }

  getCheckboxChecked(event: Event): boolean {
    return (event.target as HTMLInputElement).checked;
  }

  areAllEntitiesChecked(): boolean {
    const entities = this.getEntitiesControls();
    return entities.length > 0 && entities.every((entity) => this.isAllChecked(entity));
  }

  toggleAllEntities(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const entities = this.getEntitiesControls();
    entities.forEach((entity) => this.toggleAllRightsO(entity, checked));
  }

  toggleAllRightsO(group: FormGroup, checked: boolean): void {
    // Toggle rights in this group
    const rightsArray = group.get('rights') as FormArray;
    if (rightsArray) {
      rightsArray.controls.forEach((control: AbstractControl) => {
        control.get('selected')?.setValue(checked);
      });

      if (checked) {
        const viewControl = rightsArray.controls.find((c) => c.get('name')?.value === 'view');
        if (viewControl) {
          viewControl.get('selected')?.setValue(true);
        }
      }
    }

    // Recursively toggle all children (and grandchildren, etc.)
    const childrenArray = group.get('children') as FormArray;
    if (childrenArray) {
      childrenArray.controls.forEach((child: AbstractControl) => {
        this.toggleAllRightsO(child as FormGroup, checked);
      });
    }
  }
}
