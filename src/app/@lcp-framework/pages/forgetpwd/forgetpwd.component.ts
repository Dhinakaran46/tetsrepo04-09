import { animate, style, transition, trigger } from '@angular/animations';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AppService } from '../../service/common/app.service';
import { IconCaretDownComponent } from '../../shared/icon/icon-caret-down';

import { IconMailComponent } from '../../shared/icon/icon-mail';
import { IconLockDotsComponent } from '../../shared/icon/icon-lock-dots';
import { IconInstagramComponent } from '../../shared/icon/icon-instagram';
import { IconFacebookCircleComponent } from '../../shared/icon/icon-facebook-circle';
import { IconTwitterComponent } from '../../shared/icon/icon-twitter';
import { IconGoogleComponent } from '../../shared/icon/icon-google';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { LoaderComponent } from '../../components/loader/loader.component';
import { AuthService } from '../../service/common/auth.service';
import { CommonSharedModule } from '../../shared/common/common.module';
import { IconEyeComponent } from '../../shared/icon/icon-eye';
import { ProfileApiService } from '../../service/user/profile-api.service';
import { CopyrightComponent } from '../../components/copyright/copyright.component';
import { LanguageService } from '../../service/common/language.service';

@Component({
  selector: 'app-forgetpwd',
  standalone: true,
  templateUrl: './forgetpwd.component.html',
  styleUrl: './forgetpwd.component.scss',
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
export class ForgetpwdComponent {
  companyId: number = 1;

  email = '';
  loading = false;
  store: any;
  fgForm: FormGroup;
  isSubmitted = false;

  constructor(
    private formBuilder: FormBuilder,
    private http: HttpClient,
    public translate: TranslateService,
    public storeData: Store<any>,
    public router: Router,
    private appSetting: AppService,
    private toastr: ToastrService,
    private authService: AuthService,
    private profileApiService: ProfileApiService,
    private languageService: LanguageService
  ) {
    this.initStore();

    this.fgForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/)]],
    });
  }

  ngOnInit() {
    this.fgForm.controls['email'].statusChanges.subscribe((status) => {
      if (this.isSubmitted) {
        this.fgForm.controls['email'].markAsTouched();
      }
    });
  }

  get formControls() {
    return this.fgForm.controls;
  }

  get emailControl() {
    return this.fgForm.get('email');
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

  onSubmit() {
    this.isSubmitted = true;

    if (this.fgForm.controls['email'].hasError('pattern')) {
      const key = 'form_email_valid_msg';
      const errorMessage = this.translate.instant(key);
      this.toastr.error(errorMessage, 'Error');
      return;
    }

    if (this.fgForm.invalid) {
      // Mark fields as touched to trigger validation messages
      this.fgForm.markAllAsTouched();
      return;
    }
    this.loading = true;

    const fgpEmail = this.fgForm.value;

    this.profileApiService.forgetPasswordMail(fgpEmail.email).subscribe({
      next: (response: any) => {
        if (response.code === 200 && response.status) {
          const key = response.message;
          const successMessage = this.translate.instant(key);
          this.toastr.success(successMessage);

          const fwdMailData = response.data;
          this.router.navigate(['/reset-password', fwdMailData.uuid, fwdMailData.id]);
        } else {
          if (response.code == 405 || response.code == 421) {
            const key = 'email_is_not_registered_please_try_again';
            const errorMessage = this.translate.instant(key);
            this.toastr.error(errorMessage, 'Error');
          }
        }
      },
      error: (error) => {
        const key = 'an_error_occurred_during_foreget_password';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
        console.error(error);
      },
      complete: () => {
        this.loading = false;
        console.log('password request completed');
      },
    });
  }
}
