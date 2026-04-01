import { AfterViewInit, Directive, DoCheck, ElementRef, Input, OnChanges, OnDestroy, Renderer2, SimpleChanges } from '@angular/core';
import flatpickr from 'flatpickr';

@Directive({
  selector: 'input[appFlatpickr]',
  standalone: true,
})
export class FlatpickrDirective implements AfterViewInit, OnChanges, OnDestroy, DoCheck {
  @Input('appFlatpickr') pickerType: string = 'date';
  @Input() appFlatpickrMinDate: string | Date | null = null;
  @Input() appFlatpickrMaxDate: string | Date | null = null;

  private pickerInstance: flatpickr.Instance | null = null;
  private lastKnownValue: string = '';
  private isSyncingValue: boolean = false;
  private lastDisabledState: boolean = false;

  constructor(private elementRef: ElementRef<HTMLInputElement>, private renderer: Renderer2) {}

  ngAfterViewInit(): void {
    this.renderer.setAttribute(this.elementRef.nativeElement, 'type', 'text');
    this.lastDisabledState = this.elementRef.nativeElement.disabled;
    this.initializePicker();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.pickerInstance) {
      return;
    }

    if (changes['pickerType'] && !changes['pickerType'].firstChange) {
      this.destroyPicker();
      this.initializePicker();
      return;
    }

    if (changes['appFlatpickrMinDate'] || changes['appFlatpickrMaxDate']) {
      this.updatePickerBounds();
    }
  }

  ngDoCheck(): void {
    if (!this.pickerInstance || this.isSyncingValue) {
      return;
    }

    if (this.elementRef.nativeElement.disabled !== this.lastDisabledState) {
      this.lastDisabledState = this.elementRef.nativeElement.disabled;
      this.pickerInstance.set('clickOpens', !this.lastDisabledState);
      if (this.lastDisabledState) {
        this.pickerInstance.close();
      }
    }

    const elementValue = this.elementRef.nativeElement.value || '';
    if (elementValue !== this.lastKnownValue) {
      this.syncPickerValue(elementValue);
    }
  }

  ngOnDestroy(): void {
    this.destroyPicker();
  }

  private initializePicker(): void {
    const element = this.elementRef.nativeElement;

    this.pickerInstance = flatpickr(element, {
      allowInput: true,
      clickOpens: !element.disabled,
      disableMobile: true,
      enableTime: this.isDateTimePicker() || this.isTimePicker(),
      noCalendar: this.isTimePicker(),
      time_24hr: true,
      dateFormat: this.getDateFormat(),
      altInput: this.isDateTimePicker(),
      altFormat: this.isDateTimePicker() ? 'Y-m-d H:i' : undefined,
      onChange: (_selectedDates, dateStr) => {
        this.propagateValue(dateStr);
      },
      onClose: (_selectedDates, dateStr) => {
        this.propagateValue(dateStr);
      },
    });

    this.updatePickerBounds();
    this.syncPickerValue(element.value || '');
  }

  private destroyPicker(): void {
    this.pickerInstance?.destroy();
    this.pickerInstance = null;
  }

  private updatePickerBounds(): void {
    if (!this.pickerInstance) {
      return;
    }

    this.pickerInstance.set('minDate', this.normalizeBoundValue(this.appFlatpickrMinDate));
    this.pickerInstance.set('maxDate', this.normalizeBoundValue(this.appFlatpickrMaxDate));
  }

  private normalizeBoundValue(value: string | Date | null): string | Date | undefined {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }

    return value;
  }

  private syncPickerValue(value: string): void {
    if (!this.pickerInstance) {
      return;
    }

    this.isSyncingValue = true;

    if (!value) {
      this.pickerInstance.clear(false);
      this.renderer.setProperty(this.elementRef.nativeElement, 'value', '');
      this.lastKnownValue = '';
      this.isSyncingValue = false;
      return;
    }

    this.pickerInstance.setDate(value, false, this.getDateFormat());
    this.lastKnownValue = this.elementRef.nativeElement.value || value;
    this.isSyncingValue = false;
  }

  private propagateValue(value: string): void {
    const normalizedValue = value || '';
    this.lastKnownValue = normalizedValue;
    this.renderer.setProperty(this.elementRef.nativeElement, 'value', normalizedValue);
    this.dispatchDomEvents();
  }

  private dispatchDomEvents(): void {
    const inputElement = this.elementRef.nativeElement;
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    inputElement.dispatchEvent(new Event('change', { bubbles: true }));
  }

  private getDateFormat(): string {
    if (this.isDateTimePicker()) {
      return 'Y-m-d\\TH:i';
    }

    if (this.isTimePicker()) {
      return 'H:i';
    }

    return 'Y-m-d';
  }

  private isDateTimePicker(): boolean {
    return this.pickerType === 'datetime-local';
  }

  private isTimePicker(): boolean {
    return this.pickerType === 'time';
  }
}
