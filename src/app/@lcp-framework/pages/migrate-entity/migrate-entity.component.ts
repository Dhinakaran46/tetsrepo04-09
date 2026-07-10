import { ChangeDetectorRef, Component, ElementRef, TemplateRef, ViewChild } from '@angular/core';
import { CommonSharedModule } from '../../shared/common/common.module';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { GridApiService } from '../../service/common/grid.service';
import { WebSocketSubject } from 'rxjs/webSocket';
import { LocalStorageService } from '../../service/common/local-storage.service';
import { environment } from '../../../../environments/environment';
import { HttpEventType } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../service/common/auth.service';
import { IdleService } from '../../service/common/idle.service';
import { DataTableComponent } from '../../components/datatable/datatable.component';
import { TranslateService } from '@ngx-translate/core';
import { TimezoneService } from '../../service/common/timezone.service';
import { MenuMapService } from '../../service/common/menu-map.service';
import { Title } from '@angular/platform-browser';
import { Store } from '@ngrx/store';
interface FetchDataParams {
  entity_name: any;
  primary_table: any;
  start_index: number;
  limit_range: number;
  sort_columns: any;
  search_any: any;
  search_all: any;
  having_conditions: any;
  having_any_conditions: any;
  group_by: any;
  includes: any;
}

type CheckboxOption = {
  label: string;
  control: string;
  default?: boolean;
  tables?: string[];
  description?: string;
  dipendentOptions?: string[]; // controls that are dependent on this option
};

@Component({
  selector: 'app-migrate-entity',
  standalone: true,
  imports: [CommonSharedModule, ReactiveFormsModule, DataTableComponent],
  templateUrl: './migrate-entity.component.html',
})
export class MigrateEntityComponent {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  section: 'export' | 'import' | 'list' = 'list';
  isLoading = false;

  private socket$!: WebSocketSubject<any>;
  public progress = 0;
  userData!: any;

  showPreview = false;
  previewData: any;

  @ViewChild('actionTemplate') actionTemplate!: TemplateRef<any>;
  @ViewChild('statusTemplate') statusTemplate!: TemplateRef<any>;
  gridloading: boolean = true;
  masterInfo: any;
  enableCheckBox: boolean = false;
  customTemplates: { [key: string]: TemplateRef<any> } = {};
  headercolumns: any[] = [];
  selectcolumns: any[] = [];
  items: any[] = [];
  totalItems: number = 0;
  currentPage: number = 1;
  resultsPerPage: number = 10;
  column: any = '';
  title: string = 'Migrate Entity Log';
  query: any = {};
  listQuery: any = '';
  policyData: any = null;
  attachedPolicies: any[] = [];
  headerColumnData: any[] = [];
  config: any;
  commonSearchQuery: any = {};
  defaultQuery: any = {};
  grid_records_delete: any;
  store: any;
  expandedItems: { [key: string]: boolean } = {};
  checkboxOptions: CheckboxOption[] = [
    {
      label: 'Masters',
      control: 'includeMasters',
      default: false,
      tables: [
        'statuses',
        'field_types',
        'action_types',
        'entity_types',
        'menu_types',
        'menus',
        'phone_country_codes',
        'financial_years',
        'document_sequences',
        'wizard_groups',
        'wizard_types',
        'barcode_templates',
        'data_transfer_queries',
      ],
      description: 'Only update option will be applied.',
    },
    {
      label: 'Users',
      control: 'includeUsers',
      default: false,
      tables: [
        'users',
        'tenant_users',
        'roles',
        'user_roles',
        'user_permissions',
        'role_permissions',
        'designations',
        'departments',
        'policies',
        'user_policies',
        'role_policies',
      ],
      dipendentOptions: ['includeMasterEntities'],
      description:
        'Only update option will be applied for users table. For updating user_permissions & role_permissions, please select master entities as well with users.',
    },
    {
      label: 'Themes',
      control: 'includeThemes',
      default: false,
      tables: ['themes', 'theme_line_items', 'theme_attributes'],
      description: 'Only update option will be applied.',
    },
    {
      label: 'Configurations',
      control: 'includeConfigurations',
      default: false,
      tables: ['app_category_types', 'app_categories', 'app_configurations', 'app_user_configurations'],
    },
    {
      label: 'Languages',
      control: 'includeLanguages',
      default: false,
      tables: ['languages', 'language_contents'],
      description: 'Only update option will be applied for languages & replace for languages contents.',
    },
    {
      label: 'Master Entities',
      control: 'includeMasterEntities',
      default: false,
      tables: ['master_entities', 'master_entity_line_items', 'permissions', 'role_permissions', 'user_permissions', 'menu_items'],
    },
    {
      label: 'Export Templates',
      control: 'includeExportTemplates',
      default: false,
      tables: ['export_templates', 'export_template_line_items', 'export_template_queries'],
    },
    {
      label: 'Import Templates',
      control: 'includeImportTemplates',
      default: false,
      tables: ['import_templates', 'import_template_line_items', 'import_template_queries'],
    },
    {
      label: 'Notification Configurations',
      control: 'includeNotifications',
      default: false,
      tables: [
        'notification_template_process',
        'notification_template_tags',
        'notification_template_recipient_tags',
        'notification_template_process_tags_mapping',
        'notification_templates',
        'notification_template_assignments',
        'email_template_cc_bcc',
      ],
      description: 'Only update option will be applied.',
    },
    {
      label: 'Approval Workflow',
      control: 'includeApprovalWorkflows',
      default: false,
      tables: ['approval_workflows', 'approval_workflow_approver_tags', 'approval_workflow_assignments'],
    },
  ];
  exportForm: FormGroup;
  importForm: FormGroup;

  file: File | null = null;

  constructor(
    private fb: FormBuilder,
    private api: GridApiService,
    private toastr: ToastrService,
    private localstore: LocalStorageService,
    public router: Router,
    private idleService: IdleService,
    private authService: AuthService,
    private translate: TranslateService,
    private route: ActivatedRoute,
    private titleService: Title,
    private cdr: ChangeDetectorRef,
    private localStorageService: LocalStorageService,
    private commonService: MenuMapService,
    private timezoneService: TimezoneService,
    public storeData: Store<any>
  ) {
    this.initStore();
    this.userData = JSON.parse(this.localstore.getData('user_data'));
    const checkboxControls = this.checkboxOptions.reduce((acc, item) => {
      acc[item.control] = [item.default ?? false];
      return acc;
    }, {} as any);
    this.exportForm = this.fb.group({
      ...checkboxControls,
      companyId: [this.userData?.main?.company_id || 1, Validators.required],
      type: ['update', Validators.required],
      developer_name: [''],
      note: [''],
    });

    this.importForm = this.fb.group({
      file: [null, Validators.required],
      developer_name: [''],
      note: [''],
    });
  }

  async initStore() {
    this.storeData
      .select((d) => d.index)
      .subscribe((d) => {
        this.store = d;
      });
  }

  ngOnInit() {
    if (this.userData?.main?.user_id) {
      const socketUrl = (environment as any).WS_URL || 'ws://localhost:8089';

      this.socket$ = new WebSocketSubject(`${socketUrl}?userId=${this.userData.main.user_id}`);

      this.socket$.subscribe({
        next: (data: any) => {
          this.progress = data.progress;
        },
        error: (err) => {
          console.error('WebSocket error', err);
        },
      });
    }
  }

  ngAfterViewInit() {
    this.config = JSON.parse(this.localStorageService.getData('config'));
    const pageInfo = this.route.snapshot.data['pageInfo'] || '';
    this.resultsPerPage = parseInt(this.config.grid_pagination_default);
    this.grid_records_delete = this.config.grid_enable_associated_records_deletion;

    if (pageInfo && this.resultsPerPage) {
      if (this.userData.main?.policies) {
        this.policyData = this.userData.main?.policies || null;
      }
      this.masterInfo = pageInfo;

      const masterListConfig = pageInfo;

      const translateTitle = this.translate.instant(masterListConfig.fullEntity);
      this.titleService.setTitle(translateTitle);

      this.enableCheckBox = masterListConfig.enable_row_checkbox;

      this.title = masterListConfig.fullEntity;
      this.setHeader();
      this.setDefaultQuery();
      this.listQuery.start_index = 0;
      this.fetchAttachedPolicies(this.listQuery);
    } else {
      this.title = 'Default Title';
      this.headercolumns = [];
      this.items = [];
    }
    this.cdr.detectChanges();
  }

  // ---------------- EXPORT ----------------
  toggleCheckbox(controlName: string, dependentOptions: string[] = []) {
    const currentValue = this.exportForm.get(controlName)?.value;
    this.exportForm.get(controlName)?.setValue(!currentValue);
    if (dependentOptions.length > 0 && !currentValue) {
      dependentOptions.forEach((opt) => {
        this.exportForm.get(opt)?.setValue(true);
      });
    }
  }

  toggleExpand(controlName: string, event: Event) {
    event.stopPropagation(); // Prevent card click from toggling checkbox
    this.expandedItems[controlName] = !this.expandedItems[controlName];
  }

  toggleAll(value: boolean) {
    this.checkboxOptions.forEach((opt) => {
      this.exportForm.get(opt.control)?.setValue(value);
    });
  }

  exportData() {
    if (this.exportForm.invalid) {
      this.toastr.error('Fill required fields');
      return;
    }

    const exportType: 'download' | 'save' = 'save';
    this.progress = 0;
    this.isLoading = true;

    this.api.exportEntity(this.exportForm.value, exportType).subscribe({
      next: (res) => {
        if (exportType !== 'save') {
          // res is { blob, fileName }
          const url = window.URL.createObjectURL(res.blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = res.fileName;
          a.click();
          window.URL.revokeObjectURL(url);
          this.toastr.success('Export downloaded successfully');
        } else {
          this.toastr.success(res.message || 'Export saved successfully');
        }
        this.isLoading = false;
      },
      error: (e) => {
        this.toastr.error(e.message || 'Export failed');
        this.isLoading = false;
      },
    });
  }

  // ---------------- FILE CHANGE ----------------
  onFileChange(event: any) {
    this.showPreview = false;
    this.previewData = null;
    const file = event.target.files[0];

    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      this.toastr.error('Only ZIP files allowed');
      return;
    }

    this.file = file;
    this.importForm.patchValue({ file });
    this.importData(true);
  }

  cancelImport() {
    this.showPreview = false;
    this.previewData = null;
    this.file = null;
    this.importForm.reset();
    if (this.fileInput) this.fileInput.nativeElement.value = '';
  }

  // ---------------- IMPORT ----------------
  importData(preview: boolean = true) {
    if (this.importForm.invalid || !this.file) {
      this.toastr.error('Select file');
      return;
    }

    const formData = new FormData();
    formData.append('file', this.file);
    formData.append('developer_name', this.importForm.get('developer_name')?.value || '');
    formData.append('note', this.importForm.get('note')?.value || '');

    this.progress = 0;
    this.isLoading = true;

    this.api.importEntity(formData, preview).subscribe({
      next: (event: any) => {
        if (preview) {
          this.showPreview = true;
          this.previewData = event.data;
          this.isLoading = false;
        } else if (event.type === HttpEventType.Response) {
          const result = event.body;
          const message = result.message;

          if (result.status) {
            this.toastr.success(message || 'Import successful');
            this.isLoading = false;

            this.cancelImport();
            // setTimeout(() => {
            //   this.logout();
            // }, 5000); // wait for 2 seconds before logging out
          } else {
            this.toastr.error(message || 'Import successful');
            this.isLoading = false;
          }
        }
      },
      error: () => {
        this.toastr.error('Import failed');
        this.isLoading = false;
      },
    });
  }

  ngOnDestroy() {
    if (this.socket$) {
      this.socket$.complete();
    }
  }

  logout() {
    try {
      this.authService.logout().subscribe({
        next: (response) => {
          if (response) {
            this.idleService.stopIdleTimer();
            this.localstore.logout();
            localStorage.setItem('logout', Date.now().toString());
            this.router.navigate(['/login']); // Redirect to login page after successful logout
          }
        },
        error: (error) => {
          console.error('Logout failed', error);
          // Handle logout error as per your requirement (e.g., show an alert)
        },
      });
    } catch (error: any) {
      console.error('Logout Error: ', error);
    }
  }

  fetchData(params: FetchDataParams) {
    params.limit_range = this.resultsPerPage;
    const payload = this.localStorageService.replaceUniqueId(
      this.localStorageService.formatPayloadWithPolicyConditions(params, this.policyData, this.attachedPolicies),
      '$session_user_id',
      this.userData.main.id
    );
    this.commonService.getCommonList(payload).subscribe(
      (response) => {
        if (response.status && response.code === 200) {
          const data = this.headerColumnData
            .filter((key: any) => key.is_grid_column == 'true')
            .map((key: any) => ({
              ...key,
              column_width: '40px',
            }));

          // Check if only 'view' or 'view' + 'export_excel' are enabled
          const isOnlyViewOrViewExport =
            (!this.masterInfo.permissions.export_excel || this.masterInfo.permissions.export_excel === true) &&
            (!this.masterInfo.permissions.create || this.masterInfo.permissions.create === true) &&
            Object.keys(this.masterInfo.permissions).every((key) => key === 'export_excel' || key === 'create' || this.masterInfo.permissions[key] === false);

          // Include serial number column if enabled in config
          if (this.masterInfo.entity_configurations?.grid_show_serial_number === 'yes') {
            this.headercolumns = [
              {
                header: 'table_column_sno',
                field_value: 'S.No',
                is_sortable: 'false',
                column_order: '0.00',
                column_width: '40px',
                is_searchable: 'false',
                is_grid_column: 'true',
              },
              ...data,
            ];

            // Add 'Action' column if permissions are not limited to view/export
            if (!isOnlyViewOrViewExport) {
              this.headercolumns.push({
                header: 'table_column_action',
                field_value: 'Action',
                is_sortable: 'false',
                column_order: '0.00',
                column_width: '50px',
                is_searchable: 'false',
                is_grid_column: 'true',
              });
            }
          } else {
            this.headercolumns = [...data];
            this.headercolumns.push({
              header: 'table_column_action',
              field_value: 'Action',
              is_sortable: 'false',
              column_order: '0.00',
              column_width: '50px',
              is_searchable: 'false',
              is_grid_column: 'true',
            });
            // if (!isOnlyViewOrViewExport) {
            // }
          }

          // Adding custom templates
          this.headercolumns = this.headercolumns.map((item: any) => {
            if (item.header === 'status') {
              return {
                ...item,
                customTemplate: this.statusTemplate,
              };
            } else if (item.header === 'table_column_action') {
              return {
                ...item,
                customTemplate: this.actionTemplate,
              };
            } else {
              return { ...item };
            }
          });

          // Processing records
          if (response.data.records) {
            this.items = response.data.records.map((item: any, index: any) => {
              const formattedItem = { ...item };
              for (const key in formattedItem) {
                if (
                  formattedItem.hasOwnProperty(key) &&
                  (key.toLowerCase().includes('date') || key.toLowerCase().includes('created_at') || key.toLowerCase().includes('updated_at')) &&
                  this.isDate(formattedItem[key])
                ) {
                  const transformedDate = this.timezoneService.transformDateTime(formattedItem[key]);
                  if (transformedDate) {
                    formattedItem[key] = transformedDate;
                  }
                }
              }

              if (this.masterInfo.entity_configurations?.grid_show_serial_number === 'yes') {
                return {
                  table_column_sno: this.listQuery.start_index + index + 1,
                  ...formattedItem,
                  Action: index + 1,
                };
              }
              return {
                ...formattedItem,
                // approver_type: this.translate.instant(item.approver_type),
                // ...(this.activeTab === Tabs.pending && { pending_with: this.translate.instant(item.pending_with) }),
                Action: index + 1,
              };
            });
            this.totalItems = response.data.total_records;
            this.gridloading = false;
          } else {
            this.items = [];
            this.totalItems = 0;
            this.gridloading = false;
          }
        } else {
          this.items = [];
          this.totalItems = 0;
          this.gridloading = false;
          const key = response.message;
          const errorMessage = this.translate.instant(key);
          this.toastr.error(errorMessage, 'Error');
        }
      },
      (error) => {
        const key = 'error';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
        this.gridloading = false;
      }
    );
  }

  viewItem(item: any) {}

  handleCustomAction(action: string) {}

  onPageChange(event: { page: number; start_index: number; skipFetch?: boolean }) {
    this.currentPage = event.page;
    this.listQuery.start_index = event.start_index;
    this.listQuery.limit_range = this.resultsPerPage;
    if (event?.skipFetch) return;
    this.fetchData(this.listQuery);
  }

  onResultsPerPageChange(event: { resultsPerPage: number; start_index: number; skipFetch?: boolean }) {
    this.currentPage = 1;
    this.resultsPerPage = event.resultsPerPage;
    this.listQuery.start_index = event.start_index;
    this.listQuery.limit_range = event.resultsPerPage;
    if (event?.skipFetch) return;
    this.fetchData(this.listQuery);
  }

  sortColumn(column: any) {
    this.column = column;

    // this.listQuery.start_index = this.currentPage;
    this.listQuery.limit_range = this.resultsPerPage;
    const sortColumns = Array.isArray(column?.sortColumns) ? column.sortColumns : [this.column];
    this.listQuery.sort_columns = sortColumns.filter((col: any) => col?.sortDirection).map((col: any) => [col.field_value, col.sortDirection]);
    if (column?.skipFetch) return;
    this.fetchData(this.listQuery);
  }

  searchData(input: any) {
    const clonedListQuery = this.listQuery;
    if (input.where.data.length) {
      const query = input.where.data;
      const search = input.where.search;
      if (search == '') {
        const orgListQuery = this.defaultQuery;
        clonedListQuery.search_any = [];
        clonedListQuery.search_any = [...orgListQuery.search_any];
        if (!input?.skipFetch) {
          this.fetchData(clonedListQuery);
        }
        return;
      }
      if (query.length === 1 && query[0].column_name === '') {
        clonedListQuery.search_any = [...clonedListQuery.search_any];
      } else {
        clonedListQuery.search_any = [...query];
      }
    }
    if (input.having.data.length) {
      const query = input.having.data;
      const search = input.having.search;
      if (search.length) clonedListQuery.having_any_conditions = [...query];
    }
    clonedListQuery.start_index = 0;
    this.currentPage = 1;
    if (!input?.skipFetch) {
      this.fetchData(clonedListQuery);
    }
  }

  advancedSearchData(data: any) {
    this.commonSearchQuery.having_conditions = [];
    this.commonSearchQuery.having_any_conditions = [];
    this.commonSearchQuery.search_any = [];
    this.commonSearchQuery.search_all = [];
    interface QueryItem {
      isAggregate: boolean;
      [key: string]: any;
    }
    const query = data.data;
    //isAggregate
    const uncleanedwhereConditions = query.filter((d: any) => !d.isAggregate);
    const whereConditions = uncleanedwhereConditions.map(({ isAggregate, ...rest }: QueryItem) => rest);
    const uncleanedhavingConditions = query.filter((d: any) => d.isAggregate);
    const havingConditions = uncleanedhavingConditions.map(({ isAggregate, ...rest }: QueryItem) => rest);
    const condition = data.condition;
    //const clonedListQuery = JSON.parse(JSON.stringify(this.masterInfo.ListQuery));
    const clonedListQuery = this.listQuery;
    const orgListQuery = this.defaultQuery;
    if (whereConditions.length == 0 && havingConditions.length == 0) {
      if (condition == 'AND') {
        clonedListQuery.search_all = [...orgListQuery.search_all];
      } else {
        clonedListQuery.search_any = [...orgListQuery.search_any];
      }
      if (!data?.skipFetch) {
        this.fetchData(clonedListQuery);
      }
      return;
    }
    if (havingConditions.length > 0) {
      if (condition == 'AND') {
        clonedListQuery.having_conditions = [...havingConditions];
        this.commonSearchQuery.having_conditions = [...havingConditions];
        this.commonSearchQuery.having_any_conditions = [];
      } else {
        clonedListQuery.having_any_conditions = [...havingConditions];
        this.commonSearchQuery.having_any_conditions = [...havingConditions];
        this.commonSearchQuery.having_conditions = [];
      }
    }
    if (condition == 'AND') {
      if (whereConditions.length === 1 && whereConditions[0].column_name === '') {
        clonedListQuery.search_all = [];
        clonedListQuery.search_all = [...orgListQuery.search_all];
        this.commonSearchQuery.search_all = [];
      } else {
        clonedListQuery.search_all = [];
        clonedListQuery.search_all = [...orgListQuery.search_all, ...whereConditions];
        this.commonSearchQuery.search_any = [];
        this.commonSearchQuery.search_all = [...whereConditions];
      }
      clonedListQuery.start_index = 0;
      this.currentPage = 1;
      if (!data?.skipFetch) {
        this.fetchData(clonedListQuery);
      }
    } else {
      if (whereConditions.length === 1 && whereConditions[0].column_name === '') {
        clonedListQuery.search_any = [...clonedListQuery.search_any];
        this.commonSearchQuery.search_any = [];
      } else {
        clonedListQuery.search_any = [...clonedListQuery.search_any, ...whereConditions];
        this.commonSearchQuery.search_all = [];
        this.commonSearchQuery.search_any = [...whereConditions];
      }
      clonedListQuery.start_index = 0;
      this.currentPage = 1;
      if (!data?.skipFetch) {
        this.fetchData(clonedListQuery);
      }
    }
  }

  isDate(value: any): boolean {
    return !isNaN(Date.parse(value));
  }

  setHeader() {
    this.headerColumnData = [
      {
        header: 'type',
        clause_type: 'where',
        field_value: 'migration_record_logs.type',
        is_sortable: 'true',
        column_order: '1.00',
        column_width: '1.00',
        is_searchable: 'true',
        is_grid_column: 'true',
      },
      {
        header: 'uuid',
        clause_type: 'where',
        field_value: 'migration_record_logs.uuid',
        is_sortable: 'true',
        column_order: '3.00',
        column_width: '1.00',
        is_searchable: 'false',
        is_grid_column: 'false',
      },
      {
        header: 'file_path',
        clause_type: 'where',
        field_value: 'migration_record_logs.file_path',
        is_sortable: 'true',
        column_order: '3.00',
        column_width: '1.00',
        is_searchable: 'false',
        is_grid_column: 'false',
      },
      {
        header: 'developer_name',
        clause_type: 'where',
        field_value: 'migration_record_logs.developer_name',
        is_sortable: 'true',
        column_order: '3.00',
        column_width: '1.00',
        is_searchable: 'true',
        is_grid_column: 'true',
      },
      {
        header: 'note',
        clause_type: 'where',
        field_value: 'migration_record_logs.note',
        is_sortable: 'true',
        column_order: '4.00',
        column_width: '1.00',
        is_searchable: 'true',
        is_grid_column: 'true',
      },
      {
        header: 'modules',
        clause_type: 'where',
        field_value: 'migration_record_logs.modules',
        is_sortable: 'false',
        column_order: '2.00',
        column_width: '1.00',
        is_searchable: 'true',
        is_grid_column: 'true',
      },
    ];
  }

  setDefaultQuery() {
    this.defaultQuery = {
      print_query: true,
      company_id: 1,
      primary_table: 'migration_record_logs',
      start_index: 0,
      limit_range: 10,
      sort_columns: [['migration_record_logs.id', 'desc']],
      search_all: [
        {
          column_name: 'migration_record_logs.status_id',
          value: 1,
          operator: '=',
        },
        {
          column_name: 'migration_record_logs.company_id',
          value: 1,
          operator: '=',
        },
      ],
      search_any: [],
      select_columns: [...this.headerColumnData.map((column: { field_value: any; header: any }) => [column.field_value, column.header])],
    };
    this.listQuery = JSON.parse(JSON.stringify(this.defaultQuery));
  }

  fetchAttachedPolicies(params: FetchDataParams) {
    this.api.getAttachedPolicies({ entity_name: params.primary_table }).subscribe(
      (response) => {
        if (response.status && response.code === 200) {
          this.attachedPolicies = response.data.attached_policies || [];
        }
      },
      (error) => {
        const key = 'error';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
      },
      () => {
        this.fetchColumns();
        this.fetchData(this.listQuery);
      }
    );
  }

  fetchColumns() {
    const data = [
      {
        order_no: 2,
        status_id: 1,
        company_id: 1,
        field: 'migration_record_logs.type',
        clause_type: 'where',
        sorting: true,
        title: this.translate.instant('type'),
        field_type_id: 3,
        searchable: true,
        is_grid_column: true,
        enable: true,
      },
      {
        order_no: 3,
        status_id: 1,
        company_id: 1,
        field: 'migration_record_logs.developer_name',
        clause_type: 'where',
        sorting: true,
        title: this.translate.instant('developer_name'),
        field_type_id: 3,
        searchable: true,
        is_grid_column: true,
        enable: true,
      },
      {
        order_no: 4,
        status_id: 1,
        company_id: 1,
        field: 'migration_record_logs.note',
        clause_type: 'where',
        sorting: true,
        title: this.translate.instant('note'),
        field_type_id: 3,
        searchable: true,
        is_grid_column: true,
        enable: true,
      },
      {
        order_no: 9,
        status_id: 1,
        company_id: 1,
        field: 'migration_record_logs.modules',
        clause_type: 'where',
        sorting: false,
        title: this.translate.instant('modules'),
        field_type_id: 11,
        searchable: true,
        is_grid_column: true,
        enable: false,
      },
    ];

    this.selectcolumns = [
      {
        field: 'S.No',
        title: 'S.No',
        sorting: false,
        searchable: false,
        enable: true,
        field_type_id: 1,
      },
      ...data,
      {
        field: 'Status',
        title: 'Status',
        sorting: false,
        searchable: false,
        enable: false,
        field_type_id: 1,
      },
      {
        field: 'Action',
        title: 'Action',
        sorting: false,
        searchable: false,
        enable: false,
        field_type_id: 0,
      },
    ];
  }

  downloadFile(event: Event, item: any) {
    event.preventDefault();
    // Example: download from a URL or blob
    const url = environment.apiUrl + '/' + item.file_path;
    const a = document.createElement('a');
    a.href = url;
    a.download = item.fileName || 'download.zip';
    a.click();
  }
}
