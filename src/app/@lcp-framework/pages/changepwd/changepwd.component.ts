import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ProfileApiService } from '../../service/user/profile-api.service';
import { environment } from '../../../../environments/environment';
import { ToastrService } from 'ngx-toastr';

import { CommonSharedModule } from '../../shared/common/common.module';
import { TranslateService } from '@ngx-translate/core';
import { LocalStorageService } from '../../service/common/local-storage.service';

@Component({
  standalone: true,
  imports: [CommonSharedModule, ReactiveFormsModule],
  templateUrl: './changepwd.component.html',
})
export class ChangePwdComponent implements OnInit {
  apiUrl = localStorage.getItem('lcp_api_base_url') || environment.apiUrl;
  changePasswordForm: FormGroup;
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
    private apiService: ProfileApiService,
    private formBuilder: FormBuilder,
    private toastr: ToastrService,
    private translate: TranslateService,
    private localstore: LocalStorageService,
  ) {
    const conf = this.localstore.getData('config');
    // console.log('config:', conf);
    if (conf) {
      try {
        const common_conf: any = JSON.parse(conf);
        // console.log('Parsed config:', common_conf);
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

    this.changePasswordForm = this.formBuilder.group(
      {
        old_password: ['', Validators.required],
        new_password: ['', [Validators.required, this.passwordValidator]],
        confirm_new_password: ['', Validators.required],
      },
      { validators: this.passwordMatchValidator },
    );

    this.changePasswordForm.get('new_password')?.valueChanges.subscribe((value) => {
      this.checkPasswordStrength(value);
      this.toggleSubmitButton();
    });
  }

  ngOnInit(): void {}

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

  checkPasswordStrength(value: string) {
    this.allConditionsMet = !!value && this.passwordValidationPattern.test(value);
  }

  toggleSubmitButton() {
    const passwordValue = this.changePasswordForm.get('new_password')?.value || '';
    const canSubmit = !!passwordValue && this.passwordValidationPattern.test(passwordValue);
    if (canSubmit) {
      this.changePasswordForm.get('new_password')?.setErrors(null);
    } else {
      this.changePasswordForm.get('new_password')?.setErrors({ passwordInvalid: true });
    }
  }

  // Method to handle password change
  onChangePassword() {
    if (this.changePasswordForm && this.changePasswordForm.errors && this.changePasswordForm.errors['passwordsMismatch']) {
      const key = 'passwords_do_not_match';
      const errorMessage = this.translate.instant(key);
      this.toastr.error(errorMessage, 'Error');
      return;
    }

    if (this.changePasswordForm.invalid) {
      this.markAllAsTouched();
      return;
    }

    const formData = {
      old_password: this.changePasswordForm.get('old_password')?.value,
      new_password: this.changePasswordForm.get('new_password')?.value,
    };

    this.apiService.changePassword(formData).subscribe(
      (response) => {
        if (response.code == 200) {
          const key = 'password_changed_successfully';
          const successMessage = this.translate.instant(key);
          this.toastr.success(successMessage);
          this.changePasswordForm.reset();
        } else {
          this.toastr.error(response.message);
        }
      },
      (error) => {
        const key = 'error_changing_password';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage + error, 'Error');
        // Handle error response
      },
    );
  }

  // Method to mark all form controls as touched
  private markAllAsTouched() {
    Object.values(this.changePasswordForm.controls).forEach((control) => {
      control.markAsTouched();
    });
  }
}
