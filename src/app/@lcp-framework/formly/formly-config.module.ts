import { inject, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormlyFieldFileComponent } from './components/formly-field-file/formly-field-file.component';
import { FormlyBootstrapModule } from '@ngx-formly/bootstrap';
import { FormlyFieldConfig, FormlyModule, FormlyExtension } from '@ngx-formly/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { FormlyPresetModule } from '@ngx-formly/core/preset';
import { FileValueAccessor } from './directives/file-value-accessor';
import { FormlyFieldRepeatComponent } from './components/formly-field-repeat/formly-field-repeat.component';
import { commonConfig } from '../config/common.config';
import { debounceTime, map } from 'rxjs/operators';
import { FormlyFieldSelectFromDbComponent } from './components/formly-field-select-from-db/formly-field-select-from-db.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { FormlyFieldAutocompleteComponent } from './components/formly-field-autocomplete/formly-field-autocomplete.component';
import { FormlyRichEditorComponent } from './components/formly-rich-editor/formly-rich-editor.component';
import { QuillModule } from 'ngx-quill';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { FormlyDisplayListComponent } from './components/formly-display-list/formly-display-list.component';
import { FormlyVsCodeComponent } from './components/formly-vs-code/formly-vs-code.component';
import { FormlyRepeatTableFieldComponent } from './components/formly-repeat-table-field/formly-repeat-table-field.component';
import { SafeHtmlPipe } from '../pipes/safehtml/safe-html.pipe';
import { WhatsappTagsComponent } from './components/whatsapp-tags/whatsapp-tags.component';
import { SplitLabelPipe } from '../pipes/split-label.pipe';
import { FormlyFieldColorPickerComponent } from './components/formly-field-color-picker/formly-field-color-picker.component';
import { TranslateService } from '@ngx-translate/core';
import { FormlyFieldTreeSelectComponent } from './components/formly-field-tree-select/formly-field-tree-select.component';

export function translateMessage(key: string, defaultVal: string) {
  return (error: any, field: FormlyFieldConfig) => {
    try {
      const translate = inject(TranslateService);
      const val = translate.instant(key);
      return val !== key ? val : defaultVal;
    } catch (e) {
      return defaultVal;
    }
  };
}

export function minLengthValidationMessage(error: any, field: FormlyFieldConfig) {
  let defaultVal = '';
  if (field.props) defaultVal = `Should have at least ${field.props.minLength} characters`;
  else defaultVal = `Should have at least 1 character`;

  try {
    const translate = inject(TranslateService);
    const val = translate.instant('form_validation_min_length_message');
    if (val !== 'form_validation_min_length_message') {
      return val.replace('{0}', String(field.props?.minLength || 1));
    }
  } catch (e) {}
  return defaultVal;
}

export function maxLengthValidationMessage(error: any, field: FormlyFieldConfig) {
  let defaultVal = '';
  if (field.props) defaultVal = `This value should be less than ${field.props.maxLength} characters`;
  else defaultVal = `This value should be less than 100`;

  try {
    const translate = inject(TranslateService);
    const val = translate.instant('form_validation_max_length_message');
    if (val !== 'form_validation_max_length_message') {
      return val.replace('{0}', String(field.props?.maxLength || 100));
    }
  } catch (e) {}
  return defaultVal;
}

export function minValidationMessage(error: any, field: FormlyFieldConfig) {
  let defaultVal = '';
  if (field.props) defaultVal = `This value should be more than ${field.props.min}`;
  else defaultVal = `This value should be more than 1`;

  try {
    const translate = inject(TranslateService);
    const val = translate.instant('form_validation_min_message');
    if (val !== 'form_validation_min_message') {
      return val.replace('{0}', String(field.props?.min || 1));
    }
  } catch (e) {}
  return defaultVal;
}

export function maxValidationMessage(error: any, field: FormlyFieldConfig) {
  let defaultVal = '';
  if (field.props) defaultVal = `This value should be less than ${field.props.max}`;
  else defaultVal = `This value should be less than 100`;

  try {
    const translate = inject(TranslateService);
    const val = translate.instant('form_validation_max_message');
    if (val !== 'form_validation_max_message') {
      return val.replace('{0}', String(field.props?.max || 100));
    }
  } catch (e) {}
  return defaultVal;
}

export const field_types = commonConfig.field_types;
export const search_conditions: any = commonConfig.search_conditions;

export const lcpPresetExtension: FormlyExtension = {
  prePopulate(field) {
    if (!field.type) return;

    // Formly v7 compatibility: generically merge legacy templateOptions into props
    field.props = field.props || {};
    if (field.templateOptions) {
      field.props = { ...field.templateOptions, ...field.props };
    }

    if (field.type === '#status') {
      field.type = 'radio';
      field.key = field.key || 'status_id';
      if (field.defaultValue === undefined) field.defaultValue = 1;
      field.props.label = field.props.label || 'Status';
      if (field.props.required === undefined) field.props.required = true;
      field.props.options = field.props.options || [
        { value: 1, label: 'Active', class: 'inline-flex' },
        { value: 2, label: 'In Active', class: 'inline-flex' },
      ];
    } else if (field.type === '#field_type') {
      field.type = 'select-from-db';
      field.key = field.key || 'field_type_id';
      field.props.label = field.props.label || 'Field Type';
      field.props.placeholder = field.props.placeholder || 'Please select';
      if (field.props.required === undefined) field.props.required = true;
      field.props.options = field.props.options || [
        { label: 'field_types_integer', value: 1 },
        { label: 'field_types_float', value: 2 },
        { label: 'field_types_string', value: 3 },
        { label: 'field_types_big_string', value: 4 },
        { label: 'field_types_date', value: 5 },
        { label: 'field_types_time', value: 6 },
        { label: 'field_types_date_time', value: 7 },
        { label: 'field_types_integer_range', value: 8 },
        { label: 'field_types_float_range', value: 9 },
        { label: 'field_types_date_range', value: 10 },
        { label: 'field_types_json', value: 11 },
      ];
    } else if (field.type === '#search_conditions') {
      field.type = 'select-from-db';
      field.key = field.key || 'search_conditions';
      field.props.label = field.props.label || 'Search Condition';
      field.props.placeholder = field.props.placeholder || 'Please select';
      if (field.props.required === undefined) field.props.required = true;
      field.props.options = field.props.options || [];
      field.hooks = field.hooks || {};
      field.hooks.onInit = (f: FormlyFieldConfig) => {
        const fieldTypeControl = f.parent?.formControl?.get('field_type_id');
        if (fieldTypeControl) {
          fieldTypeControl.valueChanges
            .pipe(
              debounceTime(300),
              map((value: any) => {
                const options = value ? [...search_conditions[value]] : [];
                return options;
              })
            )
            .subscribe((options) => {
              if (f.props) {
                f.props.options = options;
              }
              if (f.formControl && f.formControl.updateValueAndValidity) {
                f.formControl.updateValueAndValidity({ onlySelf: true, emitEvent: false });
              }
              // Trigger Formly change detection to ensure UI updates after async options modification
              if (f.options && f.options.detectChanges) {
                f.options.detectChanges(f);
              }
            });
        }
      };
    }

    const inputType = field.props?.type || field.templateOptions?.type;
    if (field.type === 'input' && (inputType === 'date' || inputType === 'datetime-local' || inputType === 'datetime')) {
      field.hooks = field.hooks || {};
      const originalOnInit = field.hooks.onInit;
      field.hooks.onInit = (f: FormlyFieldConfig) => {
        if (originalOnInit) originalOnInit(f);
        const control = f.formControl;
        if (control) {
          if (control.value === '') {
            control.setValue(null);
          }
          control.valueChanges.subscribe((val) => {
            if (val === '') {
              control.setValue(null);
            }
          });
        }
      };
    }
  },
};

@NgModule({
  declarations: [
    FileValueAccessor,
    FormlyFieldFileComponent,
    FormlyFieldRepeatComponent,
    FormlyFieldSelectFromDbComponent,
    FormlyFieldAutocompleteComponent,
    FormlyRichEditorComponent,
    FormlyDisplayListComponent,
    FormlyVsCodeComponent,
    FormlyRepeatTableFieldComponent,
    FormlyFieldColorPickerComponent,
    FormlyFieldTreeSelectComponent,
    SplitLabelPipe,
  ],
  imports: [
    QuillModule,
    MonacoEditorModule,
    CommonModule,
    NgSelectModule,
    WhatsappTagsComponent,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    FormlyBootstrapModule,
    FormlyPresetModule,
    SafeHtmlPipe,
    FormlyModule.forChild({
      validationMessages: [
        { name: 'required', message: translateMessage('required_message', 'This field is required') },
        { name: 'minLength', message: minLengthValidationMessage },
        { name: 'maxLength', message: maxLengthValidationMessage },
        { name: 'min', message: minValidationMessage },
        { name: 'max', message: maxValidationMessage },
        { name: 'email', message: translateMessage('form_validation_email_format', 'Invalid email format') },
        { name: 'phone', message: translateMessage('form_validation_phone_format', 'Invalid phone number format') },
        {
          name: 'username',
          message: translateMessage('form_validation_username_format', 'Username can only contain alphanumeric characters, underscores, and hyphens'),
        },
        { name: 'noFutureDate', message: translateMessage('form_validation_no_future_date', 'Date cannot be in the future') },
        {
          name: 'phoneAndCountry',
          message: translateMessage('form_validation_phone_and_country_required', 'Both country code and phone number are required if either is provided'),
        },
        { name: 'noHtml', message: translateMessage('form_validation_html_not_allowed', 'HTML tags or scripts are not allowed') },
        { name: 'alphanumeric', message: translateMessage('form_validation_only_alphanumeric_allowed', 'Only alphanumeric characters are allowed') },
        { name: 'numeric', message: translateMessage('form_validation_only_numeric_allowed', 'Only numeric characters are allowed') },
        { name: 'url', message: translateMessage('form_validation_invalid_url_format', 'Invalid URL format') },
      ],
      validators: [
        {
          name: 'email',
          validation: (c: import('@angular/forms').AbstractControl) => {
            if (!c.value) return null;
            const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            return emailRegex.test(c.value) ? null : { email: true };
          },
        },
        {
          name: 'phone',
          validation: (c: import('@angular/forms').AbstractControl) => {
            if (!c.value) return null;
            const phoneRegex = /^\+?[0-9\s\-()]+$/;
            return phoneRegex.test(c.value) ? null : { phone: true };
          },
        },
        {
          name: 'username',
          validation: (c: import('@angular/forms').AbstractControl) => {
            if (!c.value) return null;
            const usernameRegex = /^[a-zA-Z0-9_\-]+$/;
            return usernameRegex.test(c.value) ? null : { username: true };
          },
        },
        {
          name: 'noFutureDate',
          validation: (c: import('@angular/forms').AbstractControl) => {
            if (!c.value) return null;
            const inputDate = new Date(c.value);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return inputDate <= today ? null : { noFutureDate: true };
          },
        },
        {
          name: 'phoneAndCountry',
          validation: (c: import('@angular/forms').AbstractControl, field?: any) => {
            const parent = c.parent;
            if (!parent) return null;

            // 1. Check if explicit keys are configured in the field props
            let phoneKey = field?.props?.['phoneNumberField'] || field?.templateOptions?.['phoneNumberField'];
            let countryKey = field?.props?.['countryCodeField'] || field?.templateOptions?.['countryCodeField'];

            // 2. If not explicitly defined, search by key conventions in the parent group controls
            if (!phoneKey || !countryKey) {
              Object.keys(parent.controls).forEach((key) => {
                const k = key.toLowerCase();
                if (!phoneKey && (k.includes('phone') || k.includes('mobile'))) {
                  phoneKey = key;
                } else if (!countryKey && (k.includes('country') || k.includes('dial'))) {
                  countryKey = key;
                }
              });
            }

            if (phoneKey && countryKey) {
              const phoneControl = parent.get(phoneKey);
              const countryControl = parent.get(countryKey);

              if (phoneControl && countryControl) {
                const phoneVal = phoneControl.value;
                const countryVal = countryControl.value;
                const hasError = (phoneVal && !countryVal) || (!phoneVal && countryVal);

                const siblingControl = c === phoneControl ? countryControl : phoneControl;
                if (siblingControl) {
                  const siblingHasError = siblingControl.hasError('phoneAndCountry');
                  if (hasError && !siblingHasError) {
                    siblingControl.setErrors({ ...siblingControl.errors, phoneAndCountry: true }, { emitEvent: false });
                  } else if (!hasError && siblingHasError) {
                    const errors = { ...siblingControl.errors };
                    delete errors['phoneAndCountry'];
                    siblingControl.setErrors(Object.keys(errors).length ? errors : null, { emitEvent: false });
                  }
                }

                return hasError ? { phoneAndCountry: true } : null;
              }
            }
            return null;
          },
        },
        {
          name: 'noHtml',
          validation: (c: import('@angular/forms').AbstractControl) => {
            if (!c.value || typeof c.value !== 'string') return null;
            const htmlRegex = /<[^>]*>/;
            return htmlRegex.test(c.value) ? { noHtml: true } : null;
          },
        },
        {
          name: 'alphanumeric',
          validation: (c: import('@angular/forms').AbstractControl) => {
            if (!c.value) return null;
            const alphanumericRegex = /^[a-zA-Z0-9]+$/;
            return alphanumericRegex.test(c.value) ? null : { alphanumeric: true };
          },
        },
        {
          name: 'numeric',
          validation: (c: import('@angular/forms').AbstractControl) => {
            if (!c.value) return null;
            const numericRegex = /^[0-9]+$/;
            return numericRegex.test(c.value) ? null : { numeric: true };
          },
        },
        {
          name: 'url',
          validation: (c: import('@angular/forms').AbstractControl) => {
            if (!c.value) return null;
            const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
            return urlRegex.test(c.value) ? null : { url: true };
          },
        },
      ],
      extensions: [{ name: 'lcp-preset-expansion', extension: lcpPresetExtension }],
      presets: [
        {
          name: 'status',
          config: {
            key: 'status_id',
            type: 'radio',
            defaultValue: 1,
            props: {
              label: 'Status',
              required: true,
            },
            expressionProperties: {
              'props.options': (model: any, formState: any) => {
                const opts = [
                  { value: 1, label: 'Active', class: 'inline-flex' },
                  { value: 2, label: 'In Active', class: 'inline-flex' },
                ];
                return opts;
              },
            },
          },
        },
        {
          name: 'field_type',
          config: {
            key: 'field_type_id',
            type: 'select-from-db',
            props: {
              label: 'Field Type',
              placeholder: 'Please select',
              required: true,
              options: [...field_types],
            },
          },
        },
        {
          name: 'search_conditions',
          config: {
            key: 'search_conditions',
            type: 'select-from-db',
            props: {
              label: 'Search Condition',
              placeholder: 'Please select',
              required: true,
              options: [],
            },
            hooks: {
              onInit: (field: FormlyFieldConfig) => {
                const fieldTypeControl = field.parent?.formControl?.get('field_type_id');
                if (fieldTypeControl) {
                  fieldTypeControl.valueChanges
                    .pipe(
                      debounceTime(300), // Add debounce to avoid rapid value changes
                      map((value: any) => {
                        const options = value ? [...search_conditions[value]] : [];
                        return options;
                      })
                    )
                    .subscribe((options) => {
                      // Assign new options array to ensure change detection
                      if (field.props) {
                        field.props.options = options;
                      }

                      // Trigger change detection manually if necessary
                      if (field.formControl && field.formControl.updateValueAndValidity) {
                        field.formControl.updateValueAndValidity({ onlySelf: true, emitEvent: false });
                      }
                    });
                }
              },
            },
          },
        },
      ],
      types: [
        { name: 'file', component: FormlyFieldFileComponent, wrappers: ['form-field'] },
        { name: 'image', component: FormlyFieldFileComponent, wrappers: ['form-field'] },
        { name: 'repeat', component: FormlyFieldRepeatComponent, wrappers: ['form-field'] },
        { name: 'select-from-db', component: FormlyFieldSelectFromDbComponent, wrappers: ['form-field'] },
        { name: 'async-select-from-db', component: FormlyFieldAutocompleteComponent, wrappers: ['form-field'] },
        { name: 'rich-editor', component: FormlyRichEditorComponent, wrappers: ['form-field'] },
        { name: 'notification-tags', component: FormlyDisplayListComponent, wrappers: ['form-field'] },
        { name: 'whatsapp-tags', component: WhatsappTagsComponent, wrappers: ['form-field'] },
        { name: 'vs-code', component: FormlyVsCodeComponent, wrappers: ['form-field'] },
        { name: 'repeat-table', component: FormlyRepeatTableFieldComponent, wrappers: ['form-field'] },
        { name: 'color-picker', component: FormlyFieldColorPickerComponent, wrappers: ['form-field'] },
        { name: 'tree-select', component: FormlyFieldTreeSelectComponent, wrappers: ['form-field'] },
      ],
    }),
  ],
  exports: [
    FormlyModule,
    ReactiveFormsModule,
    FileValueAccessor,
    FormlyFieldFileComponent,
    FormlyFieldRepeatComponent,
    FormlyPresetModule,
    FormlyFieldSelectFromDbComponent,
    FormlyFieldAutocompleteComponent,
    FormlyFieldTreeSelectComponent,
    NgSelectModule,
    FormlyBootstrapModule,
    SplitLabelPipe,
  ],
})
export class FormlyConfigModule {}
