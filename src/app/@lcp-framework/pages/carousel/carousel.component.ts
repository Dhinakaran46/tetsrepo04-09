import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, ValidationErrors } from '@angular/forms';
import { CommonSharedModule } from '../../shared/common/common.module';
import { IconSaveComponent } from '../../shared/icon/icon-save';
import { IconXCircleComponent } from '../../shared/icon/icon-x-circle';
import { GridApiService } from '../../service/common/grid.service';
import { ToastrService } from 'ngx-toastr';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { EditorComponent } from 'ngx-monaco-editor-v2';
import { animate, style, transition, trigger } from '@angular/animations';
import { TranslateService } from '@ngx-translate/core';
import { Title } from '@angular/platform-browser';
import { ClientDatatableComponent, TableConfig } from '../../components/client-datatable/client-datatable.component';
import { Location } from '@angular/common';

@Component({
  selector: 'app-carousel',
  standalone: true,
  imports: [CommonSharedModule, MonacoEditorModule, IconSaveComponent, IconXCircleComponent, ReactiveFormsModule, ClientDatatableComponent],
  templateUrl: './carousel.component.html',
  styleUrls: ['./carousel.component.scss'],
  animations: [
    trigger('toggleAnimation', [
      transition(':enter', [style({ opacity: 0, transform: 'scale(0.95)' }), animate('100ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))]),
      transition(':leave', [animate('75ms', style({ opacity: 0, transform: 'scale(0.95)' }))]),
    ]),
  ],
})
export class CarouselComponent implements OnInit {
  private _originalItems: any[] = [];
  previewImageUrl: string | null = null;

  form!: FormGroup;
  items: any = [];
  id: number | null = null;
  editTitle = false;
  submitted = false;
  tables_list: any = [];
  commonConfig: any;
  redirect_url = 'carousel_template';

  lineItemForm!: FormGroup;
  selectedItem: any = null;
  editingItemIndex: number = -1;
  // CarouselTemplate Component
  isItemModalOpen = false; // This will control the modal's visibility for line items

  // CarouselTemplate Component
  showEmailProcessSlug = false; // This will control whether the email process slug is shown or not

  @ViewChild('monacoEditor') monacoEditor: EditorComponent | undefined;

  // CarouselTemplate Component - itemsTableConfig
  itemsTableConfig: TableConfig = {
    columns: [
      { key: 'name', label: 'Item Name', sortable: true, searchable: true },
      { key: 'description', label: 'Description', sortable: true, searchable: true },
      { key: 'slug', label: 'Slug', sortable: true, searchable: false },
      { key: 'image_url', label: 'Image URL', sortable: true, searchable: false },
      { key: 'video_url', label: 'Video URL', sortable: true, searchable: false },
      { key: 'clickable_link', label: 'Clickable Link', sortable: true, searchable: false },
      { key: 'order_no', label: 'Order No', sortable: true, searchable: false },
      {
        key: 'actions',
        label: 'Actions',
        type: 'button',
        actions: [
          {
            icon: 'fa-solid fa-edit',
            onClick: (item: any) => this.editLineItem(item),
            class: 'mr-4',
            tooltip: 'Edit Item',
          },
          {
            icon: 'fa-solid fa-trash',
            onClick: (item: any) => this.removeLineItem(item),
            class: '',
            tooltip: 'Delete Item',
          },
        ],
      },
    ],
    pageSizes: [5, 10, 25, 50],
    defaultPageSize: 5,
    searchable: true,
    headerConfig: {
      title: 'Carousel Template Line Items',
      showHeader: true,
      addButton: {
        show: true,
        label: 'Add New',
        icon: 'fa-solid fa-plus',
        onClick: () => this.initNewLineItem(),
        disabled: false,
        class:
          'btn-primary flex items-center rounded-md border border-[#e0e6ed] px-4 py-2 font-semibold dark:border-[#253b5c] dark:bg-[#1b2e4b] dark:text-white-dark',
      },
      enableFilter: true,
      enableColumnSelector: true,
      enableExport: true,
    },
  };

  // CarouselTemplate Component
  insert_json_schema: any = {
    action: ['insert', 'insert'],
    table: ['carousel_templates', 'carousel_template_line_items'],
    table_mapping: ['table1', 'table2'],
    data: { table1: [], table2: [] },
  };

  update_json_schema: any = {
    action: ['update', 'hard_delete', 'insert'],
    table: ['carousel_templates', 'carousel_template_line_items', 'carousel_template_line_items'],
    table_mapping: ['table1', 'table2', 'table3'],
    data: { table1: [], table3: [] },
    conditions: {
      table1: [],
      table2: [],
    },
  };

  constructor(
    private fb: FormBuilder,
    private gridApiService: GridApiService,
    private toastr: ToastrService,
    private route: ActivatedRoute,
    private router: Router,
    public storeData: Store<any>,
    private translate: TranslateService,
    private titleService: Title,
    public location: Location
  ) {}

  ngOnInit() {
    
    this.id = this.route.snapshot.params['id'] || this.route.snapshot.params['uuid'];
    this.initForm();
    this.fetchAllTables();

    if (!this.id) {
      this.editTitle = false;
    } else {
      this.editTitle = true;
      this.loadData(this.id);
    }
    this.titleChange();
  }

  // CarouselTemplate Component
  get itemsData(): any[] {
    return (this.form.get('items') as FormArray).controls.map((control) => control.value);
  }

  // CarouselTemplate Component - onItemsDataChange
  onItemsDataChange(data: any[]) {
    const items = this.form.get('items') as FormArray;

    // Clear the existing line items and add the new ones
    items.clear();

    // If data is empty or undefined, use original data
    const itemsToUse = !data || data.length === 0 ? this._originalItems : data;

    itemsToUse.forEach((item: any) => {
      items.push(
        this.fb.group({
          name: [item.name, Validators.required],
          description: [item.description],
          slug: [item.slug, Validators.required],
          image_url: [item.image_url], // Image URL for upload
          video_url: [item.video_url],
          clickable_link: [item.clickable_link],
          order_no: [item.order_no, [Validators.required, Validators.min(0)]],
        })
      );
    });
  }

  isLineItemFieldInvalid(fieldName: string): boolean {
    const field = this.lineItemForm?.get(fieldName);
    return field ? field.invalid && (field.touched || this.submitted) : false;
  }

  // Handle Image Upload
  // Handle Image Upload
  onImageChange(event: any) {
    const file = event.target.files[0]; // Get the selected file
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        // Set the form control to the base64 image string (to store image data in the form)
        this.lineItemForm.patchValue({
          image_url: reader.result as string,
        });

        // Set the preview URL (display the image)
        this.previewImageUrl = reader.result as string;
      };
      reader.readAsDataURL(file); // Converts the file to base64
    }
  }

  onLineItemSubmit() {
    if (this.lineItemForm.valid) {
      const itemsArray = this.form.get('items') as FormArray;
      const formValue = this.lineItemForm.value;

      // Handle image_url
      if (!this.previewImageUrl && formValue.image_url) {
        // Retain the existing image_url if no new image is uploaded
        formValue.image_url = formValue.image_url;
      } else if (this.previewImageUrl) {
        // If a new image is uploaded, set the preview image URL
        formValue.image_url = this.previewImageUrl;
      }

      // Handle existing image URL if the user hasn't uploaded a new one
      if (!formValue.image_url) {
        formValue.image_url = this.selectedItem.image_url; // Use the existing image URL
      }

      // If editing an item
      if (this.editingItemIndex !== -1) {
        itemsArray.at(this.editingItemIndex).patchValue(formValue);
        this._originalItems[this.editingItemIndex] = { ...this._originalItems[this.editingItemIndex], ...formValue };
      } else {
        itemsArray.push(this.fb.group(formValue));
        this._originalItems.push({ ...formValue });
      }

      this.isItemModalOpen = false;
      this.cancelLineItemEdit();
    }
  }

  getLineItemErrorMessage(fieldName: string): string {
    const field = this.lineItemForm.get(fieldName);

    if (field) {
      if (field.hasError('required')) {
        return 'required_message';
      }
      if (field.hasError('maxlength')) {
        return `Maximum length exceeded (${field.errors?.['maxlength'].requiredLength} characters allowed)`;
      }
      if (field.hasError('min')) {
        return `Minimum value is ${field.errors?.['min'].min}`;
      }
    }
    return '';
  }

  // CarouselTemplate Component - Methods to handle Edit and Delete

  editLineItem(index: any) {
    this.previewImageUrl = null;
    this.selectedItem = index;
    this.editingItemIndex = this.itemsData.findIndex((i) => i === index);
    this.lineItemForm.patchValue(index);
    this.isItemModalOpen = true;
  }
  cancelLineItemEdit() {
    this.selectedItem = null;
    this.editingItemIndex = -1;
    this.lineItemForm.reset();
    this.isItemModalOpen = false;
  }

  removeLineItem(item: any) {
    const items = this.form.get('items') as FormArray;

    // Find the index of the item with the matching name (or another unique field)
    const index = items.controls.findIndex((control) => control.value.name === item.name);

    if (index !== -1) {
      // If the item exists in the form array, remove it
      items.removeAt(index);
      this._originalItems.splice(index, 1); // Update the original items array
      this.toastr.success('Item removed successfully', 'Success');
    } else {
      this.toastr.warning(`Item with name: ${item.name} not found.`, 'Warning');
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return field ? field.invalid && (field.touched || this.submitted) : false;
  }
  getErrorMessage(fieldName: string): string {
    const field = this.form.get(fieldName);
    if (field) {
      if (field.hasError('required')) {
        return 'required_message';
      }
      if (field.hasError('maxlength')) {
        return `Maximum length exceeded (${field.errors?.['maxlength'].requiredLength} characters allowed)`;
      }
      if (field.hasError('min')) {
        return `Minimum value is ${field.errors?.['min'].min}`;
      }
      if (field.hasError('viewMandatory')) {
        return '"view" option is mandatory';
      }
    }
    return '';
  }

  isItemFieldInvalid(index: number, fieldName: string): boolean {
    const items = this.form.get('items') as FormArray;
    const field = items.at(index).get(fieldName);
    return field ? field.invalid && (field.touched || this.submitted) : false;
  }

  initForm() {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      slug: ['', [Validators.required, Validators.maxLength(100)]],
      description: [''],
      status_id: [1],

      items: this.fb.array([]),
    });

    this.initLineItemForm();
  }

  initLineItemForm() {
    this.lineItemForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      description: [''],
      slug: ['', Validators.required], // For image upload
      image_url: [''], // For image upload
      video_url: [''],
      clickable_link: [''],
      order_no: ['', [Validators.required, Validators.min(0)]],
    });
  }

  initNewLineItem() {
    this.editingItemIndex = -1;
    this.selectedItem = {};
    this.lineItemForm.reset();
    this.isItemModalOpen = true;
    this.previewImageUrl = null;
  }

  toggleEmailProcessSlug(value: boolean) {
    this.showEmailProcessSlug = value;
  }

  titleChange() {
    const title = this.editTitle ? 'Edit Carousel Template' : 'Add Carousel Template';
    this.titleService.setTitle(title);
  }

  fetchAllTables() {
    this.gridApiService.getAllTables().subscribe(
      (response) => {
        if (response.status && response.code === 200) {
          this.tables_list = response.data;
        }
      },
      (error) => {
        this.toastr.error('Error fetching tables', 'Error');
      }
    );
  }

  loadData(id: number) {
    const params = {
      company_id: 1,
      print_query: true,
      primary_table: 'carousel_templates',
      start_index: 0,
      limit_range: 1,
      sort_columns: [['carousel_templates.id', 'desc']],
      search_all: [
        {
          column_name: 'carousel_templates.uuid',
          value: id,
          operator: '=',
        },
      ],
      select_columns: [
        ['carousel_templates.*'],
        [
          "CASE WHEN COUNT(carousel_template_line_items.id) = 0 THEN null ELSE COALESCE(Json_agg(DISTINCT jsonb_build_object('slug',carousel_template_line_items.slug,'name', carousel_template_line_items.name, 'description', carousel_template_line_items.description, 'image_url', carousel_template_line_items.image_url, 'video_url', carousel_template_line_items.video_url, 'clickable_link', carousel_template_line_items.clickable_link, 'order_no', carousel_template_line_items.order_no))) END",
          'items',
        ],
      ],
      includes: [
        {
          table_name: 'carousel_template_line_items',
          join_type: 'LEFT',
          join_condition: `carousel_templates.id = carousel_template_line_items.carousel_template_id`,
        },
      ],
      group_by: ['carousel_templates.id'],
    };

    this.gridApiService.getAllList(params).subscribe(
      (response) => {
        if (response.status && response.code === 200) {
          const entity = response.data.records[0];
          this.form.patchValue({
            name: entity.name,
            slug: entity.slug,
            description: entity.description,
            status_id: entity.status_id,
          });

          const lineItems = this.form.get('items') as FormArray;

          if (entity.items && entity.items.length > 0) {
            entity.items.forEach((item: any) => {
              this.previewImageUrl = item.image_url;
              lineItems.push(
                this.fb.group({
                  slug: [item.slug, Validators.required],
                  name: [item.name, Validators.required],
                  description: [item.description],
                  image_url: [item.image_url], // Image URL for upload
                  video_url: [item.video_url],
                  clickable_link: [item.clickable_link],
                  order_no: [item.order_no, [Validators.required, Validators.min(0)]],
                })
              );
            });
          }
        }
      },
      (error) => {
        this.toastr.error('Error loading carousel template data', 'Error');
      }
    );
  }

  onSubmit() {
    this.submitted = true;

    if (this.form.invalid) {
      return;
    }

    const formData = this.form.value;
    const payload = this.id ? this.getEditParams(formData, this.id) : this.getAddParams(formData);

    this.gridApiService.executeRecords(payload).subscribe(
      (response) => {
        if (response.status && response.code === 200) {
          const successMessage = this.translate.instant(this.id ? 'record_updated_successfully' : 'record_inserted_successfully');
          this.toastr.success(successMessage);

          this.router.navigate([this.redirect_url]);
        } else {
          this.toastr.error(response.message, 'Error');
        }
      },
      (error) => {
        this.toastr.error('Error submitting form', 'Error');
      }
    );
  }

  getAddParams(formData: any) {
    const master = [
      {
        name: formData.name,
        slug: formData.slug,
        description: formData.description,
        status_id: formData.status_id,
      },
    ];

    if (formData.items && formData.items.length > 0) {
      const items = formData.items.map((item: any) => ({
        carousel_template_id: '@table1.id',
        name: item.name,
        slug: item.slug,
        description: item.description,
        image_url: item.image_url,
        video_url: item.video_url,
        clickable_link: item.clickable_link,
        order_no: item.order_no,
      }));
      this.insert_json_schema.data['table2'] = items;
    }

    this.insert_json_schema.data['table1'] = master;

    return this.insert_json_schema;
  }

  getEditParams(formData: any, id: any) {
    const master = [
      {
        name: formData.name,
        slug: formData.slug,
        description: formData.description,
        status_id: formData.status_id,
      },
    ];

    this.update_json_schema.data['table1'] = master;
    this.update_json_schema.conditions['table1'] = [{ uuid: id }];
    this.update_json_schema.conditions['table2'] = [{ carousel_template_id: '@table1.id' }];

    if (formData.items && formData.items.length > 0) {
      const items = formData.items.map((item: any) => ({
        carousel_template_id: '@table1.id',
        name: item.name,
        slug: item.slug,
        description: item.description,
        image_url: item.image_url,
        video_url: item.video_url,
        clickable_link: item.clickable_link,
        order_no: item.order_no,
      }));

      this.update_json_schema.data['table3'] = items;
    }

    return this.update_json_schema;
  }
}
