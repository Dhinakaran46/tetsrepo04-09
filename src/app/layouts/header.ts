import { ChangeDetectorRef, Component, HostListener, OnInit, Type } from '@angular/core';
import { CUSTOM_ELEMENTS_SCHEMA, ViewEncapsulation } from '@angular/core';
import { Store } from '@ngrx/store';
import { NavigationEnd, Router, UrlTree } from '@angular/router';
import { AppService } from '../@lcp-framework/service/common/app.service';
import { animate, style, transition, trigger } from '@angular/animations';
import { DomSanitizer } from '@angular/platform-browser';

import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';

import { CommonSharedModule } from '../@lcp-framework/shared/common/common.module';
import { AuthService } from '../@lcp-framework/service/common/auth.service';
import { initialState } from '../store/index.reducer';
import { environment } from '../@lcp-framework/../../environments/environment';
import { LocalStorageService } from '../@lcp-framework/service/common/local-storage.service';
import { catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';

import { commonConfig } from '../@lcp-framework/config/common.config';
import { LanguageService } from '../@lcp-framework/service/common/language.service';
import { MenuLoadService } from '../@lcp-framework/service/common/menu-load.service';
import { IdleService } from '../@lcp-framework/service/common/idle.service';
import { WebSocketSubject } from 'rxjs/webSocket';
import { TimezoneService } from '../@lcp-framework/service/common/timezone.service';
import { ApiResponce, GridApiService } from '../@lcp-framework/service/common/grid.service';
import { htmlToPlainText } from '../@lcp-framework/shared/utils/html-text.util';
import { FirebaseService } from '../@lcp-framework/service/firebase.service';
import Swal from 'sweetalert2';

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
  isActive?: boolean;
  menu_img?: string | null;
}

@Component({
  selector: 'header',
  templateUrl: './header.html',
  styleUrl: './common.scss',
  standalone: true,
  imports: [CommonSharedModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  animations: [
    trigger('toggleAnimation', [
      transition(':enter', [style({ opacity: 0, transform: 'scale(0.95)' }), animate('100ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))]),
      transition(':leave', [animate('75ms', style({ opacity: 0, transform: 'scale(0.95)' }))]),
    ]),
  ],
  encapsulation: ViewEncapsulation.Emulated,
})
export class HeaderComponent implements OnInit {
  private adList: { component: Type<any>; inputs?: any }[] = [];
  private socket$!: WebSocketSubject<any>;

  userId: any;
  companyId: any;

  COMMON_CONFIG = commonConfig;
  menu_types: any = [];

  menuItems: MenuItem[] = [];
  store: any = initialState;
  search = false;
  messages = [
    {
      id: 1,
      image: this.sanitizer.bypassSecurityTrustHtml(
        `<span class="grid place-content-center w-9 h-9 rounded-full bg-success-light dark:bg-success text-success dark:text-success-light"><svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg></span>`,
      ),
      title: 'Congratulations!',
      message: 'Your OS has been updated.',
      time: '1hr',
    },
    {
      id: 2,
      image: this.sanitizer.bypassSecurityTrustHtml(
        `<span class="grid place-content-center w-9 h-9 rounded-full bg-info-light dark:bg-info text-info dark:text-info-light"><svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg></span>`,
      ),
      title: 'Did you know?',
      message: 'You can switch between artboards.',
      time: '2hr',
    },
    {
      id: 3,
      image: this.sanitizer.bypassSecurityTrustHtml(
        `<span class="grid place-content-center w-9 h-9 rounded-full bg-danger-light dark:bg-danger text-danger dark:text-danger-light"> <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></span>`,
      ),
      title: 'Something went wrong!',
      message: 'Send Reposrt',
      time: '2days',
    },
    {
      id: 4,
      image: this.sanitizer.bypassSecurityTrustHtml(
        `<span class="grid place-content-center w-9 h-9 rounded-full bg-warning-light dark:bg-warning text-warning dark:text-warning-light"><svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">    <circle cx="12" cy="12" r="10"></circle>    <line x1="12" y1="8" x2="12" y2="12"></line>    <line x1="12" y1="16" x2="12.01" y2="16"></line></svg></span>`,
      ),
      title: 'Warning',
      message: 'Your password strength is low.',
      time: '5days',
    },
  ];
  user_info: any;
  apiUrl = localStorage.getItem('lcp_api_base_url') || environment.apiUrl;
  config: any;
  showNotifications: boolean = false;
  showCompanyMenu = false;
  showLanguageMenu = false;
  showProfileMenu = false;
  companyList: any[] = [];
  selectedCompanyName = '';

  private refreshView(): void {
    setTimeout(() => this.cdr.detectChanges(), 0);
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

  private isCompanySelectionPending(): boolean {
    return this.localstore.getData('company_selection_pending') === 'true';
  }

  private getViewPermissions(): string[] {
    const permissionMap = this.getPermissionsMap();
    return Object.entries(permissionMap)
      .filter(([key, value]) => key.startsWith('view_') && value === true)
      .map(([key]) => key.replace('view_', ''));
  }

  constructor(
    public translate: TranslateService,
    private toastr: ToastrService,
    public storeData: Store<any>,
    public router: Router,
    private appSetting: AppService,
    private sanitizer: DomSanitizer,
    private authService: AuthService,
    private localstore: LocalStorageService,
    private languageService: LanguageService,
    private menuLoadService: MenuLoadService,
    private idleService: IdleService,
    private timezoneService: TimezoneService,
    private gridApiService: GridApiService,
    private firebaseService: FirebaseService,
    private cdr: ChangeDetectorRef,
  ) {}

  async initStore() {
    this.storeData
      .select((d) => d.index)
      .subscribe((d) => {
        this.store = d;
      });
  }

  ngOnDestroy() {
    if (this.socket$) {
      this.socket$.complete();
    }
  }

  ngOnInit() {
    this.initStore();
    this.user_info = this.parseUserData(this.localstore.getData('user_data'));
    this.config = JSON.parse(this.localstore.getData('config'));
    // this.setActiveDropdown();
    // this.router.events.subscribe((event) => {
    //   if (event instanceof NavigationEnd) {
    //     this.setActiveDropdown();
    //   }
    // });

    if (this.user_info?.main?.user_id) {
      if (this.config?.enable_socket_push_notification === 'true') {
        const socketUrl = (environment as any).WS_URL || 'ws://localhost:8100';
        this.socket$ = new WebSocketSubject(`${socketUrl}?userId=${this.user_info.main.user_id}`);
        console.log('Websocket connected sucessfully');
        this.socket$.subscribe({
          next: (data: any) => {
            if (data && data.message) {
              this.toastr.info(data.message, '');
            }
            console.log('WebSocket message received:', data);
          },
          error: (err) => {
            console.error('WebSocket error', err);
          },
        });
      } else {
        try {
          if (this.config?.projectId && this.config?.databaseURL) {
            this.firebaseService.init(this.config);
            this.firebaseService.listen(this.user_info?.main?.user_id);
          } else {
            console.warn('Firebase config incomplete. Real-time notifications disabled.');
          }
        } catch (error) {
          console.error('Error initializing Firebase notifications:', error);
        }
      }
    }

    if (this.user_info) {
      this.userId = this.user_info.main?.id;
      this.companyId = this.user_info.main?.company_id;
      this.initCompanyList();
    }

    const languageCode = this.languageService.getSavedLanguageCode();
    if (this.languageService.checkReloadFlag()) {
    } else {
    }

    const languageId = this.languageService.getLanguageId(languageCode);

    // Defer cache loading and service calls to next tick to avoid NG0100 ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => {
      this.loadMenuFromCache();
      this.languageService.fetchLanguageData(this.companyId, languageId);
    }, 0);

    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.updateActiveClasses();
      }
    });

    // Defer menu fetch/update to the next tick to avoid NG0100 on reload.
    setTimeout(() => {
      this.loadMenuFromStorage();
      this.updateActiveClasses();
    }, 0);
  }

  private initCompanyList(): void {
    const storedCompanies = this.user_info?.companies || this.user_info?.main?.companies;
    if (Array.isArray(storedCompanies) && storedCompanies.length) {
      this.companyList = storedCompanies.map((company: any) => this.normalizeCompanyOption(company));
      this.selectedCompanyName =
        this.isCompanySelectionPending() && this.companyList.length > 1
          ? 'Select Company'
          : this.getSelectedCompany()?.name || this.companyList[0]?.name || '';
      this.fetchCompanyList();
      return;
    }

    const currentCompany = this.normalizeCompanyOption({
      id: this.user_info?.main?.company_id || this.user_info?.company?.id || this.companyId,
      name: this.user_info?.main?.company_name || this.user_info?.company?.name || this.user_info?.main?.company_code || 'Company',
      code: this.user_info?.main?.company_code || this.user_info?.company?.code,
      user_id: this.user_info?.main?.id,
      user_uuid: this.user_info?.main?.uuid,
    });
    this.companyList = currentCompany.id ? [currentCompany] : [];
    this.selectedCompanyName = this.isCompanySelectionPending() ? 'Select Company' : currentCompany.name || '';

    this.fetchCompanyList();
  }

  private normalizeCompanyOption(company: any): any {
    return {
      id: Number(company?.id || company?.company_id || company?.value || 0),
      name: String(company?.name || company?.company_name || company?.label || company?.code || 'Company'),
      code: company?.code || company?.company_code || '',
      tenant_id: company?.tenant_id ? Number(company.tenant_id) : undefined,
      tenant_name: company?.tenant_name || company?.tenant?.name || '',
      tenant_code: company?.tenant_code || company?.tenant?.code || '',
      user_id: company?.user_id || company?.membership_user_id || company?.id,
      user_uuid: company?.user_uuid || company?.membership_user_uuid || company?.uuid,
    };
  }

  getCompanyTenantLabel(company: any): string {
    return (
      company?.tenant_name ||
      company?.tenant_code ||
      (company?.tenant_id ? `Tenant ${company.tenant_id}` : '')
    );
  }

  private getSelectedCompany(): any {
    return this.companyList.find((company: any) => Number(company.id) === Number(this.companyId));
  }

  private fetchCompanyList(): void {
    this.authService.getSwitchCompanies().subscribe({
      next: (response: any) => {
        const records = response?.data?.records || response?.data || [];
        if (!records.length) return;
        this.companyList = records.map((record: any) => this.normalizeCompanyOption(record));
        this.selectedCompanyName =
          this.isCompanySelectionPending() && this.companyList.length > 1
            ? 'Select Company'
            : this.getSelectedCompany()?.name || this.companyList[0]?.name || this.selectedCompanyName;
        this.refreshView();
      },
      error: (error) => console.warn('Unable to load company list:', error),
    });
  }

  private loadMenuFromCache(): void {
    try {
      const cachedMenuList = this.localstore.getData('menuList');
      if (cachedMenuList) {
        const menuList = JSON.parse(cachedMenuList);
        if (Array.isArray(menuList) && menuList.length > 0) {
          this.menuItems = menuList;
          this.filterMenuItems();
          this.updateActiveClasses();
          this.refreshView();
        }
      }
    } catch (error) {
      console.warn('Error loading cached menu:', error);
    }
  }

  loadMenuFromStorage() {
    return this.menuLoadService
      .fetchMenuData(this.companyId)
      .pipe(
        map((menuList) => {
          if (menuList && menuList.length > 0) {
            this.menuItems = menuList;
            this.filterMenuItems();
            this.updateActiveClasses();
            this.refreshView();
          } else {
            console.warn('No menu list found after fetching.');
            this.refreshView();
          }
        }),
        catchError((error) => {
          console.error('Error fetching menu data:', error);
          this.refreshView();
          return of([]);
        }),
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
        // Menu item.link_type external must have either target or childern in order to display in application
        if (item.link_type == 4) {
          const hasTargetOrChildren = (item?.target && item.target.trim() !== '') || (item?.children && item.children.length > 0);

          if (hasTargetOrChildren) {
            return true;
          } else {
            return false;
          }
        }
        if (item.parent_id == null) {
          return true;
        }

        return hasPermission || (item.children && item.children.length > 0);
      });
  }

  updateActiveClasses() {
    this.resetActiveClasses(this.menuItems);
    this.menuItems.forEach((item) => {
      if (item.target) item.isActive = this.isRouteActive(item.target);
      if (item.children) {
        item.children.forEach((child) => {
          if (child.target) child.isActive = this.isRouteActive(child.target);
          if (child.children) {
            child.children.forEach((grandChild) => {
              if (grandChild.target) grandChild.isActive = this.isRouteActive(grandChild.target);
              if (grandChild.children) {
                grandChild.children.forEach((greatGrandChild) => {
                  if (greatGrandChild.target) greatGrandChild.isActive = this.isRouteActive(greatGrandChild.target);
                  if (greatGrandChild.isActive) grandChild.isActive = true;
                });
              }
              if (grandChild.isActive) child.isActive = true;
            });
          }
          if (child.isActive) item.isActive = true;
        });
      }
    });
  }

  resetActiveClasses(items: MenuItem[]) {
    items.forEach((item) => {
      item.isActive = false;
      if (item.children) {
        this.resetActiveClasses(item.children);
      }
    });
  }

  isRouteActive(route: string): boolean {
    const urlTree: UrlTree = this.router.createUrlTree([route]);
    return this.router.isActive(urlTree, {
      paths: 'subset',
      queryParams: 'subset',
      fragment: 'ignored',
      matrixParams: 'ignored',
    });
  }

  // setActiveDropdown() {
  //   const selector = document.querySelector('ul.horizontal-menu a[routerLink="' + window.location.pathname + '"]');
  //   if (selector) {
  //     selector.classList.add('active');
  //     const all: any = document.querySelectorAll('ul.horizontal-menu .nav-link.active');
  //     for (let i = 0; i < all.length; i++) {
  //       all[0]?.classList.remove('active');
  //     }
  //     const ul: any = selector.closest('ul.sub-menu');
  //     if (ul) {
  //       let ele: any = ul.closest('li.menu').querySelectorAll('.nav-link');
  //       if (ele) {
  //         ele = ele[0];
  //         setTimeout(() => {
  //           ele?.classList.add('active');
  //         });
  //       }
  //     }
  //   }
  // }

  removeNotification(value: number) {
    this.notifications = this.notifications.filter((d) => d.id !== value);
  }

  removeMessage(value: number) {
    this.messages = this.messages.filter((d) => d.id !== value);
  }

  getProfileInfo() {
    if (!this.user_info?.main) {
      return { profile_pic: 'assets/images/user.png', name: '', email: '', role: '' };
    }
    const apiUrl = localStorage.getItem('lcp_api_base_url') || environment.apiUrl;
    let profile_pic = this.user_info.main.profile_pic;
    profile_pic = profile_pic && profile_pic !== 'null' ? apiUrl + '/' + profile_pic : 'assets/images/user.png';

    const first_name = this.user_info.main.first_name || '';
    const last_name = this.user_info.main.last_name || '';
    const name = `${first_name} ${last_name}`;
    const email = this.user_info.main.email || '';
    const role = this.user_info.main.role || '';

    return { profile_pic: profile_pic, name, email, role: this.translate.instant(role) };
  }

  changeLanguage(item: any) {
    this.translate.use(item.code);
    this.appSetting.toggleLanguage(item);
    this.showLanguageMenu = false;
    if (this.store.locale?.toLowerCase() === 'ae') {
      this.storeData.dispatch({ type: 'toggleRTL', payload: 'rtl' });
      this.languageService.serviceChangeLanguage(this.companyId, item.code.toLowerCase());
    } else {
      this.storeData.dispatch({ type: 'toggleRTL', payload: 'ltr' });
      this.languageService.serviceChangeLanguage(this.companyId, item.code.toLowerCase());
    }
  }

  toggleLanguageMenu(event: Event) {
    event.stopPropagation();
    this.showLanguageMenu = !this.showLanguageMenu;
    this.showCompanyMenu = false;
    this.showProfileMenu = false;
  }

  toggleCompanyMenu(event: Event) {
    event.stopPropagation();
    this.showCompanyMenu = !this.showCompanyMenu;
    this.showLanguageMenu = false;
    this.showProfileMenu = false;
  }

  changeCompany(company: any) {
    const selectedCompany = this.normalizeCompanyOption(company);
    if (!selectedCompany.id || Number(selectedCompany.id) === Number(this.companyId)) {
      this.showCompanyMenu = false;
      return;
    }

    this.showCompanyMenu = false;

    Swal.fire({
      icon: 'warning',
      title: 'Are you sure?',
      text: `Switch company to "${selectedCompany.name}"? Unsaved changes on this page may be lost.`,
      showCancelButton: true,
      confirmButtonText: 'Switch',
      cancelButtonText: 'Cancel',
      padding: '2em',
    }).then((result) => {
      if (!result.isConfirmed && !result.value) return;
      this.switchCompany(selectedCompany);
    });
  }

  private switchCompany(selectedCompany: any) {
    this.authService.switchCompany(selectedCompany.id).subscribe({
      next: (response: any) => {
        if (!response?.status || !response?.data?.token) {
          const key = response?.message || 'error';
          this.toastr.error(this.translate.instant(key), 'Error');
          return;
        }

        const switchedUser = response.data;
        const companies = switchedUser.companies?.length ? switchedUser.companies : this.companyList;
        this.companyId = Number(switchedUser.company_id || selectedCompany.id);
        this.selectedCompanyName = switchedUser.company_name || selectedCompany.name;
        const selectedCompanyTenantId = Number(
          switchedUser.company_tenant_id ||
            selectedCompany.tenant_id ||
            companies.find((company: any) => Number(company.id) === Number(this.companyId))?.tenant_id ||
            0,
        );

        const permissionsObj = (switchedUser.permissions || []).reduce((acc: any, permission: any) => {
          acc[permission.slug] = permission.accessible;
          return acc;
        }, {});

        const nextUserInfo = {
          ...this.user_info,
          main: {
            ...switchedUser,
            companies,
            selected_company_tenant_id: selectedCompanyTenantId || switchedUser.selected_company_tenant_id,
          },
          permissions: permissionsObj,
          user_id: switchedUser.id,
          company: {
            ...(this.user_info?.company || {}),
            id: this.companyId,
            name: switchedUser.company_name || selectedCompany.name,
            code: switchedUser.company_code || selectedCompany.code,
            tenant_id: selectedCompanyTenantId || selectedCompany.tenant_id,
          },
        };

        this.localstore.storeData('base_app_url', JSON.stringify(switchedUser.base_app_url));
        this.localstore.storeData('version_info', JSON.stringify(switchedUser.version_info));
        if (switchedUser.theme_info) {
          this.localstore.storeData('theme_info', JSON.stringify(switchedUser.theme_info));
        }

        const payload = JSON.stringify(nextUserInfo);
        if (this.config?.encrypt_local_storage === 'true') {
          this.localstore.storeDataEncrypted('user_data', payload);
        } else {
          this.localstore.storeData('user_data', payload);
        }

        this.user_info = nextUserInfo;
        this.localstore.removeData('company_selection_pending');
        this.localstore.storeData('selected_company_id', String(this.companyId));
        this.localstore.removeData('menuList');
        this.localstore.removeData('unorgmenuList');
        this.localstore.removeData('menu_id');

        const languageCode = this.languageService.getSavedLanguageCode();
        this.languageService.serviceChangeLanguage(this.companyId, languageCode.toLowerCase());
        window.location.href = '/';
      },
      error: (error: any) => {
        const key = error?.message || 'error';
        this.toastr.error(this.translate.instant(key), 'Error');
      },
    });
  }

  toggleProfileMenu(event: Event) {
    event.stopPropagation();
    this.showProfileMenu = !this.showProfileMenu;
    this.showCompanyMenu = false;
    this.showLanguageMenu = false;
  }

  hasVisibleChildren(item: any): boolean {
    return item.children && item.children.some((child: any) => child.link_type !== 2 && child.link_type !== 5);
  }

  logout() {
    this.showProfileMenu = false;
    try {
      this.authService.logout().subscribe({
        next: (response) => {
          if (response) {
            this.idleService.stopIdleTimer();
            this.localstore.logout();
            localStorage.setItem('logout', Date.now().toString());
            this.router.navigate(['/login']); // Redirect to login page after successful logout
          }
        },
        error: (error) => {
          console.error('Logout failed', error);
          // Handle logout error as per your requirement (e.g., show an alert)
        },
      });
    } catch (error: any) {
      console.error('Logout Error: ', error);
    }
  }

  @HostListener('document:click', ['$event'])
  handleOutsideClick(event: any) {
    const clickedInsideDropdown = event.target.closest('.notification-dropdown');
    const clickedInsideBox = event.target.closest('.notification-dropdown-box');
    const clickedInsideCompanyMenu = event.target.closest('.company-dropdown');
    const clickedInsideLanguageMenu = event.target.closest('.language-dropdown');
    const clickedInsideProfileMenu = event.target.closest('.profile-dropdown');

    if (!clickedInsideCompanyMenu) {
      this.showCompanyMenu = false;
    }

    if (!clickedInsideDropdown && !clickedInsideBox) {
      this.showNotifications = false;
      this.activeTab = this.tabs[0];
    }

    if (!clickedInsideLanguageMenu) {
      this.showLanguageMenu = false;
    }

    if (!clickedInsideProfileMenu) {
      this.showProfileMenu = false;
    }
  }

  toggleDropdown(): void {
    this.activeTab = this.tabs[0];
    if (this.showNotifications == false) {
      this.fetchNotifications(this.activeTab.key);
    }
    this.showNotifications = !this.showNotifications;
  }

  tabs = [
    {
      key: 'push_notification',
      icon: 'fa-regular fa-bell',
    },
    {
      key: 'sms',
      icon: 'fa-solid fa-comment-sms',
    },
    {
      key: 'email',
      icon: 'fa-regular fa-envelope',
    },
    {
      key: 'whatsapp',
      icon: 'fa-brands fa-whatsapp',
    },
  ];

  activeTab = this.tabs[0];

  selectTab(tab: any) {
    this.activeTab = tab;
    this.fetchNotifications(tab.key);
  }

  notifications: any[] = [];

  formatDateTime(dateTime: any) {
    return this.timezoneService.transformDateTime(dateTime);
  }

  loadingNotificationData: boolean = false;

  fetchNotifications(notification_type: string) {
    this.notifications = [];
    if (!this.user_info?.main) {
      this.loadingNotificationData = false;
      this.cdr.detectChanges();
      return;
    }
    this.loadingNotificationData = true;
    const search_all: any[] = [
      {
        column_name: 'notification_jobs.notification_type',
        operator: '=',
        value: notification_type,
      },
      {
        column_name: 'notification_jobs.company_id',
        operator: '=',
        value: 1,
      },
    ];

    if (notification_type === 'push_notification') {
      search_all.push({
        column_name: 'notification_jobs.notification_status_id',
        operator: '=',
        value: 'ac11',
      });
    }

    let email = this.user_info.main.email || '';

    const search_any: any[] = [
      {
        column_name: 'notification_jobs.notification_to',
        operator: '=',
        value: email,
      },
      {
        column_name: 'notification_jobs.notification_cc',
        operator: '=',
        value: email,
      },
      {
        column_name: 'notification_jobs.notification_bcc',
        operator: '=',
        value: email,
      },
    ];

    const param: any = {
      company_id: 1,
      print_query: true,
      primary_table: 'notification_jobs',
      search_all,
      search_any,
      select_columns: [
        ['notification_jobs.notification_content', 'notification_content'],
        ['notification_jobs.notification_subject', 'notification_subject'],
        ['notification_jobs.sent_at', 'sent_at'],
      ],
      sort_columns: [['notification_jobs.sent_at', 'desc']],
      limit_range: 5,
      start_index: 0,
    };

    this.gridApiService.getListData(param).subscribe({
      next: (response: any) => {
        if (response.status) {
          this.notifications = response.data?.records || [];
          this.notifications.forEach((notification: any) => {
            notification.notification_content = htmlToPlainText(notification.notification_content);
          });
        } else {
          const key = response.message;
          const errorMessage = this.translate.instant(key);
          this.toastr.error(`Code: ${response.code}, ${errorMessage}`);
        }
        this.loadingNotificationData = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        this.notifications = [];
        const errorMessage = this.translate.instant('error');
        this.toastr.error(errorMessage, 'Error');
        this.loadingNotificationData = false;
        this.cdr.detectChanges();
      },
      complete: () => {
        this.loadingNotificationData = false;
        this.cdr.detectChanges();
      },
    });
  }

  markPushNotificationAsread(actionType?: string) {
    this.loadingNotificationData = true;
    let param: any = {
      table: ['notification_jobs'],
      action: ['update'],
      data: {
        table1: [
          {
            notification_status_id: 'ac10',
            updated_at: true,
          },
        ],
      },
      conditions: {
        table1: [
          {
            notification_type: 'push_notification',
            notification_status_id: 'ac11',
          },
        ],
      },
      table_mapping: ['table1'],
    };
    this.gridApiService.executeTransaction(param).subscribe({
      next: (response: ApiResponce) => {
        this.loadingNotificationData = false;
        if (response.status) {
          if (!actionType) {
            const key = 'marked_notifications_as_read';
            const successMessage = this.translate.instant(key);
            this.toastr.success(successMessage, 'Success');
          }
        } else if (!response.status) {
          const key = response.message;
          const errorMessage = this.translate.instant(key);
          this.toastr.error(`Code: ${response.code} , ${errorMessage}`);
        }
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        this.loadingNotificationData = false;
        const key = 'error_mapping_role_permissions';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
        this.cdr.detectChanges();
      },
    });
  }

  navigateToNotifications() {
    this.toggleDropdown();
    if (this.activeTab.key === 'push_notification') {
      this.markPushNotificationAsread('triggerRead');
    }
    this.router.navigate(['/notifications']);
  }
}
