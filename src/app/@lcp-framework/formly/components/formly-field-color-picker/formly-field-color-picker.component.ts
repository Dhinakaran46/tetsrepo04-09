import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { FieldType, FormlyFieldConfig } from '@ngx-formly/core';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'formly-field-color-picker',
  templateUrl: './formly-field-color-picker.component.html',
  styleUrls: ['./formly-field-color-picker.component.scss']
})
export class FormlyFieldColorPickerComponent extends FieldType<FormlyFieldConfig> implements AfterViewInit {
  @ViewChild('colorInput') colorInput!: ElementRef<HTMLInputElement>;

  rgbValue: any;
  hexValue: string = '#ffffff';

  get formControlAsFormControl(): FormControl {
    return this.formControl as unknown as FormControl;
  }

  openColorPicker() {
    this.colorInput.nativeElement.click();
  }

  ngAfterViewInit() {

    if (this.to && this.to['value']) {
      this.convertToRgb(this.to['value']);
    } else {
      this.formControlAsFormControl.setValue('#ffffff');
    }
  }

  onColorChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.convertToRgb(input.value);
  }

  private convertToRgb(color: string | null | undefined) {
    if (!color) {
      return;
    }

    if (typeof color === 'string' && color.startsWith('rgb(')) {
      this.formControl.setValue(color);
      this.hexValue = this.rgbToHex(color);
      return;
    }

    try {
      const hex = color.replace('#', '');
      const bigint = parseInt(hex, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;

      const rgbValue = `rgb(${r}, ${g}, ${b})`;
      this.formControl.setValue(rgbValue);
      this.hexValue = `#${hex}`;
    } catch (e) {
      this.formControl.setValue('');
      this.hexValue = '#ffffff';
    }
  }

  private rgbToHex(rgb: string): string {
    const result = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/.exec(rgb);
    if (!result) return '#ffffff';
    const r = parseInt(result[1], 10).toString(16).padStart(2, '0');
    const g = parseInt(result[2], 10).toString(16).padStart(2, '0');
    const b = parseInt(result[3], 10).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }
}

