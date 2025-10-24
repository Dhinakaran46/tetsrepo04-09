import { Injectable } from '@angular/core';
import { LocalStorageService } from './local-storage.service';
import { MenuMapService } from './menu-map.service';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

interface MenuItem {
  id: number;
  name: string;
  uuid: string;
  target: string | null;
  order_no: number;
  parent_id: number | null;
  permission_slug: string | null;
  children?: MenuItem[];
}

@Injectable({
  providedIn: 'root',
})
export class MenuLoadService {
  public menuSubject = new BehaviorSubject<MenuItem[] | null>(null);
  private unorgMenuSubject = new BehaviorSubject<MenuItem[] | null>(null);
  user_info: any;
  menu_id: any;

  constructor(private menuMapService: MenuMapService, private localStorageService: LocalStorageService) {}

  getMenuList(): Observable<MenuItem[] | null> {
    const storedMenuList = this.localStorageService.getData('menuList');
    if (storedMenuList) {
      this.menuSubject.next(JSON.parse(storedMenuList));
    }
    return this.menuSubject.asObservable();
  }

  getUnorgMenuList(): Observable<MenuItem[] | null> {
    const storedUnorgMenuList = this.localStorageService.getData('unorgmenuList');
    if (storedUnorgMenuList) {
      this.unorgMenuSubject.next(JSON.parse(storedUnorgMenuList));
    }
    return this.unorgMenuSubject.asObservable();
  }

  organizeMenu(menuList: MenuItem[]): MenuItem[] {
    const itemMap = new Map<number, MenuItem>();

    menuList.forEach((item) => {
      itemMap.set(item.id, { ...item, children: [] });
    });

    menuList.forEach((item) => {
      if (item.parent_id !== null) {
        const parent = itemMap.get(item.parent_id);
        if (parent) {
          parent.children!.push(itemMap.get(item.id)!);
        }
      }
    });

    return menuList
      .filter((item) => item.parent_id === null)
      .map((item) => itemMap.get(item.id)!)
      .sort((a, b) => a.order_no - b.order_no);
  }

  fetchConfigData(companyId: number, userID: any): any {
    
    // 1. Try to fetch user config from app_user_configurations
    const userConfigPayload = {
      company_id: companyId,
      primary_table: 'app_user_configurations',
      sort_columns: [['app_user_configurations.id', 'asc']],
      limit_range: 1000,
      select_columns: [
        ['app_user_configurations.id'],
        ['app_user_configurations.config_key'],
        ['app_user_configurations.category_id'],
        ['app_user_configurations.config_value_enc'],
        ['app_user_configurations.config_value'],
        ['app_user_configurations.config_value_type'],
        ['app_user_configurations.config_field_type'],
      ],
      includes: [],
      search_all: [{ column_name: 'app_user_configurations.user_id', value: userID, operator: '=' }],
    };

    // Helper to process config and store user_data
    const processConfig = (finalObject: any) => {
      
      
      const user_data = this.localStorageService.getData('user_data') ? JSON.parse(this.localStorageService.getData('user_data')) : null;
      
      if (user_data) {
        if (finalObject.encrypt_local_storage === 'true') {
          this.localStorageService.storeDataEncrypted(
            'user_data',
            JSON.stringify({
              ...JSON.parse(this.localStorageService.getData('user_data') || '{}'),
              user_id: userID,
            })
          );
        } else {
          this.localStorageService.storeData(
            'user_data',
            JSON.stringify({
              ...JSON.parse(this.localStorageService.getData('user_data') || '{}'),
              user_id: userID,
            })
          );
          this.localStorageService.removeData('enc_user');
        }
      }
      return true;
    };

    // 2. Try user config first
    return this.menuMapService.getCommnListConfiguration(userConfigPayload).pipe(
      map((userResponse: any) => {
        if (userResponse.code === 200 && userResponse.status && userResponse.data.records.length > 0) {
          const userConfig = userResponse.data.records.reduce((acc: any, record: any) => {
            acc[record.config_key] = record.config_value;
            return acc;
          }, {});
          
          // If user config has encrypt_local_storage, use it
          if (userConfig.encrypt_local_storage !== undefined) {
            return processConfig(userConfig);
          }
        }
        // 3. If no user config or no encrypt_local_storage, fetch default config
        const defaultConfigPayload = {
          company_id: companyId,
          primary_table: 'app_configurations',
          sort_columns: [['app_configurations.id', 'asc']],
          limit_range: 1000,
          select_columns: [
            ['app_configurations.id'],
            ['app_configurations.config_key'],
            ['app_configurations.category_id'],
            ['app_configurations.config_value_enc'],
            ['app_configurations.config_value'],
            ['app_configurations.config_value_type'],
            ['app_configurations.config_field_type'],
          ],
          includes: [],
          search_all: [],
        };
        // Return an observable for chaining
        return this.menuMapService.getCommnListConfiguration(defaultConfigPayload).pipe(
          map((response: any) => {
            
            if (response.code === 200 && response.status) {
              const finalObject = response.data.records.reduce((acc: any, record: any) => {
                acc[record.config_key] = record.config_value;
                return acc;
              }, {});
              return processConfig(finalObject);
            } else {
              console.warn('Data fetch failed:', response);
              return [];
            }
          }),
          catchError((error) => {
            console.error('Error fetching data:', error);
            return of([]);
          })
        );
      }),
      // If the result is an observable (from fallback), flatten it
      // This ensures the return type is always an observable
      // @ts-ignore
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      map((result: any) => (result && typeof result.subscribe === 'function' ? result : result)),
      catchError((error) => {
        console.error('Error fetching user config:', error);
        return of([]);
      })
    );
  }

  fetchMenuData(companyId: number): Observable<MenuItem[]> {
    //const conf: any = localStorage.getItem('config');
    const conf: any = this.localStorageService.getData('config');
    const enc_config: any = JSON.parse(conf);
    const userData = this.localStorageService.getData('user_data');
    this.user_info = userData ? JSON.parse(userData) : null;
    if (this.user_info && this.user_info.main && this.user_info.main.role) {
      if (this.user_info.main.role !== 'super_admin') {
        this.menu_id = [1];
      } else {
        this.menu_id = [1, 2, 5];
      }
    } else {
      console.error('User info, main, or role is missing.');
      this.menu_id = [1];
    }

    const payload = {
      print_query: true,
      company_id: companyId,
      primary_table: 'menu_items',
      sort_columns: [['menu_items.order_no', 'asc']],
      limit_range: 1000,
      select_columns: [
        ['menu_items.id'],
        ['menu_items.menu_id'],
        ['menu_items.name'],
        ['menu_items.menu_img'],
        ['menu_items.target'],
        ['menu_items.parent_id'],
        ['menu_items.permission_id'],
        ['menu_items.link_type'],
        ['menu_items.order_no'],
        ['master_entities.primary_table'],
        ['master_entities.entity_type', 'component_class_name'],
        ['master_entities.entity_name'],
        ['master_entities.draft_mode'],
        ['master_entities.static_page_content'],
        ['permissions.name', 'action_slug'],
      ],
      includes: [
        {
          table_name: 'master_entities',
          join_type: 'LEFT',
          join_condition: 'master_entities.id = menu_items.entity_id',
        },
        {
          table_name: 'permissions',
          join_type: 'LEFT',
          join_condition: 'permissions.id = menu_items.permission_id',
        },
      ],
      search_all: [
        { column_name: 'menu_items.status_id', operator: '=', value: '1' },
        { column_name: 'menu_items.menu_id', operator: 'IN', value: this.menu_id },
      ],
    };
    
    return this.menuMapService.getCommonList(payload).pipe(
      map((response: any) => {
        if (response.code === 200 && response.status) {
          const organizedMenu = this.organizeMenu(response.data.records);

          // Store menu data
          const user_data = this.localStorageService.getData('user_data') ? JSON.parse(this.localStorageService.getData('user_data')) : null;
          
          if (user_data) {
            if (enc_config != null && enc_config.encrypt_local_storage == 'true') {
              this.localStorageService.storeDataEncrypted(
                'user_data',
                JSON.stringify({
                  ...JSON.parse(this.localStorageService.getData('user_data') || '{}'),
                  menuList: organizedMenu,
                  unorgmenuList: response.data.records,
                })
              );
            } else {
              this.localStorageService.storeData(
                'user_data',
                JSON.stringify({
                  ...JSON.parse(this.localStorageService.getData('user_data') || '{}'),
                  menuList: organizedMenu,
                  unorgmenuList: response.data.records,
                })
              );
              //localStorage.removeItem('enc_user');
              this.localStorageService.removeData('enc_user');
            }
          }

          return organizedMenu;
        } else {
          console.warn('Menu data fetch failed:', response);
          return [];
        }
      }),
      catchError((error) => {
        console.error('Error fetching menu data:', error);
        return of([]);
      })
    );
  }

  serviceMenus(companyId: number) {
    this.fetchMenuData(companyId);
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  }
}
