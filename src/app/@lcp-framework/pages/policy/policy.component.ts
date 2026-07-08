import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { initialState } from '../../../store/index.reducer';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { GridApiService } from '../../service/common/grid.service';
import { MenuMapService } from '../../service/common/menu-map.service';
import { LocalStorageService } from '../../service/common/local-storage.service';
import { Title } from '@angular/platform-browser';
import { Store } from '@ngrx/store';
import { FormlyConfigModule } from '../../formly/formly-config.module';
import { CommonSharedModule } from '../../shared/common/common.module';
import { LoaderComponent } from '../../components/loader/loader.component';
import { DatePipe, Location } from '@angular/common';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { EditorComponent } from 'ngx-monaco-editor-v2';
import { animate, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-policy',
  standalone: true,
  imports: [CommonSharedModule, MonacoEditorModule, ReactiveFormsModule, LoaderComponent, FormlyConfigModule],
  templateUrl: './policy.component.html',
  styleUrl: './policy.component.scss',
  providers: [DatePipe],
  animations: [
    trigger('toggleAnimation', [
      transition(':enter', [style({ opacity: 0, transform: 'scale(0.95)' }), animate('100ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))]),
      transition(':leave', [animate('75ms', style({ opacity: 0, transform: 'scale(0.95)' }))]),
    ]),
  ],
})
export class PolicyComponent implements OnInit {
  policyForm!: FormGroup;
  userData: any;
  store: any = initialState;
  loading = false;
  unique_id!: string | null;
  title: any = '';

  editorOptions = { theme: 'vs-dark', language: 'sql', tabSize: 1, insertSpaces: true };
  htmlEditorOptions = { ...this.editorOptions, language: 'html' };
  isDarkTheme = true; // Default theme
  @ViewChild('monacoEditor') monacoEditor: EditorComponent | undefined;

  isInfoModalOpen: boolean = false;
  infoContents: any = {
    queryInfo: {
      header: 'Sample Policy Information',
      comments: [],
      data: {
        sort_columns: [['user_information.user_id', 'desc']],
        search_all: [
          {
            column_name: 'user_information.deleted_at',
            value: null,
            operator: 'IS',
          },
        ],
        search_any: [
          {
            column_name: 'user_information.deleted_at',
            value: null,
            operator: 'IS',
          },
        ],
        includes: [],
        group_by: ['user_information.user_id', 'user_information.first_name', 'user_information.last_name'],
        having_conditions: [
          {
            column_name: 'user_information.deleted_at',
            value: null,
            operator: 'IS',
          },
        ],
        having_any_conditions: [
          {
            value: '%Mukesh%',
            operator: 'ILIKE',
            column_name: 'user_information.full_name',
          },
        ],
      },
    },
  };
  popupInformation: any = null;
  popupInfoEditorOptions = { ...this.editorOptions, language: 'sql', cursorStyle: 'line', readOnly: true, automaticLayout: true, minimap: { enabled: false } };
  copied = false;

  constructor(
    public fb: FormBuilder,
    public router: Router,
    private route: ActivatedRoute,
    private toastr: ToastrService,
    private gridApiService: GridApiService,
    public translate: TranslateService,
    private commonService: MenuMapService,
    private localStorageService: LocalStorageService,
    private titleService: Title,
    public storeData: Store<any>,
    public location: Location,
    public datePipe: DatePipe,
    public cdr: ChangeDetectorRef
  ) {
    this.route.paramMap.subscribe((params) => {
      this.unique_id = params.get('id') || params.get('uuid');
    });
    this.userData = JSON.parse(this.localStorageService.getData('user_data'))?.main || {};
    this.policyForm = this.fb.group({
      policy_id: [''],
      policy_name: ['', [Validators.required, Validators.maxLength(75)]],
      policy_description: ['', [Validators.required]],
      slug: [{ value: '', disabled: true }],
      query_information: [''],
      status_id: [1],
    });
    if (this.unique_id) {
      this.getPolicyData();
    }
  }

  ngOnInit() {
    this.initStore();
    this.resetComponent();

    const pageInfo = this.route.snapshot.data['pageInfo'] || '';
    if (pageInfo) {
      const translateTitle = this.translate.instant(pageInfo.fullEntity);
      this.titleService.setTitle(translateTitle);
      this.title = pageInfo.fullEntity;
    } else {
      this.title = 'Default Title';
    }
  }

  ngOnDestroy() {
    // Unsubscribe from all subscriptions
  }

  async initStore() {
    this.storeData
      .select((d) => d.index)
      .subscribe((d) => {
        queueMicrotask(() => {
          this.store = d;
          this.cdr.detectChanges();
        });
      });
  }

  resetComponent() {
    this.policyForm.patchValue({
      policy_id: '',
      policy_name: '',
      policy_description: '',
      slug: '',
      query_information: '',
      status_id: 1,
    });
  }

  prepareJSON(data: any): string {
    return JSON.stringify(JSON.parse(data));
  }

  prettyJSON(data: any) {
    return JSON.stringify(JSON.parse(JSON.stringify(data).replace(/@table(\w+)/g, '##table$1')), null, 2);
  }

  getPolicyData() {
    if (this.unique_id) {
      const payload = {
        group_by: ['policies.id'],
        includes: [],
        company_id: 1,
        search_all: [
          {
            value: this.unique_id,
            operator: '=',
            column_name: 'policies.uuid',
          },
          {
            value: '3',
            operator: '!=',
            column_name: 'policies.status_id',
          },
        ],
        limit_range: 1,
        print_query: true,
        start_index: 0,
        sort_columns: [['policies.id', 'asc']],
        primary_table: 'policies',
        select_columns: [
          ['policies.id', 'policy_id'],
          ['policies.name', 'policy_name'],
          ['policies.slug', 'slug'],
          ['policies.description', 'policy_description'],
          ['policies.status_id', 'status_id'],
          ['policies.query_information', 'query_information'],
        ],
      };
      this.loading = true;
      this.commonService.getCommonList(payload).subscribe({
        next: (response: any) => {
          if (response.code === 200 && response.status) {
            this.loading = false;
            if (response.data.records) {
              const data = response.data.records[0];
              this.policyForm.patchValue({
                policy_id: data.policy_id,
                policy_name: data.policy_name,
                policy_description: data.policy_description,
                query_information: data?.query_information ? this.prettyJSON(data.query_information) : '',
                slug: data.slug,
                status_id: data.status_id,
              });
            } else {
              const key = 'failed_to_fetch_the_policy_details';
              const errorMessage = this.translate.instant(key);
              this.toastr.error(errorMessage, 'Error');
            }
          } else {
            this.loading = false;
          }
        },
        error: (error) => {
          this.loading = false;
          console.error('Error fetching URL details:', error);
        },
      });
    } else {
      this.loading = false;
      const key = 'invalid_policy';
      const errorMessage = this.translate.instant(key);
      this.toastr.error(errorMessage, 'Error');
    }
  }

  generateSlug(data: any) {
    return this.localStorageService.generateSlugWithTimestamp(data.policy_name);
  }

  upsertPolicy() {
    const policyData = this.policyForm.getRawValue();

    const policyPayload = {
      name: policyData.policy_name?.trim(),
      description: policyData.policy_description?.length ? policyData.policy_description : null,
      slug: this.unique_id ? policyData.slug : this.generateSlug(policyData),
      query_information: policyData?.query_information ? this.prepareJSON(policyData.query_information) : null,
      status_id: Number(policyData.status_id) || 1,
      ...(!this.unique_id && {
        created_at: true,
        created_by: true,
      }),
      updated_by: true,
      updated_at: true,
    };

    const payload: any = {
      data: {
        table1: [policyPayload],
      },
      table: ['policies'],
      action: [...(this.unique_id ? ['update'] : ['insert'])],
      table_mapping: ['table1'],
      conditions: {
        ...(this.unique_id && {
          table1: [
            {
              uuid: this.unique_id,
              status_id: {
                operator: '!=',
                value: 3,
              },
            },
          ],
        }),
      },
    };

    this.loading = true;
    this.gridApiService.executeRecords(payload).subscribe({
      next: (response: any) => {
        this.loading = false;
        if (response.code === 200 && response.status) {
          const key = !this.unique_id ? 'policy_created_successfully' : 'policy_updated_successfully';
          const successMessage = this.translate.instant(key);
          this.toastr.success(successMessage);
          if (!this.unique_id) {
            this.location.back();
            return;
          }
          this.resetComponent();
          this.getPolicyData();
        } else {
          const key = !this.unique_id ? 'failed_to_create_the_policy' : 'failed_to_update_the_policy';
          const errorMessage = this.translate.instant(key);
          this.toastr.error(errorMessage, 'Error');
        }
      },
      error: (error) => {
        this.loading = false;
        console.error('Error fetching URL details:', error);
        const key = 'record_failed_inserted';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
      },
    });
  }

  openInfoPopUp(popup: string) {
    this.isInfoModalOpen = true;
    this.popupInformation = {
      ...this.infoContents[popup],
      data: JSON.stringify(this.infoContents[popup].data, null, 2),
    };
  }

  closeInfoPopUp() {
    this.isInfoModalOpen = false;
    this.popupInformation = null;
  }

  // Copy content from Monaco Editor
  copyToClipboard() {
    navigator.clipboard
      .writeText(this.popupInformation.data)
      .then(() => {
        this.copied = true;
        setTimeout(() => (this.copied = false), 3000);
      })
      .catch((err) => console.error('Failed to copy:', err));
  }
}

