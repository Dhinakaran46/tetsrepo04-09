import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { CommonSharedModule } from '../../@lcp-framework/shared/common/common.module';
import { LocalStorageService } from '../../@lcp-framework/service/common/local-storage.service';
import { MenuLoadService } from '../../@lcp-framework/service/common/menu-load.service';
import { LayoutReadyService } from '../../@lcp-framework/service/common/layout-ready.service';
import { commonConfig } from '../../@lcp-framework/config/common.config';
import { catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';

interface MenuItem {
  id: number;
  name: string;
  target: string | null;
  order_no: number;
  parent_id: number | null;
  link_type?: number | null;
  entity_name?: string | null;
  menu_img?: string | null;
  children?: MenuItem[];
}

// Bottom tab bar for the mobile/native context (WhatsApp/Instagram/Teams-style),
// replacing the desktop sidebar's off-canvas drawer. Reuses the same dynamic,
// backend-driven menu data the sidebar already fetches via MenuLoadService -
// see Frontend/src/app/layouts/sidebar.ts for the source pattern this mirrors.
@Component({
  selector: 'mobile-bottom-nav',
  standalone: true,
  imports: [CommonSharedModule, RouterModule],
  templateUrl: './mobile-bottom-nav.html',
  styleUrl: './mobile-bottom-nav.scss',
})
export class MobileBottomNavComponent implements OnInit {
  COMMON_CONFIG = commonConfig;
  menuSections: MenuItem[] = [];
  primaryTabs: MenuItem[] = [];
  isMorePanelOpen = false;
  currentUrl = '';

  private companyId: any;

  constructor(
    private router: Router,
    private localstore: LocalStorageService,
    private menuLoadService: MenuLoadService,
    private layoutReadyService: LayoutReadyService,
    private cdr: ChangeDetectorRef
  ) {
    this.currentUrl = this.router.url;
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.currentUrl = event.urlAfterRedirects || event.url;
        this.isMorePanelOpen = false;
      }
    });
  }

  ngOnInit(): void {
    const rawUserData = this.localstore.getData('user_data');
    if (rawUserData) {
      try {
        const parsed = typeof rawUserData === 'object' ? rawUserData : JSON.parse(rawUserData);
        this.companyId = parsed?.main?.company_id;
      } catch {
        this.companyId = null;
      }
    }
    this.loadMenu();
  }

  private loadMenu(): void {
    // AppLayout's full-screen loader waits on LayoutReadyService.menuReady, which
    // is normally signalled by SidebarComponent - since the sidebar isn't rendered
    // at all in this mobile-nav context, this component must signal it instead
    // (mirroring sidebar.ts's loadMenuFromStorage exactly), or the loader hangs forever.
    this.menuLoadService
      .fetchMenuData(this.companyId)
      .pipe(
        map((menuList: MenuItem[]) => {
          this.menuSections = Array.isArray(menuList) ? menuList : [];
          this.primaryTabs = this.pickPrimaryTabs(this.menuSections).slice(0, 3);
          this.cdr.detectChanges();
          this.layoutReadyService.markMenuReady();
        }),
        catchError(() => {
          this.menuSections = [];
          this.primaryTabs = [];
          this.cdr.detectChanges();
          this.layoutReadyService.markMenuReady();
          return of(null);
        })
      )
      .subscribe();
  }

  // Flattens every leaf (clickable, non-hidden, non-action) item across all
  // sections, in menu order, so the first 3 become the primary bottom tabs.
  private pickPrimaryTabs(sections: MenuItem[]): MenuItem[] {
    const leaves: MenuItem[] = [];
    const visit = (items: MenuItem[]) => {
      for (const item of items || []) {
        if (this.isHiddenOrAction(item)) continue;
        if (item.children?.length) {
          visit(item.children);
        } else if (item.target) {
          leaves.push(item);
        }
      }
    };
    visit(sections);
    return leaves;
  }

  isHiddenOrAction(item: MenuItem): boolean {
    return item.link_type === this.COMMON_CONFIG.MENU_LINK_TYPE.ACTION || item.link_type === this.COMMON_CONFIG.MENU_LINK_TYPE.HIDDEN;
  }

  isTabActive(item: MenuItem): boolean {
    return !!item.target && this.currentUrl.includes(item.target);
  }

  isDashboardActive(): boolean {
    return this.currentUrl === '/' || this.currentUrl.startsWith('/dashboard');
  }

  openMore(): void {
    this.isMorePanelOpen = true;
  }

  closeMore(): void {
    this.isMorePanelOpen = false;
  }

  onMoreItemClick(item: MenuItem): void {
    if (!item.target) return;
    this.isMorePanelOpen = false;
  }
}
