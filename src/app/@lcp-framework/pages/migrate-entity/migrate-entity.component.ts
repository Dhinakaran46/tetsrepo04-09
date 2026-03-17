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
    this.exportForm = this.fb.group({
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
  exportData() {
    if (this.exportForm.invalid) {
      this.toastr.error('Fill required fields');
      return;
    }

    this.progress = 0;
    this.isLoading = true;

    this.api.exportMasterEntity(this.exportForm.value).subscribe({
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
      error: () => {
        this.toastr.error('Export failed');
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
          this.toastr.success('Import successful');
          this.isLoading = false;

          this.importForm.reset();
          this.file = null;
          if (this.fileInput) {
            this.fileInput.nativeElement.value = '';
          }
          setTimeout(() => {
            this.logout();
          }, 5000); // wait for 2 seconds before logging out
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
