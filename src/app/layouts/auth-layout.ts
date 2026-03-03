import { Component, Renderer2 } from '@angular/core';
import { Store } from '@ngrx/store';
import { AppService } from '../@lcp-framework/service/common/app.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CopyrightComponent } from '../@lcp-framework/components/copyright/copyright.component';
import { LoaderComponent } from '../@lcp-framework/components/loader/loader.component';
import { TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../@lcp-framework/service/common/language.service';
import { CommonSharedModule } from '../@lcp-framework/shared/common/common.module';
import { animate, style, transition, trigger } from '@angular/animations';
import { MenuMapService } from '../@lcp-framework/service/common/menu-map.service';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../environments/environment';
import { LocalStorageService } from '../@lcp-framework/service/common/local-storage.service';
import { IconCaretDownComponent } from '../@lcp-framework/shared/icon/icon-caret-down';
import { GridApiService } from '../@lcp-framework/service/common/grid.service';
import { ThemeService } from '../@lcp-framework/service/common/theme.service';

@Component({
  selector: 'app-root',
  templateUrl: './auth-layout.html',
  standalone: true,
  imports: [CommonSharedModule, RouterModule, LoaderComponent, CopyrightComponent, IconCaretDownComponent],
  animations: [
    trigger('toggleAnimation', [
      transition(':enter', [style({ opacity: 0, transform: 'scale(0.95)' }), animate('100ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))]),
      transition(':leave', [animate('75ms', style({ opacity: 0, transform: 'scale(0.95)' }))]),
    ]),
  ],
})
export class AuthLayout {
  slideInterval: any;

  currYear: number = new Date().getFullYear();
  companyId: number = 1;
  loading = false;
  store: any;
  showTopButton = false;
  apiUrl = localStorage.getItem('lcp_api_base_url') || environment.apiUrl;
  logo: any;
  authentication_banner: any;
  authentication_background_1: any;
  authentication_background_2: any;
  company: any;
  copyrightContent: any;
  mediaItems: any = [];
  constructor(
    private renderer: Renderer2,
    private toastr: ToastrService,
    private commonService: MenuMapService,
    private languageService: LanguageService,
    private appSetting: AppService,
    public storeData: Store<any>,
    private service: AppService,
    public translate: TranslateService,
    private localstore: LocalStorageService,
    private gridApiService: GridApiService,
    private themeService: ThemeService
  ) {
    this.initStore();
  }

  // Auto-slide function
  startAutoSlide() {
    this.slideInterval = setInterval(() => {
      this.nextItem();
    }, 1200000000000); // Change the slide every 12 seconds
  }

  activeIndex: number = 0;

  // Move to the next item
  nextItem() {
    this.activeIndex = (this.activeIndex + 1) % this.mediaItems.length;
  }

  // Move to the previous item
  prevItem() {
    this.activeIndex = (this.activeIndex - 1 + this.mediaItems.length) % this.mediaItems.length;
  }

  headerClass = '';

  ngOnInit() {
    const languageCode = this.languageService.getSavedLanguageCode();
    if (this.languageService.checkReloadFlag()) {
      console.log('Reloaded');
    } else {
      console.log('Initial Load');
    }

    const languageId = this.languageService.getLanguageId(languageCode);
    this.languageService.fetchLanguageData(this.companyId, languageId);

    this.toggleLoader();
    window.addEventListener('scroll', () => {
      if (document.body.scrollTop > 50 || document.documentElement.scrollTop > 50) {
        this.showTopButton = true;
      } else {
        this.showTopButton = false;
      }
    });

    // Get userId from localStorageService if available
    let userId: number | undefined = undefined;
    try {
      const userDataRaw = this.localstore.getData('user_data');
      if (userDataRaw) {
        let userDataObj: any = {};
        try {
          userDataObj = JSON.parse(userDataRaw);
        } catch (e) {
          // If encrypted, try to decrypt
          const decrypted = this.localstore.getDataDecrypted('user_data');
          userDataObj = JSON.parse(decrypted);
        }
        if (userDataObj && userDataObj.main && userDataObj.main.id) {
          userId = userDataObj.main.id;
        }
      }
    } catch (e) {
      userId = undefined;
    }
    this.getconfig(userId);
    this.loadDataCarousel();
    const payload = { company_id: this.companyId, status_id: 1 };

    this.getThemeInfo(payload);
  }

  changeFavicon(url: any): void {
    const favicon = this.renderer.selectRootElement('#common-favicon', true);
    this.renderer.setAttribute(favicon, 'href', url);
  }

  loadDataCarousel() {
    const params = {
      company_id: 1,
      print_query: true,
      primary_table: 'carousel_templates',
      start_index: 0,
      limit_range: 1,
      sort_columns: [['carousel_templates.id', 'desc']],
      search_all: [
        {
          column_name: 'carousel_templates.slug',
          value: 'authentication_layout',
          operator: '=',
        },
      ],
      select_columns: [
        ['carousel_templates.*'],
        [
          "CASE WHEN COUNT(carousel_template_line_items.id) = 0 THEN null ELSE COALESCE(Json_agg(DISTINCT jsonb_build_object('name', carousel_template_line_items.name, 'description', carousel_template_line_items.description, 'image_url', carousel_template_line_items.image_url, 'video_url', carousel_template_line_items.video_url, 'clickable_link', carousel_template_line_items.clickable_link, 'order_no', carousel_template_line_items.order_no))) END",
          'items',
        ],
      ],
      includes: [
        {
          table_name: 'carousel_template_line_items',
          join_type: 'LEFT',
          join_condition: `carousel_templates.id = carousel_template_line_items.carousel_template_id`,
        },
      ],
      group_by: ['carousel_templates.id'],
    };

    this.gridApiService.getAllUnAuthList(params).subscribe(
      (response) => {
        if (response.status && response.code === 200) {
          const entity = response.data.records[0];
          if (entity && entity.items) {
            this.mediaItems = entity.items;
            this.mediaItems.sort((a: any, b: any) => a.order - b.order);
          }
        }
      },
      (error) => {
        this.toastr.error('Error loading carousel template data', 'Error');
      }
    );

    this.startAutoSlide(); // Start auto-sliding when the component is initialized
  }

  getconfig(userId?: number) {
    // Prepare params for the procedure
    const params: any = { categories: { '0': 'ac1', '1': 'ac2', '2': 'ac30' } };
    if (userId !== undefined && userId !== null) {
      params.user_id = userId; // Add user_id if provided
      //params.categories = { '0': 'ac16', '1': 'ac17' };
    }

    const procedureParams = { proc_name: 'get_configurations_values_v1', params };

    this.commonService.unAuthProcedureCall(procedureParams).subscribe({
      next: (response: { code: number; status: boolean; data: any; message: string }) => {
        if (response.code === 200 && response.status && response.data) {
          //console.log(response)
          const res = response.data?.[0]?.result?.data || {};
          //console.log(res)
          if (Object.keys(res).length > 0) {
            if (res.favicon) {
              this.changeFavicon(this.apiUrl + '/' + res.favicon);
            }
            this.logo = res.logo;
            this.authentication_banner = res.authentication_banner;
            this.authentication_background_1 = res.authentication_background_1;
            this.authentication_background_2 = res.authentication_background_2;
            this.company = res.company_name;
            this.copyrightContent = res.footer_content;
            //console.log(res)
            this.localstore.storeData('config', JSON.stringify(res));
            //localStorage.setItem('config', JSON.stringify(res));
          }
        } else {
          const key = 'error';
          const errorMessage = this.translate.instant(key);
          this.toastr.error(errorMessage, 'Error');
        }
      },
      error: (error) => {
        console.error('Error fetching data:', error);
        //this.loading = false;
      },
      complete: () => {
        //this.loading = false;
      },
    });
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

  toggleLoader() {
    this.storeData.dispatch({ type: 'toggleMainLoader', payload: true });
    setTimeout(() => {
      this.storeData.dispatch({ type: 'toggleMainLoader', payload: false });
    }, 500);
  }

  ngOnDestroy() {
    // Stop auto-slide when the component is destroyed
    if (this.slideInterval) {
      clearInterval(this.slideInterval);
    }
    window.removeEventListener('scroll', () => {});
  }

  async initStore() {
    this.storeData
      .select((d) => d.index)
      .subscribe((d) => {
        this.store = d;
      });
  }

  goToTop() {
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
  }

  getThemeInfo(payload: any) {
    this.commonService.getThemeInfo(payload).subscribe((response: any) => {
      if (response.code === 200) {
        const themeData = JSON.stringify(response.data);
        this.localstore.storeData('theme_info', themeData);
        this.themeService.applyThemeFromLocalStorage();
      }
    });
  }
}
