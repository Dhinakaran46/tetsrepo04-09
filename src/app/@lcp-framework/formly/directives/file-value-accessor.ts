import { Directive, Renderer2, ElementRef, Input, OnChanges, SimpleChanges } from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';

@Directive({
  standalone: false,
  selector: 'input[type=file].formly-file',
  host: {
    '(change)': 'handleChange($event)',
    '(blur)': 'onTouched()',
  },
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: FileValueAccessor, multi: true }],
})
export class FileValueAccessor implements ControlValueAccessor, OnChanges {
  @Input() defaultImageUrl!: string;

  private imgElement: HTMLImageElement;
  private divElement: HTMLDivElement;
  constructor(private renderer: Renderer2, private el: ElementRef) {
    // Create a div element
    this.divElement = this.renderer.createElement('div');
    this.renderer.setStyle(this.divElement, 'padding', '6px');
    this.renderer.setStyle(this.divElement, 'overflow', 'hidden');
    this.renderer.setStyle(this.divElement, 'textOverflow', 'ellipsis');
    this.renderer.setStyle(this.divElement, 'whiteSpace', 'nowrap');
    this.renderer.setStyle(this.divElement, 'display', 'none');
    this.renderer.setAttribute(this.divElement, 'appDynamicFontSize', 'body');

    // Create an img element for preview
    this.imgElement = this.renderer.createElement('img');
    this.renderer.setStyle(this.imgElement, 'width', '60px');
    this.renderer.setStyle(this.imgElement, 'height', '60px');
    this.renderer.setStyle(this.imgElement, 'padding', '6px');
    this.renderer.setAttribute(this.imgElement, 'alt', 'formly-img');
    this.renderer.setStyle(this.imgElement, 'display', 'none'); // Initially hide the image

    // Append the img element next to the input
    const parent = this.el.nativeElement.parentNode;
    this.renderer.appendChild(parent, this.imgElement);
    this.renderer.appendChild(parent, this.divElement);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['defaultImageUrl']) {
      this.updateImagePreview(null);
    }
  }

  value: any;
  onChange = (_: any) => {};
  onTouched = () => {};

  handleChange(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files) {
      this.onChange(target.files);
    }
  }

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

  private updateImagePreview(files: FileList | string | null) {
    if (files && files.length > 0) {
      if (files instanceof FileList) {
        if (files[0]?.type?.includes('image')) {
          const reader = new FileReader();
          reader.onload = () => {
            this.renderer.setStyle(this.divElement, 'display', 'none');
            this.renderer.setAttribute(this.imgElement, 'src', `${reader.result as string}`);
            this.renderer.setStyle(this.imgElement, 'display', 'block'); // Show the image
          };
          reader.readAsDataURL(files[0]);
        } else {
          this.renderer.setStyle(this.imgElement, 'display', 'none');
          this.divElement.innerHTML = `File - ${files[0].name.split('/').pop() || ''} uploaded.`;
          this.renderer.setStyle(this.divElement, 'display', 'block');
        }
      }
    } else if (this.defaultImageUrl?.length) {
      this.renderer.setStyle(this.divElement, 'display', 'none');
      this.renderer.setAttribute(this.imgElement, 'src', this.defaultImageUrl);
      this.renderer.setStyle(this.imgElement, 'display', 'block'); // Show the image
    } else {
      this.renderer.setStyle(this.imgElement, 'display', 'none'); // Hide the image
      this.renderer.setStyle(this.divElement, 'display', 'none');
    }
  }
}
