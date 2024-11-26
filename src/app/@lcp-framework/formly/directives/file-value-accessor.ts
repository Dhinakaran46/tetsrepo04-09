import { Directive, Renderer2, ElementRef, Input, OnChanges, SimpleChanges } from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';

@Directive({
  selector: 'input[type=file].formly-file',
  host: {
    '(change)': 'onChange($event.target.files)',
    '(blur)': 'onTouched()',
  },
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: FileValueAccessor, multi: true }],
})
export class FileValueAccessor implements ControlValueAccessor, OnChanges {
  @Input() defaultImageUrl!: string;

  private imgElement: HTMLImageElement;

  constructor(private renderer: Renderer2, private el: ElementRef) {
    // Create an img element for preview
    this.imgElement = this.renderer.createElement('img');
    this.renderer.setStyle(this.imgElement, 'width', '60px');
    this.renderer.setStyle(this.imgElement, 'height', '60px');
    this.renderer.setAttribute(this.imgElement, 'alt', 'formly-img');
    this.renderer.setStyle(this.imgElement, 'display', 'none'); // Initially hide the image

    // Append the img element next to the input
    const parent = this.el.nativeElement.parentNode;
    this.renderer.appendChild(parent, this.imgElement);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['defaultImageUrl']) {
      this.updateImagePreview(null);
    }
  }

  value: any;
  onChange = (_: any) => {};
  onTouched = () => {};

  writeValue(value: any) {
    this.value = value;
    if (value && value.length > 0) {
      this.updateImagePreview(value);
    } else {
      this.updateImagePreview(null);
    }
  }

  registerOnChange(fn: any) {
    this.onChange = (files: FileList) => {
      fn(files);
      this.value = files;
      this.updateImagePreview(files);
    };
  }

  registerOnTouched(fn: any) {
    this.onTouched = fn;
  }

  private updateImagePreview(files: FileList | null) {
    if (files && files.length > 0) {
      const reader = new FileReader();
      reader.onload = () => {
        this.renderer.setAttribute(this.imgElement, 'src', reader.result as string);
        this.renderer.setStyle(this.imgElement, 'display', 'block'); // Show the image
      };
      reader.readAsDataURL(files[0]);
    } else if (this.defaultImageUrl) {
      this.renderer.setAttribute(this.imgElement, 'src', this.defaultImageUrl);
      this.renderer.setStyle(this.imgElement, 'display', 'block'); // Show the image
    } else {
      this.renderer.setStyle(this.imgElement, 'display', 'none'); // Hide the image
    }
  }
}
