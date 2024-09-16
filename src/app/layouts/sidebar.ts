import { CUSTOM_ELEMENTS_SCHEMA, Component, ViewEncapsulation } from '@angular/core';
import { Router, IsActiveMatchOptions, RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { slideDownUp } from '../@lcp-framework/shared/animations';

import { TranslateService } from '@ngx-translate/core';

import { IconMenuDashboardComponent } from '../@lcp-framework/shared/icon/menu/icon-menu-dashboard';

import { CommonSharedModule } from '../@lcp-framework/shared/common/common.module';
import { LocalStorageService } from '../@lcp-framework/service/common/local-storage.service';
import { commonConfig } from '../@lcp-framework/config/common.config';

import { catchError, map } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { MenuLoadService } from '../@lcp-framework/service/common/menu-load.service';
import { environment } from '../../environments/environment';

interface MenuItem {
  id: number;
  name: string;
  uuid: string;
  target: string | null;
  order_no: number;
  parent_id: number | null;
  link_type?: number | null;
  permission_slug: string | null;
  children?: MenuItem[];
  menu_img?: string | null;
}

@Component({
  selector: 'sidebar',
  standalone: true,
  imports: [CommonSharedModule, IconMenuDashboardComponent],
  templateUrl: './sidebar.html',
  animations: [slideDownUp],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  encapsulation: ViewEncapsulation.Emulated,
})
export class SidebarComponent {
  userId: any;
  companyId: any;

  menuItems: MenuItem[] = [];
  active = false;
  store: any;
  activeDropdown: string[] = [];
  parentDropdown: string = '';
  user_info: any;
  COMMON_CONFIG = commonConfig;
  apiUrl = environment.apiUrl;

  constructor(
    public translate: TranslateService,
    public storeData: Store<any>,
    public router: Router,
    private localstore: LocalStorageService,
    private menuLoadService: MenuLoadService
  ) {
    this.initStore();
  }
  async initStore() {
    this.storeData
      .select((d) => d.index)
      .subscribe((d) => {
        this.store = d;
      });
  }

  ngOnInit() {
    const userData = this.localstore.getData('user_data');

    if (userData) {
      const parsedData = JSON.parse(userData);
      this.user_info = parsedData;
      this.userId = parsedData.main?.id;
      this.companyId = parsedData.main?.company_id;
    }
    this.setActiveDropdown();
    this.loadMenuFromStorage();
  }

  getTranslatedValues(key: any, label: any): Observable<string> {
    return this.translate.get(key).pipe(
      map((translations) => {
        return translations.includes('.') ? label : translations;
      })
    );
  }

  loadMenuFromStorage() {
    return this.menuLoadService
      .fetchMenuData(this.companyId)
      .pipe(
        map((menuList) => {
          if (menuList && menuList.length > 0) {
            this.menuItems = menuList;
            this.filterMenuItems();
          } else {
            console.warn('No menu list found after fetching.');
          }
        }),
        catchError((error) => {
          console.error('Error fetching menu data:', error);
          return of([]); // Return an empty array in case of error
        })
      )
      .toPromise();
  }

  filterMenuItems() {
    const viewPermissions = Object.entries(this.user_info.permissions)
      .filter(([key, value]) => key.startsWith('view_') && value === true)
      .map(([key, value]) => key.replace('view_', ''));

    this.menuItems = this.filterMenu(this.menuItems, viewPermissions);
  }

  filterMenu(menuItems: any[], viewPermissions: string[]): any[] {
    return menuItems.filter((item) => {
      const permissionKey = item.entity_name;
      const hasPermission = viewPermissions.includes(permissionKey);
      if (item.children && item.children.length) {
        item.children = this.filterMenu(item.children, viewPermissions);
      }

      return hasPermission || (item.children && item.children.length > 0);
    });
  }

  setActiveDropdown() {
    const selector = document.querySelector('.sidebar ul a[routerLink="' + window.location.pathname + '"]');
    if (selector) {
      selector.classList.add('active');
      const ul: any = selector.closest('ul.sub-menu');
      if (ul) {
        let ele: any = ul.closest('li.menu').querySelectorAll('.nav-link') || [];
        if (ele.length) {
          ele = ele[0];
          setTimeout(() => {
            ele.click();
          });
        }
      }
    }
  }

  hasVisibleChildren(item: any): boolean {
    if (item.children && item.children.length) {
      return item.children.some((child: any) => child.link_type !== this.COMMON_CONFIG.MENU_LINK_TYPE.ACTION);
    }
    return false;
  }

  getHref(target: string | null): string {
    if (target && typeof target === 'string' && target.startsWith('http')) {
      return target;
    }
    return target ? 'http://' + target : '';
  }

  toggleMobileMenu() {
    if (window.innerWidth < 1024) {
      this.storeData.dispatch({ type: 'toggleSidebar' });
    }
  }

  isActive(route: string): boolean {
    const options: IsActiveMatchOptions = { paths: 'exact', queryParams: 'exact', fragment: 'ignored', matrixParams: 'ignored' };
    return this.router.isActive(route, options);
  }

  toggleAccordion(name: string, parent?: string) {
    if (this.activeDropdown.includes(name)) {
      this.activeDropdown = this.activeDropdown.filter((d) => d !== name);
    } else {
      this.activeDropdown.push(name);
    }
  }
}
