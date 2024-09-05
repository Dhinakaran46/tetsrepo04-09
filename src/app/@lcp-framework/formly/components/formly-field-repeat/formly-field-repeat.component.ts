import { Component } from '@angular/core';
import { FieldArrayType, FormlyFieldConfig } from '@ngx-formly/core';

@Component({
  selector: 'app-formly-field-repeat',
  templateUrl: './formly-field-repeat.component.html',
  styleUrl: './formly-field-repeat.component.scss',
})
export class FormlyFieldRepeatComponent extends FieldArrayType {
  // Maximum number of rows allowed
  maxRows = this.props['limit'] || 5;

  isAddDisabled(): boolean {
    return this.field.fieldGroup && this.field.fieldGroup.length >= this.maxRows ? true : false;
  }

  isFormGroup(field: any): boolean {
    return field.fieldGroup && field.fieldGroup.length > 0;
  }

  override add(): void {
    super.add();
  }

  override remove(index: number): void {
    super.remove(index);
  }
}
