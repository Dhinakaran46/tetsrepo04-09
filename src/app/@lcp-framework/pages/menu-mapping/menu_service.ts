import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { MenuMapService } from '../../service/common/menu-map.service';
import { LocalStorageService } from '../../service/common/local-storage.service';

@Injectable({
  providedIn: 'root',
})
export class MenuService {
  private menuData = new BehaviorSubject<any[]>([]);
  menu$ = this.menuData.asObservable();

  userId: any;
  companyId: any;

  constructor(private menuMapService: MenuMapService, private localStorageService: LocalStorageService) {
    const userData = this.localStorageService.getData('user_data');
    if (userData) {
      const parsedData = JSON.parse(userData);
      this.userId = parsedData.main?.id;
      this.companyId = parsedData.main?.company_id;
    }
  }

  loadMenus(menuID: number) {
    const menuItems = {
      company_id: this.companyId,
      print_query: true,
      primary_table: 'menu_items',
      start_index: 0,
      limit_range: 100000,
      sort_columns: [['menu_items.order_no', 'asc']],
      search_all: [
        {
          column_name: 'menu_items.status_id',
          value: '3',
          operator: '!=',
        },
        {
          column_name: 'menu_items.menu_id',
          value: menuID,
          operator: '=',
        },
      ],
      select_columns: [['menu_items.*']],
    };

    this.menuMapService.getCommonList(menuItems).subscribe((response: any) => {
      if (response.code === 200 && response.status) {
        const hierarchicalMenu = this.buildHierarchy(response.data.records);
        this.menuData.next(hierarchicalMenu);
      }
    });
  }

  private buildHierarchy(menuItems: any[]): any[] {
    const menuMap = new Map<number, any>();

    menuItems.forEach((item) => menuMap.set(item.id, { ...item, children: [] }));

    // .sort((a, b) => a.order_no - b.order_no) // Sort items by order_no

    const rootItems: any[] = [];

    menuMap.forEach((item, id) => {
      if (item.parent_id) {
        const parent = menuMap.get(item.parent_id);
        if (parent) {
          parent.children.push(item);
        }
      } else {
        rootItems.push(item);
      }
    });

    return rootItems;
  }

  private selectedMenuItem = new BehaviorSubject<any>(null);

  getMenu(menuId?: number) {
    if (menuId) {
      this.loadMenus(menuId);
    }
    return this.menu$;
  }

  getSelectedMenuItem() {
    return this.selectedMenuItem.asObservable();
  }

  selectMenu(menuItem: any) {
    this.selectedMenuItem.next(menuItem);
  }
}
