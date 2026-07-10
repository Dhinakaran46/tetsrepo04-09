import { ChangeDetectorRef, Component, Renderer2 } from '@angular/core';
import { Store } from '@ngrx/store';
import { AppService } from '../@lcp-framework/service/common/app.service';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, NavigationEnd, Router, RouterModule } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../@lcp-framework/service/common/language.service';
import { CommonSharedModule } from '../@lcp-framework/shared/common/common.module';
import { animate, style, transition, trigger } from '@angular/animations';
import { MenuMapService } from '../@lcp-framework/service/common/menu-map.service';
import { ToastrService } from 'ngx-toastr';
import { initialState } from '../store/index.reducer';
import { environment } from '../../environments/environment';
import { LocalStorageService } from '../@lcp-framework/service/common/local-storage.service';
import { GridApiService } from '../@lcp-framework/service/common/grid.service';
import { ThemeService } from '../@lcp-framework/service/common/theme.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './auth-layout.html',
  standalone: true,
  imports: [CommonSharedModule, RouterModule],
  animations: [
    trigger('toggleAnimation', [
      transition(':enter', [style({ opacity: 0, transform: 'scale(0.95)' }), animate('100ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))]),
      transition(':leave', [animate('75ms', style({ opacity: 0, transform: 'scale(0.95)' }))]),
    ]),
  ],
})
export class AuthLayout {
  slideInterval: any;
  private routerEventsSubscription?: Subscription;
  private readonly onWindowScroll = () => {
    this.showTopButton = document.body.scrollTop > 50 || document.documentElement.scrollTop > 50;
  };

  currYear: number = new Date().getFullYear();
  companyId: number = 1;
  loading = false;
  store: any = initialState;
  isLoading = true;
  showTopButton = false;
  apiUrl = localStorage.getItem('lcp_api_base_url') || environment.apiUrl;
  logo: any;
  authentication_banner: any;
  authentication_background_1: any;
  authentication_background_2: any;
  company: any;
  copyrightContent: any;
  mediaItems: any = [];
  configLoaded = false;
  selectedLanguageCode = 'en';
  hideMedia = false;
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
    private themeService: ThemeService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router
  ) {
    // Pre-populate from cache so DOM renders with values on first paint
    this.loadConfigFromCache();
  }

  private loadConfigFromCache(): void {
    try {
      const cached = this.localstore.getData('config');
      if (cached) {
        const res = JSON.parse(cached);
        this.logo = res.logo;
        this.authentication_banner = res.authentication_banner;
        this.authentication_background_1 = res.authentication_background_1;
        this.authentication_background_2 = res.authentication_background_2;
        this.company = res.company_name;
        this.copyrightContent = res.footer_content;
        this.configLoaded = true;
      }
    } catch {
      // no cache yet — will be populated after API call
    }
  }

  // Auto-slide function
  startAutoSlide() {
    if (this.slideInterval) {
      clearInterval(this.slideInterval);
    }
    if (this.mediaItems.length <= 1) {
      return;
    }

    this.slideInterval = setInterval(() => {
      this.nextItem();
    }, 12000); // Change the slide every 12 seconds
  }

  activeIndex: number = 0;

  // Move to the next item
  nextItem() {
    if (!this.mediaItems.length) {
      return;
    }
    this.activeIndex = (this.activeIndex + 1) % this.mediaItems.length;
  }

  // Move to the previous item
  prevItem() {
    if (!this.mediaItems.length) {
      return;
    }
    this.activeIndex = (this.activeIndex - 1 + this.mediaItems.length) % this.mediaItems.length;
  }

  headerClass = '';

  ngOnInit() {
    this.initStore();
    this.updateLayoutRouteData();
    this.routerEventsSubscription = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.updateLayoutRouteData();
      }
    });

    const languageCode = this.languageService.getSavedLanguageCode();
    this.selectedLanguageCode = this.resolveLanguageCode(languageCode || this.store?.locale || this.translate.currentLang || 'en');
    this.storeData.dispatch({ type: 'toggleLocale', payload: this.selectedLanguageCode });
    this.translate.use(this.selectedLanguageCode);
    if (this.languageService.checkReloadFlag()) {
    } else {
    }

    const languageId = this.languageService.getLanguageId(languageCode);
    this.languageService.fetchLanguageData(this.companyId, languageId);

    this.toggleLoader();
    window.addEventListener('scroll', this.onWindowScroll);

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
      print_query: false,
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
          const entity = response?.data?.records?.[0];
          const rawItems = Array.isArray(entity?.items) ? entity.items : [];

          this.mediaItems = rawItems
            .map((item: any) => ({
              ...item,
              image_url: this.normalizeMediaUrl(item?.image_url),
              video_url: this.normalizeMediaUrl(item?.video_url),
            }))
            .sort((a: any, b: any) => Number(a?.order_no || 0) - Number(b?.order_no || 0));

          if (this.activeIndex >= this.mediaItems.length) {
            this.activeIndex = 0;
          }

          // Preload first media item to speed up initial paint
          this.preloadFirstMediaItem();
          this.startAutoSlide();
          this.cdr.markForCheck();
        }
      },
      (error) => {
        this.toastr.error('Error loading carousel template data', 'Error');
      }
    );
  }

  private normalizeMediaUrl(url: any): string {
    if (!url || url === 'null') {
      return '';
    }

    const value = String(url).trim();
    if (!value) {
      return '';
    }

    if (/^(https?:)?\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:')) {
      return value;
    }

    const normalizedBase = this.apiUrl.replace(/\/+$/, '');
    const normalizedPath = value.replace(/^\/+/, '');
    return `${normalizedBase}/${normalizedPath}`;
  }

  private preloadFirstMediaItem(): void {
    if (!this.mediaItems.length) {
      return;
    }

    const firstItem = this.mediaItems[0];
    if (firstItem.image_url) {
      const img = new Image();
      img.src = firstItem.image_url;
    } else if (firstItem.video_url) {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = firstItem.video_url;
    }
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
          const res = response.data?.[0]?.result?.data || {};

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

            this.localstore.storeData('config', JSON.stringify(res));
            this.cdr.markForCheck();
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
    this.selectedLanguageCode = this.resolveLanguageCode(item?.code);
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

  changeLanguageByCode(code: string) {
    const normalizedCode = this.resolveLanguageCode(code);
    this.selectedLanguageCode = normalizedCode;
    const item = this.store.languageList?.find((language: any) => language.code === normalizedCode);
    if (item) {
      this.changeLanguage(item);
    }
  }

  getLanguageName(language: any): string {
    const code = String(language?.code || '').toLowerCase();
    if (code === 'en') {
      return 'English';
    }
    if (code === 'ae' || code === 'ar') {
      return 'Arabic';
    }
    return String(language?.name || code || '').trim();
  }

  private resolveLanguageCode(code: string): string {
    const languageList = this.store?.languageList || [];
    const normalized = String(code || '').toLowerCase();

    if (languageList.some((language: any) => String(language?.code || '').toLowerCase() === normalized)) {
      return normalized;
    }

    // Keep backward compatibility where Arabic can come as "ar" but app language list uses "ae".
    if (normalized === 'ar' && languageList.some((language: any) => String(language?.code || '').toLowerCase() === 'ae')) {
      return 'ae';
    }

    return 'en';
  }

  toggleLoader() {
    this.isLoading = false;
    this.storeData.dispatch({ type: 'toggleMainLoader', payload: false });
  }

  ngOnDestroy() {
    // Stop auto-slide when the component is destroyed
    if (this.slideInterval) {
      clearInterval(this.slideInterval);
    }
    this.routerEventsSubscription?.unsubscribe();
    window.removeEventListener('scroll', this.onWindowScroll);
  }

  private updateLayoutRouteData(): void {
    this.hideMedia = Boolean(this.route.firstChild?.snapshot.data?.['hideMedia']);
  }

  initStore() {
    this.storeData
      .select((d) => d.index)
      .subscribe((d) => {
        this.store = d;
        this.selectedLanguageCode = this.resolveLanguageCode(
          this.languageService.getSavedLanguageCode() || this.store?.locale || this.translate.currentLang || 'en'
        );
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
        this.cdr.markForCheck();
      }
    });
  }
}
