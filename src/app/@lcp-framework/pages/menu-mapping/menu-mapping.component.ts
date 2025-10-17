import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { animate, style, transition, trigger } from '@angular/animations';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { CommonSharedModule } from '../../shared/common/common.module';

import { LoaderComponent } from '../../components/loader/loader.component';
import { MenuService } from './menu_service';
import { MenuItemComponent } from './menu-item/menu-item.component';
import { MenuMapService } from '../../service/common/menu-map.service';
import { ToastrService } from 'ngx-toastr';
import { LocalStorageService } from '../../service/common/local-storage.service';
import { commonConfig } from '../../config/common.config';
import { MenuLoadService } from '../../service/common/menu-load.service';
import { RouteUpdateService } from '../../service/common/route-update.service';
import { TranslateService } from '@ngx-translate/core';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-menu-mapping',
  standalone: true,
  imports: [CommonSharedModule, ReactiveFormsModule, LoaderComponent, MenuItemComponent],
  templateUrl: './menu-mapping.component.html',
  styleUrl: './menu-mapping.component.scss',
  animations: [
    trigger('toggleAnimation', [
      transition(':enter', [style({ opacity: 0, transform: 'scale(0.95)' }), animate('100ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))]),
      transition(':leave', [animate('75ms', style({ opacity: 0, transform: 'scale(0.95)' }))]),
    ]),
    trigger('slideDownUp', [
      transition(':enter', [style({ height: 0, opacity: 0 }), animate('300ms', style({ height: '*', opacity: 1 }))]),
      transition(':leave', [style({ height: '*', opacity: 1 }), animate('300ms', style({ height: 0, opacity: 0 }))]),
    ]),
  ],
})
export class MenuMappingComponent implements OnInit {
  userId: any;
  companyId: any;
  menu: any[] = [];
  flatMenu: any[] = [];

  treeview1: any = [];
  menuForm: FormGroup;
  selectedMenu: any;

  showForm = false;
  showTypeForm = false;
  editMode = false;
  currentItem: any;
  isSubmitted = false;
  loading = false;
  entityElement = true;
  getActionItem = false;

  entity_type: any;
  currentItemId: any;
  linkTypes: any[] = [];
  menuTypes: any[] = [];
  menuDeviceTypes: any[] = [];
  menuStatusTypes: any[] = [];

  entityOptions: any = [];
  entityModules: any[] = [];
  parentActionList: any[] = [];
  title_key: string = 'menu_mapping';

  selectedOptionName: string = '';
  menu_id: number | null;

  iconClasses: { icon: string }[] = [];
  selectedIcon: string = '';
  manualIcons: Set<string> = new Set(); // To track manually entered values
  commonConfig = commonConfig;

  constructor(
    private menuService: MenuService,
    private menuMapService: MenuMapService,
    public router: Router,
    private formBuilder: FormBuilder,
    private toastr: ToastrService,
    public localStorageService: LocalStorageService,
    private route: ActivatedRoute,
    private http: HttpClient,
    private menuLoadService: MenuLoadService,
    private translate: TranslateService,
    private titleService: Title
  ) {
    this.menu_id = this.localStorageService.getData('menu_id');

    this.menuForm = this.formBuilder.group({
      menu_type: [this.menu_id || ''],
      name: ['', Validators.required],
      menuIcon: [''],
      link_type: [1, Validators.required],
      parent: [''],
      parentActionItem: [''],
      url: [''],
      order_no: ['1.00', [this.decimalValidator]],
      menu_status: [1, Validators.required],
      entityType: [''],
      module: [''],
      MenuTypeName: [''],
      menuTypeSlug: '',
      menuDevice: 1,
    });
  }

  ngOnInit() {
    this.title_key = this.route.snapshot.data['pageInfo'].fullEntity;

    const translateTitle = this.translate.instant(this.title_key);
    this.titleService.setTitle(translateTitle);

    const userData = this.localStorageService.getData('user_data');
    if (userData) {
      const parsedData = JSON.parse(userData);
      this.userId = parsedData.main?.id;
      this.companyId = parsedData.main?.company_id;
    }

    this.loadIconClasses();

    this.linkTypes = commonConfig.menu_link_type;
    this.menuDeviceTypes = commonConfig.menu_device_type;
    this.menuStatusTypes = commonConfig.status_type;

    this.menuForm.get('order_no')?.valueChanges.subscribe((value) => {
      this.updateOrderNo(value);
    });

    if (this.menu_id) {
      this.getMenuList(this.menu_id);
    }

    this.getMenuType();

    this.menuService.getSelectedMenuItem().subscribe((item) => {
      if (item) {
        this.selectMenu(item);
      }
    });

    this.entityOptions = commonConfig.entity_types;
  }

  loadIconClasses(): void {
    this.http.get<{ icon: string }[]>('assets/font-awesome-icons.json').subscribe(
      (data) => {
        this.iconClasses = data;
        this.setInitialSelectedIcon();
        if (this.menu_id) {
          this.getMenuList(this.menu_id);
        }
      },
      (error) => {
        console.error('Error loading icon classes:', error);
      }
    );
  }

  setInitialSelectedIcon(): void {
    // Ensure initial selected value is set if `item.menu_img` is available
    const initialIcon = this.menuForm.get('menuIcon')?.value;
    if (initialIcon) {
      this.selectedIcon = initialIcon;
    }
  }

  transformLinkTypes(linkTypesObj: any): any[] {
    return Object.keys(linkTypesObj).map((key) => ({
      id: linkTypesObj[key],
      name: key,
    }));
  }

  decimalValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (value !== null && value !== undefined && !/^\d+(\.\d{1,2})?$/.test(value)) {
      return { decimalInvalid: true };
    }
    return null;
  }

  updateOrderNo(value: string): void {
    const numericValue = parseFloat(value);
    if (!isNaN(numericValue)) {
      const formattedValue = numericValue.toFixed(2);
      if (formattedValue !== value) {
        this.menuForm.get('order_no')?.setValue(formattedValue);
      }
    }
  }

  getMenuList(menuID: number) {
    this.menuService.getMenu(menuID).subscribe((data) => {
      this.menu = data;
      this.flatMenu = this.flattenMenu(data);
      const menuIcons = this.flatMenu.map((item) => item.menu_img).filter((icon) => icon !== null);
      this.iconClasses = this.mergeAndDeduplicateIcons(this.iconClasses, menuIcons);
    });
  }

  getMenuType() {
    const menus = {
      company_id: this.companyId,
      print_query: true,
      primary_table: 'menu',
      start_index: 0,
      limit_range: 100000,
      sort_columns: [['menu.id', 'asc']],
      search_all: [
        {
          column_name: 'menu.status_id',
          value: '1',
          operator: '=',
        },
      ],
      select_columns: [['menu.*']],
    };

    this.menuMapService.getCommonList(menus).subscribe({
      next: (response: any) => {
        if (response.code === 200 && response.status) {
          this.menuTypes = response.data.records;

          const selectedOption = this.menuTypes.find((option) => option.id == this.menu_id);

          if (selectedOption) {
            this.selectedOptionName = selectedOption.name;
          } else {
            this.selectedOptionName = '';
          }
        }
      },
      error: (error) => {
        console.error('Error fetching entity types:', error);
      },
    });
  }

  onMenuTypeChange(event: Event) {
    this.showForm = false;
    this.showTypeForm = false;
    const target = event.target as HTMLSelectElement;
    const menuID = Number(target.value);
    const selectedOption = this.menuTypes.find((option) => option.id === menuID);
    if (selectedOption) {
      this.selectedOptionName = selectedOption.name;
    } else {
      this.selectedOptionName = '';
    }
    this.menu_id = menuID;
    this.localStorageService.storeData('menu_id', menuID);
    if (menuID) {
      this.getMenuList(menuID);
    }
  }

  mergeAndDeduplicateIcons(iconClasses: { icon: string }[], menuIcons: string[]): { icon: string }[] {
    const allIcons = [...iconClasses.map((item) => item.icon), ...menuIcons];
    const uniqueIcons = Array.from(new Set(allIcons));
    return uniqueIcons.map((icon) => ({ icon }));
  }

  flattenMenu(menu: any[], parentName = null, level = 0): any[] {
    let result: any[] = [];
    for (const item of menu) {
      const indentation = '\u2003'.repeat(level) + '-'.repeat(level + 1);
      const flatItem = {
        ...item,
        parentName,
        indentedName: `${indentation} ${item.name}`,
      };
      result.push(flatItem);
      if (item.children && item.children.length > 0) {
        result = result.concat(this.flattenMenu(item.children, item.name, level + 1));
      }
    }
    return result;
  }

  toggleTreeview1(name: string) {
    if (this.treeview1.includes(name)) {
      this.treeview1 = this.treeview1.filter((d: string) => d !== name);
    } else {
      this.treeview1.push(name);
    }
  }

  selectMenu(item: any) {
    this.selectedMenu = item;
    this.entityOptions = commonConfig.entity_types;
    this.currentItemId = item.id;

    if (item.entity_id == null) {
      this.entity_type = null;
      this.updateFormFields(item);
    } else {
      const getEntityType = {
        company_id: this.companyId,
        print_query: false,
        primary_table: 'master_entities',
        start_index: 0,
        limit_range: 1,
        sort_columns: [['master_entities.id', 'asc']],
        search_all: [
          {
            column_name: 'master_entities.id',
            value: item.entity_id,
            operator: '=',
          },
        ],
        select_columns: [['master_entities.entity_type']],
      };

      this.menuMapService.getCommonList(getEntityType).subscribe({
        next: (response: any) => {
          if (response.code === 200 && response.status) {
            this.entity_type = response.data.records[0]?.entity_type || null;
            this.updateFormFields(item);
            this.fetchAndSelectModules(this.entity_type, item.entity_id);
          }
        },
        error: (error) => {
          console.error('Error fetching entity types:', error);
          this.entity_type = null;
          // this.updateFormFields(item);
        },
      });
    }
  }

  updateFormFields(item: any) {
    if (item.permission_id && item.parent_id != null) {
      this.getActionItem = true;
      this.getActionItems(item.parent_id);
    }
    if (item.link_type == 4) {
      this.entityElement = false;
      this.getActionItem = false;
    } else {
      this.entityElement = true;
      this.getActionItem = true;
    }
    this.showForm = true;
    this.editMode = true;
    this.menuForm.patchValue({
      id: item.id,
      menu_id: item.menu_id,
      link_type: item.link_type,
      parentActionItem: item.permission_id || null,
      name: item.name,
      menuIcon: item.menu_img || null,
      parent: item.parent_id || '',
      url: item.target || '',
      order_no: item.order_no || 0.0,
      entityType: this.entity_type || '',
      module: '',
      menu_status: item.status_id || 1,
    });
    this.setInitialSelectedIcon(); // Set selected icon after patching value
  }

  addMenuItem() {
    this.selectedMenu = null;
    this.showForm = true;
    this.editMode = false;
    this.getActionItem = false;
    this.parentActionList = [];

    this.menuForm.reset({
      menu_type: [this.menu_id ?? ''],
      menuIcon: '',
      link_type: 1,
      parent: '',
      parentActionItem: '',
      entityType: '',
      url: '',
      order_no: '1.00',
      module: '',
      menu_status: 1,
    });
    this.setInitialSelectedIcon(); // Set selected icon after patching value
  }

  addMenu() {
    this.showForm = false;
    this.showTypeForm = true;
    this.menuForm.reset({
      menu_type: [this.menu_id || ''],
      MenuTypeName: [''],
      menuTypeSlug: '',
      menuDevice: 1,
    });
  }

  handleManualInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;

    // Safely check for null
    if (target && target.value) {
      const value = target.value.trim();
      // Check if the value is not already in iconClasses
      if (value && !this.iconClasses.some((icon) => icon.icon === value)) {
        this.manualIcons.add(value);
        this.selectedIcon = value;
        this.menuForm.get('menuIcon')?.setValue(value);
      }
    }
  }

  loadEntityTypes(entityTypeObj: any): any[] {
    return Object.keys(entityTypeObj).map((items) => ({
      slug: entityTypeObj[items],
      name: items,
    }));
  }

  onSelectionChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const selectedValue = target.value;
    this.menuForm.patchValue({ module: '' });

    if (selectedValue) {
      this.fetchAndSelectModules(selectedValue, null);
    }
  }

  fetchAndSelectModules(entityTypeSlug: string | null, selectedEntityID: number | null) {
    if (!entityTypeSlug) {
      this.entityModules = [];
      this.menuForm.patchValue({ module: '' });
      return;
    }

    const getModuleList = {
      company_id: this.companyId,
      print_query: false,
      primary_table: 'master_entities',
      start_index: 0,
      limit_range: 100000,
      sort_columns: [['master_entities.id', 'asc']],
      search_all: [
        {
          column_name: 'master_entities.entity_type',
          value: entityTypeSlug,
          operator: '=',
        },
        {
          column_name: 'master_entities.status_id',
          value: '1',
          operator: '=',
        },
      ],
      select_columns: [['master_entities.id'], ['master_entities.name'], ['master_entities.entity_type']],
    };

    this.menuMapService.getCommonList(getModuleList).subscribe({
      next: (response: any) => {
        if (response.code === 200 && response.status) {
          this.entityModules = response.data.records;
          if (selectedEntityID) {
            this.menuForm.patchValue({ module: selectedEntityID });
            this.getViewPermission(selectedEntityID);
          }
        }
      },
      error: (error) => {
        console.error('Error fetching modules:', error);
        this.entityModules = [];
        this.menuForm.patchValue({ module: '' });
      },
    });
  }

  onParentMenuChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const selectedParentMenuID = target.value;
    if (selectedParentMenuID) {
      this.menuForm.patchValue({ parentActionItem: '' });
      this.getActionItems(selectedParentMenuID);
    }
  }

  onModuleChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const selectedModuleID = target.value;
    this.getViewPermission(parseInt(selectedModuleID));
  }

  getViewPermission(entityModuleId: number) {
    const getViewAction = {
      primary_table: 'permissions',
      sort_columns: [['permissions.order_no', 'asc']],
      limit_range: 1,
      select_columns: [['permissions.id'], ['permissions.name'], ['permissions.slug']],
      company_id: this.companyId,
      search_all: [
        { column_name: 'permissions.entity_id', operator: '=', value: entityModuleId },
        { column_name: 'permissions.status_id', operator: '=', value: '1' },
      ],
    };

    this.menuMapService.getCommonList(getViewAction).subscribe({
      next: (response: any) => {
        if (response.code === 200 && response.status) {
          const viewActionId = response.data.records[0].id;
          const formData = this.menuForm.value;
          if ((formData.link_type == 1 || formData.link_type == 5) && viewActionId) {
            this.menuForm.patchValue({ parentActionItem: viewActionId });
            this.getActionItem = false;
          }
        }
      },
      error: (error) => {
        console.error('Error fetching Actions:', error);
      },
    });
  }

  onMenuLinkTypeChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const menuLinkTypeID = Number(target.value);
    this.menuForm.patchValue({ parentActionItem: '' });
    if (menuLinkTypeID == 2 || menuLinkTypeID == 3) {
      this.getActionItem = true;
    } else {
      this.getActionItem = false;
    }

    if (menuLinkTypeID == 4) {
      this.entityElement = false;
    } else {
      this.entityElement = true;
    }
  }

  getActionItems(menuId: any) {
    const getParentActions = {
      primary_table: 'menu_items',
      sort_columns: [['menu_items.order_no', 'asc']],
      limit_range: 100,
      select_columns: [['permissions.id'], ['permissions.name'], ['permissions.slug']],
      company_id: this.companyId,
      includes: [
        {
          table_name: 'permissions',
          join_type: 'LEFT',
          join_condition: 'permissions.entity_id = menu_items.entity_id',
        },
      ],
      search_all: [
        { column_name: 'menu_items.id', operator: '=', value: menuId },
        { column_name: 'menu_items.status_id', operator: '=', value: '1' },
        { column_name: 'permissions.status_id', operator: '=', value: '1' },
      ],
    };

    this.menuMapService.getCommonList(getParentActions).subscribe({
      next: (response: any) => {
        if (response.code === 200 && response.status) {
          this.parentActionList = response.data.records.filter((action: any) => action.name !== 'view');
        }
      },
      error: (error) => {
        console.error('Error fetching Actions:', error);
      },
    });
  }

  closeForm() {
    this.showForm = false;
    this.editMode = false;
  }

  closeMenuTypForm() {
    this.showTypeForm = false;
  }

  onSubmit() {
    this.isSubmitted = true;

    this.menuForm.get('MenuTypeName')?.clearValidators();
    this.menuForm.get('MenuTypeName')?.updateValueAndValidity();

    if (this.menuForm.invalid) {
      return;
    }

    this.loading = true;

    const formData = this.menuForm.value;
    const currentDate = new Date().toISOString().split('T')[0]; // Format as YYYY-MM-DD

    if (formData.url) {
      // Perform URL existence check
      const gettargetUrl = {
        company_id: this.companyId,
        print_query: false,
        primary_table: 'menu_items',
        start_index: 0,
        limit_range: 1,
        sort_columns: [['menu_items.id', 'asc']],
        search_all: [
          {
            column_name: 'menu_items.target',
            value: formData.url,
            operator: '=',
          },
        ],
        select_columns: [['menu_items.target'], ['menu_items.id']],
      };

      this.menuMapService.getCommonList(gettargetUrl).subscribe({
        next: (response: any) => {
          if (response.code === 200 && response.status) {
            const records = response.data.records;
            if (records.length > 0) {
              const existingItemId = records[0].id;
              if (this.editMode && existingItemId == this.currentItemId) {
                this.saveMenuData(formData, currentDate);
              } else {
                this.toastr.warning('This URL is already in use. Please try another URL.');
                this.loading = false;
              }
            } else {
              this.saveMenuData(formData, currentDate);
            }
          } else {
            this.loading = false;
          }
        },
        error: (error) => {
          console.error('Error fetching URL details:', error);
          this.loading = false;
        },
      });
    } else {
      // No URL to check, proceed to save the data
      this.saveMenuData(formData, currentDate);
    }
  }

  private saveMenuData(formData: any, currentDate: string) {
    const menuData = {
      action: this.editMode ? ['update'] : ['insert'],
      table: ['menu_items'],
      table_mapping: ['table1'],
      conditions: this.editMode ? { table1: [{ id: this.currentItemId }] } : {},
      data: {
        table1: [
          {
            name: formData.name,
            menu_id: this.menu_id,
            menu_img: formData.menuIcon || null,
            link_type: formData.link_type,
            permission_id: formData.parentActionItem || null,
            target: formData.url || '',
            order_no: formData.order_no || 1.0,
            parent_id: formData.parent || null,
            entity_id: formData.module || null,
            status_id: formData.menu_status,
            ...(this.editMode
              ? {}
              : {
                  created_by: this.userId,
                  updated_at: currentDate,
                }),
            ...(this.editMode ? { updated_at: currentDate } : {}),
          },
        ],
      },
    };

    this.menuMapService.postCommnList(menuData).subscribe({
      next: (response: any) => {
        if (response.code === 200 && response.status) {
          const key = this.editMode ? 'record_updated_successfully' : 'record_inserted_successfully';
          const successMessage = this.translate.instant(key);
          this.toastr.success(successMessage);
          this.menuLoadService.serviceMenus(this.companyId);
          if (this.menu_id !== null) {
            this.menuService.loadMenus(this.menu_id);
          } else {
            console.warn('Menu ID is null, cannot load menus');
          }
        }
      },
      error: (error) => {
        console.error('Error saving menu data:', error);
      },
      complete: () => {
        this.loading = false;
       

        this.showForm = false;
        this.menuForm.reset();
      },
    });
  }

  onMenuTypeSubmit() {
    Object.keys(this.menuForm.controls).forEach((key) => {
      if (key !== 'MenuTypeName') {
        this.menuForm.get(key)?.clearValidators();
        this.menuForm.get(key)?.updateValueAndValidity();
      }
    });

    this.menuForm.get('MenuTypeName')?.setValidators(Validators.required);
    this.menuForm.get('MenuTypeName')?.updateValueAndValidity();

    if (this.menuForm.invalid) {
      return;
    }

    const formData = this.menuForm.value;
    const currentDate = new Date().toISOString().split('T')[0]; // Format as YYYY-MM-DD

    const menuData = {
      action: ['insert'],
      table: ['menu'],
      table_mapping: ['table1'],
      conditions: {},
      data: {
        table1: [
          {
            name: formData.MenuTypeName,
            slug: formData.menuTypeSlug,
            menu_type: formData.menuDevice,
            created_by: this.userId,
            created_at: currentDate,
            updated_at: currentDate,
          },
        ],
      },
    };
    this.menuMapService.postCommnList(menuData).subscribe({
      next: (response: any) => {
        if (response.code === 200 && response.status) {
          const key = 'record_inserted_successfully';
          const successMessage = this.translate.instant(key);
          this.toastr.success(successMessage);
          this.menuLoadService.serviceMenus(this.companyId);
          if (this.menu_id !== null) {
            this.menuService.loadMenus(this.menu_id);
          } else {
            console.warn('Menu ID is null, cannot load menus');
          }
        }
      },
      error: (error) => {
        console.error('Error saving menu data:', error);
      },
      complete: () => {
        this.loading = false;
        
        this.showTypeForm = false;
        this.menuForm.reset();
      },
    });
  }
}
