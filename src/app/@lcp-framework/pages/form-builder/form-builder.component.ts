import { Component, EventEmitter, Input, OnInit, Output, ViewChildren, QueryList, AfterViewInit } from '@angular/core';
import { CommonSharedModule } from '../../shared/common/common.module';
import { GridApiService } from '../../service/common/grid.service';
import { ToastrService } from 'ngx-toastr';
import { Store, select } from '@ngrx/store';
import { FormlyFieldConfig, FormlyFormOptions } from '@ngx-formly/core';
import { AbstractControl, AsyncValidatorFn, FormArray, FormControl, FormGroup, ValidationErrors } from '@angular/forms';
import { Observable, forkJoin, of } from 'rxjs';
import { tap, map, catchError } from 'rxjs/operators';
import { ActivatedRoute, Router } from '@angular/router';
import { FormlyConfigModule } from '../../formly/formly-config.module';
import { ChangeDetectorRef } from '@angular/core';
import { Location } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { Title } from '@angular/platform-browser';
import { LocalStorageService } from '../../service/common/local-storage.service';
import { FormlyFieldSelectFromDbComponent } from '../../formly/components/formly-field-select-from-db/formly-field-select-from-db.component';

@Component({
  selector: 'app-form-builder',
  standalone: true,
  imports: [CommonSharedModule, FormlyConfigModule],
  templateUrl: './form-builder.component.html',
  styleUrls: ['./form-builder.component.scss'],
})
export class FormBuilderComponent implements OnInit, AfterViewInit {
  store: any;
  formEntity: any;
  form = new FormGroup({});
  options: FormlyFormOptions = {};
  model: any = {};
  fields: FormlyFieldConfig[] = [];
  listParams: any;
  listDatas: any = {};
  transParam: any;
  entity_name!: string | null;
  entity_type!: any;
  unique_id!: string | null;
  originaluid!: string | null;
  defaultData: any = {};
  defaultDataParam!: any;
  uploadedFiles: string[] = [];
  oldUploadedFiles: string[] = []; // after edit completion old fils should removed
  pageInfo: any;
  policyData: any = null;
  user_info: any;
  draftMode = false;
  isDrafted = false;
  processStatus: any = 'submitted';

  // Add properties for nested form-builder modal
  isNestedFormModalOpen = false;
  nestedFormEntityName: string | null = null;
  nestedFormUuid: string | null = null;
  noNestedFormPermission: boolean = false;
  public nestedFormFieldKey: string | null = null;
  public nestedFormModalConfig: any = null;
  public nestedModalEntityType: 'popup_add' | 'popup_edit' = 'popup_add';

  processStatuses: any = {
    submitted: {
      value: 'table_process_status_val_0',
      border_color: 'badge-outline-primary',
    },
    approved: {
      value: 'table_process_status_val_1',
      border_color: 'badge-outline-success',
    },
    rejected: {
      value: 'table_process_status_val_2',
      border_color: 'badge-outline-danger',
    },
    under_approval: {
      value: 'table_process_status_val_3',
      border_color: 'badge-outline-warning',
    },
    created: {
      value: 'table_process_status_val_4',
      border_color: 'badge-outline-success',
    },
    not_appear: {
      value: 'table_process_status_val_5',
      border_color: 'badge-outline-danger',
    },
  };

  @Input() uuid!: string | null;
  @Input() entityName!: string;
  @Input() entityType!: string;
  @Input() isModal: boolean = false;
  @Input() isNested: boolean = false;
  @Input() fieldKey: string | null = null;
  @Output() closeModal = new EventEmitter<void>();
  @Output() nestedFormSuccess = new EventEmitter<any>();
  
  @ViewChildren(FormlyFieldSelectFromDbComponent) selectFromDbFields!: QueryList<FormlyFieldSelectFromDbComponent>;

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private gridApiService: GridApiService,
    private toastr: ToastrService,
    public storeData: Store<any>,
    private cdRef: ChangeDetectorRef,
    public location: Location,
    private translate: TranslateService,
    private titleService: Title,
    private localStorageService: LocalStorageService
  ) {}

  ngOnInit() {
    if (!this.uuid) {
      this.route.paramMap.subscribe((params) => {
        const id = params.get('id');
        const uuid = params.get('uuid');
        const value = id || uuid;
        console.log(value)
        this.originaluid = value;
        this.unique_id = value;
      });
    }
    console.log(this.uuid)
    if (this.uuid) {
      this.unique_id = this.uuid;
    }
    console.log(this.unique_id)
    if (!this.entityName) {
      this.route.data.subscribe((data) => {
        this.pageInfo = data['pageInfo'];
        this.entity_name = this.pageInfo.fullEntity;
        this.entity_type = this.pageInfo.action_slug;
        this.draftMode = this.pageInfo.draft_mode;
      });
    }
    console.log(this.nestedModalEntityType);
    if (this.entityName) {
      this.entity_name = this.entityName;
      if(this.entityType){
        this.entity_type = this.entityType;
      }else{
        if (this.unique_id) {
          this.entity_type = 'popup_edit';
        } else {
          this.entity_type = 'popup_add';
        }
      }
      
      const translateTitle = this.translate.instant(this.entity_name);
      this.titleService.setTitle(translateTitle);
    } 
    

    
    

    this.user_info = JSON.parse(this.localStorageService.getData('user_data'));
    if (this.user_info.main?.policies) {
      this.policyData = this.user_info.main?.policies || null;
    }

    if (this.entity_type !== 'add' && this.entity_type !== 'popup_add' && !this.unique_id) {
      
      this.toastr.error('Invalid entity details given.');
      this.router.navigate(['/dashboard']);
      return;
    }

    this.options = {
      formState: {
        componentInstance: this, // 'this' is the actual component reference
        submitted: false,
        isDraftMode: this.draftMode,
      },
    };

    this.initStore();
    this.resetForm();

    this.form.valueChanges.subscribe((val) => {
      const rawValue = this.flatten(val);
      this.processStatus = rawValue?.process_status || 'submitted';
      this.isDrafted = rawValue?.is_drafted || false;
    });
  }

  ngAfterViewInit() {
    const pageInfo = this.route.snapshot.data['pageInfo'] || '';
    
  }

  private initStore() {
    this.storeData
      .select((d) => d.index)
      .subscribe((d) => {
        this.store = d;
      });
  }

  uniqueValidator(key: string): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      const value = control.value;

      if (!value || !this.listParams[key]) {
        return of(null); // No validation if there's no value or key
      }

      // Clone the listParams object deeply to avoid mutating the original object
      let listParams = JSON.parse(JSON.stringify(this.listParams[key]));

      // Replace 'this.label' with the current control value, and 'this.value' with the unique_id
      if (listParams.search_all) {
        listParams.search_all = listParams.search_all.map((item: any) => {
          Object.keys(item).forEach((sKey) => {
            if (typeof item[sKey] === 'string') {
              if (item[sKey] === 'this.label') {
                item[sKey] = value.trim(); // Replace 'this.label' with control value
              }
              if (item[sKey] === 'this.value') {
                item[sKey] = this.unique_id; // Replace 'this.value' with unique_id
              }
            }
          });
          return item;
        });
      }

      // Replace placeholders with the updated model values
      listParams = this.replacePlaceholders(listParams, this.model, false);

      // Make the API call to check if the value is unique
      return this.gridApiService.getAllList(listParams).pipe(
        map((response) => {
          if (response.status && response.code === 200) {
            const records = response.data?.records || [];
            return records.length > 0 ? null : { unique: true }; // If records exist, mark as not unique
          } else {
            return null; // No validation error if response isn't valid
          }
        }),
        catchError(() => {
          return of(null); // Handle errors gracefully, no validation error on failure
        })
      );
    };
  }

  fetchList(field: FormlyFieldConfig | any, key: string, reset: boolean = false): Observable<any> {
    return new Observable(observer => {
      if (!reset && key && this.listDatas[key]) {
        if (field && field.props) {
          field.props.options = this.listDatas[key];
        }
        observer.next(this.listDatas[key]);
        observer.complete();
      } else if (key && this.listParams[key]) {
        const required = false;
        let listParams = this.localStorageService.replaceUniqueId(
          this.localStorageService.formatPayloadWithPolicyConditions(
            this.replacePlaceholders(this.listParams[key], this.model, required),
            this.policyData,
            field?.attached_policies || []
          ),
          '$session_user_id',
          this.user_info.main.id
        );
        listParams.company_id = 1;
        listParams = this.localStorageService.replaceUniqueId(listParams, '$unique_id', this.unique_id || '');
        console.log(listParams)
        this.gridApiService.getAllList(listParams).subscribe(
          (response) => {
            if (response.status && response.code === 200) {
              const records = response.data?.records || [];
              const options = [...records];
              this.listDatas[key] = options;
              if (field && field.props) {
                field.props.options = options;
              }
              observer.next(options);
              observer.complete();
            } else {
              observer.next([]);
              observer.complete();
            }
          },
          (error) => {
            observer.error(error);
          }
        );
      } else {
        observer.next([]);
        observer.complete();
      }
    });
  }

  trimFormValues(formGroup: FormGroup | FormArray) {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key);

      if (control instanceof FormControl) {
        const value = control.value;

        // Only trim if the value is a string
        if (typeof value === 'string') {
          control.setValue(value.trim(), { emitEvent: false });
        }
      } else if (control instanceof FormGroup || control instanceof FormArray) {
        // Recursively trim values in nested FormGroup or FormArray
        this.trimFormValues(control);
      }
    });
  }

  onSubmit(draft_mode: boolean = false) {
    this.options.formState.submitted = true;
    // Trim all form values before validation
    if (this.form.invalid) {
      // const key = 'please_select_all_the_required_fields';
      // const errorMessage = this.translate.instant(key);
      // this.toastr.error(errorMessage, 'Error');
      return;
    }
    this.trimFormValues(this.form);
    if (this.form.invalid) {
      // const key = 'please_select_all_the_required_fields';
      // const errorMessage = this.translate.instant(key);
      // this.toastr.error(errorMessage, 'Error');
      return;
    }
    const uploadObservables = this.collectFileUploadObservables();
    if (uploadObservables.length === 0) {
      // If there are no files to upload, directly proceed with the transaction
      this.executeTransaction(draft_mode);
    } else {
      forkJoin(uploadObservables).subscribe({
        next: () => {
          this.executeTransaction(draft_mode);
        },
        error: (error) => {
          this.toastr.error('Error uploading files: ' + error.message);
          if (this.uploadedFiles.length) this.deleteImageByName(this.uploadedFiles);
        },
      });
    }
  }

  private redirectToCurrentPage() {
    const currentUrl = this.router.url; // Get the current URL
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigate([currentUrl]); // Navigate back to the current URL
    });
  }

  private executeTransaction(draft_mode: boolean) {
    // this.model = { ...this.model, ...this.form.value };
    // 
    
    let transParam = this.replaceDataPlaceholders(this.transParam, this.model, false, draft_mode);
    transParam = this.replacePlaceholders(transParam, this.model);
    const val = transParam.data.table1[0].name;
    this.gridApiService.executeTransaction(transParam).subscribe(
      (response) => {
        
        if (response.status) {
          if (this.oldUploadedFiles.length) this.deleteImageByName(this.oldUploadedFiles);
          const key = 'transaction_successfully_executed';
          const successMessage = this.translate.instant(key);
          this.toastr.success(successMessage);
          if (this.isNested) {
            setTimeout(() => {
            this.nestedFormSuccess.emit({ value: val, fieldKey: this.fieldKey });
            },500);
          } else {
            this.redirectToCurrentPage();
          }
        } else {
          const key = response.message;
          const errorMessage = this.translate.instant(key);
          this.toastr.error(errorMessage, 'Error');
          if (this.uploadedFiles.length) this.deleteImageByName(this.uploadedFiles);
        }
      },
      (error) => {
        const key = 'error';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
        if (this.uploadedFiles.length) this.deleteImageByName(this.uploadedFiles);
      }
    );
  }

  private deleteImageByName(images: string[]) {
    const uploadObservable = this.gridApiService.deleteImageByName({ images }).subscribe((response) => {
      if (response.status && response.code === 200) {
      }
    });
  }

  private collectFileUploadObservables(fields: any = null, parentKey: string = ''): Observable<any>[] {
    fields = fields || this.fields;
    const uploadObservables: Observable<any>[] = [];
    this.uploadedFiles = [];
    this.oldUploadedFiles = [];

    fields.forEach((field: any) => {
      const fieldKey = parentKey ? `${parentKey}.${field.key}` : field.key;

      // Handle FormGroup
      if (field.fieldGroup?.length) {
        uploadObservables.push(...this.collectFileUploadObservables(field.fieldGroup, fieldKey));
      }

      // Handle FormArray
      if (field.fieldArray?.fieldGroup) {
        const formArrayModel = this.model[field.key];
        formArrayModel.forEach((formArrayItem: any, index: number) => {
          const nestedFields = field.fieldArray.fieldGroup.map((nestedField: any) => {
            return {
              ...nestedField,
              key: `${fieldKey}[${index}].${nestedField.key}`,
            };
          });
          // uploadObservables.push(...this.collectFileUploadObservables(nestedFields, `${fieldKey}[${index}]`));
          uploadObservables.push(...this.collectFileUploadObservables(nestedFields));
        });
      }

      // Handle image field
      if (field.type === 'file' || field.type === 'image') {
        const controlName = fieldKey;
        const files = this.getFilesFromModel(controlName, parentKey);
        if (files && files.length > 0) {
          const formData: FormData = new FormData();
          if (Array.isArray(files)) {
            files.forEach((file: any) => {
              formData.append('image', file, file.name);
            });
          } else if (files) {
            formData.append('image', files[0], files.name);
          }
          const uploadObservable = this.gridApiService.uploadImageAndGetName(formData).pipe(
            tap((response: any) => {
              if (response.body && response.body.status) {
                const docNames: string = response.body.data.map((item: { docName: string }) => item.docName).join(',');
                this.uploadedFiles.push(...response.body.data.map((item: { docName: string }) => item.docName));
                const controlKey = this.removeSuffix(controlName, '_file');
                const formControl: any = this.getFormControlFromPath(controlKey);
                if (formControl) {
                  formControl.setValue(docNames);

                  // Update the model using a helper to correctly set nested values
                  this.setNestedValueInModel(this.model, controlKey, docNames);
                }
                const defaultValue = this.getNestedValueFromPath(this.defaultData, controlKey);
                if (defaultValue) {
                  this.oldUploadedFiles.push(defaultValue);
                }
                // if (this.defaultData[controlKey]) {
                //   this.oldUploadedFiles.push(this.defaultData[controlKey]);
                // }
              }
            })
          );
          uploadObservables.push(uploadObservable);
        }
      }
    });

    return uploadObservables;
  }

  private setNestedValueInModel(obj: any, path: string, value: any): void {
    if (!obj || !path) return;

    // Convert array-like notation (e.g., `item_images[0].image_path`) to proper dot notation
    const pathSegments = path.replace(/\[(\d+)\]/g, '.$1').split('.');

    let current = obj;
    for (let i = 0; i < pathSegments.length; i++) {
      const segment = pathSegments[i];

      // If at the last segment, set the value
      if (i === pathSegments.length - 1) {
        current[segment] = value;
      } else {
        // Initialize nested objects or arrays if they don't exist
        if (!current[segment]) {
          current[segment] = isNaN(Number(pathSegments[i + 1])) ? {} : [];
        }
        current = current[segment];
      }
    }
  }

  private getNestedValueFromPath(obj: any, path: string): any {
    if (!obj || !path) return undefined;

    // Convert array-like notation `item_images[0].image_path` to `item_images.0.image_path`
    const pathSegments = path.replace(/\[(\d+)\]/g, '.$1').split('.');

    let current = obj;
    for (const segment of pathSegments) {
      if (current && segment in current) {
        current = current[segment];
      } else {
        return undefined; // Path does not exist
      }
    }

    return current;
  }

  private getFormControlFromPath(path: string): AbstractControl | null {
    const pathSegments = path.replace(/\[(\d+)\]/g, '.$1').split('.'); // Convert `item_images[0].image_path` to `item_images.0.image_path`
    let control: AbstractControl | null = this.form;

    for (const segment of pathSegments) {
      if (control instanceof FormGroup) {
        control = control.get(segment);
      } else if (control instanceof FormArray) {
        control = control.at(parseInt(segment, 10));
      } else {
        return null; // Path is invalid
      }
    }

    return control;
  }

  private getFilesFromModel(controlName: string, parentKey: string): any {
    const keys = controlName.split('.'); // Split by '.'
    let modelValue = this.model;

    keys.forEach((key) => {
      if (modelValue) {
        // Check if the key contains an array index
        const arrayMatch = key.match(/^(\w+)\[(\d+)\]$/); // Matches `key[index]`
        if (arrayMatch) {
          const arrayKey = arrayMatch[1]; // The array name (e.g., `item`)
          const index = parseInt(arrayMatch[2], 10); // The index (e.g., `0`)
          modelValue = modelValue[arrayKey]?.[index]; // Resolve to the array item
        } else {
          // Normal key resolution for non-array keys
          modelValue = modelValue[key];
        }
      }
    });

    return modelValue;
  }

  // private getFilesFromModel(controlName: string, parentKey: string): any {
  //   const keys = controlName.split('.');
  //   let modelValue = this.model;
  //   keys.forEach((key) => {
  //     if (modelValue && modelValue[key] !== undefined) {
  //       modelValue = modelValue[key];
  //     }
  //   });
  //   return modelValue;
  // }

  private removeSuffix(value: string, suffix: string): string {
    return value.endsWith(suffix) ? value.slice(0, -suffix.length) : value;
  }

  private replacePlaceholders(obj: any, model: any, required: boolean = true): any {
    const result = JSON.parse(JSON.stringify(obj)); // Deep copy to avoid mutating the original object
    // const placeholderPattern = /\$(.+)/;
    const placeholderPattern = /^\$(.+)/;
    const replaceInObject = (item: any): any => {
      if (Array.isArray(item)) {
        return item.map(replaceInObject);
      } else if (typeof item === 'object' && item !== null) {
        for (const key in item) {
          if (item.hasOwnProperty(key)) {
            item[key] = replaceInObject(item[key]);
          }
        }
        return item;
      } else if (typeof item === 'string') {
        const match = item.match(placeholderPattern);
        if (match) {
          const placeholder = match[1];
          const value = this.getNestedProperty(placeholder, model);
          return value !== undefined ? value : `$${required ? placeholder : ''}`;
        }
      }
      return item;
    };

    return replaceInObject(result);
  }

  titleChange() {
    const translateTitle = this.translate.instant(this.formEntity?.entity_name);
    this.titleService.setTitle(translateTitle);
  }

  private replaceDataPlaceholders(obj: any, model: any, required: boolean = true, draft_mode: boolean): any {
    const result = JSON.parse(JSON.stringify(obj)); // Deep copy to avoid mutating the original object
    // const placeholderPattern = /\$(.+)/;
    const placeholderPattern = /^\$(.+)/;

    const replaceInObject = (item: any, context: any = model): any => {
      if (Array.isArray(item)) {
        return item.map((subItem) => replaceInObject(subItem, context));
      } else if (typeof item === 'object' && item !== null) {
        for (const key in item) {
          if (item.hasOwnProperty(key)) {
            item[key] = key === 'is_drafted' ? draft_mode : replaceInObject(item[key], context);
          }
        }
        return item;
      } else if (typeof item === 'string') {
        const match = item.match(placeholderPattern);
        if (match) {
          const placeholder = match[1];
          let value;
          if (placeholder === 'model') {
            value = context;
          } else {
            if (placeholder === 'user_id') {
              value = this.user_info.main.id;
            } else if (placeholder === 'unique_id') {
              value = this.unique_id;
            } else {
              value = this.getNestedProperty(placeholder, context);
            }
          }
          value = typeof value === 'string' ? value?.trim() : value;
          return value !== undefined ? value : required ? match[0] + placeholder : null;
        }
      }
      return item;
    };

    // Dynamically handle array expansion for any table in `result.data`
    for (const tableKey in result.data) {
      if (result.data.hasOwnProperty(tableKey)) {
        // Detect if the corresponding model entry is an array
        const placeholdersInTable = result.data[tableKey];
        if (placeholdersInTable.length > 0) {
          const firstPlaceholder = placeholdersInTable[0];
          const firstKeyMatchKey: any = Object.keys(firstPlaceholder).find((key) => {
            const value = firstPlaceholder[key];
            return typeof value === 'string' && value.startsWith('$');
          });
          const firstKeyMatch =
            firstPlaceholder && firstKeyMatchKey && firstPlaceholder[firstKeyMatchKey] && firstPlaceholder[firstKeyMatchKey].match(placeholderPattern);
          // const firstKeyMatch = firstPlaceholder && firstPlaceholder[Object.keys(firstPlaceholder)[0]].match(placeholderPattern);
          if (firstKeyMatch) {
            const firstKey = firstKeyMatch[1].split('.')[0];
            const key = firstKeyMatch[1].split('.')[1];
            if (model[firstKey] && Array.isArray(model[firstKey])) {
              result.data[tableKey] = model[firstKey].map((detail: any) => {
                const tableTemplate = JSON.parse(JSON.stringify(placeholdersInTable[0]));
                return replaceInObject(tableTemplate, { [firstKey]: detail });
              });
            } else if (model[firstKey] && model[firstKey][key] && Array.isArray(model[firstKey][key])) {
              result.data[tableKey] = model[firstKey][key].map((detail: any) => {
                detail = { [key]: detail };
                const tableTemplate = JSON.parse(JSON.stringify(placeholdersInTable[0]));
                return replaceInObject(tableTemplate, { [firstKey]: detail });
              });
            } else {
              result.data[tableKey] = replaceInObject(result.data[tableKey]);
            }
          } else {
            
          }
        }
      }
    }

    // Replace placeholders in tables that are not arrays in the model
    for (const tableKey in result.data) {
      if (result.data.hasOwnProperty(tableKey) && !Array.isArray(result.data[tableKey])) {
        result.data[tableKey] = replaceInObject(result.data[tableKey]);
      }
    }

    return result;
  }

  // private getNestedProperty(path: string, obj: any): any {
  //   return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  // }
  private getNestedProperty(path: string, obj: any): any {
    const pathSegments = path.replace(/\[(\d+)\]/g, '.$1').split('.'); // Convert array-like keys to dot notation
    return pathSegments.reduce((acc, part) => acc && acc[part], obj);
  }

  private parseJSONField(value: any) {
    try {
      return typeof value === 'string' ? JSON.parse(value) : value;
    } catch (error) {
      console.error('JSON Parsing Error:', error);
      return value;
    }
  }

  private resetForm() {
    
    const listParams = {
      company_id: 1,
      print_query: false,
      primary_table: 'master_entities',
      start_index: 0,
      limit_range: 1,
      sort_columns: [['master_entities.id', 'desc']],
      select_columns: [['master_entities.*']],
      search_all: [
        { column_name: 'master_entities.entity_name', operator: '=', value: this.entity_name },
        { column_name: 'master_entities.entity_type', operator: '=', value: 'form_builder_module' },
        { column_name: 'master_entities.status_id', operator: '=', value: '1' },
      ],
    };

    this.gridApiService.getAllList(listParams).subscribe(
      (response) => {
        if (response.status && response.data?.records?.length > 0) {
          let formEntity = response.data.records[0];
          
          formEntity.query_information = this.parseJSONField(formEntity.query_information);
          formEntity.form_information = this.parseJSONField(formEntity.form_information);
          formEntity.add_query_information = this.parseJSONField(formEntity.add_query_information);
          formEntity.edit_query_information = this.parseJSONField(formEntity.edit_query_information);
          formEntity.preset_query_information = this.parseJSONField(formEntity.preset_query_information);
          this.formEntity = formEntity;
          this.listParams = this.formEntity.query_information;



          
          this.transParam =
            this.entity_type === 'add' || this.entity_type === 'popup_add' ? this.formEntity.add_query_information : this.formEntity.edit_query_information;
            console.log(this.transParam)
            console.log(this.entity_type)
          this.model = { ...this.formEntity.form_information.model, unique_id: this.unique_id };
          this.defaultDataParam = this.formEntity.preset_query_information;
          const fieldsJson = this.formEntity.form_information.fields;

          fieldsJson.forEach((field: any) => {
                    // fieldGroup
            field.fieldGroup?.forEach((subField: any) => {
              if (subField.props && subField.props.label)
                subField.props.label = this.translate.instant(subField.props.label);
              if (subField.props && subField.props.placeholder)
                subField.props.placeholder = this.translate.instant(subField.props.placeholder || '');

              if (subField.templateOptions && subField.templateOptions.label)
                subField.templateOptions.label = this.translate.instant(subField.templateOptions.label);
              if (subField.templateOptions && subField.templateOptions.placeholder)
                subField.templateOptions.placeholder = this.translate.instant(subField.templateOptions.placeholder || '');

              // props.options (radio, select, etc.)
              if (subField.props && Array.isArray(subField.props.options)) {
                subField.props.options.forEach((opt: any) => {
                  if (opt.label) {
                    opt.label = this.translate.instant(opt.label);
                  }
                });
              }
            });

            // fieldArray
            field.fieldArray?.fieldGroup?.forEach((subField: any) => {
              if (subField.props && subField.props.label)
                subField.props.label = this.translate.instant(subField.props.label);
              if (subField.props && subField.props.placeholder)
                subField.props.placeholder = this.translate.instant(subField.props.placeholder || '');

              if (subField.templateOptions && subField.templateOptions.label)
                subField.templateOptions.label = this.translate.instant(subField.templateOptions.label);
              if (subField.templateOptions && subField.templateOptions.placeholder)
                subField.templateOptions.placeholder = this.translate.instant(subField.templateOptions.placeholder || '');

              // props.options (radio, select, etc.)
              if (subField.props && Array.isArray(subField.props.options)) {
                subField.props.options.forEach((opt: any) => {
                  if (opt.label) {
                    opt.label = this.translate.instant(opt.label);
                  }
                });
              }
            });

            // templateOptions (top-level)
            if (field.templateOptions && field.templateOptions.label)
              field.templateOptions.label = this.translate.instant(field.templateOptions.label);
            if (field.templateOptions && field.templateOptions.placeholder)
              field.templateOptions.placeholder = this.translate.instant(field.templateOptions.placeholder || '');

            // props.options (top-level field, if ever used)
            if (field.props && Array.isArray(field.props.options)) {
              field.props.options.forEach((opt: any) => {
                if (opt.label) {
                  opt.label = this.translate.instant(opt.label);
                }
              });
            }
          });

          const isNestedModal = !!this.nestedFormEntityName && (this.entity_type === 'popup_add' || this.entity_type === 'popup_edit');
          if (!isNestedModal) {
            this.fields = this.processFields(fieldsJson);
            this.setDefaultData();
            this.titleChange();
          }
        } else {
          this.toastr.error('Invalid entity details given.');
          this.router.navigate(['/dashboard']);
        }
      },
      (error) => {
        const key = 'error';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
        this.router.navigate(['/dashboard']);
      }
    );
  }

  setDefaultData() {
      console.log(this.entity_type)
      console.log(this.defaultDataParam)
    if (this.entity_type !== 'add' && this.defaultDataParam && this.entity_type !== 'popup_add' && this.defaultDataParam) {
      
      if (this.defaultDataParam.primary_table) {
        this.processDefaultParam(this.defaultDataParam);
      } else {
        for (const formControl in this.defaultDataParam) {
          if (this.defaultDataParam.hasOwnProperty(formControl)) {
            this.processDefaultParam(this.defaultDataParam[formControl], formControl);
          }
        }
      }
    }
  }

  private processDefaultParam(defaultParam: any, formControl: string | null = null) {
    const defaultDataParam = this.replacePlaceholders(defaultParam, this.model);
    this.gridApiService.getAllList(defaultDataParam).subscribe(
      (response) => {
        if (response.status && response.data?.records?.length > 0) {
          let fieldsJson: any;
          if (formControl) {
            const control = this.form.get(`${formControl}`);
            if (control instanceof FormArray) {
              fieldsJson = response.data.records; // Handle as an array of records
            } else {
              fieldsJson = response.data.records[0]; // Handle as a single record
            }
            this.defaultData[formControl] = fieldsJson;
          } else {
            fieldsJson = response.data.records[0];
            this.defaultData = fieldsJson;
          }
          this.applyAvailableDataToForm(fieldsJson, formControl);
        } else if (!response.status) {
          this.toastr.error('Invalid entity details given.');
          this.router.navigate(['/dashboard']);
        }
      },
      (error) => {
        const key = 'error';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
        this.router.navigate(['/dashboard']);
      }
    );
  }

  private applyAvailableDataToForm(updateData: any, formControl: string | null = null) {
    if (Array.isArray(updateData) && formControl) {
      // Handle FormArray case
      const formArray = this.form.get(formControl) as FormArray;
      if (formArray) {
        this.model[formControl] = updateData;
        this.patchFormArray(formArray, updateData);
      }
    } else {
      const keys = Object.keys(updateData);
      const formData: any = {};
      keys.forEach((key) => {
        if (formControl) {
          const controlPath = `${formControl}.${key}`;
          const control = this.form.get(controlPath);
          if (control && control instanceof FormArray) {
            const arrayValues = Array.isArray(updateData[key])
              ? updateData[key]
              : `${updateData[key]}`.split(',').map((value: any) => (isNaN(value) ? value : Number(value)));
            this.model[formControl][key] = arrayValues;
            if (this.options && this.options.resetModel) {
              this.options.resetModel(this.model);
            }
          } else if (control) {
            if (Array.isArray(control?.value) && !Array.isArray(updateData[key])) {
              let parsedArray = [];
              if (updateData[key] && typeof updateData[key] === 'string') {
                try {
                  // Attempt to parse the input as JSON
                  const parsed = JSON.parse(updateData[key]);
                  // Ensure the parsed result is an array
                  parsedArray = Array.isArray(parsed) ? parsed : [];
                } catch (e) {
                  // If JSON parsing fails, treat it as a comma-separated string
                  parsedArray = updateData[key].split(',').map((item: string) => {
                    // Remove any surrounding brackets or quotes and trim whitespace
                    const trimmed = item.replace(/[\[\]"]/g, '').trim();
                    // Convert to number if possible, otherwise keep as string
                    return trimmed;
                  });
                }
              }
              this.model[formControl][key] = parsedArray;
              control.patchValue(parsedArray);
            } else {
              this.model[formControl][key] = updateData[key];
              control.patchValue(updateData[key]);
            }
          }
        } else {
          const control = this.form.get(key);
          if (control) {
            if (control instanceof FormArray) {
              const arrayValues = Array.isArray(updateData[key])
                ? updateData[key]
                : `${updateData[key]}`.split(',').map((value: any) => (isNaN(value) ? value : Number(value)));
              this.model[key] = arrayValues;
              if (this.options && this.options.resetModel) {
                this.options.resetModel(this.model);
              }
              // this.patchFormArray(control, updateData[key]);
            } else {
              control.patchValue(updateData[key]);
            }
          } else if (this.model) {
            this.model[key] = updateData[key];
          }
        }
      });

      if (!Array.isArray(updateData)) {
        if (formControl) {
          this.form.get(formControl)?.patchValue(formData);
        } else {
          this.form.patchValue(formData);
        }
      }
    }
  }

  private patchFormArray(formArray: FormArray, data: any[]) {
    formArray.clear(); // Clear existing form array controls
    data.forEach((item) => {
      formArray.push(this.createFormGroup(item));
    });
    // Manually trigger change detection if the UI doesn't update
    // 
    setTimeout(() => {
      if (this.options && this.options.resetModel) {
        this.options.resetModel(this.model);
      }
    }, 500);
    formArray.markAsPristine();
    formArray.markAsUntouched();
  }

  private createFormGroup(data: any): FormGroup {
    const group: { [key: string]: FormControl } = {};
    Object.keys(data).forEach((key) => {
      group[key] = new FormControl(data[key]);
    });
    return new FormGroup(group);
  }

  private processFields(fieldsJson: any[]): FormlyFieldConfig[] {
    const processedFields = fieldsJson.map((group: any) => {
      // Recursively process fieldGroups if they exist and are arrays
      if (Array.isArray(group.fieldGroup)) {
        group.fieldGroup = this.processFields(group.fieldGroup);
        // If this group has modal, pass it down to individual fields
        if (group.modal) {
          group.fieldGroup.forEach((field: any) => {
            field.modal = group.modal;
          });
        }
      }

      // Process fieldArray (used in repeatable sections) if it exists and contains a fieldGroup
      if (group.fieldArray && Array.isArray(group.fieldArray.fieldGroup)) {
        group.fieldArray.fieldGroup = this.processFields(group.fieldArray.fieldGroup);
        // If this group has modal, pass it down to fieldArray fields
        if (group.modal) {
          group.fieldArray.fieldGroup.forEach((field: any) => {
            field.modal = group.modal;
          });
        }
      } else if (group.fieldArray?.type === 'select' || group.fieldArray?.type === 'select-from-db') {
        group.fieldArray.type = 'select-from-db';
        if (group.fieldArray.props) group.fieldArray.props.placeholder = group.fieldArray.props.placeholder || 'Please select';
      }

      if (group.hooks && group.hooks.onInit) {
        if (group.parentConfig && group.parentConfig.hasParent) {
          group.hooks.onInit = (f: FormlyFieldConfig) => {
            const parentKey = group.parentConfig.parentKey;
            const parentControl = this.form.get(parentKey);
            if (parentControl) {
              parentControl.valueChanges
                .pipe(
                  tap((parentValue: any) => {
                    this.form.patchValue({ [group.key]: '' });
                    if (parentValue) {
                      
                      
                      this.fetchList(f, group.key, true);
                    }
                  })
                )
                .subscribe();
            }
          };
        } else {
          
                      
          group.hooks.onInit = (f: FormlyFieldConfig) => this.fetchList(f, group.key);
        }
      } else if (group.fieldArray?.hooks && group.fieldArray.hooks.onInit) {
        if (group.fieldArray.parentConfig && group.fieldArray.parentConfig.hasParent) {
          group.fieldArray.hooks.onInit = (f: FormlyFieldConfig) => {
            const parentKey = group.parentConfig.parentKey;
            const parentControl = this.form.get(parentKey);
            if (parentControl) {
              parentControl.valueChanges
                .pipe(
                  tap((parentValue: any) => {
                    this.form.patchValue({ [group.key]: '' });
                    if (parentValue) {
                      
                      
                      this.fetchList(f, group.key, true);
                    }
                  })
                )
                .subscribe();
            }
          };
        } else {
          
                      
          group.fieldArray.hooks.onInit = (f: FormlyFieldConfig) => this.fetchList(f, group.key);
        }
      }

      // Convert string-based onInitFunc to actual functions
      if (group.hooks && group.hooks.onInitFunc) {
        const dynamicHook = this.stringToFunction(group.hooks.onInitFunc);
        if (typeof dynamicHook === 'function') {
          group.hooks.onInit = (f: FormlyFieldConfig) => {
            dynamicHook(f);
          };
        }
      } else if (group.fieldArray?.hooks && group.fieldArray.hooks.onInitFunc) {
        const dynamicHook = this.stringToFunction(group.fieldArray.hooks.onInitFunc);
        if (typeof dynamicHook === 'function') {
          group.fieldArray.hooks.onInit = (f: FormlyFieldConfig) => {
            dynamicHook(f);
          };
        }
      }

      if (group.hooks && group.hooks.uniqueKey) {
        const uniqueKey = group.hooks.uniqueKey;
        group.modelOptions = {
          updateOn: 'blur',
        };
        if (typeof uniqueKey === 'string') {
          group.asyncValidators = { unique: { expression: this.uniqueValidator(uniqueKey), message: 'this_value_cannot_be_duplicate' } };
        }
      } else if (group.fieldArray?.hooks && group.fieldArray.hooks.uniqueKey) {
        const uniqueKey = group.fieldArray.hooks.uniqueKey;
        group.fieldArray.modelOptions = {
          updateOn: 'blur',
        };
        if (typeof uniqueKey === 'string') {
          group.fieldArray.asyncValidators = { unique: { expression: this.uniqueValidator(uniqueKey), message: 'this_value_cannot_be_duplicate' } };
        }
      }
      
      // Set default options for select fields
      if (group.type === 'select' || group.type === 'select-from-db') {
        group.type = 'select-from-db';
        if (group.props) group.props.placeholder = group.props.placeholder || 'Please select';
        
        // Ensure options are fetched for select-from-db fields
        this.fetchList(group, group.key, true);
        // Fallback: if no listParams for this key, build from templateOptions
        if (!this.listParams || !this.listParams[group.key]) {
          const opts = group.templateOptions || group.props || {};
          if (opts.table && opts.valueColumn && opts.labelColumn) {
            this.listParams = this.listParams || {};
            this.listParams[group.key] = {
              primary_table: opts.table,
              select_columns: [[
                opts.valueColumn.includes('CONCAT(') ? opts.valueColumn : `${opts.table}.${opts.valueColumn}`
              ], [
                opts.labelColumn.includes('CONCAT(') ? opts.labelColumn : `${opts.table}.${opts.labelColumn}`
              ]],
              search_all: opts.search_all || [],
              sort_columns: opts.sort_columns || [],
              print_query: false,
              start_index: 0,
              limit_range: 1000
            };
            
            this.fetchList(group, group.key, true);
          }
        }
      }
      // Also ensure options are fetched for fieldArray of type select-from-db
      if (group.type === 'select-from-db') {
        
        this.fetchList(group, group.key, true);
        // Fallback for fieldArray
        if (!this.listParams || !this.listParams[group.key]) {
          const opts = group.templateOptions || group.props || {};
          if (opts.table && opts.valueColumn && opts.labelColumn) {
            this.listParams = this.listParams || {};
            this.listParams[group.key] = {
              primary_table: opts.table,
              select_columns: [[
                opts.valueColumn.includes('CONCAT(') ? opts.valueColumn : `${opts.table}.${opts.valueColumn}`
              ], [
                opts.labelColumn.includes('CONCAT(') ? opts.labelColumn : `${opts.table}.${opts.labelColumn}`
              ]],
              search_all: opts.search_all || [],
              sort_columns: opts.sort_columns || [],
              print_query: false,
              start_index: 0,
              limit_range: 1000
            };
            this.fetchList(group, group.key, true);
          }
        }
      }
      if (group.fieldArray && group.fieldArray.type === 'select-from-db') {
        this.fetchList(group.fieldArray, group.key, true);
        // Fallback for fieldArray
        if (!this.listParams || !this.listParams[group.key]) {
          const opts = group.fieldArray.templateOptions || group.fieldArray.props || {};
          if (opts.table && opts.valueColumn && opts.labelColumn) {
            this.listParams = this.listParams || {};
            this.listParams[group.key] = {
              primary_table: opts.table,
              select_columns: [[
                opts.valueColumn.includes('CONCAT(') ? opts.valueColumn : `${opts.table}.${opts.valueColumn}`
              ], [
                opts.labelColumn.includes('CONCAT(') ? opts.labelColumn : `${opts.table}.${opts.labelColumn}`
              ]],
              search_all: opts.search_all || [],
              sort_columns: opts.sort_columns || [],
              print_query: false,
              start_index: 0,
              limit_range: 1000
            };
            this.fetchList(group.fieldArray, group.key, true);
          }
        }
      }

      // Disable fields in view mode
      if (this.entity_type === 'details') {
        group.expressions = group.expressions || {};
        group.expressions['props.disabled'] = 'true';
      }

      return group;
    });
    // After processing all fields, ensure all select/select-from-db options are loaded
    const selectKeys = this.collectSelectKeys(processedFields);
    
    selectKeys.forEach(key => {
      const fieldConfig = this.findFieldConfigByKey(processedFields, key);
      
      this.fetchList(fieldConfig, key, true).subscribe({
        next: (options) => {
          
        },
        error: (err) => {
          console.error('Error fetching options for', key, err);
        }
      });
    });
    return processedFields;
  }

  private stringToFunction(fnString: string): Function {
    try {
      return new Function('model', 'formState', `return (${fnString})(model, formState);`);
    } catch (error) {
      console.error('Error creating function from string:', fnString, error);
      return () => null;
    }
  }

  flatten(obj: any): any {
    return Object.keys(obj).reduce((acc: any, key) => {
      const value = obj[key];
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        Object.assign(acc, this.flatten(value));
      } else {
        acc[key] = value;
      }
      return acc;
    }, {});
  }

  get isDisabled(): boolean {
    return this.processStatus === 'under_approval';
  }

  // Method to open nested form-builder modal
  openAddNestedFormModal(entityName: string, fieldKey?: string, modalConfig?: any) {
    this.nestedModalEntityType = 'popup_add';
    this.openNestedFormModal(entityName, fieldKey, modalConfig, null, 'popup_add');
  }

  openNestedFormModal(entityName: string, fieldKey?: string, modalConfig?: any, uuid?: string | null, mode?: 'popup_add' | 'popup_edit') {
    console.log(entityName);
    console.log(fieldKey);
    console.log(uuid);
    this.noNestedFormPermission = false;
    const userData = this.user_info || JSON.parse(this.localStorageService.getData('user_data'));
    const unorgmenuList = userData?.unorgmenuList || [];
    let menuPermissionId = null;
    if (unorgmenuList && Array.isArray(unorgmenuList)) {
      // For edit mode, check for 'edit' or 'popup_edit' permission; for add, check 'add' or 'popup_add'
      const menuItem = unorgmenuList.find((item: any) => item.entity_name === entityName && (uuid ? (item.action_slug === 'edit' || item.action_slug === 'popup_edit') : (item.action_slug === 'add' || item.action_slug === 'popup_add')));
      if (menuItem) {
        menuPermissionId = menuItem.permission_id;
      }
    }
    let hasPermission = true;
    if (menuPermissionId && userData?.main?.permissions && Array.isArray(userData.main.permissions)) {
      const permObj = userData.main.permissions.find((perm: any) => perm.id == menuPermissionId);
      hasPermission = !!(permObj && permObj.accessible);
    }
    if (!hasPermission) {
      this.noNestedFormPermission = true;
      this.nestedFormModalConfig = { open: true, title: 'No Permission' };
      return;
    }
    // Set these for nested modal; if uuid is provided, open in edit mode, else add mode
    this.nestedFormEntityName = entityName;
    this.nestedFormUuid = uuid || null;
    console.log(mode);
    // Always use the mode if provided, otherwise fallback to uuid logic
    this.nestedModalEntityType = mode ? mode : (uuid ? 'popup_edit' : 'popup_add');
    console.log(this.nestedModalEntityType);
    this.nestedFormFieldKey = fieldKey || null;
    this.nestedFormModalConfig = { ...(modalConfig || {}), open: true };
    // Do NOT call this.resetForm() here!
  }

  // Method to close nested form-builder modal
  closeNestedFormModal() {
    if (this.nestedFormModalConfig) {
      this.nestedFormModalConfig.open = false;
    }
    this.nestedFormEntityName = null;
    this.nestedFormUuid = null;
    this.nestedModalEntityType = 'popup_add'; // Always reset modal mode to add
  }

  // Method to handle nested form submission
  onNestedFormSubmitted(formData: any) {
    // Check if the form submission was successful
    if (formData && formData.success) {
      
      
      // Close the modal
      this.closeNestedFormModal();
      
      // Refresh the form data to update dropdowns and other dynamic content
      this.refreshFormData();
    } else {
      // If no data or unsuccessful, just close the modal
      this.closeNestedFormModal();
    }
  }

  // Method to refresh form data
  private refreshFormData() {
    // Refresh the form data to update dropdowns and other dynamic content
    // This will reload the form configuration and fetch fresh data
    this.resetForm();
    
    // Optionally show a success message
    this.toastr.success('Record created successfully. Form data refreshed.');
  }

  public refreshSelectFromDbOptions() {
    // Deep clone the fields array to force Angular and Formly to re-render the form
    this.fields = JSON.parse(JSON.stringify(this.fields));
    this.cdRef.detectChanges();
  }

  // Recursive helper to find a field config by key, searching all nested fieldGroups and fieldArrays
  private findFieldConfigByKey(fields: FormlyFieldConfig[], key: string): FormlyFieldConfig | null {
    for (const field of fields) {
      // Only operate on objects, not functions
      if (typeof field === 'object' && field !== null) {
        if (field.key === key) {
          return field;
        }
        if (Array.isArray((field as any).fieldGroup)) {
          const found = this.findFieldConfigByKey((field as any).fieldGroup, key);
          if (found) return found;
        }
        if (
          field.fieldArray &&
          typeof field.fieldArray === 'object' &&
          Array.isArray((field.fieldArray as any).fieldGroup)
        ) {
          const found = this.findFieldConfigByKey((field.fieldArray as any).fieldGroup, key);
          if (found) return found;
        }
      }
    }
    return null;
  }

  public onNestedFormSuccess(event: { value: any, fieldKey: string }) {
    this.refreshSelectFromDbOptions();
    
    if (event && event.value && event.fieldKey) {
      // Use recursive search for the field config
      const fieldConfig = this.findFieldConfigByKey(this.fields, event.fieldKey);
      // Fetch and wait for options to be available before updating value
      this.fetchList(fieldConfig, event.fieldKey, true).subscribe(() => {
        // Debug: log all keys and char codes
        
        
        
        Object.keys(this.listDatas).forEach(k => {
          
        });
        // Normalize key by trimming whitespace
        const normalizedKey = event.fieldKey.trim();
        const options = this.listDatas[normalizedKey] || [];
        
        // Always set the value immediately
        this.model[event.fieldKey] = event.value;
        const control = this.form.get(event.fieldKey);
        if (control) {
          control.setValue(event.value);
        }
        const currentValue = fieldConfig?.formControl?.value;
        if (fieldConfig?.formControl) {
          let updatedValue: any[] = [];
          if (Array.isArray(currentValue)) {
            updatedValue = currentValue.includes(event.value)
              ? currentValue
              : [...currentValue, event.value];
          } else if (currentValue !== undefined && currentValue !== null) {
            updatedValue = [currentValue, event.value];
          } else {
            updatedValue = [event.value];
          }
          if (Array.isArray(options)) {
            updatedValue = updatedValue.map(val => {
              if (typeof val === 'string') {
                const found = options.find(
                  (opt: any) => opt.label === val || opt.name === val
                );
                if (found) {
                  return found.id !== undefined ? found.id : found.value;
                }
              }
              return val;
            });
          }
          fieldConfig.formControl.setValue(updatedValue);
        }
        // Always close the modal after success
        this.closeNestedFormModal();
      });
    }
  }

  private collectSelectKeys(fields: FormlyFieldConfig[]): string[] {
    const selectKeys: string[] = [];
    const collectKeys = (field: FormlyFieldConfig) => {
      if (typeof field === 'object' && field !== null) {
        if (field.type === 'select' || field.type === 'select-from-db') {
          if (typeof field.key === 'string') {
            selectKeys.push(field.key);
          }
        }
        if (field.fieldArray && typeof field.fieldArray === 'object' && Array.isArray(field.fieldArray.fieldGroup)) {
          field.fieldArray.fieldGroup.forEach(collectKeys);
        }
        if (Array.isArray((field as any).fieldGroup)) {
          (field as any).fieldGroup.forEach(collectKeys);
        }
      }
    };
    fields.forEach(collectKeys);
    return selectKeys;
  }
}

        