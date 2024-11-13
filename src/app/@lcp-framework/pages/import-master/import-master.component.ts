import { Component, OnInit } from '@angular/core';
import { CommonSharedModule } from '../../shared/common/common.module';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { ApiResponce, GridApiService } from '../../service/common/grid.service';
import { ToastrService } from 'ngx-toastr';
import { ImportConfirmDeactivate } from '../../guards/impotrt-confirm-deactivate.guard';
import { ClientDatatableComponent } from '../../components/client-datatable/client-datatable.component';

interface HeaderDetails {
  id: number;
  is_date: boolean;
  is_enum: boolean;
  order_no: number;
  is_unique: boolean;
  field_name: string;
  field_type: string;
  is_foreign: boolean;
  enum_values: string | null;
  field_table: string;
  is_multiple: boolean;
  is_nullable: boolean;
  display_name: string;
  check_reg_exp: string | null;
  default_value: string | null;
  field_type_id: number;
  foreign_table: string | null;
  foreign_column: string | null;
  foreign_can_create: boolean;
}

interface RowData {
  columns: { [key: string]: string | null };
  error: boolean;
  warning: boolean;
  errors: { [key: string]: { message: string; type: string }[] };
  warnings: { [key: string]: { message: string; type: string }[] };
}

interface SheetData {
  header_details: { [key: string]: HeaderDetails };
  row_datas: RowData[];
  individual_header_details: { [key: string]: HeaderDetails };
  ind_row_datas: RowData;
}

interface EntityList {
  id: number;
  name: string;
  slug: string;
  uuid: string;
}

interface ImportableField {
  id: number;
  is_enum: boolean;
  order_no: number;
  is_unique: boolean;
  field_name: string;
  is_foreign: boolean;
  enum_values: any;
  is_nullable: boolean;
  display_name: string;
  default_value: any;
  field_type_id: number;
  field_table: string;
  foreign_can_create: boolean;
  is_individual: boolean;
  individual_column: string;
}

interface Entity {
  id: number;
  name: string;
  slug: string;
  uuid: string;
  description: string;
  primary_table: string;
  importable_fields: ImportableField[];
}

interface EntityListDataResponce extends ApiResponce {
  data?: {
    records: EntityList[];
    total_records: number;
  };
}

@Component({
  selector: 'app-import-master',
  standalone: true,
  imports: [CommonSharedModule, ReactiveFormsModule, ClientDatatableComponent],
  templateUrl: './import-master.component.html',
  styleUrls: ['./import-master.component.scss'],
})
export class ImportMasterComponent implements OnInit, ImportConfirmDeactivate {
  importForm: FormGroup;
  fieldsForm: FormGroup = this.fb.group({});
  section: string = 'section1';
  importTemplates: EntityList[] = [];
  selectedTemplate: Entity | null = null;
  file: File | null = null;
  fileHeaders: string[] = [];
  fileUploadLog: { uuid: string; id: number } | null = null;
  sheet_data: SheetData | null = null;
  individual_fields: { [key: string]: ImportableField } = {};
  submitted: boolean = false;

  tableConfig: any = {
    pageSizes: [5, 10, 25, 50],
    defaultPageSize: 5,
    searchable: true,
  };

  constructor(
    public translate: TranslateService,
    private toastr: ToastrService,
    private gridApiService: GridApiService,
    public router: Router,
    private fb: FormBuilder
  ) {
    this.importForm = this.fb.group({
      import_template: ['', Validators.required],
      import_template_file: ['', Validators.required],
      data_header_row: [1, [Validators.required, Validators.min(1)]], // Minimum value 1
      data_start_row: [0, [Validators.min(0)]], // Minimum value 0
      data_end_row: [0, [Validators.min(0)]], // Minimum value 0
      max_data_row: [{ value: 500, disabled: true }],
      individual_fields: this.fb.group({}),
    });
  }

  ngOnInit() {
    this.resetComponent();
    this.getImportTemplates();
  }

  resetComponent(uuid: string = '') {
    this.deleteUploadedSheet();
    this.importForm.reset({
      import_template: uuid,
      import_template_file: '',
      data_header_row: 1,
      data_start_row: 0,
      data_end_row: 0,
      max_data_row: 500,
      individual_fields: this.fb.group({}),
    });
    this.fieldsForm = this.fb.group({});
    this.section = 'section1';
    // this.importTemplates = [];
    this.individual_fields = {};
    this.selectedTemplate = null;
    this.file = null;
    this.fileHeaders = [];
    this.fileUploadLog = null;
    this.sheet_data = null;
  }

  getImportTemplates() {
    const impTemParam: any = {
      primary_table: 'import_templates',
      sort_columns: [['import_templates.name', 'asc']],
      limit_range: 1000,
      select_columns: [['import_templates.id'], ['import_templates.name'], ['import_templates.slug'], ['import_templates.uuid']],
      company_id: 1,
      search_all: [{ column_name: 'import_templates.status_id', operator: '=', value: '1' }],
    };
    this.gridApiService.getListData(impTemParam).subscribe(
      (response: EntityListDataResponce) => {
        if (response.status && response.data?.records.length) {
          this.importTemplates = response.data.records;
        } else if (!response.status) {
          this.importTemplates = [];
          this.toastr.error(`Code: ${response.code} , ${response.message}`);
        }
      },
      (error: any) => {
        this.importTemplates = [];
        this.toastr.error('Error getting ImportTemplateDetail');
      }
    );
  }

  onFileChange(event: any) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) {
      return;
    }
    this.file = input.files[0];
    this.importForm.patchValue({ import_template_file: this.file });
  }

  getTemplateDetail() {
    this.submitted = true;
    // console.log('val', this.importForm.value);
    if (this.importForm.invalid) {
      if (this.importForm.controls['import_template'].hasError('required')) {
        this.toastr.error('please_select_import_template_before_continuing');
      } else if (this.importForm.controls['import_template_file'].hasError('required')) {
        this.toastr.error('please_select_a_import_template_file_before_continuing');
      }
      return;
    }
    if (this.file) {
      const formData = new FormData();
      formData.append('excel_file', this.file);
      formData.append('uuid', this.importForm.get('import_template')?.value);
      formData.append('data_header_row', this.importForm.get('data_header_row')?.value);
      formData.append('data_start_row', this.importForm.get('data_start_row')?.value);
      formData.append('data_end_row', this.importForm.get('data_end_row')?.value);
      formData.append('max_data_row', this.importForm.get('max_data_row')?.value);
      this.gridApiService.getImportTemplateDetail(formData).subscribe(
        (response: ApiResponce) => {
          if (response.status) {
            this.deleteUploadedSheet();
            this.selectedTemplate = response.data.selectedTemplate;
            if (this.selectedTemplate) this.createFieldsForm(this.selectedTemplate.importable_fields);
            this.fileHeaders = response.data.fileHeaders;
            this.fileUploadLog = response.data.fileUploadLog;
            this.section = 'section2';
          } else {
            this.toastr.error(response.message);
          }
        },
        (error: any) => {
          this.toastr.error('Error getting import template detail');
        }
      );
    }
  }

  createFieldsForm(fieldOptions: ImportableField[]): void {
    const group: { [key: string]: any } = {};

    // Initialize the main form controls based on `fieldOptions`
    fieldOptions.forEach((fieldOption) => {
      const controlName = `${fieldOption.field_table}-${fieldOption.field_name}`;
      group[controlName] = fieldOption.default_value || fieldOption.is_nullable ? [''] : ['', Validators.required];
    });

    // Initialize `individual_fields` as a nested FormGroup if `importForm` has individual fields
    const importIndividualFields = this.importForm.get('individual_fields') as FormGroup;
    if (importIndividualFields && Object.keys(importIndividualFields.controls).length > 0) {
      const individualFieldsGroup: { [key: string]: FormControl } = {};

      // Copy each control from `importForm.individual_fields` to `fieldsForm.individual_fields`
      Object.keys(importIndividualFields.controls).forEach((controlName) => {
        const control = importIndividualFields.get(controlName) as FormControl;
        individualFieldsGroup[controlName] = new FormControl(control.value, control.validator);
      });

      // Add `individual_fields` as a nested FormGroup to `fieldsForm`
      group[`individual_fields`] = this.fb.group(individualFieldsGroup);
    }

    // Set `fieldsForm` with the created controls
    this.fieldsForm = this.fb.group(group);
  }

  getValidationData() {
    // console.log('this.fieldsForm', this.fieldsForm);
    if (this.fieldsForm.invalid) {
      this.toastr.error('please_select_all_the_required_fields');
      return;
    }
    if (!this.selectedTemplate || !this.fileUploadLog) {
      this.toastr.error('session_expired_please_try_again');
      this.resetComponent();
      return;
    }
    const bodyParams = {
      ...this.fieldsForm.value,
      data_header_row: this.importForm.get('data_header_row')?.value,
      data_start_row: this.importForm.get('data_start_row')?.value,
      data_end_row: this.importForm.get('data_end_row')?.value,
      max_data_row: this.importForm.get('max_data_row')?.value,
    };
    this.gridApiService.getImportTemplateData(bodyParams, this.selectedTemplate?.uuid, this.fileUploadLog?.uuid).subscribe(
      (response: ApiResponce) => {
        // console.log('response', response);
        if (response.status) {
          this.section = 'section3';
          this.sheet_data = response.data; //{ header_details, row_datas }
        } else {
          this.toastr.error(response.message);
        }
      },
      (error: any) => {
        this.toastr.error('Error getting import template data');
      }
    );
  }

  canDeactivate(): boolean {
    // Show confirmation dialog
    if (this.fileUploadLog && this.fileUploadLog.uuid) return confirm('Are you sure you want to leave this page befor importing?');
    else return true;
  }

  // Component cleanup logic in ngOnDestroy
  ngOnDestroy() {
    this.deleteUploadedSheet();
  }

  deleteUploadedSheet() {
    if (this.fileUploadLog && this.fileUploadLog.uuid) {
      this.gridApiService.deleteFileByUuid(this.fileUploadLog?.uuid).subscribe(
        (response: ApiResponce) => {
          // console.log('Component destroyed');
        },
        (error: any) => {
          const key = 'error';
          const errorMessage = this.translate.instant(key);
          this.toastr.error(errorMessage, 'Error');
        }
      );
    }
  }

  getSheetDatas(): any {
    return this.sheet_data?.row_datas.map((row: any) => {
      return { ...row.columns, errors: row.errors, warnings: row.warnings };
    });
  }

  getSheetHeader() {
    const headers: any = this.sheet_data?.header_details;
    const columns: any = Object.entries(headers)
      .sort(([, a]: [any, any], [, b]: [any, any]) => a.order_no - b.order_no) // Sort by `order_no`
      .map(([key, header]: [any, any]) => ({
        key: key, // headers key
        label: header.display_name, // headers.display_name
        sortable: true, // assuming all columns are sortable; adjust if needed
      }));
    return { ...this.tableConfig, columns };
  }

  importTemplateDetail() {
    const sheet_data: any = this.sheet_data;
    const isInValid = sheet_data.row_datas?.some((row: any) => row.error === true);
    const isInValidInd = sheet_data.ind_row_datas?.error;
    if (!sheet_data?.row_datas?.length || isInValid || isInValidInd) {
      this.toastr.error('Invalid sheet data please fix the errors befor continue.');
    } else {
      this.gridApiService
        .importTemplateDetail(this.selectedTemplate?.uuid, this.fileUploadLog?.uuid, {
          row_datas: sheet_data.row_datas,
          ind_row_datas: sheet_data.ind_row_datas,
        })
        .subscribe(
          (response: ApiResponce) => {
            // console.log(response);
            if (response.status) {
              this.resetComponent();
              this.updateIndividualFields([]);
              this.getImportTemplates();
              this.submitted = false;
              this.toastr.success(response.message);
            } else {
              this.toastr.error(response.message);
            }
          },
          (error: any) => {
            const key = 'error';
            const errorMessage = this.translate.instant(key);
            this.toastr.error(errorMessage, 'Error');
          }
        );
    }
  }

  getIndividualHeader(headers: any[]) {
    // Sort the array by `order_no` in ascending order
    const sortedData = headers.sort(([, a]: [any, any], [, b]: [any, any]) => a.order_no - b.order_no);
    // Convert to an object with keys in the "field_table-field_name" format
    const result: any = {};
    sortedData.forEach((item: any) => {
      const key = `${item.field_table}-${item.field_name}`;
      result[key] = item;
    });

    return result;
  }

  getIndividualFields() {
    const uuid = this.importForm.get('import_template')?.value;
    if (uuid) {
      this.gridApiService.getIndividualImportFields(uuid).subscribe(
        (response: ApiResponce) => {
          if (response.status && response.data.records.length) {
            this.resetComponent(uuid);
            if (response.data.records[0].importable_fields) {
              // console.log(111, response.data.records[0].importable_fields);
              this.individual_fields = this.getIndividualHeader(response.data.records[0].importable_fields);
              this.updateIndividualFields(response.data.records[0].importable_fields);
            } else {
              this.updateIndividualFields([]);
            }
            this.importForm.patchValue({
              data_header_row: response.data.records[0].header_row,
              data_start_row: response.data.records[0].data_start_row,
              data_end_row: response.data.records[0].data_end_row,
              max_data_row: response.data.records[0].max_row_count,
            });
          } else {
            this.resetComponent(uuid);
            this.updateIndividualFields([]);
          }
        },
        (error: any) => {
          const key = 'error';
          const errorMessage = this.translate.instant(key);
          this.toastr.error(errorMessage, 'Error');
        }
      );
    } else {
      this.updateIndividualFields([]);
    }
  }

  updateIndividualFields(fields: any[]) {
    const individualFields = this.importForm.get('individual_fields') as FormGroup;

    // Clear existing controls
    Object.keys(individualFields.controls).forEach((controlName) => {
      individualFields.removeControl(controlName);
    });

    fields.forEach((field) => {
      const controlName = `${field.field_table}-${field.field_name}`;
      const validators: any = []; //this.getValidators(field);

      individualFields.addControl(controlName, new FormControl(field.individual_column || '', validators));
    });
  }

  getValidators(field: any) {
    const validators = [];
    if (!field.is_nullable && !field.default_value) {
      validators.push(Validators.required);
    }
    return validators;
  }

  // Helper to access individual_fields FormArray controls
  // get individualFieldsControls() {
  //   return (this.importForm.get('individual_fields') as FormArray).controls;
  // }

  get individualFieldsControlNames() {
    return Object.keys((this.importForm.get('individual_fields') as FormGroup).controls);
  }

  getIndividualFieldKeys() {
    return this.sheet_data ? Object.keys(this.sheet_data.ind_row_datas.columns) : [];
  }
}
