import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonSharedModule } from '../../shared/common/common.module';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { GridApiService } from '../../service/common/grid.service';
import { WebSocketSubject } from 'rxjs/webSocket';
import { LocalStorageService } from '../../service/common/local-storage.service';
import { environment } from '../../../../environments/environment';
import { HttpEventType } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../service/common/auth.service';
import { IdleService } from '../../service/common/idle.service';

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
  imports: [CommonSharedModule, ReactiveFormsModule],
  templateUrl: './migrate-entity.component.html',
})
export class MigrateEntityComponent {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  section: 'export' | 'import' = 'import';
  isLoading = false;

  private socket$!: WebSocketSubject<any>;
  public progress = 0;
  userData!: any;

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
      ],
      description: 'Only update option will be applied.',
    },
    {
      label: 'Users',
      control: 'includeUsers',
      default: false,
      tables: [
        'users',
        'user_details',
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
      description: 'Export templates excel file should be moved to assets folder separately.',
    },
    {
      label: 'Import Templates',
      control: 'includeImportTemplates',
      default: false,
      tables: ['import_templates', 'import_template_line_items', 'import_template_queries'],
      description: 'Import templates excel file should be moved to assets folder separately.',
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
    private authService: AuthService,
    private idleService: IdleService
  ) {
    this.userData = JSON.parse(this.localstore.getData('user_data'));
    const checkboxControls = this.checkboxOptions.reduce((acc, item) => {
      acc[item.control] = [item.default ?? false];
      return acc;
    }, {} as any);
    this.exportForm = this.fb.group({
      ...checkboxControls,
      companyId: [this.userData?.main?.company_id || 1, Validators.required],
      type: ['update', Validators.required],
    });

    this.importForm = this.fb.group({
      file: [null, Validators.required],
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

    this.progress = 0;
    this.isLoading = true;

    this.api.exportEntity(this.exportForm.value).subscribe({
      next: (res) => {
        const url = window.URL.createObjectURL(res.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = res.fileName;
        a.click();

        window.URL.revokeObjectURL(url); // ✅ important cleanup

        this.toastr.success('Export successful');
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
    const file = event.target.files[0];

    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      this.toastr.error('Only ZIP files allowed');
      return;
    }

    this.file = file;
    this.importForm.patchValue({ file });
  }

  // ---------------- IMPORT ----------------
  importData() {
    if (this.importForm.invalid || !this.file) {
      this.toastr.error('Select file');
      return;
    }

    const formData = new FormData();
    formData.append('file', this.file);

    this.progress = 0;
    this.isLoading = true;

    this.api.importMasterEntity(formData).subscribe({
      next: (event: any) => {
        if (event.type === HttpEventType.Response) {
          const result = event.body;
          const message = result.message;

          if (result.status) {
            this.toastr.success(message || 'Import successful');
            this.isLoading = false;

            this.importForm.reset();
            this.file = null;
            if (this.fileInput) {
              this.fileInput.nativeElement.value = '';
            }
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
}
