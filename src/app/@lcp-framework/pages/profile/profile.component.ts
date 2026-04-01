import { DatePipe, CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProfileApiService } from '../../service/user/profile-api.service';
import { CountryTimezoneService } from '../../service/common/country-timezone.service';
import { environment } from '../../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { FlatpickrDirective } from '../../directives/flatpickr.directive';
import { DynamicFontSizeDirective } from '../../directives/page-specific-font-size.directive';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FlatpickrDirective, TranslateModule, DynamicFontSizeDirective],
  providers: [DatePipe],
  templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnInit {
  apiUrl = localStorage.getItem('lcp_api_base_url') || environment.apiUrl;
  profile_pic: any;
  profileForm: FormGroup;
  countryCodes: string[] = [];
  timezones: { [countryCode: string]: string } = {};
  profilePicture: File | null = null;

  constructor(
    private apiService: ProfileApiService,
    private formBuilder: FormBuilder,
    private countryTimezoneService: CountryTimezoneService,
    private datepipe: DatePipe,
    private toastr: ToastrService,
    private translate: TranslateService
  ) {
    this.profileForm = this.formBuilder.group({
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      dob: ['', Validators.required],
      country_code: ['', Validators.required],
      phone_number: ['', Validators.required],
      gender: ['', Validators.required],
      user_time_zone: ['', Validators.required],
      address: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.fetchUserProfile();
    this.fetchCountryTimezones();
  }

  fetchCountryTimezones() {
    this.timezones = this.countryTimezoneService.getCountryTimezones();
    this.countryCodes = Object.keys(this.timezones);
  }

  fetchUserProfile() {
    this.apiService.getUserProfile().subscribe(
      (response: any) => {
        if (response.code === 200 && response.status) {
          const userData = response.data;
          this.profile_pic = userData.profile_pic;
          localStorage.setItem('profile_pic', this.profile_pic);
          this.profileForm.patchValue({
            first_name: userData.first_name,
            last_name: userData.last_name,
            dob: this.datepipe.transform(userData.dob, 'yyyy-MM-dd'),
            country_code: userData.country_code,
            phone_number: userData.phone_number,
            gender: userData.gender,
            user_time_zone: userData.user_time_zone,
            address: userData.address,
          });
        } else {
          const key = response.message;
          const errorMessage = this.translate.instant(key);
          this.toastr.error(errorMessage, 'Error');
        }
      },
      (error) => {
        const key = 'error';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
      }
    );
  }

  updateProfile() {
    if (this.profileForm.valid) {
      const formData = this.profileForm.value;
      this.apiService.updateUserProfile(formData).subscribe(
        (response) => {
          const key = 'record_updated_successfully';
          const successMessage = this.translate.instant(key);
          this.toastr.success(successMessage);
          this.fetchUserProfile();
          // Handle success response
        },
        (error) => {
          const key = 'error';
          const errorMessage = this.translate.instant(key);
          this.toastr.error(errorMessage, 'Error');
          // Handle error response
        }
      );
    } else {
      this.profileForm.markAllAsTouched();
    }
  }

  onCountryCodeChange() {
    const countryCode = this.profileForm.get('country_code')?.value;
    const timezone = this.countryTimezoneService.getTimezoneByCountryCode(countryCode);
    this.profileForm.get('user_time_zone')?.setValue(timezone);
  }

  onProfilePictureSelected(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    if (inputElement.files && inputElement.files.length > 0) {
      this.profilePicture = inputElement.files[0];
    }
  }

  uploadProfilePicture() {
    if (this.profilePicture) {
      this.apiService.uploadProfilePicture(this.profilePicture).subscribe(
        (response) => {
          const key = 'record_inserted_successfully';
          const successMessage = this.translate.instant(key);
          this.toastr.success(successMessage);
          this.fetchUserProfile();
          // Handle success response
        },
        (error) => {
          const key = 'error';
          const errorMessage = this.translate.instant(key);
          this.toastr.error(errorMessage, 'Error');
          // Handle error response
        }
      );
    }
  }
}
