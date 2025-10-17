import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormlyFieldFileComponent } from './components/formly-field-file/formly-field-file.component';
import { FormlyBootstrapModule } from '@ngx-formly/bootstrap';
import { FormlyFieldConfig, FormlyModule } from '@ngx-formly/core';
import { ReactiveFormsModule } from '@angular/forms';
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

export function minLengthValidationMessage(error: any, field: FormlyFieldConfig) {
  if (field.props) return `Should have at least ${field.props.minLength} characters`;
  else return `Should have at least 1 character`;
}

export function maxLengthValidationMessage(error: any, field: FormlyFieldConfig) {
  if (field.props) return `This value should be less than ${field.props.maxLength} characters`;
  else return `This value should be less than 100`;
}

export function minValidationMessage(error: any, field: FormlyFieldConfig) {
  if (field.props) return `This value should be more than ${field.props.min}`;
  else return `This value should be more than 1`;
}

export function maxValidationMessage(error: any, field: FormlyFieldConfig) {
  if (field.props) return `This value should be less than ${field.props.max}`;
  else return `This value should be less than 100`;
}

export const field_types = commonConfig.field_types;
export const search_conditions: any = commonConfig.search_conditions;

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
    SplitLabelPipe,
  ],
  imports: [
    QuillModule,
    MonacoEditorModule,
    CommonModule,
    NgSelectModule,
    WhatsappTagsComponent,
    ReactiveFormsModule,
    FormlyBootstrapModule,
    FormlyPresetModule,
    SafeHtmlPipe,
    FormlyModule.forRoot({
      validationMessages: [
        { name: 'required', message: 'This field is required' },
        { name: 'minLength', message: minLengthValidationMessage },
        { name: 'maxLength', message: maxLengthValidationMessage },
        { name: 'min', message: minValidationMessage },
        { name: 'max', message: maxValidationMessage },
      ],
      presets: [
        {
          name: 'status',
          config: {
            key: 'status_id',
            type: 'radio',
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
        { name: 'email-tags', component: FormlyDisplayListComponent, wrappers: ['form-field'] },
        { name: 'whatsapp-tags', component: WhatsappTagsComponent, wrappers: ['form-field'] },
        { name: 'vs-code', component: FormlyVsCodeComponent, wrappers: ['form-field'] },
        { name: 'repeat-table', component: FormlyRepeatTableFieldComponent, wrappers: ['form-field'] },
        { name: 'color-picker', component: FormlyFieldColorPickerComponent, wrappers: ['form-field'] }
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
    NgSelectModule,
    SplitLabelPipe,
  ],
})
export class FormlyConfigModule { }
