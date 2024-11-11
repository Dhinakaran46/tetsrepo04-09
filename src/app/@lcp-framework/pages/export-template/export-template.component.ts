import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, ValidationErrors } from '@angular/forms';
import { CommonSharedModule } from '../../shared/common/common.module';
import { IconXComponent } from '../../shared/icon/icon-x';
import { IconSendComponent } from '../../shared/icon/icon-send';
import { IconSaveComponent } from '../../shared/icon/icon-save';
import { IconEyeComponent } from '../../shared/icon/icon-eye';
import { IconDownloadComponent } from '../../shared/icon/icon-download';
import { IconXCircleComponent } from '../../shared/icon/icon-x-circle';
import { IconPlusCircleComponent } from '../../shared/icon/icon-plus-circle';
import { GridApiService } from '../../service/common/grid.service';
import { ToastrService } from 'ngx-toastr';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { commonConfig } from '../../config/common.config';
import { LocalStorageService } from '../../service/common/local-storage.service';
import { AbstractControl, ValidatorFn } from '@angular/forms';
import { Location } from '@angular/common';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { EditorComponent } from 'ngx-monaco-editor-v2';
import { animate, style, transition, trigger } from '@angular/animations';
import { TranslateService } from '@ngx-translate/core';
import { Title } from '@angular/platform-browser';
import { ClientDatatableComponent, TableConfig } from '../../components/client-datatable/client-datatable.component';
import * as XLSX from 'xlsx';

export function viewMandatoryValidator(): ValidatorFn {
  return (control: AbstractControl): { [key: string]: any } | null => {
    const selectedOptions = control.value;
    if (Array.isArray(selectedOptions) && selectedOptions.includes('view')) {
      return null; // Valid
    }
    return { viewMandatory: true }; // Invalid
  };
}

interface LineItem {
  field_name: string;
  display_name: string;
  field_table: string;
  order_no: number;
  default_value: string;
  column_name: string;

  is_individual: boolean;
  individual_column: string;

  field_type_id: number;
}

interface QueryItem {
  query_string: string;
  order_no: number;
  query_name: string;
  query_procedure: string;
}

interface ExcelRow extends Array<any> {
  [index: number]: string | number | null;
  length: number;
}

@Component({
  selector: 'app-export-template',
  standalone: true,
  imports: [
    CommonSharedModule,
    MonacoEditorModule,
    IconXComponent,
    IconSendComponent,
    IconSaveComponent,
    IconEyeComponent,
    IconDownloadComponent,
    IconXCircleComponent,
    IconPlusCircleComponent,
    ReactiveFormsModule,
    ClientDatatableComponent,
  ],

  templateUrl: './export-template.component.html',
  styleUrl: './export-template.component.scss',
  animations: [
    trigger('toggleAnimation', [
      transition(':enter', [style({ opacity: 0, transform: 'scale(0.95)' }), animate('100ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))]),
      transition(':leave', [animate('75ms', style({ opacity: 0, transform: 'scale(0.95)' }))]),
    ]),
  ],
})
export class ExportTemplateComponent implements OnInit {
  store: any;
  form!: FormGroup;
  items: any = [];
  queries: any = [];
  //entity_types: any = [];
  action_types: any[] = [];
  field_types: any[] = [];
  tables_list: any = [];
  wizard_type_list: any[] = [];
  id: number | null = null;
  editTitle = false;
  submitted = false;
  commonConfig = commonConfig;
  existing_actions: string[] = [];
  redirect_url: string = 'export_template';
  rowsLength: number = 26;

  lineItemForm!: FormGroup;
  selectedItem: any = null;
  editingItemIndex: number = -1;

  lineQueryForm!: FormGroup;
  selectedQuery: any = null;
  editingQueryIndex: number = -1;

  editorOptions = { theme: 'vs-dark', language: 'json', tabSize: 1, insertSpaces: true };
  htmlEditorOptions = { ...this.editorOptions, language: 'html' };
  isDarkTheme = true; // Default theme
  @ViewChild('monacoEditor') monacoEditor: EditorComponent | undefined;

  private _originalItems: any[] = [];
  private _originalQueries: any[] = [];

  selectedFile: File | null = null;
  isProcessingFile = false;
  fileError: string = '';
  excelHeaders: string[] = [];

  insert_json_schema: any = {
    // it will be removed
    action: ['insert', 'insert', 'insert'],
    table: ['export_templates', 'export_template_line_items', 'export_template_queries'],
    table_mapping: ['table1', 'table2', 'table3'],
    data: {
      table1: [],
      table2: [],
      table3: [],
    },
  };

  update_json_schema: any = {
    // it will be removed
    action: ['update', 'hard_delete', 'insert', 'hard_delete', 'insert'],
    table: ['export_templates', 'export_template_line_items', 'export_template_line_items', 'export_template_queries', 'export_template_queries'],
    table_mapping: ['table1', 'table2', 'table3', 'table4', 'table5'],
    data: {
      table1: [],
      table3: [],
      table5: [],
    },
    conditions: {
      table1: [],
      table2: [],
      table4: [],
    },
  };

  // Add modal state variables
  isItemModalOpen = false;
  isQueryModalOpen = false;

  // Items Datatable Configuration
  itemsTableConfig: TableConfig = {
    columns: [
      { key: 'field_name', label: 'Field Name', sortable: true, searchable: true },
      { key: 'display_name', label: 'Display Name', sortable: true, searchable: true },
      { key: 'field_table', label: 'Field Table', sortable: true, searchable: true },
      { key: 'order_no', label: 'Order No', sortable: true, searchable: true },
      { key: 'field_type_id', label: 'Field Type', sortable: true, searchable: true },
      {
        key: 'actions',
        label: 'Actions',
        type: 'button',
        actions: [
          {
            icon: 'fa-solid fa-edit',
            onClick: (item: any) => this.editLineItem(item),
            class: '   mr-4',
            tooltip: 'Edit Item',
          },
          {
            icon: 'fa-solid fa-trash',
            onClick: (item: any) => this.removeItem(item),
            class: '  ',
            tooltip: 'Delete Item',
          },
        ],
      },
    ],
    pageSizes: [5, 10, 25, 50],
    defaultPageSize: 5,
    searchable: true,
    headerConfig: {
      title: 'Export Template Line Items',
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

  // Queries Datatable Configuration
  queriesTableConfig: TableConfig = {
    columns: [
      { key: 'query_name', label: 'Query Name', sortable: true, searchable: true },

      { key: 'order_no', label: 'Order No', sortable: true, searchable: true },
      { key: 'query_procedure', label: 'Query Procedure', sortable: true, searchable: true },
      { key: 'query_string', label: 'Query String', sortable: true, searchable: true },
      {
        key: 'actions',
        label: 'Actions',
        type: 'button',
        actions: [
          {
            icon: 'fa-solid fa-edit',
            onClick: (item: any) => this.editQueryItem(item),
            class: '   mr-4',
            tooltip: 'Edit Query',
          },
          {
            icon: 'fa-solid fa-trash',
            onClick: (item: any) => this.removeQuery(item),
            class: '  ',
            tooltip: 'Delete Query',
          },
        ],
      },
    ],
    pageSizes: [5, 10, 25, 50],
    defaultPageSize: 5,
    searchable: true,
    headerConfig: {
      title: 'Export Template Line Queries',
      showHeader: true,
      addButton: {
        show: true,
        label: 'Add New',
        icon: 'fa-solid fa-plus',
        onClick: () => this.initNewLineQuery(),
        disabled: false,
        class:
          'btn-primary flex items-center rounded-md border border-[#e0e6ed] px-4 py-2 font-semibold dark:border-[#253b5c] dark:bg-[#1b2e4b] dark:text-white-dark',
      },
      enableFilter: true,
      enableColumnSelector: true,
      enableExport: true,
    },
  };

  constructor(
    private fb: FormBuilder,
    private gridApiService: GridApiService,
    private toastr: ToastrService,
    private route: ActivatedRoute,
    private router: Router,
    public localStorageService: LocalStorageService,
    public storeData: Store<any>,
    public location: Location,
    private translate: TranslateService,
    private titleService: Title
  ) {
    this.initStore();
  }

  ngOnInit() {
    this.id = this.route.snapshot.params['id'] || null;
    this.initForm();
    //this.constructRedirectUrl();

    // To load all the lookups
    this.field_types = this.commonConfig.field_types;
    //this.entity_types = this.commonConfig.entity_types;
    this.action_types = this.commonConfig.action_types;
    this.wizard_type_list = this.commonConfig.wizard_type;
    this.fetchAllTables();

    // If "id" is not available we need consider it as "Add", otherwise "Edit"
    if (!this.id) {
      this.editTitle = false;
    } else {
      this.editTitle = true;
      this.loadData(this.id);
    }
    this.titleChange();
  }

  async initStore() {
    this.storeData
      .select((d) => d.index)
      .subscribe((d) => {
        this.store = d;
      });
  }

  handleFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    this.fileError = '';

    if (!file) return;

    // Validate file type
    if (!this.isExcelFile(file)) {
      this.fileError = 'Please upload only Excel files (.xlsx, .xls, .csv)';
      return;
    }

    const headerRow = this.form.get('header_row')?.value;
    if (!headerRow) {
      this.fileError = 'Please specify the header row number first';
      return;
    }

    this.isProcessingFile = true;

    this.gridApiService.uploadExcelFile(file).subscribe(
      (response: any) => {
        if (response.body && response.body.status) {
          // Store the file path
          const filePath = response.body.data;
          this.form.patchValue({ data_filepath: filePath });

          // Process the file for headers
          this.selectedFile = file;
          // this.processExcelFile(file, headerRow);

          // Load headers after successful upload
          this.loadExcelHeaders(filePath, headerRow);
        }
        this.isProcessingFile = false;
      },
      (error) => {
        this.fileError = 'Error uploading file. Please try again.';
        this.isProcessingFile = false;
        const key = 'error';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
      }
    );
  }

  removeFile(): void {
    // Clear file-related data
    this.selectedFile = null;
    this.fileError = '';
    this.excelHeaders = [];
    this.form.patchValue({ data_filepath: '' });

    // Clear line items FormArray
    const items = this.form.get('items') as FormArray;
    while (items.length > 0) {
      items.removeAt(0);
    }

    // Reset original items array
    this._originalItems = [];

    // Clear any existing column selections
    items.controls.forEach((control) => {
      const columnNameControl = control.get('column_name');
      if (columnNameControl) {
        columnNameControl.setValue('');
      }
    });

    // Close the item modal if it's open
    this.isItemModalOpen = false;
    this.selectedItem = null;
    this.editingItemIndex = -1;

    // Show notification
    this.toastr.info('File and associated line items have been removed');
  }

  private isExcelFile(file: File): boolean {
    return /\.(xlsx|xls|csv)$/.test(file.name.toLowerCase());
  }

  private processExcelFile(file: File, headerRow: number): void {
    this.isProcessingFile = true;
    this.fileError = '';

    const reader = new FileReader();

    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        if (!e.target?.result) {
          throw new Error('Failed to read file');
        }

        const data = new Uint8Array(e.target.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // Get the first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Get the range of the worksheet
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

        // Find headers in the specified row
        const headers: string[] = [];
        for (let C = range.s.c; C <= range.e.c; ++C) {
          // Convert column number to letter (0 = A, 1 = B, etc.)
          const cellRef = XLSX.utils.encode_cell({ r: headerRow - 1, c: C });
          const cell = worksheet[cellRef];

          if (cell && cell.v) {
            headers.push(String(cell.v).trim());
          }
        }

        if (headers.length === 0) {
          this.fileError = `No headers found in row ${headerRow} (${XLSX.utils.encode_col(0)}${headerRow})`;
          this.isProcessingFile = false;
          return;
        }

        // Store the headers
        this.excelHeaders = headers;
        console.log('Found headers at row', headerRow, ':', headers);

        // Enable column_name selection in line items
        const items = this.form.get('items') as FormArray;
        items.controls.forEach((control) => {
          const columnNameControl = control.get('column_name');
          if (columnNameControl) {
            columnNameControl.enable();
          }
        });
      } catch (error) {
        console.error('Excel processing error:', error);
        this.fileError = 'Error processing Excel file. Please try again.';
      } finally {
        this.isProcessingFile = false;
      }
    };

    reader.onerror = () => {
      this.fileError = 'Error reading file. Please try again.';
      this.isProcessingFile = false;
    };

    reader.readAsArrayBuffer(file);
  }

  // Helper method to validate header row input
  validateHeaderRowInput(input: string | number): boolean {
    const row = Number(input);
    return row > 0 && row <= 1048576; // Excel's maximum row number
  }

  // Update the header row validation
  validateHeaderRow(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = parseInt(input.value);

    if (!this.validateHeaderRowInput(value)) {
      this.fileError = 'Please enter a valid row number (1-1048576)';
      return;
    }

    // If we have a file path, reload the headers with new row number
    const filePath = this.form.get('data_filepath')?.value;
    if (filePath) {
      this.loadExcelHeaders(filePath, value);
    }
  }

  private loadExcelHeaders(filePath: string, headerRow: number) {
    if (!filePath || !headerRow) {
      this.excelHeaders = [];
      return;
    }

    const params = {
      file_path: filePath,
      header_row: headerRow,
    };

    this.gridApiService.getExcelHeaders(params).subscribe(
      (response: any) => {
        if (response.status && response.code === 200) {
          // Expecting array of column names from the specified header row
          this.excelHeaders = response.data;
        }
      },
      (error) => {
        console.error('Error loading Excel headers:', error);
        const errorMessage = this.translate.instant('error_loading_excel_headers');
        this.toastr.error(errorMessage, 'Error');
      }
    );
  }

  initLineItemForm() {
    this.lineItemForm = this.fb.group({
      field_name: ['', [Validators.required, Validators.maxLength(100)]],
      display_name: ['', [Validators.required, Validators.maxLength(100)]],
      order_no: ['', [Validators.required, Validators.min(0)]],
      field_table: ['', Validators.required],
      default_value: [''],
      column_name: ['', Validators.required],

      is_individual: [false],
      individual_column: [''],

      field_type_id: ['', Validators.required],
    });

    this.addFormArraySubscriptions();
    /*if (!this.id) {
      this.initNewLineItem();
    }*/

    this.form.get('header_row')?.valueChanges.subscribe(() => {
      if (this.selectedFile) {
        this.removeFile();
      }
    });
  }
  initLineQueryForm() {
    this.lineQueryForm = this.fb.group({
      query_string: ['', [Validators.required]],
      order_no: ['', [Validators.required, Validators.min(0)]],
      query_name: ['', [Validators.required, Validators.min(0)]],
      query_procedure: ['', [Validators.required]],
    });

    /*if (!this.id) {
      this.initNewLineQuery();
    }*/
  }

  addFormArraySubscriptions() {
    this.lineItemForm.get('is_foreign')?.valueChanges.subscribe((value) => {
      const foreignControls = ['foreign_table', 'foreign_column', 'foreign_can_create'];
      foreignControls.forEach((control) => {
        const formControl = this.lineItemForm.get(control);
        if (value) {
          formControl?.enable();
        } else {
          formControl?.disable();
        }
      });
    });

    this.lineItemForm.get('is_enum')?.valueChanges.subscribe((value) => {
      const enumControl = this.lineItemForm.get('enum_values');
      if (value) {
        enumControl?.enable();
      } else {
        enumControl?.disable();
      }
    });

    this.lineItemForm.get('is_individual')?.valueChanges.subscribe((value) => {
      const individualColumn = this.lineItemForm.get('individual_column');
      if (value) {
        individualColumn?.enable();
      } else {
        individualColumn?.disable();
      }
    });
  }

  initNewLineItem() {
    this.editingItemIndex = -1;
    this.selectedItem = {};
    this.lineItemForm.reset({
      is_individual: false,
    });
    this.isItemModalOpen = true;
  }
  initNewLineQuery() {
    this.editingQueryIndex = -1;
    this.selectedQuery = {};
    this.lineQueryForm.reset({
      query_string: '',
      order_no: '',
      query_name: '',
      query_procedure: '',
    });
    this.isQueryModalOpen = true;
  }

  editQueryItem(index: any) {
    console.log(index);
    //this.editingQueryIndex = index;
    this.selectedQuery = index;
    this.editingQueryIndex = this.queriesData.findIndex((q) => q === index);
    this.lineQueryForm.patchValue(index);
    /*const queriesArray = this.form.get('queries') as FormArray;
    const query = queriesArray.at(index);
    this.selectedQuery = query.value;
    this.lineQueryForm.patchValue(query.value);*/
    this.isQueryModalOpen = true;
  }

  editLineItem(index: any) {
    console.log(index);
    //this.editingItemIndex = index;
    /* const itemsArray = this.form.get('items') as FormArray;
    const item = itemsArray.at(index);
    this.selectedItem = item.value;
    this.lineItemForm.patchValue(item.value);*/

    /*this.selectedItem = index;
    this.lineItemForm.patchValue(index);*/
    this.selectedItem = index;
    this.editingItemIndex = this.itemsData.findIndex((i) => i === index);

    // Load headers if we have file and row number
    const filePath = this.form.get('data_filepath')?.value;
    const headerRow = this.form.get('header_row')?.value;
    console.log(filePath);
    console.log(headerRow);
    if (filePath && headerRow) {
      this.loadExcelHeaders(filePath, headerRow);
    }

    this.lineItemForm.patchValue(index);
    this.isItemModalOpen = true;
  }

  cancelLineItemEdit() {
    this.selectedItem = null;
    this.editingItemIndex = -1;
    this.lineItemForm.reset();
    this.isItemModalOpen = false;
  }

  cancelLineQueryEdit() {
    this.selectedQuery = null;
    this.editingQueryIndex = -1;
    this.lineQueryForm.reset();
    this.isQueryModalOpen = false;
  }

  onLineItemSubmit() {
    if (this.lineItemForm.valid) {
      const itemsArray = this.form.get('items') as FormArray;
      const formValue = this.lineItemForm.value;

      if (this.editingItemIndex !== -1) {
        // Update existing item in FormArray
        itemsArray.at(this.editingItemIndex).patchValue(formValue);
      } else {
        // Push new item to FormArray
        itemsArray.push(this.fb.group(formValue));
      }

      this.isItemModalOpen = false;
      this.cancelLineItemEdit(); // Clear form after submission
    }
  }

  onLineQuerySubmit() {
    if (this.lineQueryForm.valid) {
      const queriesArray = this.form.get('queries') as FormArray;
      const formValue = this.lineQueryForm.value;

      if (this.editingQueryIndex !== -1) {
        // Update existing item in FormArray
        queriesArray.at(this.editingQueryIndex).patchValue(formValue);
      } else {
        // Push new item to FormArray
        queriesArray.push(this.fb.group(formValue));
      }

      this.isQueryModalOpen = false;
      this.cancelLineQueryEdit(); // Clear form after submission
    }
  }

  getFieldTypeName(typeId: number): string {
    const fieldType = this.field_types.find((type) => type.value === typeId);
    return fieldType ? fieldType.label : '';
  }

  isLineItemFieldInvalid(fieldName: string): boolean {
    const field = this.lineItemForm?.get(fieldName);
    return field ? field.invalid && (field.touched || this.submitted) : false;
  }

  isLineQueryFieldInvalid(fieldName: string): boolean {
    const field = this.lineQueryForm?.get(fieldName);
    return field ? field.invalid && (field.touched || this.submitted) : false;
  }

  titleChange() {
    const title = this.editTitle ? 'title_edit_entity' : 'title_add_entity';
    const translateTitle = this.translate.instant(title);
    this.titleService.setTitle(translateTitle);
  }
  decimalValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (value !== null && value !== undefined && !/^\d+(\.\d{1,2})?$/.test(value)) {
      return { decimalInvalid: true };
    }
    return null;
  }

  initForm() {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      slug: [''],
      description: ['', Validators.required],
      max_row_count: ['', Validators.required],
      data_filepath: ['', Validators.required],
      header_row: ['', Validators.required],
      data_start_row: ['', Validators.required],
      data_end_row: ['', Validators.required],

      status_id: [1],
      items: this.fb.array([]),
      queries: this.fb.array([]),
    });
    this.initLineItemForm();
    this.initLineQueryForm();
  }

  updateFormValidation(entityType: any) {
    this.form.clearValidators();

    const itemsControl = this.form.get('items');
    const queriesControl = this.form.get('queries');

    this.form.updateValueAndValidity();
  }

  constructRedirectUrl() {
    const currentUrl = this.router.url;
    let updatedUrl = currentUrl.replace(/\/edit\/\d+$/, '');
    this.redirect_url = updatedUrl.replace(/\/add$/, '');
  }

  toggleTheme() {
    this.isDarkTheme = !this.isDarkTheme;
    this.editorOptions = {
      ...this.editorOptions,
      theme: this.isDarkTheme ? 'vs-dark' : 'vs-light',
    };
  }

  fetchAllTables() {
    this.gridApiService.getAllTables().subscribe(
      (response) => {
        if (response.status && response.code === 200) {
          this.tables_list = response.data;
        }
      },
      (error) => {
        const key = 'error';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
      }
    );
  }

  removeItem(item: any) {
    const items = this.form.get('items') as FormArray;

    // Find the index of the item with the matching field_name
    const index = items.controls.findIndex((control) => control.value.field_name === item.field_name);

    if (index !== -1) {
      // If the item exists in the form array, remove it
      items.removeAt(index);
      console.log(`Item with field_name: ${item.field_name} removed at index: ${index}`);
    } else {
      this.toastr.warning(`Item with field_name: ${item.field_name} not found.`);
    }
  }

  removeQuery(query: any) {
    const queries = this.form.get('queries') as FormArray;

    // Find the index of the query with the matching query_name
    const index = queries.controls.findIndex((control) => control.value.query_name === query.query_name);
    console.log(index);
    if (index !== -1) {
      // If the query exists in the form array, remove it
      queries.removeAt(index);
      console.log(`Query with query_name: ${query.query_name} removed at index: ${index}`);
    } else {
      this.toastr.warning(`Query with query_name: ${query.query_name} not found.`);
    }
  }

  get itemsControls() {
    return (this.form.get('items') as FormArray).controls;
  }
  get queriesControls() {
    return (this.form.get('queries') as FormArray).controls;
  }

  loadData(id: number) {
    const params = {
      company_id: 1,
      print_query: true,
      primary_table: 'export_templates',
      start_index: 0,
      limit_range: 1,
      sort_columns: [['export_templates.id', 'desc']],
      search_all: [
        {
          column_name: 'export_templates.uuid',
          value: id,
          operator: '=',
        },
        //['export_templates.uuid = '${id}'']
      ],
      select_columns: [
        ['export_templates.*'],

        [
          "CASE WHEN COUNT(export_template_line_items.id) = 0 THEN null ELSE COALESCE(Json_agg(DISTINCT jsonb_build_object('field_name', export_template_line_items.field_name, 'display_name', export_template_line_items.display_name, 'field_table', export_template_line_items.field_table, 'order_no', export_template_line_items.order_no, 'default_value', export_template_line_items.default_value, 'column_name', export_template_line_items.column_name, 'is_individual', export_template_line_items.is_individual, 'individual_column', export_template_line_items.individual_column,  'field_type_id', export_template_line_items.field_type_id))) END",
          'items',
        ],
        [
          "CASE WHEN COUNT(export_template_queries.id) = 0 THEN null ELSE COALESCE(Json_agg(DISTINCT jsonb_build_object('query_string', export_template_queries.query_string,'query_name', export_template_queries.query_name,'query_procedure', export_template_queries.query_procedure, 'order_no', export_template_queries.order_no))) END",
          'queries',
        ],
      ],
      includes: [
        {
          table_name: 'export_template_line_items',
          join_type: 'LEFT',
          join_condition: `export_templates.id = export_template_line_items.export_template_id`,
        },
        {
          table_name: 'export_template_queries',
          join_type: 'LEFT',
          join_condition: `export_templates.id = export_template_queries.export_template_id`,
        },
      ],
      group_by: ['export_templates.id'],
    };

    this.gridApiService.getAllList(params).subscribe(
      (response) => {
        if (response.status && response.code === 200) {
          const entity = response.data.records[0];

          this.form.patchValue({
            name: entity.name,
            slug: entity.slug,
            description: entity.description,
            max_row_count: entity.max_row_count,
            data_filepath: entity.data_filepath,
            header_row: entity.header_row,
            data_start_row: entity.data_start_row,
            data_end_row: entity.data_end_row,

            status_id: entity.status_id,
          });

          // Handle Excel file display
          console.log(entity.data_filepath);
          if (entity.data_filepath) {
            const fileName = entity.data_filepath.split('/').pop() || '';
            this.selectedFile = {
              name: fileName,
              size: 0, // We don't have the actual file size
              type: fileName.split('.').pop() || '',
            } as File;

            // Load Excel headers if we have both file path and header row
            if (entity.header_row) {
              this.loadExcelHeaders(entity.data_filepath, entity.header_row);
            }
          }

          const items = this.form.get('items') as FormArray;

          if (entity.items && entity.items.length > 0) {
            this._originalItems = [...entity.items];
            entity.items.forEach((item: any) => {
              items.push(
                this.fb.group({
                  field_name: [item.field_name, Validators.required],
                  display_name: [item.display_name, Validators.required],
                  order_no: [item.order_no, [Validators.required, Validators.min(0)]],
                  field_table: [item.field_table, Validators.required],
                  default_value: [item.default_value],
                  column_name: [item.column_name, Validators.required],

                  is_individual: [item.is_individual],
                  individual_column: [item.individual_column],

                  field_type_id: [item.field_type_id, Validators.required],
                })
              );
            });
          }

          const queries = this.form.get('queries') as FormArray;

          if (entity.queries && entity.queries.length > 0) {
            this._originalQueries = [...entity.queries];
            entity.queries.forEach((query: any) => {
              queries.push(
                this.fb.group({
                  query_string: [query.query_string, Validators.required],
                  order_no: [query.order_no, [Validators.required, Validators.min(0)]],
                  query_name: [query.query_name, Validators.required],
                  query_procedure: [query.query_procedure, Validators.required],
                })
              );
            });
          }
        }
      },
      (error) => {
        const key = 'error';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
      }
    );
  }

  getAddParams(formData: any) {
    const master = [
      {
        name: formData.name,
        //entity_type: formData.entityType,

        status_id: formData.status_id,
        slug: formData.slug,
        description: formData.description,
        max_row_count: formData.max_row_count,
        data_filepath: formData.data_filepath,
        header_row: formData.header_row,
        data_start_row: formData.data_start_row,
        data_end_row: formData.data_end_row,
      },
    ];

    if (formData.items && formData.items.length > 0) {
      const items = formData.items.map((item: any) => ({
        export_template_id: '@table1.id',
        field_name: item.field_name,
        display_name: item.display_name,
        order_no: item.order_no,
        field_table: item.field_table,
        default_value: item.default_value,
        column_name: item.column_name,

        is_individual: item.is_individual,
        individual_column: item.individual_column ? item.individual_column : null,

        field_type_id: item.field_type_id,
      }));
      this.insert_json_schema.data['table2'] = items;
    }

    if (formData.queries && formData.queries.length > 0) {
      const queries = formData.queries.map((query: any) => ({
        export_template_id: '@table1.id',
        query_string: query.query_string,
        order_no: query.order_no,
        query_name: query.query_name,
        query_procedure: query.query_procedure,
      }));
      this.insert_json_schema.data['table3'] = queries;
    }

    this.insert_json_schema.data['table1'] = master;

    return this.insert_json_schema;
  }

  getEditParams(formData: any, id: any) {
    const master = [
      {
        name: formData.name,
        //entity_type: formData.entityType,

        status_id: formData.status_id,
        slug: formData.slug,
        description: formData.description,
        max_row_count: formData.max_row_count,
        data_filepath: formData.data_filepath,
        header_row: formData.header_row,
        data_start_row: formData.data_start_row,
        data_end_row: formData.data_end_row,
      },
    ];

    this.update_json_schema.data['table1'] = master;
    this.update_json_schema.conditions['table1'] = [{ uuid: id }];

    this.update_json_schema.conditions['table2'] = [{ export_template_id: '@table1.id' }];
    this.update_json_schema.conditions['table4'] = [{ export_template_id: '@table1.id' }];

    if (formData.items && formData.items.length > 0) {
      const items = formData.items.map((item: any) => ({
        export_template_id: '@table1.id',
        field_name: item.field_name,
        display_name: item.display_name,
        order_no: item.order_no,
        field_table: item.field_table,
        default_value: item.default_value,
        column_name: item.column_name,

        is_individual: item.is_individual,
        individual_column: item.individual_column ? item.individual_column : null,

        field_type_id: item.field_type_id,
      }));

      this.update_json_schema.data['table3'] = items;
    }
    if (formData.queries && formData.queries.length > 0) {
      const queries = formData.queries.map((query: any) => ({
        export_template_id: '@table1.id',
        query_string: query.query_string,
        order_no: query.order_no,
        query_name: query.query_name,
        query_procedure: query.query_procedure,
      }));

      this.update_json_schema.data['table5'] = queries;
    }

    return this.update_json_schema;
  }

  prepareJSON(data: any): string {
    return JSON.stringify(JSON.parse(data));
  }

  prettyJSON(data: any) {
    return JSON.stringify(JSON.parse(JSON.stringify(data).replace(/@table(\w+)/g, '##table$1')), null, 2);
  }

  onSubmit() {
    this.submitted = true;

    const formData = this.form.value;
    const payload = this.id ? this.getEditParams(formData, this.id) : this.getAddParams(formData);

    //return;
    this.gridApiService.executeRecords(payload).subscribe(
      (response) => {
        if (response.status && response.code === 200) {
          let key;
          if (this.id) {
            key = 'record_updated_successfully';
          } else {
            key = 'record_inserted_successfully';
          }

          const successMessage = this.translate.instant(key);
          this.toastr.success(successMessage);

          this.router.navigate([this.redirect_url]);
        } else {
          const key = response.message;
          const errorMessage = this.translate.instant(key);
          this.toastr.error(errorMessage, 'Error');
        }
      },
      (error) => {
        const key = 'error';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
      }
    );
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return field ? field.invalid && (field.touched || this.submitted) : false;
  }

  isFormInvalid() {
    return this.form.invalid || this.itemsControls.length === 0 || this.queriesControls.length === 0;
    //return this.form.invalid;
  }

  logFormStatus(): void {
    Object.keys(this.form.controls).forEach((field) => {
      const control = this.form.get(field);
      if (control) {
        console.log(`Field: ${field}, Status: ${control.status}, Errors: ${JSON.stringify(control.errors)}`);
      }
    });
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

  isQueryFieldInvalid(index: number, fieldName: string): boolean {
    const queries = this.form.get('queries') as FormArray;
    const field = queries.at(index).get(fieldName);
    return field ? field.invalid && (field.touched || this.submitted) : false;
  }

  getItemErrorMessage(index: number, fieldName: string): string {
    const items = this.form.get('items') as FormArray;
    const field = items.at(index).get(fieldName);
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
  getQueryErrorMessage(index: number, fieldName: string): string {
    const queries = this.form.get('queries') as FormArray;
    const field = queries.at(index).get(fieldName);
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

  getQueryItemErrorMessage(fieldName: string): string {
    const field = this.lineQueryForm.get(fieldName);

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

  // Items Table Methods
  get itemsData(): any[] {
    return (this.form.get('items') as FormArray).controls.map((control) => control.value);
  }

  get queriesData(): any[] {
    return (this.form.get('queries') as FormArray).controls.map((control) => control.value);
  }

  private createItemFormGroup(item: any) {
    return this.fb.group({
      field_name: [item.field_name, Validators.required],
      display_name: [item.display_name, Validators.required],
      order_no: [item.order_no, [Validators.required, Validators.min(0)]],
      field_table: [item.field_table, Validators.required],
      default_value: [item.default_value],
      column_name: [item.column_name, Validators.required],

      is_individual: [item.is_individual],
      individual_column: [item.individual_column],

      field_type_id: [item.field_type_id, Validators.required],
    });
  }

  private createQueryFormGroup(query: any) {
    return this.fb.group({
      query_string: [query.query_string, Validators.required],
      order_no: [query.order_no, [Validators.required, Validators.min(0)]],
      query_name: [query.query_name, Validators.required],
      query_procedure: [query.query_procedure],
    });
  }

  onItemsDataChange(data: any[]) {
    const items = this.form.get('items') as FormArray;
    items.clear();

    // If data is empty or undefined, use original data
    const itemsToUse = !data || data.length === 0 ? this._originalItems : data;

    itemsToUse.forEach((item) => {
      items.push(this.createItemFormGroup(item));
    });
  }

  onQueriesDataChange(data: any[]) {
    const queries = this.form.get('queries') as FormArray;
    queries.clear();

    // If data is empty or undefined, use original data
    const queriesToUse = !data || data.length === 0 ? this._originalQueries : data;

    queriesToUse.forEach((query) => {
      queries.push(this.createQueryFormGroup(query));
    });
  }

  onItemsSortChange(sort: { column: string; direction: 'asc' | 'desc' }) {
    const items = [...this.itemsData];
    items.sort((a, b) => {
      const aVal = a[sort.column];
      const bVal = b[sort.column];
      return sort.direction === 'asc' ? (aVal > bVal ? 1 : -1) : aVal < bVal ? 1 : -1;
    });
    this.onItemsDataChange(items);
  }

  onQueriesSortChange(sort: { column: string; direction: 'asc' | 'desc' }) {
    const queries = [...this.queriesData];
    queries.sort((a, b) => {
      const aVal = a[sort.column];
      const bVal = b[sort.column];
      return sort.direction === 'asc' ? (aVal > bVal ? 1 : -1) : aVal < bVal ? 1 : -1;
    });
    this.onQueriesDataChange(queries);
  }
}
