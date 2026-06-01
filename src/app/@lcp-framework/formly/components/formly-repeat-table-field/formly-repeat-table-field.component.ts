import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FieldArrayType, FormlyFieldConfig } from '@ngx-formly/core';
import { FormArray, FormGroup, FormControl } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { debounceTime, map } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';
import { GridApiService } from '../../../service/common/grid.service';
import { LocalStorageService } from '../../../service/common/local-storage.service';

@Component({
  standalone: false,
  selector: 'app-formly-repeat-table-field',
  templateUrl: './formly-repeat-table-field.component.html',
  styleUrl: './formly-repeat-table-field.component.scss',
})
export class FormlyRepeatTableFieldComponent extends FieldArrayType implements OnInit {
  formArray!: FormArray<FormGroup>;
  currentRowIndex: number | null = null; // To track editing row
  editForm: FormGroup; // Separate form for editing rows
  editModel: any = {}; // Model for inline edit formly-form
  errorMessage: string = '';
  imageExtensions: string[] = [];
  productCache: Map<string, any[]> = new Map(); // Cache for product data
  resolvedDisplayValues: Map<string, string> = new Map(); // Store resolved values for display

  // Popup state management
  isPopupOpen: boolean = false;
  popupForm: FormGroup; // Form for popup fields
  popupModel: any = {}; // Model for popup formly-form (drives hideExpression)

  // Config flag: when true use popup, when false use inline form
  enablePopupLineItem: boolean = true;

  // Cached popup fields to avoid re-creating on every change detection cycle
  private _cachedPopupFields: FormlyFieldConfig[] | null = null;

  // Cached flag for discount rule type detection
  private _isDiscountRuleType: boolean | null = null;

  constructor(private gridApiService: GridApiService, private localStorageService: LocalStorageService, private cdr: ChangeDetectorRef) {
    super();
    this.editForm = new FormGroup({}); // Initialize empty form
    this.popupForm = new FormGroup({}); // Initialize popup form
  }

  isImageUrl(fieldValue: any, key: string): boolean {
    const apiUrl = localStorage.getItem('lcp_api_base_url') || environment.apiUrl;
    const pathKey = this.removeSuffix(key, '_file');
    let url = '';
    if (!fieldValue[key] && fieldValue[pathKey]) {
      url = `${apiUrl}/${fieldValue[pathKey]}`; // Return null if no value
    } else {
      const ImageValue = fieldValue[key];
      if (typeof fieldValue === 'string') {
        url = ImageValue; // Return the string URL
      } else if (ImageValue instanceof FileList && ImageValue.length > 0) {
        url = ImageValue[0].name;
      } else if (ImageValue instanceof File) {
        url = ImageValue.name;
      }
    }
    if (url) {
      const extension = url.split('.').pop() || '';
      return ['jpg', 'jpeg', 'png', 'gif', 'svg', 'ico', 'webp'].includes(extension);
    }
    return false;
  }

  ngOnInit() {
    // Read enable_popup_line_item from field props (form builder level)
    // Falls back to false if not set — opt-in per module via props or templateOptions
    const val = this.field.props?.['enable_popup_line_item'] ?? (this.field as any).templateOptions?.['enable_popup_line_item'];
    this.enablePopupLineItem = val === true || val === 'true';

    // Initialize the dynamic form based on schema
    this.initializeDynamicForm();

    // Ensure formControl is available and of type FormArray
    if (this.formControl instanceof FormArray) {
      this.formArray = this.formControl as FormArray<FormGroup>;
      console.log('=== REPEAT-TABLE: formArray initialized from formControl, length:', this.formArray.length);
    } else {
      // If formControl isn't a FormArray, try to use it anyway or create fallback
      console.error('formControl is not an instance of FormArray. formControl type:', typeof this.formControl, 'value:', this.formControl);
      console.error('field key:', this.field.key, 'field type:', this.field.type);
      this.formArray = new FormArray<FormGroup>([]);
    }

    // Initialize formArray if it's still undefined for some reason
    if (!this.formArray) {
      this.formArray = new FormArray<FormGroup>([]); // Initialize if undefined
    }

    this.editForm.valueChanges.subscribe(() => {
      this.errorMessage = ''; // Clear the error message when the form changes
    });

    // Removed auto-population - dropdowns will only populate when manually editing a row
    // console.log('DEBUG: Auto-population disabled - dropdowns will populate only on manual edit');

    // Trigger refresh of select-from-db displays after initialization
    // Skip if customHeaders are used (parent handles display via getCustomDisplay)
    if (!this.hasCustomHeaders()) {
      setTimeout(() => {
        this.refreshSelectFromDbDisplays();
      }, 100);
    }

    let lastRowCount = this.formArray.length;

    // Re-run display resolution whenever rows are added/changed (e.g. after async data load)
    this.formArray.valueChanges.pipe(debounceTime(200)).subscribe(() => {
      const currentRowCount = this.formArray.length;
      // If rows were added (e.g. data loaded from API on edit page), clear cache and re-resolve
      if (currentRowCount !== lastRowCount) {
        this.resolvedDisplayValues.clear();
        lastRowCount = currentRowCount;
      }
      // Skip if customHeaders are used (parent handles display via getCustomDisplay)
      if (!this.hasCustomHeaders()) {
        this.refreshSelectFromDbDisplays();
      }
      // Single delayed change detection to catch async API resolutions
      setTimeout(() => this.cdr.detectChanges(), 500);
    });
  }

  // Cached field group to avoid re-creating on every change detection cycle
  private _cachedFieldGroup: FormlyFieldConfig[] | null = null;

  // Helper function to get fieldArray.fieldGroup
  getFieldGroup(): FormlyFieldConfig[] {
    if (this._cachedFieldGroup) {
      return this._cachedFieldGroup;
    }
    const fieldArray = typeof this.field.fieldArray === 'function' ? this.field.fieldArray(this.field) : this.field.fieldArray;
    this._cachedFieldGroup = fieldArray?.fieldGroup || [];
    return this._cachedFieldGroup;
  }

  // Returns fields wrapped with fieldGroupClassName for popup grid layout
  getPopupFields(): FormlyFieldConfig[] {
    if (this._cachedPopupFields) {
      return this._cachedPopupFields;
    }
    const fieldArray = typeof this.field.fieldArray === 'function' ? this.field.fieldArray(this.field) : this.field.fieldArray;
    const fieldGroupClassName = fieldArray?.fieldGroupClassName;
    if (fieldGroupClassName) {
      this._cachedPopupFields = [
        {
          fieldGroup: fieldArray?.fieldGroup || [],
          fieldGroupClassName,
        },
      ];
    } else {
      this._cachedPopupFields = fieldArray?.fieldGroup || [];
    }
    return this._cachedPopupFields;
  }

  // Helper to read a field prop from either props or templateOptions (handles both Formly v5/v6 styles)
  private getFieldProp(field: FormlyFieldConfig, key: string): any {
    return field.props?.[key] ?? (field as any).templateOptions?.[key];
  }

  // Method to refresh all select-from-db displays
  private refreshSelectFromDbDisplays(): void {
    if (!this.formArray || this.formArray.length === 0) {
      return;
    }
    // Iterate through all rows and fields to refresh select-from-db displays
    this.formArray.controls.forEach((rowGroup, rowIndex) => {
      const rowData = rowGroup.value;
      const fieldGroup = this.getFieldGroup();

      fieldGroup.forEach((field) => {
        if (!field.key) return; // Skip if field.key is undefined

        const fieldKey = this.coerceKeyToString(field.key);
        if (field.type === 'select-from-db' && rowData[fieldKey]) {
          const cacheKey = `${rowIndex}_${fieldKey}`;

          // If we don't have a cached value, start resolution
          if (!this.resolvedDisplayValues.has(cacheKey)) {
            this.resolveAndCacheDisplayValue(rowData[fieldKey], field, cacheKey);
          }
        }
      });
    });
  }

  // Initialize the editForm based on dynamic schema
  // initializeDynamicForm() {
  //   const group: { [key: string]: FormControl } = {};
  //   this.getFieldGroup().forEach((field: any) => {
  //     group[field.key] = new FormControl(''); // Initialize with empty values
  //   });
  //   this.editForm = new FormGroup(group); // Assign the dynamically created form group
  // }
  initializeDynamicForm() {
    const group: { [key: string]: FormControl } = {};
    this.getFieldGroup().forEach((field: any) => {
      if (!field || !field.key) return;
      group[field.key] = new FormControl(field.defaultValue || '');
    });
    this.editForm = new FormGroup(group);
  }

  // Ensure all form controls exist, even if they're hidden
  private ensureAllControlsExist(): void {
    if (!this.editForm) {
      this.editForm = new FormGroup({});
    }

    this.getFieldGroup().forEach((field: any) => {
      if (!this.editForm.contains(field.key)) {
        // Get current value from existing row if editing, otherwise use default
        let defaultValue = field.defaultValue || '';
        if (this.currentRowIndex !== null) {
          const existingRowData = this.formArray.at(this.currentRowIndex).value;
          defaultValue = existingRowData[field.key] !== undefined ? existingRowData[field.key] : defaultValue;

          // For select-from-db fields with multiple=true, ensure array values are preserved
          if (field.type === 'select-from-db' && this.getFieldProp(field, 'multiple')) {
            if (Array.isArray(defaultValue)) {
              // Keep array as is for multi-select fields
            } else if (defaultValue && !Array.isArray(defaultValue)) {
              // Convert single values to array for multi-select fields
              defaultValue = [defaultValue];
            } else if (!defaultValue) {
              // Ensure empty multi-select fields are initialized as empty arrays
              defaultValue = [];
            }
          }
        }
        this.editForm.addControl(field.key, new FormControl(defaultValue));
      }
    });
  }

  // Ensure all select-from-db controls exist specifically
  private ensureAllSelectFromDbControlsExist(): void {
    if (!this.editForm) {
      this.editForm = new FormGroup({});
    }

    // Ensure all possible select-from-db controls exist
    const selectFromDbFields = ['product_ids', 'customer_ids', 'category_ids', 'customer_group_ids'];
    selectFromDbFields.forEach((fieldKey) => {
      const control = this.editForm.get(fieldKey);
      if (!control) {
        this.editForm.addControl(fieldKey, new FormControl([]));
      }
    });
  }

  // Add or Update the row
  saveRow() {
    // Ensure all required controls exist before saving
    this.ensureAllSelectFromDbControlsExist();

    // Trigger validation for the current row - only validate visible controls
    this.editForm.markAllAsTouched();
    this.editForm.updateValueAndValidity();

    console.log('=== REPEAT-TABLE saveRow DEBUG ===');
    console.log('editForm.valid:', this.editForm.valid);
    console.log('editForm.value:', this.editForm.value);
    console.log('formArray exists:', !!this.formArray);
    console.log('formArray length:', this.formArray?.length);

    // Check validity only for visible fields that have required prop set
    const fieldGroup = this.getFieldGroup();
    let hasVisibleInvalidField = false;

    for (const field of fieldGroup) {
      if (!field.key) continue;
      const fieldKey = this.coerceKeyToString(field.key);
      const control = this.editForm.get(fieldKey);
      if (!control) continue;

      // Determine if field is hidden via any mechanism
      const isHiddenByField = field.hide === true;
      const isHiddenByClass = (field as any).className === 'hidden';
      const isHiddenByProps = field.props?.['hideColumn'] === true || (field as any).templateOptions?.['hideColumn'] === true;
      const isHiddenByType = field.props?.type === 'hidden' || (field as any).templateOptions?.type === 'hidden';
      const isHidden = isHiddenByField || isHiddenByClass || isHiddenByProps || isHiddenByType;

      // Only block save if a VISIBLE field with explicit required prop is invalid
      const isRequired = field.props?.required === true || (field as any).templateOptions?.required === true;

      if (!isHidden && isRequired && control.invalid) {
        hasVisibleInvalidField = true;
        break;
      }
    }

    if (hasVisibleInvalidField) {
      console.log('=== REPEAT-TABLE: Blocked by visible invalid field ===');
      return;
    }
    if (this.isDisabled() && this.currentRowIndex === null) {
      this.errorMessage = `The row limit "${this.field.props['limit']}" has been reached for adding new record`;
      console.log('=== REPEAT-TABLE: Blocked by row limit ===');
      return; // Prevent execution if the button should be disabled
    }
    console.log('=== REPEAT-TABLE: Validation passed, proceeding to save ===');

    // Check for fields with `unique_row = true`
    const uniqueFields = this.getFieldGroup().filter((field) => field.props && field.props['uniqueRow']);
    const duplicateFields: string[] = [];

    // Iterate over each unique field and check if its value is already present in other rows
    uniqueFields.forEach((uniqueField) => {
      const fieldKey = this.coerceKeyToString(uniqueField.key ?? '');
      const currentValue = this.editForm.get(fieldKey)?.value;

      // Check if the current value exists in any other row except the one being edited
      const duplicate = this.formArray.controls.some((row, index) => {
        if (index !== this.currentRowIndex) {
          // Skip the row currently being edited
          return row.get(fieldKey)?.value === currentValue;
        }
        return false;
      });

      // If a duplicate is found, add to the list of duplicate fields
      if (duplicate) {
        duplicateFields.push(uniqueField.props?.label || fieldKey);
      }
    });

    // If duplicates were found, prevent saving and notify the user
    if (duplicateFields.length > 0) {
      this.errorMessage = `The "${duplicateFields.join(', ')}" fields must be unique, can't add duplicate values.`;
      return; // Exit the function without saving
    }

    // Logic for updating an existing row
    if (this.currentRowIndex !== null) {
      // Ensure all possible select-from-db controls exist before accessing them
      this.ensureAllSelectFromDbControlsExist();

      // Also ensure all general controls exist before accessing them
      this.ensureAllControlsExist();

      // If the row index exists, update the corresponding row
      // Use field group schema to ensure all controls are available
      const fieldGroup = this.getFieldGroup();
      const fieldKeys = fieldGroup.map((field: any) => field.key);

      let uniqueKey = fieldKeys.filter((key) => key.endsWith('_file'))[0];

      if (uniqueKey?.length) uniqueKey = uniqueKey.replace('_file', '');
      if (uniqueKey) {
        this.editForm.setValue({
          ...this.editForm.value,
          [uniqueKey]: this.editForm.getRawValue()[`${uniqueKey}_file`] ? null : this.editForm.getRawValue()[uniqueKey],
        });
      }

      // Get the existing row data to preserve fields that might not be in the edit form
      const existingRowData = this.formArray.at(this.currentRowIndex).value;

      // Merge the edit form values with existing row data to preserve all fields
      const mergedData = { ...existingRowData, ...this.editForm.value };

      this.formArray.at(this.currentRowIndex).patchValue(mergedData);
    } else {
      // Logic for adding a new row

      const newFormGroup = new FormGroup({});

      // Safely get all control values from edit form
      const controlKeys = Object.keys(this.editForm.controls);

      controlKeys.forEach((key) => {
        const control = this.editForm.get(key);

        if (control) {
          newFormGroup.addControl(key, new FormControl(control?.value || ''));
        } else {
          newFormGroup.addControl(key, new FormControl(''));
        }
      });

      this.formArray.push(newFormGroup); // Push the new row to the form array
      console.log('=== REPEAT-TABLE: Row pushed. formArray length now:', this.formArray.length);
    }
    // Update the model
    if (this.field.parent && this.field.parent.model) {
      const key = this.field.key;
      this.field.parent.model[`${key}`] = this.formArray.value;
    }

    // Clear resolved values cache since data changed
    this.resolvedDisplayValues.clear();

    // Notify parent via optional callback so it can clear its own display cache
    const onRowSaved = this.field.templateOptions?.['onRowSaved'];
    if (typeof onRowSaved === 'function') {
      onRowSaved();
    }

    // Reset the form fields after saving
    this.resetRow();

    // Trigger change detection to render the new row in the table
    this.cdr.detectChanges();
  }

  // resetRow() {
  //   this.editForm.reset();
  //   this.currentRowIndex = null;
  // }
  resetRow() {
    const defaultValues: any = {}; // Map of default values for each control
    this.getFieldGroup().forEach((field: any) => {
      defaultValues[field.key] = field.defaultValue || ''; // Set default or empty value
    });
    this.editForm.reset(defaultValues); // Reset the form
    this.editModel = {}; // Reset the model
    this.currentRowIndex = null;
    // setTimeout(() => {
    //   const fileInputs = document.querySelectorAll('input[type="file"].formly-file');
    //   fileInputs.forEach((fileInput, i) => {
    //     (fileInput as HTMLInputElement).value = ''; // Clear the file input
    //   });
    // }, 300);
  }

  // Edit a row in the table - opens popup or inline form based on config
  editRow(index: number) {
    this.currentRowIndex = index;
    const rowData = this.formArray.at(index).value;

    if (this.enablePopupLineItem) {
      // Open popup with existing data
      this.openPopupForEdit(rowData);
    } else {
      // Inline edit: set model first so Formly fields render with correct values
      this.editModel = { ...rowData };
      this.initializeDynamicForm();
      setTimeout(() => {
        this.setEditFormValues(rowData);
      }, 100);
    }
  }

  // Wait for Formly fields to be ready before setting values
  private waitForFormlyFieldsAndSetValues(rowData: any, attempts: number = 0): void {
    const maxAttempts = 10;
    const delay = 300;

    if (attempts >= maxAttempts) {
      this.setEditFormValues(rowData);
      return;
    }

    setTimeout(() => {
      // Check if the select-from-db field is ready by examining its options
      const selectFromDbFields = this.getFieldGroup().filter(
        (field: any) =>
          field.type === 'select-from-db' &&
          (field.key === 'product_ids' || field.key === 'customer_ids' || field.key === 'category_ids' || field.key === 'customer_group_ids')
      );
      const isReady = selectFromDbFields.every((field) => this.isSelectFromDbFieldReady(field));

      if (isReady) {
        this.setEditFormValues(rowData);
      } else {
        this.waitForFormlyFieldsAndSetValues(rowData, attempts + 1);
      }
    }, delay);
  }

  // Check if a select-from-db field is ready to accept values
  private isSelectFromDbFieldReady(field: any): boolean {
    if (!field || field.type !== 'select-from-db') {
      return true; // Not a select-from-db field, so it's ready
    }

    // Check if the field has options loaded (check multiple possible indicators)
    const fieldControl = this.editForm.get(field.key);
    if (!fieldControl) {
      return false;
    }

    // Try to access the field's options through various means
    const hasOptions =
      field.props?.options ||
      (field as any)['options'] ||
      (fieldControl as any)['options'] ||
      (field.formControl && (field.formControl as any)['_parent']?.field?.props?.options);

    return hasOptions !== undefined && hasOptions !== null;
  }

  // Set values in the edit form with proper Formly field updates
  private setEditFormValues(rowData: any): void {
    // Identify select-from-db fields that need delayed setting (options load from API)
    const fieldGroup = this.getFieldGroup();
    const dbSelectFieldKeys = new Set<string>();

    Object.keys(rowData).forEach((key) => {
      const targetField = fieldGroup.find((f: any) => f.key === key);
      if (targetField && targetField.type === 'select-from-db' && rowData[key] != null && rowData[key] !== '') {
        const hasTable = this.getFieldProp(targetField, 'table');
        if (hasTable) {
          dbSelectFieldKeys.add(key);
        }
      }
    });

    // Patch all fields immediately (including select-from-db fields)
    // ng-select will display the value once options arrive from API
    this.editForm.patchValue(rowData);

    // Process each field for proper formatting and Formly updates
    Object.keys(rowData).forEach((key) => {
      const control = this.editForm.get(key);
      const targetField = fieldGroup.find((f: any) => f.key === key);

      if (control) {
        let processedValue = rowData[key];

        // Convert date values for HTML date input fields
        if (targetField && (targetField.props?.type === 'date' || (targetField as any).templateOptions?.type === 'date') && rowData[key]) {
          processedValue = this.convertDateForInput(rowData[key]);
        }

        control.setValue(processedValue, {
          emitEvent: true,
          emitModelToViewChange: true,
          emitViewToModelChange: true,
        });
        control.markAsDirty();
        control.updateValueAndValidity({ emitEvent: true });

        // Try to set Formly field value directly
        this.setFormlyFieldValue(key, processedValue);
      }
    });

    // Trigger change detection
    this.cdr.detectChanges();

    // For select-from-db fields, re-apply values after options have loaded from API
    if (dbSelectFieldKeys.size > 0) {
      const reapplyValues = () => {
        dbSelectFieldKeys.forEach((key) => {
          const control = this.editForm.get(key);
          if (control && rowData[key] != null) {
            control.setValue(rowData[key], {
              emitEvent: true,
              emitModelToViewChange: true,
              emitViewToModelChange: true,
            });
          }
        });
        this.cdr.detectChanges();
      };

      // Re-apply at intervals to catch when options load
      setTimeout(() => reapplyValues(), 500);
      setTimeout(() => reapplyValues(), 1000);
      setTimeout(() => reapplyValues(), 2000);
    }
  }

  // Wait for select-from-db options to be loaded and then set the value
  private waitForSelectFromDbOptionsAndSetValue(control: any, values: any[], key: string, attempt: number): void {
    const maxAttempts = 10;
    const delay = 300;

    const applyValue = () => {
      control.setValue(values, {
        emitEvent: true,
        emitModelToViewChange: true,
        emitViewToModelChange: true,
      });
      control.markAsDirty();
      control.updateValueAndValidity({ emitEvent: true });
      this.setFormlyFieldValue(key, values);
      this.cdr.detectChanges();
    };

    if (attempt >= maxAttempts) {
      applyValue();
      return;
    }

    setTimeout(() => {
      const fieldGroup = this.getFieldGroup();
      const targetField = fieldGroup.find((f: any) => f.key === key);

      // Check static options array (legacy fields)
      const hasStaticOptions = targetField?.props?.options && Array.isArray(targetField.props.options) && targetField.props.options.length > 0;

      // Check select-from-db component's currentOptions (populated after API response)
      const componentCurrentOptions = (targetField as any)?._componentRef?.instance?.currentOptions;
      const hasDbOptions = Array.isArray(componentCurrentOptions) && componentCurrentOptions.length > 0;

      // Also check if the formControl on the Formly field has options loaded via the field's component
      const fieldFormControl = targetField?.formControl;
      const hasFormControlOptions = fieldFormControl && (fieldFormControl as any)['_currentOptions']?.length > 0;

      if (hasStaticOptions || hasDbOptions || hasFormControlOptions) {
        applyValue();
      } else {
        this.waitForSelectFromDbOptionsAndSetValue(control, values, key, attempt + 1);
      }
    }, delay);
  }

  // Set value directly on Formly field instance
  private setFormlyFieldValue(fieldKey: string, value: any): void {
    try {
      // Try to find the Formly field instance and set its value
      const fieldGroup = this.getFieldGroup();
      const field = fieldGroup.find((f: any) => f.key === fieldKey);

      if (field) {
        // Try multiple approaches to set the field value
        if (field.formControl) {
          field.formControl.setValue(value, { emitEvent: true });
        }

        // Try to set the field's model through the parent if possible
        if (field.parent && field.parent.model && typeof field.key === 'string') {
          field.parent.model[field.key] = value;
        }

        // Try to trigger field's change detection
        if (field.options && field.options.detectChanges) {
          field.options.detectChanges(field);
        }
      }
    } catch (error) {
      console.log(`DEBUG: Error setting Formly field value for ${fieldKey}:`, error);
    }
  }

  // Try to patch values multiple times with increasing delays
  private patchValueWithRetry(rowData: any, attempt: number): void {
    const delays = [200, 400, 600, 800]; // Progressive delays

    if (attempt >= delays.length) {
      // Final attempt - patch regardless of options state
      this.patchFormlyValues(rowData);
      return;
    }

    setTimeout(() => {
      // Try to patch the values using our enhanced method
      this.patchFormlyValues(rowData);

      // Check if the values were actually set by comparing the form values
      const productIdsControl = this.editForm.get('product_ids');
      const customerIdsControl = this.editForm.get('customer_ids');
      const categoryIdsControl = this.editForm.get('category_ids');
      const customerGroupIdsControl = this.editForm.get('customer_group_ids');

      const hasProductIds =
        productIdsControl &&
        ((Array.isArray(productIdsControl.value) && productIdsControl.value.length > 0) ||
          (typeof productIdsControl.value === 'string' && productIdsControl.value !== ''));

      const hasCustomerIds =
        customerIdsControl &&
        ((Array.isArray(customerIdsControl.value) && customerIdsControl.value.length > 0) ||
          (typeof customerIdsControl.value === 'string' && customerIdsControl.value !== ''));

      const hasCategoryIds =
        categoryIdsControl &&
        ((Array.isArray(categoryIdsControl.value) && categoryIdsControl.value.length > 0) ||
          (typeof categoryIdsControl.value === 'string' && categoryIdsControl.value !== ''));

      const hasCustomerGroupIds =
        customerGroupIdsControl &&
        ((Array.isArray(customerGroupIdsControl.value) && customerGroupIdsControl.value.length > 0) ||
          (typeof customerGroupIdsControl.value === 'string' && customerGroupIdsControl.value !== ''));

      const shouldRetry =
        (!hasProductIds && rowData.product_ids) ||
        (!hasCustomerIds && rowData.customer_ids) ||
        (!hasCategoryIds && rowData.category_ids) ||
        (!hasCustomerGroupIds && rowData.customer_group_ids);

      if (shouldRetry) {
        // Values not set yet, try again with longer delay
        this.patchValueWithRetry(rowData, attempt + 1);
      } else {
        // Values set successfully, trigger comprehensive updates
        this.triggerFormlyUpdates();
      }
    }, delays[attempt]);
  }

  // Enhanced method to patch values and ensure Formly fields are updated
  private patchFormlyValues(rowData: any): void {
    // Patch the form values
    this.editForm.patchValue(rowData);

    // Trigger form control value changes to notify Formly fields
    Object.keys(rowData).forEach((key) => {
      const control = this.editForm.get(key);
      if (control) {
        // Force the control to emit a value change event
        control.setValue(rowData[key], { emitEvent: true, emitModelToViewChange: true });
        control.markAsDirty();
        control.updateValueAndValidity();
      }
    });
  }

  // Comprehensive update triggers for Formly
  private triggerFormlyUpdates(): void {
    // Trigger change detection multiple times to ensure Formly updates
    this.cdr.detectChanges();

    // Additional trigger after a small delay
    setTimeout(() => {
      this.cdr.detectChanges();
    }, 50);

    // Final trigger after Formly has had time to process
    setTimeout(() => {
      this.cdr.detectChanges();
    }, 150);
  }

  // Delete a row in the table
  deleteRow(index: number) {
    this.resetRow();
    this.formArray.removeAt(index);
    if (this.field.parent && this.field.parent.model) {
      const key = this.field.key;
      this.field.parent.model[`${key}`] = this.formArray.value;
    }

    // Clear resolved values cache since data changed
    this.resolvedDisplayValues.clear();
  }

  coerceKeyToString(key: string | number | (string | number)[]): string {
    if (Array.isArray(key)) {
      return key.join('.');
    }
    return String(key);
  }

  // Check if this is a discount rule type component
  isDiscountRuleType(): boolean {
    if (this._isDiscountRuleType !== null) {
      return this._isDiscountRuleType;
    }
    const fieldGroup = this.getFieldGroup();
    this._isDiscountRuleType = fieldGroup.some((field: any) => field.key === 'rule_type');
    return this._isDiscountRuleType;
  }

  // Check if this component has custom headers
  hasCustomHeaders(): boolean {
    return this.field.templateOptions?.['customHeaders'] && Array.isArray(this.field.templateOptions?.['customHeaders']);
  }

  // Get custom headers
  getCustomHeaders(): any[] {
    return this.field.templateOptions?.['customHeaders'] || [];
  }

  // Get custom display value
  getCustomDisplayValue(rowData: any, rowIndex: number, headerKey: string): string {
    const customDisplayFn = this.field.templateOptions?.['getCustomDisplay'];
    if (customDisplayFn && typeof customDisplayFn === 'function') {
      try {
        const displayData = customDisplayFn(rowData, rowIndex);
        return displayData?.[headerKey] || '';
      } catch (e) {
        console.error('=== REPEAT-TABLE: Error in getCustomDisplay:', e);
        return '';
      }
    }
    return '';
  }

  // Get formatted display for rule type (discount-specific)
  getRuleTypeDisplay(ruleType: string): string {
    if (!ruleType) return '';

    switch (ruleType) {
      case 'product':
        return 'Product';
      case 'customer':
        return 'Customer';
      case 'category':
        return 'Category';
      case 'customer_group':
        return 'Customer Group';
      default:
        return ruleType.charAt(0).toUpperCase() + ruleType.slice(1);
    }
  }

  // Get formatted display for rule values based on rule type (discount-specific)
  getRuleValuesDisplay(rowData: any, rowIndex: number): string {
    if (!rowData) return '';

    const ruleType = rowData.rule_type;

    switch (ruleType) {
      case 'product':
        return this.getResolvedFieldDisplay(rowData.product_ids, 'product_ids', rowIndex);
      case 'customer':
        return this.getResolvedFieldDisplay(rowData.customer_ids, 'customer_ids', rowIndex);
      case 'category':
        return this.getResolvedFieldDisplay(rowData.category_ids, 'category_ids', rowIndex);
      case 'customer_group':
        return this.getResolvedFieldDisplay(rowData.customer_group_ids, 'customer_group_ids', rowIndex);
      default:
        return '';
    }
  }

  // Helper method to get resolved display for a field (discount-specific)
  private getResolvedFieldDisplay(fieldValue: any, fieldKey: string, rowIndex: number): string {
    if (!fieldValue) return '';

    const cacheKey = `${rowIndex}_${fieldKey}`;

    // Check if we already have a resolved value
    if (this.resolvedDisplayValues.has(cacheKey)) {
      return this.resolvedDisplayValues.get(cacheKey)!;
    }

    // For select-from-db fields, try to resolve names
    const fieldGroup = this.getFieldGroup();
    const field = fieldGroup.find((f: any) => f.key === fieldKey);

    if (field && field.type === 'select-from-db') {
      // Start async resolution
      this.resolveAndCacheDisplayValue(fieldValue, field, cacheKey);
    }

    // Return original value for now (will be updated when async resolution completes)
    return Array.isArray(fieldValue) ? fieldValue.join(', ') : String(fieldValue);
  }

  // Popup management methods
  openPopup() {
    this.isPopupOpen = true;
    this.initializePopupForm();
    this.currentRowIndex = null; // Reset editing state
  }

  openPopupForEdit(rowData: any) {
    this.isPopupOpen = true;
    this.popupModel = { ...rowData }; // Set model so hideExpression evaluates correctly
    this.initializePopupForm();
    this.currentRowIndex = this.currentRowIndex; // Keep the editing index

    // Populate popup form with existing row data
    setTimeout(() => {
      this.setPopupFormValues(rowData);
    }, 100);
  }

  closePopup() {
    this.isPopupOpen = false;
    this.popupModel = {}; // Reset popup model
    // Reset popup form with default values like the original resetRow method
    const defaultValues: any = {};
    this.getFieldGroup().forEach((field: any) => {
      defaultValues[field.key] = field.defaultValue || '';
    });
    this.popupForm.reset(defaultValues);
    this.currentRowIndex = null;
    this.errorMessage = '';
  }

  initializePopupForm() {
    this.popupForm = new FormGroup({});
    this._cachedPopupFields = null; // Clear cached popup fields to force re-binding with new form

    // Set options for popup form fields
    this.getFieldGroup().forEach((field: any) => {
      if (field.options) {
        field.options.formState = this.options?.formState;
      }
    });
  }

  setPopupFormValues(rowData: any) {
    // Ensure all controls exist before setting values
    this.getFieldGroup().forEach((field: any) => {
      if (!this.popupForm.contains(field.key)) {
        let fieldValue = rowData[field.key] !== undefined ? rowData[field.key] : field.defaultValue || '';

        // For select-from-db fields with multiple=true, ensure array values are properly handled
        if (field.type === 'select-from-db' && this.getFieldProp(field, 'multiple')) {
          if (Array.isArray(fieldValue)) {
            // Keep array as is for multi-select fields
          } else if (fieldValue && !Array.isArray(fieldValue)) {
            // Convert single values to array for multi-select fields
            fieldValue = Array.isArray(fieldValue) ? fieldValue : [fieldValue];
          } else if (!fieldValue) {
            // Ensure empty multi-select fields are initialized as empty arrays
            fieldValue = [];
          }
        }

        this.popupForm.addControl(field.key, new FormControl(fieldValue));
      }
    });

    // Set the values using patchValue, but preserve array values for multi-select fields
    const patchData = { ...rowData };

    this.getFieldGroup().forEach((field: any) => {
      if (field.type === 'select-from-db' && this.getFieldProp(field, 'multiple')) {
        // Ensure multi-select fields maintain array format
        const fieldValue = rowData[field.key];

        if (Array.isArray(fieldValue)) {
          patchData[field.key] = fieldValue;
        } else if (fieldValue && !Array.isArray(fieldValue)) {
          patchData[field.key] = [fieldValue];
        } else if (!fieldValue) {
          patchData[field.key] = [];
        }
      }
    });

    this.popupForm.patchValue(patchData);

    // Force each control to update and notify Formly fields
    Object.keys(rowData).forEach((key) => {
      const control = this.popupForm.get(key);
      if (control) {
        // Check if this is a date field and convert format for HTML input
        const fieldGroup = this.getFieldGroup();
        const targetField = fieldGroup.find((f: any) => f.key === key);
        let processedValue = rowData[key];

        // Convert date values for HTML date input fields
        if (targetField && this.getFieldProp(targetField, 'type') === 'date' && rowData[key]) {
          processedValue = this.convertDateForInput(rowData[key]);
        }

        // For ALL select-from-db fields, use the retry mechanism to wait for options to load
        if (targetField && targetField.type === 'select-from-db') {
          // Normalize value to array for multiple fields, or keep as-is for single
          if (this.getFieldProp(targetField, 'multiple')) {
            if (Array.isArray(processedValue)) {
              // keep as-is
            } else if (processedValue) {
              processedValue = [processedValue];
            } else {
              processedValue = [];
            }
          }

          if (
            processedValue !== null &&
            processedValue !== undefined &&
            processedValue !== '' &&
            !(Array.isArray(processedValue) && processedValue.length === 0)
          ) {
            // Use retry mechanism so we wait for async options to load before setting value
            this.waitForSelectFromDbOptionsAndSetValue(control, Array.isArray(processedValue) ? processedValue : processedValue, key, 0);
          } else {
            control.setValue(processedValue, { emitEvent: true });
          }
          return; // Skip the generic setValue below
        }

        control.setValue(processedValue, {
          emitEvent: true,
          emitModelToViewChange: true,
          emitViewToModelChange: true,
        });
        control.markAsDirty();
        control.updateValueAndValidity({ emitEvent: true });

        // Log control value after setting
      }
    });

    // Trigger change detection
    this.cdr.detectChanges();
    setTimeout(() => this.cdr.detectChanges(), 50);
  }

  saveFromPopup() {
    // Trigger validation
    this.popupForm.markAllAsTouched();
    this.popupForm.updateValueAndValidity();

    if (this.popupForm.invalid) {
      return;
    }

    // Check for unique fields (skip for edit mode)
    if (this.currentRowIndex === null && this.isDisabled()) {
      this.errorMessage = `The row limit "${this.field.props['limit']}" has been reached for adding new record`;
      return;
    }

    // Check for unique fields
    const uniqueFields = this.getFieldGroup().filter((field) => field.props && field.props['uniqueRow']);
    const duplicateFields: string[] = [];

    uniqueFields.forEach((uniqueField) => {
      const fieldKey = this.coerceKeyToString(uniqueField.key ?? '');
      const currentValue = this.popupForm.get(fieldKey)?.value;

      const duplicate = this.formArray.controls.some((row, index) => {
        // Skip the current row when editing
        if (this.currentRowIndex !== null && index === this.currentRowIndex) {
          return false;
        }
        return row.get(fieldKey)?.value === currentValue;
      });

      if (duplicate) {
        duplicateFields.push(uniqueField.props?.label || fieldKey);
      }
    });

    if (duplicateFields.length > 0) {
      this.errorMessage = `The "${duplicateFields.join(', ')}" fields must be unique, can't add duplicate values.`;
      return;
    }

    if (this.currentRowIndex !== null) {
      // Edit mode - update existing row
      const existingRowData = this.formArray.at(this.currentRowIndex).value;
      const mergedData = { ...existingRowData, ...this.popupForm.value };
      this.formArray.at(this.currentRowIndex).patchValue(mergedData);
    } else {
      // Add mode - add new row
      const newFormGroup = new FormGroup({});
      const controlKeys = Object.keys(this.popupForm.controls);

      controlKeys.forEach((key) => {
        const control = this.popupForm.get(key);
        if (control) {
          newFormGroup.addControl(key, new FormControl(control?.value || ''));
        }
      });

      this.formArray.push(newFormGroup);
    }

    // Update the model
    if (this.field.parent && this.field.parent.model) {
      const key = this.field.key;
      this.field.parent.model[`${key}`] = this.formArray.value;
    }

    // Clear resolved values cache
    this.resolvedDisplayValues.clear();

    // Notify parent via optional callback so it can clear its own display cache
    const onRowSaved = this.field.templateOptions?.['onRowSaved'];
    if (typeof onRowSaved === 'function') {
      onRowSaved();
    }

    // Close popup and reset
    this.closePopup();
  }

  // Utility methods for backward compatibility
  getSafeDisplayValue(fieldValue: any, options: any[] | Observable<any[]> | undefined): Observable<string> | string {
    if (!options) {
      return fieldValue; // Return the value if options are not available
    }

    // If options is an Observable, use it directly
    if (options instanceof Observable) {
      return options.pipe(
        map((opts: any[]) => {
          const option = opts.find((opt) => opt.value === fieldValue);
          return option ? option.label : fieldValue;
        })
      );
    }

    // If options is an array, return the label directly
    const option = options.find((opt) => opt.value === fieldValue);
    return option ? option.label : fieldValue;
  }

  // // getImageSrc(fieldValue: any, key: string, returnNull: boolean = false): string {
  // //   const apiUrl = localStorage.getItem('lcp_api_base_url') || environment.apiUrl;
  // //   const pathKey = this.removeSuffix(key, '_file');
  // //   let url = '';

  // //   if (!fieldValue[key] && fieldValue[pathKey]) {
  // //     url = `${apiUrl}/${fieldValue[pathKey]}`;
  // //   } else {
  // //     const ImageValue = fieldValue[key];
  // //     if (typeof fieldValue === 'string') {
  // //       url = ImageValue;
  // //     } else if (ImageValue instanceof FileList && ImageValue.length > 0) {
  // //       url = ImageValue[0].name;
  // //     } else if (ImageValue instanceof File) {
  // //       url = ImageValue.name;
  // //     }
  // //   }

  // //   if (returnNull && !url) {
  // //     return '';
  // //   }

  // //   return url;
  // // }

  // // getFileExtension(url: string, index: number): string {
  // //   if (!url) return '';
  // //   const parts = url.split('.');
  // //   return parts.length > 1 ? parts[parts.length - 1] : '';
  // // }

  // // removeSuffix(str: string, suffix: string): string {
  // //   return str.endsWith(suffix) ? str.slice(0, -suffix.length) : str;
  // // }

  // // downloadFile(url: string, index: number): void {
  // //   if (url && url.includes('http')) {
  // //     window.open(url, '_blank');
  // //   }
  // // }

  // // // Get formatted display for rule type
  // // getRuleTypeDisplay(ruleType: string): string {
  // //   if (!ruleType) return '';

  // //   switch (ruleType) {
  // //     case 'product':
  // //       return 'Product';
  // //     case 'customer':
  // //       return 'Customer';
  // //     case 'category':
  // //       return 'Category';
  // //     case 'customer_group':
  // //       return 'Customer Group';
  // //     default:
  // //       return ruleType.charAt(0).toUpperCase() + ruleType.slice(1);
  // //   }
  // // }

  // // // Get formatted display for rule values based on rule type
  // // getRuleValuesDisplay(rowData: any, rowIndex: number): string {
  // //   if (!rowData) return '';

  // //   const ruleType = rowData.rule_type;

  // //   switch (ruleType) {
  // //     case 'product':
  // //       return this.getResolvedFieldDisplay(rowData.product_ids, 'product_ids', rowIndex);
  // //     case 'customer':
  // //       return this.getResolvedFieldDisplay(rowData.customer_ids, 'customer_ids', rowIndex);
  // //     case 'category':
  // //       return this.getResolvedFieldDisplay(rowData.category_ids, 'category_ids', rowIndex);
  // //     case 'customer_group':
  // //       return this.getResolvedFieldDisplay(rowData.customer_group_ids, 'customer_group_ids', rowIndex);
  // //     default:
  // //       return '';
  // //   }
  // // }

  // // // Helper method to get resolved display for a field
  // // private getResolvedFieldDisplay(fieldValue: any, fieldKey: string, rowIndex: number): string {
  // //   if (!fieldValue) return '';

  // //   const cacheKey = `${rowIndex}_${fieldKey}`;

  // //   // Check if we already have a resolved value
  // //   if (this.resolvedDisplayValues.has(cacheKey)) {
  // //     return this.resolvedDisplayValues.get(cacheKey)!;
  // //   }

  // //   // For select-from-db fields, try to resolve names
  // //   const fieldGroup = this.getFieldGroup();
  // //   const field = fieldGroup.find((f: any) => f.key === fieldKey);

  // //   if (field && field.type === 'select-from-db') {
  // //     // Start async resolution
  // //     this.resolveAndCacheDisplayValue(fieldValue, field, cacheKey);
  // //   }

  // //   // Return original value for now (will be updated when async resolution completes)
  // //   return Array.isArray(fieldValue) ? fieldValue.join(', ') : String(fieldValue);
  // // }

  // // getSafeDisplayValue(fieldValue: any, options: any[] | Observable<any[]> | undefined): Observable<string> {
  // //   if (!options) {
  // //     return fieldValue; // Return the value if options are not available
  // //   }

  // //   // If options is an Observable, use it directly
  // //   if (options instanceof Observable) {
  // //     return options.pipe(
  // //       map((opts: any[]) => {
  // //         const option = opts.find((opt) => opt.value === fieldValue);
  // //         return option ? option.label : fieldValue;
  // //       })
  // //     );
  // //   }

  // //   // If options is an array, return the label directly
  // //   const option = options.find((opt) => opt.value === fieldValue);
  // //   return option ? option.label : fieldValue;
  // // }

  // // Check if this is a discount rule type component
  // isDiscountRuleType(): boolean {
  //   const fieldGroup = this.getFieldGroup();
  //   return fieldGroup.some((field: any) => field.key === 'rule_type');
  // }

  // // Get formatted display for rule type (discount-specific)
  // getRuleTypeDisplay(ruleType: string): string {
  //   if (!ruleType) return '';

  //   switch (ruleType) {
  //     case 'product':
  //       return 'Product';
  //     case 'customer':
  //       return 'Customer';
  //     case 'category':
  //       return 'Category';
  //     case 'customer_group':
  //       return 'Customer Group';
  //     default:
  //       return ruleType.charAt(0).toUpperCase() + ruleType.slice(1);
  //   }
  // }

  // // Get formatted display for rule values based on rule type (discount-specific)
  // getRuleValuesDisplay(rowData: any, rowIndex: number): string {
  //   if (!rowData) return '';

  //   const ruleType = rowData.rule_type;

  //   switch (ruleType) {
  //     case 'product':
  //       return this.getResolvedFieldDisplay(rowData.product_ids, 'product_ids', rowIndex);
  //     case 'customer':
  //       return this.getResolvedFieldDisplay(rowData.customer_ids, 'customer_ids', rowIndex);
  //     case 'category':
  //       return this.getResolvedFieldDisplay(rowData.category_ids, 'category_ids', rowIndex);
  //     case 'customer_group':
  //       return this.getResolvedFieldDisplay(rowData.customer_group_ids, 'customer_group_ids', rowIndex);
  //     default:
  //       return '';
  //   }
  // }

  // // Helper method to get resolved display for a field (discount-specific)
  // private getResolvedFieldDisplay(fieldValue: any, fieldKey: string, rowIndex: number): string {
  //   if (!fieldValue) return '';

  //   const cacheKey = `${rowIndex}_${fieldKey}`;

  //   // Check if we already have a resolved value
  //   if (this.resolvedDisplayValues.has(cacheKey)) {
  //     return this.resolvedDisplayValues.get(cacheKey)!;
  //   }

  //   // For select-from-db fields, try to resolve names
  //   const fieldGroup = this.getFieldGroup();
  //   const field = fieldGroup.find((f: any) => f.key === fieldKey);

  //   if (field && field.type === 'select-from-db') {
  //     // Start async resolution
  //     this.resolveAndCacheDisplayValue(fieldValue, field, cacheKey);
  //   }

  //   // Return original value for now (will be updated when async resolution completes)
  //   return Array.isArray(fieldValue) ? fieldValue.join(', ') : String(fieldValue);
  // }

  // // Utility methods for backward compatibility
  // getImageSrc(fieldValue: any, key: string, returnNull: boolean = false): string {
  //   const apiUrl = localStorage.getItem('lcp_api_base_url') || environment.apiUrl;
  //   const pathKey = this.removeSuffix(key, '_file');
  //   let url = '';

  //   if (!fieldValue[key] && fieldValue[pathKey]) {
  //     url = `${apiUrl}/${fieldValue[pathKey]}`;
  //   } else {
  //     const ImageValue = fieldValue[key];
  //     if (typeof fieldValue === 'string') {
  //       url = ImageValue;
  //     } else if (ImageValue instanceof FileList && ImageValue.length > 0) {
  //       url = ImageValue[0].name;
  //     } else if (ImageValue instanceof File) {
  //       url = ImageValue.name;
  //     }
  //   }

  //   if (returnNull && !url) {
  //     return '';
  //   }

  //   return url;
  // }

  // getFileExtension(url: string, index: number): string {
  //   if (!url) return '';
  //   const parts = url.split('.');
  //   return parts.length > 1 ? parts[parts.length - 1] : '';
  // }

  // removeSuffix(str: string, suffix: string): string {
  //   return str.endsWith(suffix) ? str.slice(0, -suffix.length) : str;
  // }

  // downloadFile(url: string, index: number): void {
  //   if (url && url.includes('http')) {
  //     window.open(url, '_blank');
  //   }
  // }

  // Method to format date values for display
  formatDateValue(dateValue: any): string {
    if (!dateValue) return '';

    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return dateValue; // Return original if invalid date

      // Format as dd-mm-yyyy
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();

      return `${day}-${month}-${year}`;
    } catch (error) {
      return dateValue; // Return original value if formatting fails
    }
  }

  // Method to convert date values for HTML date input editing
  convertDateForInput(dateValue: any): string {
    if (!dateValue) return '';

    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return dateValue; // Return original if invalid date

      // Format as yyyy-MM-dd for HTML date input
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');

      return `${year}-${month}-${day}`;
    } catch (error) {
      return dateValue; // Return original value if formatting fails
    }
  }

  // Method to get display value for table cells
  getDisplayValue(fieldValue: any, field: FormlyFieldConfig, rowIndex: number): string {
    const cacheKey = `${rowIndex}_${field.key}`;

    // For select-from-db fields, try to resolve names
    if (field.type === 'select-from-db') {
      const tableName = this.getFieldProp(field, 'table') || this.getFieldProp(field, 'primary_table');
      let staticOptions = this.getFieldProp(field, 'options');

      // If no table is configured, resolve from static options.
      // When expressionProperties drives the options list it may still be empty on the
      // first render pass (before the expression has evaluated for this row). In that
      // case we evaluate the expression ourselves so the label resolves immediately
      // instead of showing a raw value.
      if (!tableName) {
        // Fast path for uuid-keyed fields (e.g. parent_location_uuid):
        // scan all sibling rows in formArray directly for a uuid match.
        // This is reliable even when the expression's options list is empty or stale.
        if (fieldValue && typeof fieldValue === 'string' && fieldValue.includes('-')) {
          const allRows: any[] = this.formArray?.value || [];
          const matchedRow = allRows.find((row: any) => row?.uuid === fieldValue);
          if (matchedRow?.name) {
            return matchedRow.name;
          }
        }

        // Try to get a fresh options list by evaluating expressionProperties if present
        if ((!staticOptions || (Array.isArray(staticOptions) && staticOptions.length === 0)) && field.expressionProperties) {
          const optionsExpr = (field.expressionProperties as any)['props.options'];
          if (typeof optionsExpr === 'function') {
            try {
              // Build the row model for this row so the expression has the right context.
              // Use formArray.value (always current) rather than componentInstance.model
              // which may lag behind after a popup save.
              const rowModel = this.formArray?.at(rowIndex)?.value || {};

              // Build a synthetic formState that uses formArray.value as the source of
              // truth for sibling rows (e.g. parent_location_uuid options resolution).
              const realFormState = this.field?.options?.formState;
              const allRows = this.formArray?.value || [];
              const syntheticFormState = {
                ...realFormState,
                componentInstance: {
                  ...(realFormState?.componentInstance || {}),
                  model: {
                    ...(realFormState?.componentInstance?.model || {}),
                    // Override warehouse_locations with the live formArray data so
                    // parent-location label resolution always uses the latest rows.
                    warehouse_locations: allRows,
                  },
                },
              };

              const evaluated = optionsExpr(rowModel, syntheticFormState, field);
              if (Array.isArray(evaluated) && evaluated.length > 0) {
                staticOptions = evaluated;
              }
            } catch (_) {
              /* ignore evaluation errors */
            }
          }
        }

        if (staticOptions && Array.isArray(staticOptions) && staticOptions.length > 0) {
          const displayValue = this.getSafeDisplayValue(fieldValue, staticOptions);
          return typeof displayValue === 'string' ? displayValue : String(displayValue);
        }

        // Last resort: if options are still empty, return the raw value
        return fieldValue != null ? String(fieldValue) : '';
      }

      // Special handling for salesman_id - try synchronous resolution first
      if (field.key === 'salesman_id') {
        return this.resolveSalesmanName(fieldValue, field, cacheKey);
      }

      // Check if we already have a resolved value
      if (this.resolvedDisplayValues.has(cacheKey)) {
        return this.resolvedDisplayValues.get(cacheKey)!;
      }

      // Start async resolution (DB lookup)
      this.resolveAndCacheDisplayValue(fieldValue, field, cacheKey);

      // Return original value for now (will update once async resolves)
      return fieldValue;
    }

    // For other fields, use the existing method
    const options = this.getFieldProp(field, 'options');
    const displayValue = this.getSafeDisplayValue(fieldValue, options);
    return typeof displayValue === 'string' ? displayValue : String(displayValue);
  }

  // Special method to resolve salesman name synchronously
  private resolveSalesmanName(fieldValue: any, field: FormlyFieldConfig, cacheKey: string): string {
    if (!fieldValue) return '';

    // Check cache first
    if (this.resolvedDisplayValues.has(cacheKey)) {
      return this.resolvedDisplayValues.get(cacheKey)!;
    }

    // Start async resolution
    this.resolveAndCacheDisplayValue(fieldValue, field, cacheKey);

    // Return raw value while loading (same as other select-from-db fields)
    return String(fieldValue);
  }

  // Method to resolve and cache display values asynchronously
  private async resolveAndCacheDisplayValue(fieldValue: any, field: FormlyFieldConfig, cacheKey: string): Promise<void> {
    if (!fieldValue || field.type !== 'select-from-db') {
      return;
    }

    const tableName = this.getFieldProp(field, 'table') || this.getFieldProp(field, 'primary_table');
    if (!tableName) {
      return;
    }

    // Check cache first
    const optionsCacheKey = `${tableName}_${this.getFieldProp(field, 'valueColumn')}_${this.getFieldProp(field, 'labelColumn')}`;
    let cachedOptions = this.productCache.get(optionsCacheKey);

    if (!cachedOptions) {
      // Load options if not cached
      cachedOptions = await this.loadFieldOptions(field);
      if (cachedOptions) {
        this.productCache.set(optionsCacheKey, cachedOptions);
      } else {
        return;
      }
    } else {
      console.log(`DEBUG: Using cached options for ${field.key}, count: ${cachedOptions.length}`);
    }

    if (cachedOptions) {
      let resolvedValue = fieldValue;

      // Handle multiple values (array or comma-separated string)
      if (Array.isArray(fieldValue)) {
        const names = fieldValue.map((id) => {
          const option = cachedOptions.find((opt: any) => opt.value === parseInt(id) || opt.value === id);
          return option ? option.label : id;
        });
        resolvedValue = names.join(', ');
      } else if (typeof fieldValue === 'string' && fieldValue.includes(',')) {
        const ids = fieldValue.split(',').map((id) => id.trim());
        const names = ids.map((id) => {
          const option = cachedOptions.find((opt: any) => opt.value === parseInt(id) || opt.value === id);
          return option ? option.label : id;
        });
        resolvedValue = names.join(', ');
      } else {
        // Handle single value
        const option = cachedOptions.find((opt: any) => opt.value === parseInt(fieldValue) || opt.value === fieldValue);
        resolvedValue = option ? option.label : fieldValue;
      }

      // Cache the resolved value
      this.resolvedDisplayValues.set(cacheKey, resolvedValue);

      // Trigger multiple change detection cycles to ensure the display updates
      this.cdr.detectChanges();

      // Additional change detection with delays to ensure UI updates
      setTimeout(() => this.cdr.detectChanges(), 50);
      setTimeout(() => this.cdr.detectChanges(), 150);
      setTimeout(() => this.cdr.detectChanges(), 300);
    } else {
      console.log('DEBUG: No cached options available for field:', field.key);
    }
  }

  // Method to resolve product IDs to names for select-from-db fields
  async resolveProductNames(fieldValue: any, field: FormlyFieldConfig): Promise<string> {
    if (!fieldValue || field.type !== 'select-from-db') {
      return fieldValue;
    }

    const tableName = this.getFieldProp(field, 'table') || this.getFieldProp(field, 'primary_table');
    if (!tableName) {
      return fieldValue;
    }

    // Check cache first
    const cacheKey = `${tableName}_${this.getFieldProp(field, 'valueColumn')}_${this.getFieldProp(field, 'labelColumn')}`;
    let cachedOptions = this.productCache.get(cacheKey);

    if (!cachedOptions) {
      // Load options if not cached
      cachedOptions = await this.loadFieldOptions(field);
      if (cachedOptions) {
        this.productCache.set(cacheKey, cachedOptions);
      }
    }

    if (cachedOptions) {
      // Handle multiple values (array or comma-separated string)
      if (Array.isArray(fieldValue)) {
        const names = fieldValue.map((id) => {
          const option = cachedOptions.find((opt: any) => opt.value === parseInt(id) || opt.value === id);
          return option ? option.label : id;
        });
        return names.join(', ');
      } else if (typeof fieldValue === 'string' && fieldValue.includes(',')) {
        const ids = fieldValue.split(',').map((id) => id.trim());
        const names = ids.map((id) => {
          const option = cachedOptions.find((opt: any) => opt.value === parseInt(id) || opt.value === id);
          return option ? option.label : id;
        });
        return names.join(', ');
      } else {
        // Handle single value
        const option = cachedOptions.find((opt: any) => opt.value === parseInt(fieldValue) || opt.value === fieldValue);
        return option ? option.label : fieldValue;
      }
    }

    return fieldValue;
  }

  // Method to load field options dynamically
  private async loadFieldOptions(field: FormlyFieldConfig): Promise<any[]> {
    const tableName = this.getFieldProp(field, 'table') || this.getFieldProp(field, 'primary_table');
    const valueColumn = this.getFieldProp(field, 'valueColumn');
    const labelColumn = this.getFieldProp(field, 'labelColumn');
    const additionalColumns = this.getFieldProp(field, 'additionalColumns') || [];
    const includes = this.getFieldProp(field, 'includes') || [];
    if (!tableName || !valueColumn || !labelColumn) {
      return [];
    }

    const userData = JSON.parse(this.localStorageService.getData('user_data') || '{}');

    // Use the field's own search_all if defined, otherwise fall back to a basic status filter
    const fieldSearchAll = this.getFieldProp(field, 'search_all');
    const search_all = fieldSearchAll && fieldSearchAll.length > 0 ? fieldSearchAll : [{ column_name: `${tableName}.status_id`, operator: '=', value: 1 }];

    const params = {
      company_id: userData?.main?.company_id || 1,
      primary_table: tableName,
      limit_range: 1000,
      sort_columns: [[labelColumn, 'asc']],
      select_columns: [[valueColumn, 'value'], [labelColumn, 'label'], ...additionalColumns],
      includes: includes,
      search_all,
    };

    try {
      const response = await this.gridApiService.getAllList(params).toPromise();

      if (response?.status && response.data?.records) {
        const options = response.data.records.map((record: any) => ({
          value: record[valueColumn] || record['value'],
          label: record[labelColumn] || record['label'],
        }));
        return options;
      }
    } catch (error) {
      console.error(`DEBUG: Error loading field options for ${field.key}:`, error);
    }

    return [];
  }

  isDisabled() {
    return this.field.props['limit'] <= this.formArray.length;
  }

  getImageSrc(fieldValue: any, key: string, blob = false): string | null {
    const apiUrl = localStorage.getItem('lcp_api_base_url') || environment.apiUrl;
    const pathKey = this.removeSuffix(key, '_file');
    if (!fieldValue[key] && fieldValue[pathKey]) {
      return `${apiUrl}/${fieldValue[pathKey]}`; // Return null if no value
    }
    const ImageValue = fieldValue[key];
    if (typeof fieldValue === 'string') {
      return ImageValue; // Return the string URL
    } else if (ImageValue instanceof FileList && ImageValue.length > 0) {
      if (ImageValue[0].type.includes('image/')) {
        if (blob) return ImageValue[0].toString();
        else return URL.createObjectURL(ImageValue[0]); // Use the first file in the FileList
      } else return ImageValue[0].name;
    } else if (ImageValue instanceof File) {
      if (ImageValue.type.includes('image/')) {
        // Use the first file in the FileList
        if (blob) return ImageValue.toString();
        else return URL.createObjectURL(ImageValue);
      } else return ImageValue.name;
    }
    return null;
  }

  private removeSuffix(value: string, suffix: string): string {
    return value.endsWith(suffix) ? value.slice(0, -suffix.length) : value;
  }

  downloadFile(url: string | null, index: number) {
    if (url && url?.startsWith('http')) {
      fetch(url)
        .then((response) => response.blob())
        .then((blob) => {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = this.getFileExtension(url, index);
          link.textContent = 'Download File';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
        })
        .catch((error) => console.error('Download failed:', error));
    }
  }

  getFileExtension(url: string | null, i: number): string {
    if (url && url?.startsWith('http')) {
      const name = this.formArray?.at(i)?.getRawValue()?.name || '';
      const extension = url?.split('/').pop()?.split('.')[1] || '';
      return `${name}.${extension}`;
    }
    return '';
  }
}
