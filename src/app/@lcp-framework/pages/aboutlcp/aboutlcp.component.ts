import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { GridApiService } from '../../service/common/grid.service';
import { Location } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { environment } from '../../../../environments/environment';
import { LocalStorageService } from '../../service/common/local-storage.service';

@Component({
  selector: 'app-aboutlcp',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './aboutlcp.component.html',
  styleUrls: ['./aboutlcp.component.scss'],
})
export class AboutlcpComponent implements OnInit {
  userId: any;
  companyId: number | null = null;
  form!: FormGroup;
  apiUrl = environment.apiUrl;
  fileNamePdf: string = '';
  fileNameWord: string = '';
  pdfFilePath: string = '';
  wordFilePath: string = '';
  isEditMode: boolean = false;
  aboutLcpId: string | null = null;

  update_json_schema: any = {
    print_query: true,
    action: ['update'],
    table: ['about_lcp'],
    table_mapping: ['table1'],
    data: {
      table1: [],
    },
    conditions: {
      table1: [],
    },
  };

  insert_json_schema: any = {
    print_query: true,
    action: ['insert'],
    table: ['about_lcp'],
    table_mapping: ['table1'],
    data: {
      table1: [],
    },
    conditions: {},
  };

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private gridApiService: GridApiService,
    private router: Router,
    private location: Location,
    private route: ActivatedRoute,
    private translate: TranslateService,
    public localStorageService: LocalStorageService
  ) {}

  ngOnInit(): void {
    this.initForm();
    const userData = this.localStorageService.getData('user_data');
    if (userData) {
      const parsedData = JSON.parse(userData);
      this.userId = parsedData.main?.id;
      this.companyId = parsedData.main?.company_id;
    }
    // Check if we are in Edit mode by checking the URL params
    this.route.paramMap.subscribe((params) => {
      this.aboutLcpId = params.get('id');
      if (this.aboutLcpId) {
        this.isEditMode = true;
        this.loadExistingData(this.aboutLcpId);
      } else {
        this.isEditMode = false;
      }
    });
  }

  initForm() {
    this.form = this.fb.group({
      type: ['', [Validators.required]],
      name: ['', [Validators.required]],
      description: [''],
      documentation_video_url: [''],
      documentation_pdf: [null],
      documentation_word: [null],
    });
  }

  onFileChange(event: Event, type: 'pdf' | 'word') {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const validPdfTypes = ['application/pdf'];
      const validWordTypes = [
        'application/msword', // .doc
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      ];

      // Validate file type
      if ((type === 'pdf' && !validPdfTypes.includes(file.type)) || (type === 'word' && !validWordTypes.includes(file.type))) {
        this.toastr.warning(this.translate.instant('invalid_file_type'), 'Warning');
        input.value = ''; // Reset file input
        return;
      }

      // Proceed with upload if file type is valid
      this.gridApiService.uploadConfigPicture(file).subscribe({
        next: (response: any) => {
          if (response?.body?.status) {
            const filePath = response.body.data;

            if (type === 'pdf') {
              this.form.patchValue({ documentation_pdf: filePath });
              this.fileNamePdf = file.name;
              this.pdfFilePath = filePath;
            } else {
              this.form.patchValue({ documentation_word: filePath });
              this.fileNameWord = file.name;
              this.wordFilePath = filePath;
            }
          }
        },
        error: () => {
          this.toastr.error(this.translate.instant('file_upload_failed'), 'Error');
        },
      });
    }
  }

  clearFile(type: 'pdf' | 'word') {
    if (type === 'pdf') {
      this.fileNamePdf = '';
      this.pdfFilePath = '';
      this.form.patchValue({ documentation_pdf: null });
    } else {
      this.fileNameWord = '';
      this.wordFilePath = '';
      this.form.patchValue({ documentation_word: null });
    }
  }

  onSubmit() {
    if (this.form.invalid) {
      this.toastr.error(this.translate.instant('required_message'), 'Error');
      return;
    }

    // Prepare the data for the insert or update operation based on mode
    if (this.isEditMode && this.aboutLcpId) {
      // Update scenario
      this.update_json_schema.data['table1'] = [
        {
          uuid: this.aboutLcpId, // Using the id for updating the record
          type: this.form.value.type,
          name: this.form.value.name,
          description: this.form.value.description || '',
          documentation_video_url: this.form.value.documentation_video_url || '',
          documentation_pdf: this.form.value.documentation_pdf || '',
          documentation_word: this.form.value.documentation_word || '',
        },
      ];
      this.update_json_schema.conditions['table1'] = [{ uuid: this.aboutLcpId }];

      this.gridApiService.executeRecords(this.update_json_schema).subscribe(
        (response: any) => {
          if (response.status && response.code === 200) {
            this.toastr.success(this.translate.instant('record_updated_successfully'));
            this.router.navigate(['/about-lcp']);
          } else {
            this.toastr.error(this.translate.instant('record_failed_updated'), 'Error');
          }
        },
        (error: any) => {
          this.toastr.error(this.translate.instant('record_failed_updated'), 'Error');
        }
      );
    } else {
      // Insert scenario
      this.insert_json_schema.data['table1'] = [
        {
          type: this.form.value.type,
          name: this.form.value.name,
          description: this.form.value.description || '',
          documentation_video_url: this.form.value.documentation_video_url || '',
          documentation_pdf: this.form.value.documentation_pdf || '',
          documentation_word: this.form.value.documentation_word || '',
        },
      ];

      this.gridApiService.executeRecords(this.insert_json_schema).subscribe(
        (response: any) => {
          if (response.status && response.code === 200) {
            this.toastr.success(this.translate.instant('record_inserted_successfully'));
            this.router.navigate(['/about-lcp']);
          } else {
            this.toastr.error(response.message, 'Error');
          }
        },
        (error: any) => {
          this.toastr.error(this.translate.instant('record_failed_inserted'), 'Error');
        }
      );
    }
  }

  loadExistingData(id: any) {
    if (!this.companyId) {
      console.error('Company ID is not available');
      return;
    }

    const payload = {
      company_id: this.companyId,
      print_query: true,
      primary_table: 'about_lcp',
      start_index: 0,
      limit_range: 1,
      sort_columns: [['about_lcp.id', 'asc']],
      search_all: [
        {
          column_name: 'about_lcp.uuid',
          value: id,
          operator: '=',
        },
      ],
      select_columns: [['about_lcp.*']],

      group_by: ['about_lcp.id'],
    };

    this.gridApiService.getAllList(payload).subscribe({
      next: (response: any) => {
        console.log(response);
        if (response.code === 200 && response.status) {
          const data = response.data.records[0];
          this.form.patchValue({
            type: data.type,
            name: data.name,
            description: data.description,
            documentation_video_url: data.documentation_video_url,
            documentation_pdf: data.documentation_pdf,
            documentation_word: data.documentation_word,
          });

          this.fileNamePdf = data.documentation_pdf;
          this.fileNameWord = data.documentation_word;
        }
      },
      error: (error) => {
        const key = 'error';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
        console.error('Error fetching entity types:', error);
      },
    });
  }

  goBack() {
    this.location.back();
  }
}
