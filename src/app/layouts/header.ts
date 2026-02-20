import { Component, OnInit, Type } from '@angular/core';
import { CUSTOM_ELEMENTS_SCHEMA, ViewEncapsulation } from '@angular/core';
import { Store } from '@ngrx/store';
import { NavigationEnd, Router, UrlTree } from '@angular/router';
import { AppService } from '../@lcp-framework/service/common/app.service';
import { animate, style, transition, trigger } from '@angular/animations';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { TranslateService } from '@ngx-translate/core';

import { CommonSharedModule } from '../@lcp-framework/shared/common/common.module';
import { AuthService } from '../@lcp-framework/service/common/auth.service';
import { environment } from '../@lcp-framework/../../environments/environment';
import { MenuItemComponent } from './menu-item-component';
import { LocalStorageService } from '../@lcp-framework/service/common/local-storage.service';
import { catchError, map } from 'rxjs/operators';
import { Observable, of } from 'rxjs';

import { commonConfig } from '../@lcp-framework/config/common.config';
import { IconMenuDashboardComponent } from '../@lcp-framework/shared/icon/menu/icon-menu-dashboard';
import { NgComponentOutlet } from '@angular/common';
import { LanguageService } from '../@lcp-framework/service/common/language.service';
import { MenuLoadService } from '../@lcp-framework/service/common/menu-load.service';
import { IdleService } from '../@lcp-framework/service/common/idle.service';

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
  imports: [CommonSharedModule, NgComponentOutlet, MenuItemComponent, IconMenuDashboardComponent],
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

  userId: any;
  companyId: any;

  COMMON_CONFIG = commonConfig;
  menu_types: any = [];

  menuItems: MenuItem[] = [];
  store: any;
  search = false;
  notifications = [
    {
      id: 1,
      profile: '<i class="fas fa-circle-user"></i>',
      message: '<strong class="text-sm mr-1">John Doe</strong>invite you to <strong>Prototyping</strong>',
      time: '45 min ago',
    },
    {
      id: 2,
      profile: '<i class="fas fa-circle-user"></i>',
      message: '<strong class="text-sm mr-1">Adam Nolan</strong>mentioned you to <strong>UX Basics</strong>',
      time: '9h Ago',
    },
    {
      id: 3,
      profile: '<i class="fas fa-circle-user"></i>',
      message: '<strong class="text-sm mr-1">Anna Morgan</strong>Upload a file',
      time: '9h Ago',
    },
  ];
  messages = [
    {
      id: 1,
      image: this.sanitizer.bypassSecurityTrustHtml(
        `<span class="grid place-content-center w-9 h-9 rounded-full bg-success-light dark:bg-success text-success dark:text-success-light"><svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg></span>`
      ),
      title: 'Congratulations!',
      message: 'Your OS has been updated.',
      time: '1hr',
    },
    {
      id: 2,
      image: this.sanitizer.bypassSecurityTrustHtml(
        `<span class="grid place-content-center w-9 h-9 rounded-full bg-info-light dark:bg-info text-info dark:text-info-light"><svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg></span>`
      ),
      title: 'Did you know?',
      message: 'You can switch between artboards.',
      time: '2hr',
    },
    {
      id: 3,
      image: this.sanitizer.bypassSecurityTrustHtml(
        `<span class="grid place-content-center w-9 h-9 rounded-full bg-danger-light dark:bg-danger text-danger dark:text-danger-light"> <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></span>`
      ),
      title: 'Something went wrong!',
      message: 'Send Reposrt',
      time: '2days',
    },
    {
      id: 4,
      image: this.sanitizer.bypassSecurityTrustHtml(
        `<span class="grid place-content-center w-9 h-9 rounded-full bg-warning-light dark:bg-warning text-warning dark:text-warning-light"><svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">    <circle cx="12" cy="12" r="10"></circle>    <line x1="12" y1="8" x2="12" y2="12"></line>    <line x1="12" y1="16" x2="12.01" y2="16"></line></svg></span>`
      ),
      title: 'Warning',
      message: 'Your password strength is low.',
      time: '5days',
    },
  ];
  user_info: any;
  apiUrl = localStorage.getItem('lcp_api_base_url') || environment.apiUrl;
  config: any;

  constructor(
    public translate: TranslateService,
    public storeData: Store<any>,
    public router: Router,
    private appSetting: AppService,
    private sanitizer: DomSanitizer,
    private authService: AuthService,
    private localstore: LocalStorageService,
    private languageService: LanguageService,
    private menuLoadService: MenuLoadService,
    private idleService: IdleService
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
    this.user_info = JSON.parse(this.localstore.getData('user_data'));
    this.config = JSON.parse(this.localstore.getData('config'));
    // this.setActiveDropdown();
    // this.router.events.subscribe((event) => {
    //   if (event instanceof NavigationEnd) {
    //     this.setActiveDropdown();
    //   }
    // });

    if (this.user_info) {
      this.userId = this.user_info.main?.id;
      this.companyId = this.user_info.main?.company_id;
    }

    const languageCode = this.languageService.getSavedLanguageCode();
    if (this.languageService.checkReloadFlag()) {
      console.log('Reloaded');
    } else {
      console.log('Initial Load');
    }

    const languageId = this.languageService.getLanguageId(languageCode);
    this.languageService.fetchLanguageData(this.companyId, languageId);

    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.updateActiveClasses();
      }
    });

    this.loadMenuFromStorage();

    this.updateActiveClasses();
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
          return of([]);
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
      // Menu item.link_type external must have either target or childern in order to display in application
      if (item.link_type == 4) {
        const hasTargetOrChildren = (item?.target && item.target.trim() !== '') || (item?.children && item.children.length > 0);

        if (hasTargetOrChildren) {
          //console.log(" Rendering item (link_type=4, has target/children):", item);
          return true;
        } else {
          //console.log("Skipping item (link_type=4, no target/children):", item);
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
    const apiUrl = localStorage.getItem('lcp_api_base_url') || environment.apiUrl;
    let profile_pic = this.user_info.main.profile_pic;
    profile_pic = profile_pic && profile_pic !== 'null' ? apiUrl + '/' + profile_pic : 'assets/images/user.png';

    const first_name = this.user_info.main.first_name || '';
    const last_name = this.user_info.main.last_name || '';
    const name = `${first_name} ${last_name}`;
    const email = this.user_info.main.email || '';

    return { profile_pic: profile_pic, name, email };
  }

  changeLanguage(item: any) {
    this.translate.use(item.code);
    this.appSetting.toggleLanguage(item);
    if (this.store.locale?.toLowerCase() === 'ae') {
      this.storeData.dispatch({ type: 'toggleRTL', payload: 'rtl' });
      this.languageService.serviceChangeLanguage(this.companyId, item.code.toLowerCase());
    } else {
      this.storeData.dispatch({ type: 'toggleRTL', payload: 'ltr' });
      this.languageService.serviceChangeLanguage(this.companyId, item.code.toLowerCase());
    }
  }

  hasVisibleChildren(item: any): boolean {
    return item.children && item.children.some((child: any) => child.link_type !== 2 && child.link_type !== 5);
  }

  logout() {
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
}
