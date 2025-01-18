import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { animate, style, transition, trigger } from '@angular/animations';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { LocalStorageService } from '../../../@lcp-framework/service/common/local-storage.service';
import { ToastrService } from 'ngx-toastr';
import { ActivatedRoute, Router } from '@angular/router';
import { commonConfig } from '../../../@lcp-framework/config/common.config';
import { CommonSharedModule } from '../../../@lcp-framework/shared/common/common.module';
import { MenuMapService } from '../../../@lcp-framework/service/common/menu-map.service';
import { generate } from 'rxjs';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { saveAs } from 'file-saver';
import axios from 'axios';
import { LoaderComponent } from '../../../@lcp-framework/components/loader/loader.component';
import { Location } from '@angular/common';

@Component({
  selector: 'app-barcode-printing',
  standalone: true,
  imports: [CommonSharedModule, ReactiveFormsModule, LoaderComponent],
  templateUrl: './barcode-printing.component.html',
  styleUrl: './barcode-printing.component.scss',
  animations: [
    trigger('toggleAnimation', [
      transition(':enter', [style({ opacity: 0, transform: 'scale(0.95)' }), animate('100ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))]),
      transition(':leave', [animate('75ms', style({ opacity: 0, transform: 'scale(0.95)' }))]),
    ]),
    trigger('slideDownUp', [
      transition(':enter', [style({ height: 0, opacity: 0 }), animate('300ms', style({ height: '*', opacity: 1 }))]),
      transition(':leave', [style({ height: '*', opacity: 1 }), animate('300ms', style({ height: 0, opacity: 0 }))]),
    ]),
  ],
})
export class BarcodePrintingComponent {
  barcodePrintForm: FormGroup;
  isSubmitted = false;
  title_key: string = 'barcode_printing';
  barcode_template_id: string = '';
  templateDetails: any;
  loading = false;
  barcodes: string[] = [];
  zplcodes: string[] = [];
  zplPreview: string | null = null;

  inputWidth: number = 2;
  inputHeight: number = 1;

  constructor(
    public router: Router,
    private formBuilder: FormBuilder,
    private toastr: ToastrService,
    public localStorageService: LocalStorageService,
    private route: ActivatedRoute,
    private http: HttpClient,
    private menuMapService: MenuMapService,
    private translate: TranslateService,
    public location: Location
  ) {
    this.barcodePrintForm = this.formBuilder.group({
      id: [''],
      uuid: [''],
      name: [{ value: '', disabled: true }],
      prefix: ['', Validators.required],
      label_end: ['', Validators.required],
      no_of_barcodes: ['', Validators.required],
      asset_from: [{ value: '', disabled: true }],
      asset_to: [{ value: '', disabled: true }],
      zpl_code: ['', Validators.required],
      page_width: [''],
      page_height: [''],
      image_height: [''],
      image_width: [''],
    });
  }

  ngOnInit() {
    this.title_key = this.route.snapshot.data['pageInfo'].fullEntity;

    if (this.route.snapshot.params) {
      this.barcode_template_id = this.route.snapshot.params['id'];
    }

    this.getBarcodeTemplateDetails(this.barcode_template_id);
    this.onFormChanges();
  }

  onFormChanges(): void {
    this.barcodePrintForm.valueChanges.subscribe((formValues) => {
      const { prefix, label_end, no_of_barcodes } = formValues;

      if (prefix && label_end) {
        // Update asset_from whenever prefix or label_end changes
        this.updateAssets(prefix, label_end, no_of_barcodes);
      }
    });
  }

  updateAssets(prefix: string, label_end: string, no_of_barcodes: number): void {
    const assetFrom = `${prefix}${label_end}`;
    const label_end_num = Number(label_end);
    const assetTo = no_of_barcodes >= 1 ? `${prefix}${(label_end_num + (no_of_barcodes - 1)).toString().padStart(label_end.length, '0')}` : '';

    this.barcodePrintForm.patchValue(
      {
        asset_from: assetFrom,
        asset_to: assetTo,
      },
      { emitEvent: false }
    );
  }

  onBarcodeChange(event: any): void {
    const inputValue = event.target.value;
    const numericValue = Number(inputValue);

    if (!isNaN(numericValue) && numericValue >= 1) {
      const formData = this.barcodePrintForm.value;
      const currentLabelEnd = parseInt(formData.label_end) + numericValue;

      const paddedLabelEnd = (currentLabelEnd - 1).toString().padStart(formData.label_end.length, '0');
      const barcode = `${formData.prefix}${paddedLabelEnd}`;

      this.barcodePrintForm.patchValue({
        asset_to: barcode,
      });
    } else {
      this.barcodePrintForm.patchValue({
        no_of_barcodes: 0,
      });
    }
  }

  getBarcodeTemplateDetails(uuid: string) {
    this.loading = true;
    const payload = {
      company_id: 1,
      search_all: [
        {
          value: uuid,
          operator: '=',
          column_name: 'barcode_templates.uuid',
        },
        {
          value: '3',
          operator: '!=',
          column_name: 'barcode_templates.status_id',
        },
      ],
      limit_range: 1,
      print_query: false,
      start_index: 0,
      sort_columns: [['barcode_templates.id', 'asc']],
      primary_table: 'barcode_templates',
      select_columns: [
        ['id'],
        ['uuid'],
        ['name'],
        ['prefix'],
        ['zpl_code'],
        ['label_start'],
        ['label_end'],
        ['page_width'],
        ['page_height'],
        ["concat(prefix,'',label_end)", 'asset_from'],
        ["concat(prefix,'',label_end)", 'asset_to'],
      ],
    };

    this.menuMapService.getCommonList(payload).subscribe({
      next: (response: any) => {
        if (response.code === 200 && response.status) {
          const records = response.data.records;
          if (records.length > 0) {
            this.loading = false;
            this.updateFormFields(records[0]);
          }
        } else {
          this.loading = false;
        }
      },
      error: (error) => {
        console.error('Error fetching URL details:', error);
        this.loading = false;
      },
    });
  }

  updateFormFields(item: any) {
    // Parse the current label end and increment by 1
    const incrementedLabelEnd = parseInt(item.label_end) + 1;

    // Determine the length of the original label_end for padding
    const labelEndLength = item.label_end.length;

    // Format the incremented label end with leading zeros
    const formattedLabelEnd = incrementedLabelEnd.toString().padStart(labelEndLength, '0');

    this.barcodePrintForm.patchValue({
      id: item.id,
      uuid: item.uuid,
      name: item.name,
      prefix: item.prefix,
      zpl_code: item.zpl_code,
      page_width: item.page_width,
      page_height: item.page_height,
      label_end: formattedLabelEnd, // Use the formatted label end
      asset_from: `${item.prefix}${formattedLabelEnd}`, // Correctly format asset_from
      asset_to: `${item.prefix}${formattedLabelEnd}`, // Correctly format asset_to
      no_of_barcodes: 0,
    });
  }

  onSubmit() {
    this.isSubmitted = true;
    if (this.barcodePrintForm.invalid) {
      return;
    }
    this.loading = true;

    const formData = this.barcodePrintForm.value;
    if (formData.no_of_barcodes > 0) {
      const currentLabelEnd = formData.label_end;
      const noOfBarcodes = parseInt(formData.no_of_barcodes);
      const zplCodeTemplate = formData.zpl_code;
      this.generateBarcodes(currentLabelEnd, noOfBarcodes, formData.prefix, zplCodeTemplate);
    } else {
      this.loading = false;
      const key = 'enter_number_of_barcode_more_than_0';
      const successMessage = this.translate.instant(key);
      this.toastr.warning(successMessage);
    }
  }

  generateBarcodes(startLabelEnd: string, noOfBarcodes: number, prefix: string, zplCodeTemplate: string) {
    this.barcodes = [];
    this.zplcodes = [];
    this.loading = true;

    const startLabelEndNum = parseInt(startLabelEnd, 10); // Convert the start label to a number for calculation
    const labelLength = startLabelEnd.length; // Keep track of the length to pad correctly

    for (let i = 0; i < noOfBarcodes; i++) {
      const barcodeNumber = (startLabelEndNum + i).toString().padStart(labelLength, '0'); // Ensure padding
      const barcode = `${prefix}${barcodeNumber}`;

      this.barcodes.push(barcode);

      const zplContent = zplCodeTemplate.replace(/\[\[label\]\]/g, barcode);
      this.zplcodes.push(zplContent);
    }

    const lastBarcode = this.barcodes[this.barcodes.length - 1];

    this.barcodePrintForm.patchValue({
      asset_to: lastBarcode,
    });

    const newLabelEnd = startLabelEndNum - 1 + noOfBarcodes;
    this.createPDFWithZPLImages(this.zplcodes, newLabelEnd.toString().padStart(labelLength, '0'));
  }

  async createPDFWithZPLImages(zplcodes: string[], newLabelEnd: any) {
    const pdfDoc = await PDFDocument.create();

    const dpi = 96; // Dots per inch (DPI) for conversion

    // Convert 2x1 inches to pixels
    const pageWidth = this.inputWidth * dpi; // 2 inches wide
    const pageHeight = this.inputHeight * dpi; // 1 inches tall
    const imageWidth = pageWidth; // Image width slightly smaller than page
    const imageHeight = pageHeight; // Image height slightly smaller than page

    const marginX = (pageWidth - imageWidth) / 2; // Center horizontally
    const marginY = (pageHeight - imageHeight) / 2; // Center vertically

    for (let i = 0; i < zplcodes.length; i++) {
      const zplCode = zplcodes[i];
      const imageBytes = await this.fetchZPLImage(zplCode);
      const image = await pdfDoc.embedPng(imageBytes);

      // Create a new page for each barcode with 2x4 inch dimensions
      const page = pdfDoc.addPage([pageWidth, pageHeight]);

      // Draw the image on the page
      page.drawImage(image, {
        x: marginX,
        y: marginY,
        width: imageWidth,
        height: imageHeight,
      });
    }

    const pdfBytes = await pdfDoc.save();

    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    this.updateLabelEnd(newLabelEnd);
    this.loading = false;
    window.open(url);
  }

  // Fetch ZPL as Image using Labelary API
  async fetchZPLImage(zplCode: string): Promise<Uint8Array> {
    const labelSize = `${this.inputWidth}x${this.inputHeight}`; // Example: '2x1' for 2-inch by 1-inch label
    const response = await axios.post(`https://api.labelary.com/v1/printers/8dpmm/labels/${labelSize}/0/`, zplCode, {
      responseType: 'arraybuffer',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    console.log(response.data);
    return new Uint8Array(response.data);
  }

  str_replace(search: string, replace: string, subject: string) {
    return subject.split(search).join(replace);
  }

  previewClick() {
    const formData = this.barcodePrintForm.value;
    const zplCodeTemplate = formData.zpl_code;
    const barcode = `${formData.prefix}${formData.label_end}`;

    this.loading = true;

    if (zplCodeTemplate) {
      const previewZPL = zplCodeTemplate.replace(/\[\[label\]\]/g, barcode);
      this.generatePreviewImage(previewZPL); // Fetch the preview image
    }
  }

  async generatePreviewImage(zplCode: string) {
    try {
      const imageBytes = await this.fetchZPLImage(zplCode);
      const blob = new Blob([imageBytes], { type: 'image/png' });
      this.loading = false;

      this.zplPreview = URL.createObjectURL(blob);
    } catch (error) {
      this.loading = false;

      console.error('Error generating ZPL preview:', error);
      this.zplPreview = null;
    }
  }

  updateLabelEnd(newLabelEnd: number) {
    const formData = this.barcodePrintForm.value;

    const payload = {
      data: {
        table1: [
          {
            prefix: formData.prefix,
            label_end: newLabelEnd ? newLabelEnd : formData.label_end,
            zpl_code: formData.zpl_code,
            page_width: formData.page_width,
            page_height: formData.page_height,
            status_id: 1,
            updated_at: true,
            updated_by: true,
          },
        ],
      },
      table: ['barcode_templates'],
      action: ['update'],
      conditions: {
        table1: [
          {
            uuid: this.barcode_template_id,
          },
        ],
      },
      table_mapping: ['table1'],
    };

    this.menuMapService.executeRecords(payload).subscribe({
      next: (response: any) => {
        if (response.code === 200 && response.status) {
          const key = 'record_updated_successfully';
          const successMessage = this.translate.instant(key);
          this.toastr.success(successMessage);
          this.getBarcodeTemplateDetails(this.barcode_template_id);
        } else {
          this.loading = false;
        }
      },
      error: (error) => {
        console.error('Error fetching URL details:', error);
        this.loading = false;
      },
    });
  }
}
