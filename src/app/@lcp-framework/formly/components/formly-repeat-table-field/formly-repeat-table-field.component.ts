import { Component, OnInit } from '@angular/core';
import { FieldArrayType, FormlyFieldConfig } from '@ngx-formly/core';
import { FormArray, FormGroup, FormControl } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-formly-repeat-table-field',
  templateUrl: './formly-repeat-table-field.component.html',
  styleUrl: './formly-repeat-table-field.component.scss',
})
export class FormlyRepeatTableFieldComponent extends FieldArrayType implements OnInit {
  formArray!: FormArray<FormGroup>;
  currentRowIndex: number | null = null; // To track editing row
  editForm: FormGroup; // Separate form for editing rows
  errorMessage: string = '';

  constructor() {
    super();
    this.editForm = new FormGroup({}); // Initialize empty form
  }

  ngOnInit() {
    // Initialize the dynamic form based on schema
    this.initializeDynamicForm();

    // Ensure formControl is available and of type FormArray
    if (this.formControl instanceof FormArray) {
      this.formArray = this.formControl as FormArray<FormGroup>;
    } else {
      // If formControl isn't a FormArray, you should initialize the formArray within the formControl
      console.error('formControl is not an instance of FormArray. Check your form configuration.');
      return; // Add a safeguard in case formControl isn't as expected
    }

    // Initialize formArray if it's still undefined for some reason
    if (!this.formArray) {
      this.formArray = new FormArray<FormGroup>([]); // Initialize if undefined
    }

    this.editForm.valueChanges.subscribe(() => {
      this.errorMessage = ''; // Clear the error message when the form changes
    });
  }

  // Helper function to get fieldArray.fieldGroup
  getFieldGroup(): FormlyFieldConfig[] {
    const fieldArray = typeof this.field.fieldArray === 'function' ? this.field.fieldArray(this.field) : this.field.fieldArray;
    return fieldArray?.fieldGroup || [];
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
      group[field.key] = new FormControl(field.defaultValue || ''); // Use field default value if available
    });
    this.editForm = new FormGroup(group);
  }

  // Add or Update the row
  saveRow() {
    // Trigger validation for the current row
    this.editForm.markAllAsTouched(); // Marks all controls as touched to trigger validation
    this.editForm.updateValueAndValidity(); // Triggers the validation

    if (this.editForm.invalid) {
      return;
    }
    if (this.isDisabled() && this.currentRowIndex === null) {
      this.errorMessage = `The row limit "${this.field.props['limit']}" has been reached for adding new record`;
      return; // Prevent execution if the button should be disabled
    }

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
      // If the row index exists, update the corresponding row
      this.formArray.at(this.currentRowIndex).setValue(this.editForm.value);
    } else {
      // Logic for adding a new row
      const newFormGroup = new FormGroup({});
      Object.keys(this.editForm.controls).forEach((key) => {
        newFormGroup.addControl(key, new FormControl(this.editForm.get(key)?.value));
      });
      this.formArray.push(newFormGroup); // Push the new row to the form array
    }

    // Update the model
    if (this.field.parent && this.field.parent.model) {
      const key = this.field.key;
      this.field.parent.model[`${key}`] = this.formArray.value;
    }

    // Reset the form fields after saving
    this.resetRow();
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
    this.currentRowIndex = null;
    setTimeout(() => {
      const fileInputs = document.querySelectorAll('input[type="file"].formly-file');
      fileInputs.forEach((fileInput, i) => {
        (fileInput as HTMLInputElement).value = ''; // Clear the file input
      });
    }, 300);
  }

  // Edit a row in the table
  editRow(index: number) {
    this.currentRowIndex = index;
    const rowData = this.formArray.at(index).value;
    this.editForm.setValue(rowData); // Populate the edit form with the row data
  }

  // Delete a row in the table
  deleteRow(index: number) {
    this.resetRow();
    this.formArray.removeAt(index);
    if (this.field.parent && this.field.parent.model) {
      const key = this.field.key;
      this.field.parent.model[`${key}`] = this.formArray.value;
    }
  }

  coerceKeyToString(key: string | number | (string | number)[]): string {
    if (Array.isArray(key)) {
      return key.join('.');
    }
    return String(key);
  }

  getSafeDisplayValue(fieldValue: any, options: any[] | Observable<any[]> | undefined): Observable<string> {
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

  isDisabled() {
    return this.field.props['limit'] <= this.formArray.length;
  }

  getImageSrc(fieldValue: any, key: string): string | null {
    const pathKey = this.removeSuffix(key, '_file');
    if (!fieldValue[key] && fieldValue[pathKey]) {
      return `${environment.apiUrl}/${fieldValue[pathKey]}`; // Return null if no value
    }
    const ImageValue = fieldValue[key];
    if (typeof fieldValue === 'string') {
      return ImageValue; // Return the string URL
    } else if (ImageValue instanceof FileList && ImageValue.length > 0) {
      return URL.createObjectURL(ImageValue[0]); // Use the first file in the FileList
    } else if (ImageValue instanceof File) {
      return URL.createObjectURL(ImageValue); // Handle single File object
    }
    return null;
  }

  private removeSuffix(value: string, suffix: string): string {
    return value.endsWith(suffix) ? value.slice(0, -suffix.length) : value;
  }
}
