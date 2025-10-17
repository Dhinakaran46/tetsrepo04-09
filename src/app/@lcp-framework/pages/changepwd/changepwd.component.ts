import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ProfileApiService } from '../../service/user/profile-api.service';
import { environment } from '../../../../environments/environment';
import { ToastrService } from 'ngx-toastr';

import { CommonSharedModule } from '../../shared/common/common.module';
import { TranslateService } from '@ngx-translate/core';

@Component({
  standalone: true,
  imports: [CommonSharedModule, ReactiveFormsModule],
  templateUrl: './changepwd.component.html',
})
export class ChangePwdComponent implements OnInit {
  apiUrl = localStorage.getItem('lcp_api_base_url') || environment.apiUrl;
  changePasswordForm: FormGroup;

  constructor(private apiService: ProfileApiService, private formBuilder: FormBuilder, private toastr: ToastrService, private translate: TranslateService) {
    this.changePasswordForm = this.formBuilder.group(
      {
        old_password: ['', Validators.required],
        new_password: ['', [Validators.required, Validators.minLength(8), this.passwordValidator]],
        confirm_new_password: ['', Validators.required],
      },
      { validators: this.passwordMatchValidator }
    );
  }

  ngOnInit(): void {}

  // Custom validator to check password pattern
  passwordValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) {
      return null;
    }
    const hasUpperCase = /[A-Z]/.test(value);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);
    const isValid = hasUpperCase && hasSpecialChar;
    return !isValid ? { passwordInvalid: true } : null;
  }

  // Custom validator to check if new password and confirm new password match
  passwordMatchValidator(group: FormGroup): ValidationErrors | null {
    const newPassword = group.get('new_password')?.value;
    const confirmNewPassword = group.get('confirm_new_password')?.value;
    return newPassword === confirmNewPassword ? null : { passwordsMismatch: true };
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
      }
    );
  }

  // Method to mark all form controls as touched
  private markAllAsTouched() {
    Object.values(this.changePasswordForm.controls).forEach((control) => {
      control.markAsTouched();
    });
  }
}
