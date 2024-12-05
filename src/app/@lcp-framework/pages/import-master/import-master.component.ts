import { Component, OnInit } from '@angular/core';
import { CommonSharedModule } from '../../shared/common/common.module';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { ApiResponce, GridApiService } from '../../service/common/grid.service';
import { ToastrService } from 'ngx-toastr';
import { ImportConfirmDeactivate } from '../../guards/impotrt-confirm-deactivate.guard';
import { ClientDatatableComponent } from '../../components/client-datatable/client-datatable.component';
import Swal from 'sweetalert2';
import { LocalStorageService } from '../../service/common/local-storage.service';
import { WebSocketSubject } from 'rxjs/webSocket';
import { environment } from '../../../../environments/environment';

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
  error_msg?: string;
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
  ignore_error_rows?: boolean;
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
  isLoading: boolean = false;

  private socket$!: WebSocketSubject<any>;
  public progress = 100;
  userData!: any;

  tableConfig: any = {
    pageSizes: [5, 10, 25, 50],
    defaultPageSize: 10,
    searchable: true,
  };

  constructor(
    public translate: TranslateService,
    private toastr: ToastrService,
    private gridApiService: GridApiService,
    public router: Router,
    private localstore: LocalStorageService,
    private fb: FormBuilder
  ) {
    this.userData = JSON.parse(this.localstore.getData('user_data'));
    this.importForm = this.fb.group({
      import_template: ['', Validators.required],
      import_template_file: ['', Validators.required],
      data_header_row: [1, [Validators.required, Validators.min(1)]], // Minimum value 1
      data_start_row: [0, [Validators.min(0)]], // Minimum value 0
      data_end_row: [0, [Validators.min(0)]], // Minimum value 0
      max_data_row: [{ value: 500, disabled: true }],
      // individual_fields: this.fb.group({}),
    });
  }

  ngOnInit() {
    this.resetComponent();
    this.getImportTemplates();
    if (this.userData?.main?.user_id) {
      const socketUrl = 'wss://opensource.techcedence.net:8090'; //(environment as any).WS_URL ? (environment as any).WS_URL : 'ws://localhost:8090';
      this.socket$ = new WebSocketSubject(`${socketUrl}?userId=${this.userData.main.user_id}`);
      this.socket$.subscribe((data: any) => {
        this.progress = data.progress;
      });
    }
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
      // individual_fields: this.fb.group({}),
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
    let search_all = [{ column_name: 'import_templates.status_id', operator: '=', value: '1' }];
    if (this.userData || this.userData?.main?.role !== 'super_admin') {
      search_all.push({ column_name: 'import_templates.is_admin_module', operator: '=', value: 'false' });
    }
    const impTemParam: any = {
      primary_table: 'import_templates',
      sort_columns: [['import_templates.name', 'asc']],
      limit_range: 1000,
      select_columns: [['import_templates.id'], ['import_templates.name'], ['import_templates.slug'], ['import_templates.uuid']],
      company_id: 1,
      search_all: search_all,
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
      this.isLoading = true;
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
            this.fileHeaders = response.data.fileHeaders;
            if (this.selectedTemplate) this.createFieldsForm(this.selectedTemplate.importable_fields);
            this.fileUploadLog = response.data.fileUploadLog;
            this.section = 'section2';
            this.isLoading = false;
          } else {
            this.toastr.error(response.message);
            this.isLoading = false;
          }
        },
        (error: any) => {
          this.toastr.error('Error getting import template detail');
          this.isLoading = false;
        }
      );
    }
  }

  getValidators(field: any) {
    const validators = [Validators.pattern('^[A-Z]{1,2}(?:[1-9][0-9]{0,4}|100000)$')];
    if (!field.is_nullable && !field.default_value) {
      validators.push(Validators.required);
    }
    return validators;
  }

  createFieldsForm(fieldOptions: ImportableField[]): void {
    const group: { [key: string]: any } = {};

    // Initialize the main form controls based on `fieldOptions`
    fieldOptions.forEach((fieldOption) => {
      const defaultValue = this.fileHeaders.includes(fieldOption.display_name) ? fieldOption.display_name : '';
      const controlName = `${fieldOption.field_table}-${fieldOption.field_name}`;
      group[controlName] = fieldOption.default_value || fieldOption.is_nullable ? [defaultValue] : [defaultValue, Validators.required];
    });

    // Initialize `individual_fields` as a nested FormGroup if `importForm` has individual fields
    if (this.individual_fields && Object.keys(this.individual_fields).length > 0) {
      const individualFieldsGroup: { [key: string]: FormControl } = {};

      // Copy each control from `importForm.individual_fields` to `fieldsForm.individual_fields`
      Object.keys(this.individual_fields).forEach((controlName) => {
        const field: any = this.individual_fields[controlName];
        individualFieldsGroup[controlName] = new FormControl(field.individual_column || '', this.getValidators(field));
      });

      // Add `individual_fields` as a nested FormGroup to `fieldsForm`
      group[`individual_fields`] = this.fb.group(individualFieldsGroup);
    }

    // Set `fieldsForm` with the created controls
    this.fieldsForm = this.fb.group(group);
  }

  getValidationData() {
    if (this.fieldsForm.invalid) {
      this.toastr.error('Please make sure all the fields are valid.');
      return;
    }

    const bodyParams = {
      ...this.fieldsForm.value,
      data_header_row: this.importForm.get('data_header_row')?.value,
      data_start_row: this.importForm.get('data_start_row')?.value,
      data_end_row: this.importForm.get('data_end_row')?.value,
      max_data_row: this.importForm.get('max_data_row')?.value,
    };
    const emptyFields = Object.entries(this.fieldsForm.value).filter(([key, value]) => value === '');
    if (emptyFields.length > 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Are you sure?',
        text: `There are ${emptyFields.length} unmapped fieldes. Are you sure you want to continue?`,
        showCancelButton: true,
        confirmButtonText: 'Confirm',
        padding: '2em',
      }).then(async (result) => {
        if (result.value) {
          this.getImportTemplateData(bodyParams);
        }
      });
    } else {
      this.getImportTemplateData(bodyParams);
    }
  }

  getImportTemplateData(bodyParams: any) {
    if (!this.selectedTemplate || !this.fileUploadLog) {
      this.toastr.error('session_expired_please_try_again');
      this.resetComponent();
      return;
    }
    this.isLoading = true;
    this.gridApiService.getImportTemplateData(bodyParams, this.selectedTemplate?.uuid, this.fileUploadLog?.uuid).subscribe(
      (response: ApiResponce) => {
        if (response.status) {
          this.section = 'section3';
          this.sheet_data = response.data; //{ header_details, row_datas }
          this.isLoading = false;
        } else {
          this.toastr.error(response.message);
          this.isLoading = false;
        }
      },
      (error: any) => {
        this.toastr.error('Error getting import template data');
        this.isLoading = false;
      }
    );
  }

  getErrorCount(rowDatas: any = []) {
    return rowDatas.filter((row: any) => row.error === true).length;
  }

  getWarningCount(rowDatas: any = []) {
    return rowDatas.filter((row: any) => row.warning === true && row.error === false).length;
  }

  getValidCount(rowDatas: any = []) {
    return rowDatas.filter((row: any) => row.error === false && row.warning === false).length;
  }

  canDeactivate(): boolean {
    // Show confirmation dialog
    if (this.fileUploadLog && this.fileUploadLog.uuid) return confirm('Are you sure you want to leave this page befor importing?');
    else return true;
  }

  // Component cleanup logic in ngOnDestroy
  ngOnDestroy() {
    this.deleteUploadedSheet();
    this.socket$.complete();
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
      // Extract error messages and combine them into a single string
      const errorMessages = Object.values(row.errors)
        .flat()
        .map((error: any) => error.message)
        .join(', ');
      const warnMessages = Object.values(row.warnings)
        .flat()
        .map((warning: any) => warning.message)
        .join(', ');

      // Determine the error status
      const status = row.warning
        ? '<span class="badge text-xs badge-outline-warning">warning</span>'
        : '<span class="badge text-xs badge-outline-success">valid</span>';
      const errorstatus = row.error ? `<span class="badge text-xs badge-outline-danger">invalid</span>` : status;
      return {
        ...row.columns,
        errors: row.errors,
        warnings: row.warnings,
        errorstatus, // Add error status
        errorMessages: row.error ? errorMessages : warnMessages, // Add combined error messages
      };
    });
  }

  getSheetHeader() {
    const headers: any = this.sheet_data?.header_details;
    const columns: any = Object.entries(headers)
      .sort(([, a]: [any, any], [, b]: [any, any]) => a.order_no - b.order_no) // Sort by `order_no`
      .map(([key, header]: [any, any]) => ({
        key: key, // headers key
        label: `${header.display_name}${header.is_nullable ? '' : ' <span class="text-danger">*</span>'}`,
        sortable: true, // assuming all columns are sortable; adjust if needed
        isHtmlHeader: true,
      }));
    // Add the two new columns at the beginning
    const additionalColumns = [
      { key: 'errorstatus', label: 'Status', sortable: true, isHtmlValue: true },
      { key: 'errorMessages', label: 'Messages', sortable: false, isHtmlValue: true },
    ];

    // Prepend additionalColumns to the existing columns
    const updatedColumns = [...additionalColumns, ...columns];

    return { ...this.tableConfig, columns: updatedColumns };
  }

  importTemplateDetail() {
    const sheet_data: any = this.sheet_data;
    const isInValid = sheet_data.row_datas?.some((row: any) => row.error === true);
    const isInValidInd = sheet_data.ind_row_datas?.error;
    if (!sheet_data?.row_datas?.length || isInValid || isInValidInd) {
      this.toastr.error('Invalid sheet data please fix the errors befor continue.');
    } else {
      if (sheet_data.error_msg) {
        Swal.fire({
          icon: 'warning',
          title: 'Are you sure?',
          text: sheet_data.error_msg,
          showCancelButton: true,
          confirmButtonText: 'Confirm',
          padding: '2em',
        }).then(async (result) => {
          if (result.value) {
            this.callImportApi(sheet_data);
          }
        });
      } else {
        this.callImportApi(sheet_data);
      }
    }
  }

  importValidRecords() {
    let sheet_data: any = this.sheet_data;
    const onlyValidRowDatas = sheet_data.row_datas?.filter((row: any) => row.error !== true);
    const isInValidInd = sheet_data.ind_row_datas?.error;
    if (isInValidInd) {
      this.toastr.error('Please fix the Individual fields errors befor continue.');
    } else if (!onlyValidRowDatas.length) {
      this.toastr.error('There are no valid rows available to import.');
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'Are you sure?',
        text: `${this.getErrorCount(this.sheet_data?.row_datas || [])} error rows will be ignored, and ${
          onlyValidRowDatas.length
        } rows will be imported out of a total of ${this.sheet_data?.row_datas?.length || 0} records.`,
        showCancelButton: true,
        confirmButtonText: 'Confirm',
        padding: '2em',
      }).then(async (result) => {
        if (result.value) {
          sheet_data = { ...sheet_data, row_datas: onlyValidRowDatas };
          this.callImportApi(sheet_data);
        }
      });
    }
  }

  callImportApi(sheet_data: SheetData) {
    this.isLoading = true;
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
            this.getImportTemplates();
            this.submitted = false;
            this.toastr.success(response.message);
            this.isLoading = false;
          } else {
            this.toastr.error(response.message);
            this.isLoading = false;
          }
        },
        (error: any) => {
          const key = 'error';
          const errorMessage = this.translate.instant(key);
          this.toastr.error(errorMessage, 'Error');
          this.isLoading = false;
        }
      );
  }

  getIndividualHeader(headers: any[]) {
    // Sort the array by `order_no` in ascending order
    // const sortedData = headers.sort(([, a]: [any, any], [, b]: [any, any]) => a.order_no - b.order_no);
    const sortedData = headers.sort((a: any, b: any) => a.order_no - b.order_no);
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
              this.individual_fields = this.getIndividualHeader(response.data.records[0].importable_fields);
            }
            this.importForm.patchValue({
              data_header_row: response.data.records[0].header_row,
              data_start_row: response.data.records[0].data_start_row,
              data_end_row: response.data.records[0].data_end_row,
              max_data_row: response.data.records[0].max_row_count,
            });
          } else {
            this.resetComponent(uuid);
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

  get individualFieldsControlNames() {
    return Object.keys((this.fieldsForm.get('individual_fields') as FormGroup)?.controls || {});
  }

  getIndividualFieldKeys() {
    return this.sheet_data ? Object.keys(this.sheet_data.ind_row_datas.columns) : [];
  }
}
