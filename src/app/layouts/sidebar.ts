import { CUSTOM_ELEMENTS_SCHEMA, ChangeDetectorRef, Component, ViewEncapsulation } from '@angular/core';
import { Router, IsActiveMatchOptions, RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { slideDownUp } from '../@lcp-framework/shared/animations';

import { TranslateService } from '@ngx-translate/core';

import { CommonSharedModule } from '../@lcp-framework/shared/common/common.module';
import { LocalStorageService } from '../@lcp-framework/service/common/local-storage.service';
import { commonConfig } from '../@lcp-framework/config/common.config';

import { catchError, map } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { MenuLoadService } from '../@lcp-framework/service/common/menu-load.service';
import { LayoutReadyService } from '../@lcp-framework/service/common/layout-ready.service';
import { initialState } from '../store/index.reducer';
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
  imports: [CommonSharedModule],
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
  store: any = initialState;
  activeDropdown: string[] = [];
  parentDropdown: string = '';
  user_info: any;
  COMMON_CONFIG = commonConfig;
  apiUrl = localStorage.getItem('lcp_api_base_url') || environment.apiUrl;
  config: any;

  showssmenu: boolean = true;

  private refreshView(): void {
    this.cdr.detectChanges();
  }

  private parseUserData(rawUserData: any): any {
    if (!rawUserData) return null;
    if (typeof rawUserData === 'object') return rawUserData;
    try {
      return JSON.parse(rawUserData);
    } catch {
      return null;
    }
  }

  private getPermissionsMap(): Record<string, boolean> {
    const rootPermissions = this.user_info?.permissions;
    if (rootPermissions && typeof rootPermissions === 'object' && !Array.isArray(rootPermissions)) {
      return rootPermissions as Record<string, boolean>;
    }

    const mainPermissions = this.user_info?.main?.permissions;
    if (Array.isArray(mainPermissions)) {
      return mainPermissions.reduce((acc: Record<string, boolean>, permission: any) => {
        const slug = String(permission?.slug || '').trim();
        if (!slug) return acc;
        acc[slug] = permission?.accessible === true;
        return acc;
      }, {});
    }

    if (mainPermissions && typeof mainPermissions === 'object') {
      return mainPermissions as Record<string, boolean>;
    }

    return {};
  }

  private getViewPermissions(): string[] {
    const permissionMap = this.getPermissionsMap();
    return Object.entries(permissionMap)
      .filter(([key, value]) => key.startsWith('view_') && value === true)
      .map(([key]) => key.replace('view_', ''));
  }

  constructor(
    public translate: TranslateService,
    public storeData: Store<any>,
    public router: Router,
    private localstore: LocalStorageService,
    private menuLoadService: MenuLoadService,
    private cdr: ChangeDetectorRef,
    private layoutReadyService: LayoutReadyService
  ) {}
  initStore() {
    this.storeData
      .select((d) => d.index)
      .subscribe((d) => {
        this.store = d;

        if (this.store.menu == 'horizontal') {
          this.showssmenu = true;
        } else {
          if (this.store.menu == 'vertical' && this.store.sidebar) {
            this.showssmenu = true;
          } else {
            this.showssmenu = false;
          }
        }
      });
  }

  ngOnInit() {
    this.initStore();
    this.config = JSON.parse(this.localstore.getData('config'));
    const userData = this.localstore.getData('user_data');

    if (userData) {
      const parsedData = this.parseUserData(userData);
      if (!parsedData) {
        this.layoutReadyService.markMenuReady();
        return;
      }
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
          this.refreshView();
          this.layoutReadyService.markMenuReady();
        }),
        catchError((error) => {
          console.error('Error fetching menu data:', error);
          this.refreshView();
          this.layoutReadyService.markMenuReady();
          return of([]);
        })
      )
      .toPromise();
  }

  filterMenuItems() {
    const viewPermissions = this.getViewPermissions();
    if (!viewPermissions.length) {
      return;
    }

    this.menuItems = this.filterMenu(this.menuItems, viewPermissions);
  }

  filterMenu(menuItems: any[], viewPermissions: string[]): any[] {
    return (menuItems || [])
      .map((item) => {
        const children = Array.isArray(item?.children) ? this.filterMenu(item.children, viewPermissions) : [];
        return {
          ...item,
          children,
        };
      })
      .filter((item) => {
        const permissionKey = item.entity_name;
        const hasPermission = viewPermissions.includes(permissionKey);
        if (item.parent_id == null) {
          return true;
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
      return item.children.some(
        (child: any) => child.link_type !== this.COMMON_CONFIG.MENU_LINK_TYPE.ACTION && child.link_type !== this.COMMON_CONFIG.MENU_LINK_TYPE.HIDDEN
      );
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
