import { animate, style, transition, trigger } from '@angular/animations';
import { Component, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { initialState } from '../../../../store/index.reducer';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AppService } from '../../../service/common/app.service';
import { IconCaretDownComponent } from '../../../shared/icon/icon-caret-down';

import { IconMailComponent } from '../../../shared/icon/icon-mail';
import { IconLockDotsComponent } from '../../../shared/icon/icon-lock-dots';
import { IconInstagramComponent } from '../../../shared/icon/icon-instagram';
import { IconFacebookCircleComponent } from '../../../shared/icon/icon-facebook-circle';
import { IconTwitterComponent } from '../../../shared/icon/icon-twitter';
import { IconGoogleComponent } from '../../../shared/icon/icon-google';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { LoaderComponent } from '../../../components/loader/loader.component';
import { AuthService } from '../../../service/common/auth.service';
import { CommonSharedModule } from '../../../shared/common/common.module';
import { IconEyeComponent } from '../../../shared/icon/icon-eye';
import { ProfileApiService } from '../../../service/user/profile-api.service';
import { CopyrightComponent } from '../../../components/copyright/copyright.component';
import { LocalStorageService } from '../../../service/common/local-storage.service';
import { LanguageService } from '../../../service/common/language.service';

@Component({
  selector: 'app-resetpwd',
  standalone: true,
  templateUrl: './resetpwd.component.html',
  styleUrl: './resetpwd.component.scss',
  imports: [
    CommonSharedModule,
    ReactiveFormsModule,
    LoaderComponent,
  ],
  animations: [
    trigger('toggleAnimation', [
      transition(':enter', [style({ opacity: 0, transform: 'scale(0.95)' }), animate('100ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))]),
      transition(':leave', [animate('75ms', style({ opacity: 0, transform: 'scale(0.95)' }))]),
    ]),
  ],
})
export class ResetpwdComponent {
  companyId: number = 1;

  loading = false;
  store: any = initialState;
  resetPwdForm: FormGroup;
  isSubmitted = false;
  currYear: number = new Date().getFullYear();

  uuid: any;
  id: any;
  commonRememberMe: any;
  // Add these properties for password visibility and icon toggle
  passwordVisible = false;
  iconClicked = false;

  cnfPasswordVisible = false;
  cnficonClicked = false;

  passwordValidationPattern: RegExp = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
  passwordValidationMessage = 'Password must include uppercase, lowercase, number, special character, and be at least 8 characters long.';

  allConditionsMet = false;

  private parsePasswordValidationRegexp(pattern: string): RegExp {
    // Accept both plain regex strings and slash-delimited strings (/.../flags).
    const literalMatch = pattern.match(/^\/(.*)\/([a-z]*)$/i);
    if (literalMatch) {
      return new RegExp(literalMatch[1], literalMatch[2]);
    }
    return new RegExp(pattern);
  }

  constructor(
    private formBuilder: FormBuilder,
    private http: HttpClient,
    public translate: TranslateService,
    public storeData: Store<any>,
    private activeRoute: ActivatedRoute,
    public router: Router,
    private appSetting: AppService,
    private toastr: ToastrService,
    private authService: AuthService,
    private profileApiService: ProfileApiService,
    private localstore: LocalStorageService,
    private languageService: LanguageService,
    private cdr: ChangeDetectorRef
  ) {
    const conf: any = this.localstore.getData('config');
    if (conf) {
      try {
        const common_conf: any = JSON.parse(conf);
        if (common_conf?.password_validation_regexp) {
          this.passwordValidationPattern = this.parsePasswordValidationRegexp(common_conf.password_validation_regexp);
        }
        if (common_conf?.password_validation_message) {
          this.passwordValidationMessage = common_conf.password_validation_message;
        }
      } catch (error) {
        // Keep fallback regex and message if config is unavailable or malformed.
      }
    }

    this.resetPwdForm = this.formBuilder.group(
      {
        otp: ['', Validators.required],
        new_password: ['', [Validators.required, this.passwordValidator]],
        confirm_new_password: ['', Validators.required],
      },
      { validators: this.passwordMatchValidator }
    );

    this.resetPwdForm.get('new_password')?.valueChanges.subscribe((value) => {
      this.checkPasswordStrength(value);
      this.toggleSubmitButton();
    });
  }

  ngOnInit() {
    this.initStore();
    const languageCode = this.languageService.getSavedLanguageCode();
    if (this.languageService.checkReloadFlag()) {
    } else {
    }

    const languageId = this.languageService.getLanguageId(languageCode);
    this.languageService.fetchLanguageData(this.companyId, languageId);

    this.uuid = this.activeRoute.snapshot.paramMap.get('uuid');
    this.id = this.activeRoute.snapshot.paramMap.get('id');

    this.commonRememberMe = JSON.parse(this.localstore.getData('rememberme'));
  }

  get formControls() {
    return this.resetPwdForm.controls;
  }

  // Custom validator to check password pattern
  passwordValidator = (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) {
      return null;
    }
    const isValid = this.passwordValidationPattern.test(value);
    return !isValid ? { passwordInvalid: true } : null;
  };

  // Custom validator to check if new password and confirm new password match
  passwordMatchValidator(group: FormGroup): ValidationErrors | null {
    const newPassword = group.get('new_password')?.value;
    const confirmNewPassword = group.get('confirm_new_password')?.value;
    return newPassword === confirmNewPassword ? null : { passwordsMismatch: true };
  }

  togglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible;
  }

  toggleCNFPasswordVisibility() {
    this.cnfPasswordVisible = !this.cnfPasswordVisible;
  }

  toggleIcon() {
    this.iconClicked = !this.iconClicked;
  }

  cnftoggleIcon() {
    this.cnficonClicked = !this.cnficonClicked;
  }

  checkPasswordStrength(value: string) {
    this.allConditionsMet = !!value && this.passwordValidationPattern.test(value);
  }

  async initStore() {
    this.storeData
      .select((d) => d.index)
      .subscribe((d) => {
        queueMicrotask(() => {
          this.store = d;
          this.cdr.detectChanges();
        });
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

  toggleSubmitButton() {
    const passwordValue = this.resetPwdForm.get('new_password')?.value || '';
    const canSubmit = !!passwordValue && this.passwordValidationPattern.test(passwordValue);
    if (canSubmit) {
      this.resetPwdForm.get('new_password')?.setErrors(null);
    } else {
      this.resetPwdForm.get('new_password')?.setErrors({ passwordInvalid: true });
    }
  }

  onResetPassword() {
    this.isSubmitted = true;

    if (this.resetPwdForm && this.resetPwdForm.errors && this.resetPwdForm.errors['passwordsMismatch']) {
      const key = 'passwords_do_not_match';
      const errorMessage = this.translate.instant(key);
      this.toastr.error(errorMessage, 'Error');
      return;
    }

    if (this.resetPwdForm.invalid) {
      this.markAllAsTouched();
      return;
    }

    const formData = {
      uuid: this.uuid,
      otp: this.resetPwdForm.get('otp')?.value,
      new_password: this.resetPwdForm.get('new_password')?.value,
      confirm_password: this.resetPwdForm.get('confirm_new_password')?.value,
    };

    this.profileApiService.resetPasswordMail(formData).subscribe(
      (response) => {
        if (response.code === 200 && response.status) {
          // Handle success response
          const key = response.message;
          const successMessage = this.translate.instant(key);
          this.toastr.success(successMessage);
          if (this.commonRememberMe) {
            this.localstore.removeData('rememberme');
          }
          this.resetPwdForm.reset();
          this.router.navigate(['/login']);
        } else if (response.code == 424 || response.code == 425) {
          const key = response.message;
          const errorMessage = this.translate.instant(key);
          this.toastr.error(errorMessage, 'Error');
        }
      },
      (error) => {
        const key = 'error_changing_password';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage + error, 'Error');
        // Handle error response
      }
    );
  }

  // Method to mark all form controls as touched
  private markAllAsTouched() {
    Object.values(this.resetPwdForm.controls).forEach((control) => {
      control.markAsTouched();
    });
  }
}
