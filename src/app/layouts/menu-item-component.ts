import { Component, Input } from '@angular/core';
import { IconCaretDownComponent } from '../@lcp-framework/shared/icon/icon-caret-down';
import { NavigationEnd, Router, IsActiveMatchOptions } from '@angular/router';
import { CommonSharedModule } from '../@lcp-framework/shared/common/common.module';
import { IconMenuDashboardComponent } from '../@lcp-framework/shared/icon/menu/icon-menu-dashboard';
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

@Component({
  selector: 'app-menu-item',
  standalone: true,
  imports: [CommonSharedModule, IconCaretDownComponent, IconMenuDashboardComponent],
  template: `
    <li class="menu nav-item relative">
      <a [routerLink]="item.target ? [item.target] : null" [routerLinkActive]="item.target ? 'active' : ''" class="nav-link">
        <div class="flex items-center">
          <icon-menu-dashboard class="shrink-0" *ngIf="item.name.toLowerCase() === 'dashboard'" />
          <!-- Add more icon conditions here based on item name or other properties -->
          <span class="px-2">{{ item.name | translate }}</span>
        </div>
        <div class="right_arrow" *ngIf="item.children && item.children.length">
          <i class="fa-solid fa-angle-down"></i>
        </div>
      </a>
      <ul class="sub-menu" *ngIf="item.children && item.children.length">
        <app-menu-item *ngFor="let child of item.children" [item]="child"></app-menu-item>
      </ul>
    </li>
  `,
})
export class MenuItemComponent {
  @Input() item!: MenuItem;

  constructor(public router: Router) {}

  ngOnInit() {
    this.setActiveDropdown();
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.setActiveDropdown();
      }
    });
  }

  isActive(route: string): boolean {
    const options: IsActiveMatchOptions = { paths: 'exact', queryParams: 'exact', fragment: 'ignored', matrixParams: 'ignored' };
    return this.router.isActive(route, options);
  }

  setActiveDropdown() {
    const selector = document.querySelector('ul.horizontal-menu a[routerLink="' + window.location.pathname + '"]');
    if (selector) {
      selector.classList.add('active');
      const all: any = document.querySelectorAll('ul.horizontal-menu .nav-link.active');
      for (let i = 0; i < all.length; i++) {
        all[0]?.classList.remove('active');
      }
      const ul: any = selector.closest('ul.sub-menu');
      if (ul) {
        let ele: any = ul.closest('li.menu').querySelectorAll('.nav-link');
        if (ele) {
          ele = ele[0];
          setTimeout(() => {
            ele?.classList.add('active');
          });
        }
      }
    }
  }
}
