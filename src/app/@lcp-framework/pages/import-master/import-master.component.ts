import { Component, OnInit } from '@angular/core';
import { CommonSharedModule } from '../../shared/common/common.module';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { ApiResponce, GridApiService } from '../../service/common/grid.service';
import { ToastrService } from 'ngx-toastr';
import { ImportConfirmDeactivate } from '../../guards/impotrt-confirm-deactivate.guard';

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
  imports: [CommonSharedModule, ReactiveFormsModule],
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
    });
  }

  ngOnInit() {
    this.resetComponent();
  }

  resetComponent() {
    this.importForm.reset({
      import_template: '',
      import_template_file: '',
    });
    this.fieldsForm = this.fb.group({});
    this.section = 'section1';
    this.importTemplates = [];
    this.selectedTemplate = null;
    this.file = null;
    this.fileHeaders = [];
    this.fileUploadLog = null;
    this.getImportTemplates();
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
          const key = response.message;
          const errorMessage = this.translate.instant(key);
          this.toastr.error(`Code: ${response.code} , ${errorMessage}`);
        }
      },
      (error: any) => {
        this.importTemplates = [];
        const key = 'error';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
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
    if (this.importForm.invalid) {
      let key: any;
      if (this.importForm.controls['import_template'].hasError('required')) {
        key = 'please_select_import_template_before_continuing';
      } else if (this.importForm.controls['import_template_file'].hasError('required')) {
        key = 'please_select_a_import_template_file_before_continuing';
      }
      const errorMessage = this.translate.instant(key);
      this.toastr.error(errorMessage, 'Error');
      return;
    }
    if (this.file) {
      const formData = new FormData();
      formData.append('excel_file', this.file);
      formData.append('uuid', this.importForm.get('import_template')?.value);

      this.gridApiService.getImportTemplateDetail(formData).subscribe(
        (response: ApiResponce) => {
          if (response.status) {
            this.selectedTemplate = response.data.selectedTemplate;
            if (this.selectedTemplate) this.createFieldsForm(this.selectedTemplate.importable_fields);
            this.fileHeaders = response.data.fileHeaders;
            this.fileUploadLog = response.data.fileUploadLog;
            this.section = 'section2';
          } else {
            const key = response.message;
            const errorMessage = this.translate.instant(key);
            this.toastr.error(errorMessage, 'Error');
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

  createFieldsForm(fieldOptions: ImportableField[]): void {
    const group: { [key: string]: any } = {};
    fieldOptions.forEach((fieldOption) => {
      if (fieldOption.default_value || fieldOption.is_nullable) {
        group[`${fieldOption.field_table}.${fieldOption.field_name}`] = [''];
      } else {
        group[`${fieldOption.field_table}.${fieldOption.field_name}`] = ['', Validators.required];
      }
    });
    this.fieldsForm = this.fb.group(group);
  }

  getValidationData() {
    if (this.fieldsForm.invalid) {
      const key = 'please_select_all_the_required_fields';
      const errorMessage = this.translate.instant(key);
      this.toastr.error(errorMessage, 'Error');
      return;
    }
    if (!this.selectedTemplate || !this.fileUploadLog) {
      const key = 'session_expired_please_try_again';
      const errorMessage = this.translate.instant(key);
      this.toastr.error(errorMessage, 'Error');
      this.resetComponent();
      return;
    }
    this.gridApiService.getImportTemplateData(this.fieldsForm.value, this.selectedTemplate?.uuid, this.fileUploadLog?.uuid).subscribe(
      (response: ApiResponce) => {
        console.log('response', response);
        if (response.status) {
          this.section = 'section3';
          this.sheet_data = response.data; //{ header_details, row_datas }
        } else {
          const key = response.message;
          const errorMessage = this.translate.instant(key);
          this.toastr.error(errorMessage, 'Error');
        }
      },
      (error: any) => {
        const key = 'error';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
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
    if (this.fileUploadLog && this.fileUploadLog.uuid) {
      this.gridApiService.deleteFileByUuid(this.fileUploadLog?.uuid).subscribe(
        (response: ApiResponce) => {
          console.log('Component destroyed');
        },
        (error: any) => {
          const key = 'error';
          const errorMessage = this.translate.instant(key);
          this.toastr.error(errorMessage, 'Error');
        }
      );
    }
  }

  getMessages(rowData: RowData, key: string): string {
    const errorMessages = rowData.errors[key]?.map((err) => err.message) || [];
    const warningMessages = rowData.warnings[key]?.map((warn) => warn.message) || [];
    return [...errorMessages, ...warningMessages].join('\n');
  }
}
