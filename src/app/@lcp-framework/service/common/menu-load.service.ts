import { Injectable } from '@angular/core';
import { LocalStorageService } from './local-storage.service';
import { MenuMapService } from './menu-map.service';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

interface MenuItem {
  id: number;
  name: string;
  uuid: string;
  menu_slug?: string | null;
  target: string | null;
  order_no: number;
  parent_id: number | null;
  permission_slug: string | null;
  children?: MenuItem[];
  action_slug?: any;
  entity_name?: any;
}

@Injectable({
  providedIn: 'root',
})
export class MenuLoadService {
  public menuSubject = new BehaviorSubject<MenuItem[] | null>(null);
  private unorgMenuSubject = new BehaviorSubject<MenuItem[] | null>(null);
  user_info: any;
  menu_slug: string[] = [];

  constructor(private menuMapService: MenuMapService, private localStorageService: LocalStorageService) {}

  private parseJsonSafe(raw: any, fallback: any = null): any {
    if (raw == null) return fallback;
    if (typeof raw === 'object') return raw;
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  private resolveMenuSlugsFromStoredMenus(userData: any): string[] {
    const unorgList = Array.isArray(userData?.unorgmenuList) ? userData.unorgmenuList : [];
    const menuSlugs = unorgList.map((item: any) => String(item?.menu_slug || item?.slug || '').trim()).filter(Boolean);

    if (menuSlugs.length > 0) {
      return Array.from(new Set<string>(menuSlugs)).sort();
    }

    const legacyMenuSlugMap: Record<number, string> = {
      1: 'primary_menu',
      2: 'admin_menu',
      3: 'mobile_menu',
      4: 'mobile_menu_web',
      5: 'documentation_menu',
    };
    const legacyMenuIds = unorgList.map((item: any) => Number(item?.menu_id)).filter((id: number) => Number.isFinite(id) && id > 0);
    return Array.from(new Set<string>(legacyMenuIds.map((id: number) => legacyMenuSlugMap[id]).filter(Boolean))).sort();
  }

  private resolveMenuSlugsFromUserData(userData: any): string[] {
    const main = userData?.main || {};
    const roleCandidates = [main?.role, main?.role_slug, main?.role_name, main?.user_role]
      .map((item) =>
        String(item || '')
          .trim()
          .toLowerCase()
      )
      .filter(Boolean);

    if (roleCandidates.includes('super_admin')) {
      return ['primary_menu', 'admin_menu', 'documentation_menu'];
    }

    const fromStoredMenus = this.resolveMenuSlugsFromStoredMenus(userData);
    if (fromStoredMenus.length > 0) {
      return fromStoredMenus;
    }

    return ['primary_menu'];
  }

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

    // Step 1: Initialize map with empty children arrays
    menuList.forEach((item) => {
      itemMap.set(item.id, { ...item, children: [] });
    });

    // Step 2: Normal parent-child relationships
    menuList.forEach((item) => {
      if (item.parent_id !== null) {
        const parent = itemMap.get(item.parent_id);
        if (parent) {
          parent.children!.push(itemMap.get(item.id)!);
        }
      }
    });

    // Step 3: For child_details with no children, attach "virtual" children
    menuList.forEach((item) => {
      const mappedItem = itemMap.get(item.id)!;

      if (
        mappedItem.action_slug === 'child_details' && // make sure this matches DB value
        mappedItem.children &&
        mappedItem.children.length === 0
      ) {
        // Find other items with same entity_name
        const matchedItems = menuList.filter((x) => x.entity_name === mappedItem.entity_name && x.id !== mappedItem.id);

        // Clone them WITHOUT their existing children to avoid cycles
        const clonedChildren: MenuItem[] = matchedItems.map((x) => {
          const original = itemMap.get(x.id)!;
          return {
            ...original,
            // IMPORTANT: break links to original children to avoid cycles
            children: [],
          };
        });

        mappedItem.children = clonedChildren;
      }
    });

    // Step 4: Return top-level menus sorted
    return menuList
      .filter((item) => item.parent_id === null)
      .map((item) => itemMap.get(item.id)!)
      .sort((a, b) => a.order_no - b.order_no);
  }

  /*organizeMenu(menuList: MenuItem[]): MenuItem[] {
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
  }*/

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
      switchMap((userResponse: any) => {
        if (userResponse.code === 200 && userResponse.status && userResponse.data.records.length > 0) {
          const userConfig = userResponse.data.records.reduce((acc: any, record: any) => {
            acc[record.config_key] = record.config_value;
            return acc;
          }, {});

          // If user config has encrypt_local_storage, use it
          if (userConfig.encrypt_local_storage !== undefined) {
            return of(processConfig(userConfig));
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

            ['app_configurations.config_value'],
            ['app_configurations.config_value_type'],
            ['app_configurations.config_field_type'],
          ],
          includes: [],
          search_all: [],
        };
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
      catchError((error) => {
        console.error('Error fetching user config:', error);
        return of([]);
      })
    );
  }

  fetchMenuData(companyId: number, menuSlug?: string | string[]): Observable<MenuItem[]> {
    //const conf: any = localStorage.getItem('config');
    const conf: any = this.localStorageService.getData('config');
    const enc_config: any = this.parseJsonSafe(conf, null);
    const userData = this.localStorageService.getData('user_data');
    this.user_info = this.parseJsonSafe(userData, null);
    this.menu_slug = Array.isArray(menuSlug)
      ? menuSlug.map((slug) => String(slug).trim()).filter(Boolean)
      : menuSlug
      ? [String(menuSlug).trim()].filter(Boolean)
      : this.resolveMenuSlugsFromUserData(this.user_info);

    const payload = {
      print_query: true,
      company_id: companyId,
      primary_table: 'menu_items',
      sort_columns: [['menu_items.order_no', 'asc']],
      limit_range: 1000,
      select_columns: [
        ['menu_items.id'],
        ['menu_items.menu_id'],
        ['menu.slug', 'menu_slug'],
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
        ['master_entities.entity_configurations'],
        ['master_entities.export_template_file_name'],
        ['master_entities.static_page_content'],
        ['permissions.name', 'action_slug'],
        ['master_entities.entity_configurations', 'entity_configurations'],
      ],
      includes: [
        {
          table_name: 'menu',
          join_type: 'INNER',
          join_condition: 'menu.id = menu_items.menu_id',
        },
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
        { column_name: 'menu.slug', operator: 'IN', value: this.menu_slug },
        { column_name: 'menu_items.company_id', operator: '=', value: companyId },
      ],
    };

    return this.menuMapService.getCommonList(payload).pipe(
      map((response: any) => {
        if (response.code === 200 && response.status) {
          const organizedMenu = this.organizeMenu(response.data.records);
          // Store menu data
          const user_data = this.parseJsonSafe(this.localStorageService.getData('user_data'), null);

          if (user_data) {
            if (enc_config != null && enc_config.encrypt_local_storage == 'true') {
              this.localStorageService.storeDataEncrypted(
                'user_data',
                JSON.stringify({
                  ...this.parseJsonSafe(this.localStorageService.getData('user_data'), {}),
                  menuList: organizedMenu,
                  unorgmenuList: response.data.records,
                })
              );
            } else {
              this.localStorageService.storeData(
                'user_data',
                JSON.stringify({
                  ...this.parseJsonSafe(this.localStorageService.getData('user_data'), {}),
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
