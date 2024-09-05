import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { FieldType, FieldTypeConfig } from '@ngx-formly/core';
import { environment } from '../../../../../environments/environment';
// import 'file-upload-with-preview/dist/style.css';

@Component({
  selector: 'app-formly-field-file',
  templateUrl: './formly-field-file.component.html',
  styleUrls: ['./formly-field-file.component.scss'],
})
export class FormlyFieldFileComponent extends FieldType<FieldTypeConfig> implements OnInit {
  defaultImageUrl: string = 'assets/images/file-preview.svg';
  fileNameControlKey!: string;
  fileNameControl!: FormControl;
  fileSelected: boolean = false;

  ngOnInit() {
    this.fileNameControlKey = this.removeSuffix(this.field.key as string, '_file');
    this.fileNameControl = this.form.get(this.fileNameControlKey) as FormControl;
    this.updateDefaultImageUrl();
    this.fileNameControl?.valueChanges.subscribe(() => {
      this.updateDefaultImageUrl();
    });
  }

  private removeSuffix(value: string, suffix: string): string {
    return value.endsWith(suffix) ? value.slice(0, -suffix.length) : value;
  }

  private updateDefaultImageUrl() {
    if (this.fileNameControl?.value) {
      this.defaultImageUrl = `${environment.apiUrl}/${this.fileNameControl.value}`;
    } else {
      this.defaultImageUrl = 'assets/images/file-preview.svg';
    }
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.fileSelected = true;
    } else {
      this.fileSelected = false;
    }
  }
}
