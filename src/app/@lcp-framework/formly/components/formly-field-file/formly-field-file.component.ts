import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
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
  errorMessage: string = '';
  acceptFormat: string[] = [];

  mimeToExtensions: Record<string, string[]> = {
    'image/*': ['jpg', 'jpeg', 'png', 'gif', 'svg', 'ico', 'webp', 'heic', 'heif'],
    'application/pdf': ['pdf'],
    'application/vnd.ms-excel': ['xls'], // XLS format
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'], // XLSX format
    'application/msword': ['doc'], // DOC format
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'], // DOCX format
    'text/csv': ['csv'], // CSV format
    'application/vnd.oasis.opendocument.text': ['odt'], // ODT format
    'image/png': ['png'], // PNG format
    'image/jpeg': ['jpeg'], // JPEG format
    'image/jpg': ['jpg'], // JPG format
    'image/gif': ['gif'], // GIF format
    'image/svg': ['svg'], // SVG format
    'image/heic': ['heic'], // HEIC format
    'image/heif': ['heif'], // HEIF format
    'image/svg+xml': ['svg'], // SVG format
    'image/ico': ['ico'], // ICO format
    'image/webp': ['webp'], // WEBP format
    'text/plain': ['txt'], //
    'application/vnd.ms-powerpoint': ['ppt'], // PPT format
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['pptx'], // PPTX format
  };
  fileMsg = '';
  constructor(private cdr: ChangeDetectorRef) {
    super();
  }

  ngOnInit() {
    this.fileNameControlKey = this.removeSuffix(this.field.key as string, '_file');
    this.fileNameControl = this.form.get(this.fileNameControlKey) as FormControl;
    this.updateDefaultImageUrl();
    this.fileNameControl?.valueChanges.subscribe(() => {
      this.updateDefaultImageUrl();
    });
    this.formControl.valueChanges.subscribe((file: FileList) => {
      this.updateDefaultImageUrl();
      if (file) {
        const isValid = this.validateFileFormat(file);
        if (isValid) {
          if (!this.formControl.hasError('invalidFileSize')) {
            this.formControl.setErrors(null);
          }
        } else {
          this.formControl.setErrors({
            invalidFileFormat: true,
          });
        }
      }
    });
  }

  isImageFile = (data: string): boolean => {
    return this.acceptFormat.filter((format) => format.includes(data)).length ? true : false;
  };

  mapMimeTypeToExtensions = (mimeType: string): string[] => {
    return this.mimeToExtensions[mimeType] || [];
  };

  updateFileAccept(type: string) {
    if (type?.length) {
      type.split(',').map((value) => {
        let format = '';
        switch (value.trim().toLowerCase()) {
          case 'image':
            format = 'image/*';
            break;
          case 'png':
            format = 'image/png';
            break;
          case 'jpeg':
            format = 'image/jpeg';
            break;
          case 'jpg':
            format = 'image/jpg';
            break;
          case 'heic':
            format = 'image/heic';
            break;
          case 'heif':
            format = 'image/heif';
            break;
          case 'gif':
            format = 'image/gif';
            break;
          case 'svg':
            format = 'image/svg+xml, image/svg';
            break;
          case 'svg+xml':
            format = 'image/svg+xml, image/svg';
            break;
          case 'ico':
            format = 'image/ico';
            break;
          case 'webp':
            format = 'image/webp';
            break;
          case 'powerpoint':
            format = 'application/vnd.ms-powerpoint, application/vnd.openxmlformats-officedocument.presentationml.presentation';
            break;
          case 'ppt':
            format = 'application/vnd.ms-powerpoint';
            break;
          case 'pptx':
            format = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
            break;
          case 'pdf':
            format = 'application/pdf';
            break;
          case 'excel':
            format = 'application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            break;
          case 'xlsx':
            format = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            break;
          case 'xls':
            format = 'application/vnd.ms-excel';
            break;
          case 'csv':
            format = 'text/csv';
            break;
          case 'document':
            format = 'application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/vnd.oasis.opendocument.text';
            break;
          case 'docx':
            format = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            break;
          case 'doc':
            format = 'application/msword';
            break;
          case 'odt':
            format = 'application/vnd.oasis.opendocument.text';
            break;
          case 'text':
          case 'txt':
            format = 'text/plain';
            break;
          case 'all':
            format = '*/*'; // Allows all file types
            break;
          default:
            format = 'image/*';
        }
        if (!this.acceptFormat.includes(format)) this.acceptFormat.push(format);
      });
    } else {
      this.acceptFormat = ['image/*'];
    }
    return this.acceptFormat.join(',');
  }

  validateFileFormat = (file: FileList): boolean => {
    if (!file || !file?.length || !this.acceptFormat.length) return false;
    if (typeof file !== 'string') {
      const mimeType = file[0].type; // Get the MIME type of the file
      const fileExtension = file[0].name?.split('.')?.pop()?.toLowerCase(); // Extract the file extension
      for (const format of this.acceptFormat) {
        if (format === '*/*') {
          return true; // Allow all formats
        }

        // Check MIME type matches (e.g., "image/*")
        if (format.endsWith('/*')) {
          const baseType = format.split('/')[0]; // e.g., "image"
          if (mimeType?.startsWith(baseType)) {
            return true;
          }
        }

        // Check if the MIME type matches exactly
        if (mimeType === format) {
          return true;
        }

        // Check if the file extension matches (fallback)
        const allowedExtensions = this.mapMimeTypeToExtensions(format);
        if (allowedExtensions?.includes(fileExtension || '')) {
          return true;
        }
      }
      return false; // File format is not allowed
    }
    return true;
  };

  private removeSuffix(value: string, suffix: string): string {
    return value.endsWith(suffix) ? value.slice(0, -suffix.length) : value;
  }

  private updateDefaultImageUrl() {
    if (typeof this.fileNameControl.value === 'string' && this.fileNameControl?.value?.length) {
      if (this.mimeToExtensions['image/*'].includes(this.fileNameControl?.value?.split('.').pop() || '')) {
        this.fileMsg = '';
      } else {
        this.fileMsg = this.form?.getRawValue()?.name ? this.getFileName(true) : `${this.fileNameControl?.value.split('/').pop()}`;
      }
      this.defaultImageUrl = this.getFileName();
    } else {
      if (!this.fileNameControl?.value?.length) {
        this.fileMsg = '';
      }
      this.defaultImageUrl = `assets/images/file-preview.svg`;
    }
    this.cdr.detectChanges();
  }

  convertSizeToBytes(size: string): number {
    const units = ['b', 'kb', 'mb', 'gb'];
    const regex = /^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)$/i;
    const match = size.trim().match(regex);

    if (match) {
      const value = parseFloat(match[1]);
      const unit = match[2];
      const exponent = units.indexOf(unit);
      return value * Math.pow(1024, exponent);
    } else {
      throw new Error('Invalid size format. Please use a format like "10MB", "5kb", etc.');
    }
  }

  onFileChange(event: Event, maxSize = '10mb') {
    const input = event.target as HTMLInputElement;
    const size = this.convertSizeToBytes(maxSize.toLowerCase());
    this.fileMsg = '';
    if (input.files && input.files[0]) {
      if (input.files[0].size > size) {
        this.formControl.setErrors({
          invalidFileSize: true,
        });
      } else {
        if (!this.formControl.hasError('invalidFileFormat')) {
          this.formControl.setErrors(null);
        }
      }
      this.fileSelected = true;
    } else {
      this.fileSelected = false;
      this.defaultImageUrl = '';
    }
  }

  downloadFile(): void {
    if (this.defaultImageUrl && this.defaultImageUrl?.startsWith('http')) {
      fetch(this.defaultImageUrl)
        .then((response) => response.blob())
        .then((blob) => {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = this.getFileName(true);
          link.textContent = 'Download File';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
        })
        .catch((error) => console.error('Download failed:', error));
    }
  }

  getFileName(download: boolean = false): string {
    if (download) {
      if (this.defaultImageUrl && this.defaultImageUrl?.startsWith('http')) {
        const name = this.form?.getRawValue()?.name || '';
        if (name) {
          const extension = this.defaultImageUrl?.split('/').pop()?.split('.')[1] || '';
          return `${name}.${extension}`;
        }
        return this.defaultImageUrl?.split('/')?.pop() || '';
      }
      return '';
    } else {
      const apiUrl = localStorage.getItem('lcp_api_base_url') || environment.apiUrl;
      return `${apiUrl}/${this.fileNameControl.value}`;
    }
  }
}
