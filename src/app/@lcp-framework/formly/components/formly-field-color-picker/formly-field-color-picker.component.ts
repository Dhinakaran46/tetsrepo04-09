import { Component, ViewChild, ElementRef, AfterViewInit, OnDestroy, OnInit } from '@angular/core';
import { FieldType, FormlyFieldConfig } from '@ngx-formly/core';
import { FormControl } from '@angular/forms';
import { Subscription } from 'rxjs';

@Component({
  selector: 'formly-field-color-picker',
  templateUrl: './formly-field-color-picker.component.html',
  styleUrls: ['./formly-field-color-picker.component.scss'],
})
export class FormlyFieldColorPickerComponent extends FieldType<FormlyFieldConfig> implements OnInit, OnDestroy {
  @ViewChild('colorInput') colorInput!: ElementRef<HTMLInputElement>;

  hexValue = '#ffffff';
  sub!: Subscription;
  ignoreUpdates = false;

  get formControlAsFormControl(): FormControl {
    return this.formControl as any;
  }

  ngOnInit() {
    this.sub = this.formControlAsFormControl.valueChanges.subscribe((value) => {
      if (this.ignoreUpdates) return;

      if (!value) this.hexValue = '#ffffff';
      else if (value.startsWith('#')) this.hexValue = value;
      else if (value.startsWith('rgb(')) this.hexValue = this.rgbToHex(value);
    });
    // Initial load
    const initial = this.formControlAsFormControl.value;
    if (initial?.startsWith('#')) this.hexValue = initial;
    else if (initial?.startsWith('rgb(')) this.hexValue = this.rgbToHex(initial);
  }

  onColorChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.hexValue = input.value;

    // Prevent looping
    this.ignoreUpdates = true;
    this.formControlAsFormControl.setValue(this.hexToRgb(this.hexValue));
    this.ignoreUpdates = false;
  }

  private hexToRgb(hex: string) {
    hex = hex.replace('#', '');
    const bigint = parseInt(hex, 16);
    return `rgb(${(bigint >> 16) & 255}, ${(bigint >> 8) & 255}, ${bigint & 255})`;
  }

  private rgbToHex(rgb: string) {
    const result = rgb.match(/\d+/g);
    if (!result) return '#ffffff';

    const [r, g, b] = result.map((v) => Number(v).toString(16).padStart(2, '0'));
    return `#${r}${g}${b}`;
  }

  ngOnDestroy() {
    if (this.sub) this.sub.unsubscribe();
  }
}
