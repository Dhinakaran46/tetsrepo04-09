import { Component, ViewChild, ElementRef, AfterViewInit, OnDestroy, OnInit } from '@angular/core';
import { FieldType, FormlyFieldConfig } from '@ngx-formly/core';
import { FormControl } from '@angular/forms';
import { Subscription } from 'rxjs';

@Component({
  standalone: false,
  selector: 'formly-field-color-picker',
  templateUrl: './formly-field-color-picker.component.html',
  styleUrls: ['./formly-field-color-picker.component.scss'],
})
export class FormlyFieldColorPickerComponent extends FieldType<FormlyFieldConfig> implements OnInit, OnDestroy {
  @ViewChild('colorInput') colorInput!: ElementRef<HTMLInputElement>;

  hexValue = '#ffffff';
  alphaValue = 1;
  rValue = 255;
  gValue = 255;
  bValue = 255;
  sub!: Subscription;
  ignoreUpdates = false;

  get formControlAsFormControl(): FormControl {
    return this.formControl as any;
  }

  ngOnInit() {
    this.sub = this.formControlAsFormControl.valueChanges.subscribe((value) => {
      if (this.ignoreUpdates) return;

      if (!value) {
        this.hexValue = '#ffffff';
        this.alphaValue = 1;
        this.rValue = 255;
        this.gValue = 255;
        this.bValue = 255;
      } else if (value.startsWith('#')) {
        this.hexValue = value;
        this.hexToRgbValues(value);
      } else if (value.startsWith('rgba(')) {
        this.hexValue = this.rgbaToHex(value);
      } else if (value.startsWith('rgb(')) {
        this.hexValue = this.rgbToHex(value);
        this.extractRgbValues(value);
      }
    });
    // Initial load
    const initial = this.formControlAsFormControl.value;
    if (initial?.startsWith('#')) {
      this.hexValue = initial;
      this.hexToRgbValues(initial);
    } else if (initial?.startsWith('rgba(')) {
      this.hexValue = this.rgbaToHex(initial);
    } else if (initial?.startsWith('rgb(')) {
      this.hexValue = this.rgbToHex(initial);
      this.extractRgbValues(initial);
    }
  }

  onColorChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.hexValue = input.value;

    // Prevent looping
    this.ignoreUpdates = true;
    this.formControlAsFormControl.setValue(this.hexToRgb(this.hexValue));
    this.ignoreUpdates = false;
  }

  onRChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const newValue = parseInt(input.value, 10);
    this.rValue = Math.max(0, Math.min(255, newValue));
    this.updateHexFromRgb();
  }

  onGChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const newValue = parseInt(input.value, 10);
    this.gValue = Math.max(0, Math.min(255, newValue));
    this.updateHexFromRgb();
  }

  onBChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const newValue = parseInt(input.value, 10);
    this.bValue = Math.max(0, Math.min(255, newValue));
    this.updateHexFromRgb();
  }

  onAlphaChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const newAlpha = parseFloat(input.value);

    // Clamp value between 0 and 1
    this.alphaValue = Math.max(0, Math.min(1, newAlpha));

    // Update form control with new alpha value
    this.ignoreUpdates = true;
    this.formControlAsFormControl.setValue(this.rgbToRgbaString());
    this.ignoreUpdates = false;
  }

  private updateHexFromRgb() {
    const r = this.rValue.toString(16).padStart(2, '0');
    const g = this.gValue.toString(16).padStart(2, '0');
    const b = this.bValue.toString(16).padStart(2, '0');
    this.hexValue = `#${r}${g}${b}`;

    // Update form control
    this.ignoreUpdates = true;
    this.formControlAsFormControl.setValue(this.rgbToRgbaString());
    this.ignoreUpdates = false;
  }

  private rgbToRgbaString() {
    return `rgba(${this.rValue}, ${this.gValue}, ${this.bValue}, ${this.alphaValue})`;
  }

  private extractRgbValues(rgb: string) {
    const result = rgb.match(/\d+/g);
    if (result && result.length >= 3) {
      this.rValue = parseInt(result[0], 10);
      this.gValue = parseInt(result[1], 10);
      this.bValue = parseInt(result[2], 10);
      if (result.length >= 4) {
        this.alphaValue = parseFloat(result[3]);
      }
    }
  }

  private hexToRgbValues(hex: string) {
    hex = hex.replace('#', '');
    const bigint = parseInt(hex, 16);
    this.rValue = (bigint >> 16) & 255;
    this.gValue = (bigint >> 8) & 255;
    this.bValue = bigint & 255;
  }

  private hexToRgb(hex: string) {
    hex = hex.replace('#', '');
    const bigint = parseInt(hex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    this.rValue = r;
    this.gValue = g;
    this.bValue = b;
    return `rgba(${r}, ${g}, ${b}, ${this.alphaValue})`;
  }

  private rgbToHex(rgb: string) {
    const result = rgb.match(/\d+/g);
    if (!result) return '#ffffff';

    const [r, g, b] = result.map((v) => Number(v).toString(16).padStart(2, '0'));
    return `#${r}${g}${b}`;
  }

  private rgbaToHex(rgba: string) {
    const result = rgba.match(/[\d.]+/g);
    if (!result || result.length < 4) return '#ffffff';

    const r = Number(result[0]).toString(16).padStart(2, '0');
    const g = Number(result[1]).toString(16).padStart(2, '0');
    const b = Number(result[2]).toString(16).padStart(2, '0');
    this.alphaValue = Number(result[3]);

    return `#${r}${g}${b}`;
  }

  ngOnDestroy() {
    if (this.sub) this.sub.unsubscribe();
  }
}
