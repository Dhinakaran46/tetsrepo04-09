import { animate, style, transition, trigger } from '@angular/animations';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { AppService } from '../../service/common/app.service';
import { IconCaretDownComponent } from '../../shared/icon/icon-caret-down';

import { IconMailComponent } from '../../shared/icon/icon-mail';
import { IconLockDotsComponent } from '../../shared/icon/icon-lock-dots';
import { IconInstagramComponent } from '../../shared/icon/icon-instagram';
import { IconFacebookCircleComponent } from '../../shared/icon/icon-facebook-circle';
import { IconTwitterComponent } from '../../shared/icon/icon-twitter';
import { IconGoogleComponent } from '../../shared/icon/icon-google';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { LoaderComponent } from '../../components/loader/loader.component';

import { AuthService } from '../../service/common/auth.service';
import { CommonSharedModule } from '../../shared/common/common.module';
import { IconEyeComponent } from '../../shared/icon/icon-eye';
import { CopyrightComponent } from '../../components/copyright/copyright.component';
import { TimezoneService } from '../../service/common/timezone.service';
import { MenuMapService } from '../../service/common/menu-map.service';
import { ThemeService } from '../../service/common/theme.service';

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
import { LocalStorageService } from '../../service/common/local-storage.service';
import { RouteUpdateService } from '../../service/common/route-update.service';
import { LanguageService } from '../../service/common/language.service';
import { MenuLoadService } from '../../service/common/menu-load.service';
import { forkJoin } from 'rxjs';

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

function organizeMenu(menuList: MenuItem[]): MenuItem[] {
  const itemMap = new Map<number, MenuItem>();

  menuList.forEach((item) => {
    itemMap.set(item.id, { ...item, children: [] });
  });

  menuList.forEach((item) => {
    if (item.parent_id !== null) {
      const parent = itemMap.get(item.parent_id);
      if (parent) {
        parent.children!.push(itemMap.get(item.id)!);
      }
    }
  });

  const organizedMenu = menuList
    .filter((item) => item.parent_id === null)
    .map((item) => itemMap.get(item.id)!)
    .sort((a, b) => a.order_no - b.order_no);

  return organizedMenu;
}

@Component({
  standalone: true,
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  imports: [
    CommonSharedModule,
    ReactiveFormsModule,
    IconEyeComponent,
    IconCaretDownComponent,
    IconMailComponent,
    IconLockDotsComponent,
    IconInstagramComponent,
    IconFacebookCircleComponent,
    IconTwitterComponent,
    IconGoogleComponent,
    LoaderComponent,
    CopyrightComponent,
  ],
  animations: [
    trigger('toggleAnimation', [
      transition(':enter', [style({ opacity: 0, transform: 'scale(0.95)' }), animate('100ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))]),
      transition(':leave', [animate('75ms', style({ opacity: 0, transform: 'scale(0.95)' }))]),
    ]),
  ],
})
export class CoverLoginComponent implements OnInit, OnDestroy {
  companyId: number = 1;

  email = '';
  password = '';
  subscribe = false;

  loading = false;
  store: any;
  loginForm: FormGroup;
  isSubmitted = false;

  passwordVisible = false;
  iconClicked = false;

  title_key: string = 'login';

  private focusListener: any;

  constructor(
    private formBuilder: FormBuilder,
    private http: HttpClient,
    public translate: TranslateService,
    public storeData: Store<any>,
    public router: Router,
    private appSetting: AppService,
    private toastr: ToastrService,
    private authService: AuthService,
    private localstore: LocalStorageService,
    private routeUpdateService: RouteUpdateService,
    private languageService: LanguageService,
    private route: ActivatedRoute,
    private menuLoadService: MenuLoadService,
    private timezoneService: TimezoneService,
    private commonService: MenuMapService,
    private themeService: ThemeService
  ) {
    this.initStore();
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/)]],
      password: ['', [Validators.required]],
      subscribe: [false],
    });

    const commonRememberMe = JSON.parse(this.localstore.getData('rememberme'));
    const rememberMe = commonRememberMe ? commonRememberMe.rememberMe === 'true' : false;

    if (rememberMe) {
      this.loginForm.patchValue({
        email: commonRememberMe.savedEmail || '',
        password: commonRememberMe.savedPassword || '',
        subscribe: true,
      });
    }
  }

  ngOnInit() {
    // document.documentElement.classList.add('login-page');
    this.loginForm.controls['email'].statusChanges.subscribe((status) => {
      if (this.isSubmitted) {
        this.loginForm.controls['email'].markAsTouched();
      }
    });

    this.loginForm.controls['password'].statusChanges.subscribe((status) => {
      if (this.isSubmitted) {
        this.loginForm.controls['password'].markAsTouched();
      }
    });

    this.focusListener = () => this.checkIfLoggedIn();
    window.addEventListener('focus', this.focusListener);
  }

  ngOnDestroy(): void {
    document.documentElement.classList.remove('login-page');
    window.removeEventListener('focus', this.focusListener);
  }

  get formControls() {
    return this.loginForm.controls;
  }

  async initStore() {
    this.storeData
      .select((d) => d.index)
      .subscribe((d) => {
        this.store = d;
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

  get emailControl() {
    return this.loginForm.get('email');
  }

  get passwordControl() {
    return this.loginForm.get('password');
  }

  togglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible;
  }

  toggleIcon() {
    this.iconClicked = !this.iconClicked;
  }

  onLoginSuccess(companyId: number): void {
    // Fetch the menu data first and subscribe to it
    this.menuLoadService.fetchMenuData(companyId).subscribe({
      next: (menuList) => {
        if (menuList.length > 0) {
          // Proceed with the rest of the login process

          this.routeUpdateService.addDynamicRoutes();
        } else {
          console.error('Failed to load menu, login halted');
        }
      },
      error: (error) => {
        console.error('Error fetching menu data during login:', error);
      },
    });
  }
  setConfig(companyId: number, userID: any): void {
    this.menuLoadService.fetchConfigData(companyId, userID).subscribe({
      next: (res: any) => {
        this.timezoneService.reloadConfig();
      },
      error: (error: any) => {
        console.error('Error fetching menu data during login:', error);
      },
    });
  }

  checkIfLoggedIn() {
    // Replace with your actual logic to check if user is logged in
    const userData = this.localstore.getData('user_data');
    if (userData) {
      this.router.navigate(['/dashboard']);
    }
  }

  onSubmit() {
    this.isSubmitted = true;

    if (this.loginForm.controls['email'].hasError('pattern')) {
      const key = 'form_email_valid_msg';
      const errorMessage = this.translate.instant(key);
      this.toastr.error(errorMessage, 'Error');
      return;
    }

    if (this.loginForm.invalid) {
      const key = 'Both_fields_are_required_and_valid';
      const errorMessage = this.translate.instant(key);
      this.toastr.error(errorMessage, 'Error');
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading = true;

    const loginData = this.loginForm.value;

    this.authService
      .login({
        ...loginData,
        from_source: 1,
      })
      .subscribe({
        next: async (response: any) => {
          if (response.status) {
            const userID = response.data.id;

            const permissionsObj = response.data.permissions.reduce((acc: any, perm: any) => {
              acc[perm.slug] = perm.accessible;
              return acc;
            }, {});

            // Store the user data along with permissions and menu lists
            const conf: any = this.localstore.getData('config');

            const enc_config: any = JSON.parse(conf);

            this.localstore.storeData('version_info', JSON.stringify(response.data.version_info));
            if (response.data.theme_info) {
              const themeData = JSON.stringify(response.data.theme_info);
              this.localstore.storeData('theme_info', themeData);

              this.themeService.applyThemeFromLocalStorage();
            }
            if (enc_config != null && enc_config.encrypt_local_storage == 'true') {
              this.localstore.storeDataEncrypted(
                'user_data',
                JSON.stringify({
                  main: response.data,
                  permissions: permissionsObj,
                  user_id: userID,
                })
              );
            } else {
              this.localstore.storeData(
                'user_data',
                JSON.stringify({
                  main: response.data,
                  permissions: permissionsObj,
                  user_id: userID,
                })
              );
            }

            // Update permissions list in RouteUpdateService
            this.routeUpdateService.setPermissionsList(permissionsObj);

            if (this.loginForm.value.subscribe) {
              this.localstore.storeData(
                'rememberme',
                JSON.stringify({ savedEmail: this.loginForm.value.email, savedPassword: this.loginForm.value.password, rememberMe: 'true' })
              );
            } else {
              this.localstore.removeData('rememberme');
            }

            this.setConfig(this.companyId, userID);

            this.getconfig(userID);

            this.onLoginSuccess(this.companyId);

            // Add dynamic routes

            forkJoin([this.menuLoadService.fetchMenuData(this.companyId)]).subscribe({
              next: ([configData]) => {
                // Notify other tabs of login
                localStorage.setItem('login', Date.now().toString());
                this.router.navigate(['/dashboard']);
                window.location.reload();
              },
              error: (error) => {
                console.error('Error during login:', error);
                this.toastr.error('Login failed due to an internal error.');
              },
            });
          } else {
            if (response.code === 401) {
              const errorMessage = 'Login Access Denied';
              this.toastr.error(errorMessage, 'Error');
              return;
            }
            if (response.code == 405 || response.code == 421) {
              const key = 'incorrect_username_or_password';
              const errorMessage = this.translate.instant(key);
              this.toastr.error(errorMessage, 'Error');
            } else {
              const key = 'login_failed';
              const errorMessage = this.translate.instant(key);
              this.toastr.error(errorMessage, 'Error');
            }
          }
        },
        error: (error) => {
          const key = 'error';
          let errorMessage = this.translate.instant(key);
          if (error.code === 429) {
            errorMessage = error.message;
          }
          this.toastr.error(errorMessage, 'Error');
          this.loading = false;
          console.error(error);
        },
        complete: () => {
          this.loading = false;
        },
      });
  }

  // Copy of getconfig from AuthLayout
  getconfig(userId?: number) {
    // Prepare params for the procedure
    const params: any = { categories: { '0': 'ac1', '1': 'ac2' } };
    if (userId !== undefined && userId !== null) {
      params.user_id = userId; // Add user_id if provided
      params.categories = { '0': 'ac16', '1': 'ac17' };
    }

    const procedureParams = { proc_name: 'get_configurations_values_v1', params };

    this.commonService.unAuthProcedureCall(procedureParams).subscribe({
      next: (response: { code: number; status: boolean; data: any; message: string }) => {
        if (response.code === 200 && response.status && response.data) {
          const res = response.data?.[0]?.result?.data || {};

          if (Object.keys(res).length > 0) {
            // Optionally handle favicon, logo, etc. here if needed
            this.localstore.storeData('config', JSON.stringify(res));
          }
        } else {
          const key = 'error';
          const errorMessage = this.translate.instant(key);
          this.toastr.error(errorMessage, 'Error');
        }
      },
      error: (error) => {
        console.error('Error fetching data:', error);
      },
      complete: () => {},
    });
  }
}
