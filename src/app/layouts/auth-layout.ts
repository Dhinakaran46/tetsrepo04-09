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

@Component({
  selector: 'app-root',
  templateUrl: './auth-layout.html',
  standalone: true,
  imports: [CommonSharedModule, RouterModule, LoaderComponent, CopyrightComponent],
  animations: [
    trigger('toggleAnimation', [
      transition(':enter', [style({ opacity: 0, transform: 'scale(0.95)' }), animate('100ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))]),
      transition(':leave', [animate('75ms', style({ opacity: 0, transform: 'scale(0.95)' }))]),
    ]),
  ],
})
export class AuthLayout {
  currYear: number = new Date().getFullYear();
  companyId: number = 1;
  loading = false;
  store: any;
  showTopButton = false;
  apiUrl = environment.apiUrl;
  logo: any;
  company: any;
  copyrightContent: any;
  constructor(
    private renderer: Renderer2,
    private toastr: ToastrService,
    private commonService: MenuMapService,
    private languageService: LanguageService,
    private appSetting: AppService,
    public storeData: Store<any>,
    private service: AppService,
    public translate: TranslateService,
    private localstore: LocalStorageService
  ) {
    this.initStore();
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
    this.getconfig();
  }

  changeFavicon(url: any): void {
    const favicon = this.renderer.selectRootElement('#common-favicon', true);
    this.renderer.setAttribute(favicon, 'href', url);
  }

  getconfig() {
    const procedureParams = { proc_name: 'get_configurations_values', params: { '0': 'ac1', '1': 'ac2' } };

    this.commonService.unAuthProcedureCall(procedureParams).subscribe({
      next: (response: { code: number; status: boolean; data: any; message: string }) => {
        if (response.code === 200 && response.status && response.data) {
          const res = response.data?.[0]?.result || [];

          if (Object.keys(res).length > 0) {
            this.changeFavicon(this.apiUrl + '/' + res.favicon);
            this.logo = res.logo;
            this.company = res.company_name;
            this.copyrightContent = res.footer_content;
            this.localstore.storeData('config', JSON.stringify(res));
            //localStorage.setItem('config', JSON.stringify(res));
          }
        } else {
          const key = 'error';
          const errorMessage = this.translate.instant(key);
          this.toastr.error(errorMessage, 'Error');
          console.log(response.message);
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
}
