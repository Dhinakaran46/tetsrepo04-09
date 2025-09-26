import { Component } from '@angular/core';
import { ClientDatatableComponent, TableConfig } from '../../components/client-datatable/client-datatable.component';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { GridApiService } from '../../service/common/grid.service';
import { ToastrService } from 'ngx-toastr';
import { LocalStorageService } from '../../service/common/local-storage.service';
import { TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { CommonSharedModule } from '../../shared/common/common.module';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-cron-setting',
  standalone: true,
  imports: [ClientDatatableComponent, CommonSharedModule, ReactiveFormsModule],
  templateUrl: './cron-setting.component.html',
  styleUrl: './cron-setting.component.scss',
})
export class CronSettingComponent {
  listItems: any = [];
  configData: any;
  userData: any;
  myForm: any;
  formSubmitted: boolean = false;

  isRunning: boolean = false;
  cronStatus: any;

  showModal: boolean = false;
  cronForm: FormGroup;

  editMode = false;
  currentJobId: number | null = null;

  itemsTableConfig: TableConfig = {
    columns: [
      { key: 'timing', label: 'Cron timing', sortable: true, searchable: true },
      { key: 'cron_url', label: 'Cron url', sortable: true, searchable: true },
      { key: 'concat_base_url', label: 'Concat base url', sortable: true, searchable: false },
      { key: 'description', label: 'Description', sortable: true, searchable: false },
      { key: 'status', label: 'Cron status', sortable: true, searchable: true },
      {
        key: 'actions',
        label: 'Actions',
        type: 'button',
        actions: [
          {
            icon: 'fa-solid fa-eye ',
            onClick: (item: any) => this.detailCronJob(item.uuid),
            class: '  ',
            tooltip: 'Details Cron',
          },
          {
            icon: 'fa-solid fa-play text-success',
            onClick: (item: any) => this.startCronJob(item.id),
            class: '  ',
            tooltip: 'Start Cron',
          },
          {
            icon: 'fa-solid fa-ban text-warning',
            onClick: (item: any) => this.stopCronJob(item.id),
            class: '  ',
            tooltip: 'Stop Cron',
          },
          {
            icon: 'fa-solid fa-edit text-primary',
            onClick: (item: any) => this.editItem(item),
            class: '   mr-4',
            tooltip: 'Edit Cron',
          },
          {
            icon: 'fa-solid fa-trash text-danger',
            onClick: (item: any) => this.removeItem(item),
            class: '  ',
            tooltip: 'Delete Cron',
          },
        ],
      },
    ],
    pageSizes: [5, 10, 25, 50],
    defaultPageSize: 10,
    searchable: true,
    headerConfig: {
      title: 'Cron Job List',
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

  constructor(
    public translate: TranslateService,
    private toastr: ToastrService,
    private gridApiService: GridApiService,
    public router: Router,
    private localstore: LocalStorageService,
    private fb: FormBuilder
  ) {
    this.configData = JSON.parse(this.localstore.getData('config'));
    this.userData = JSON.parse(this.localstore.getData('user_data'));
    this.myForm = this.fb.group({
      import_template: ['', Validators.required],
      import_template_file: ['', Validators.required],
      data_header_row: [1, [Validators.required, Validators.min(1)]], // Minimum value 1
      data_start_row: [0, [Validators.min(0)]], // Minimum value 0
      data_end_row: [0, [Validators.min(0)]], // Minimum value 0
      max_data_row: [{ value: 500, disabled: true }],
      name: ['', Validators.required],
      description: [''],
    });

    

    this.cronForm = this.fb.group({
      timing: ['', Validators.required],
      cron_url: ['', Validators.required],
      concat_base_url: [false],
      description: [''],
    });
  }

  ngOnInit() {
    this.resetComponent();
    this.getCronJobs();
  }

  resetComponent(uuid: string = '') {
    this.myForm.reset({
      import_template: uuid,
      import_template_file: '',
      data_header_row: 1,
      data_start_row: 0,
      data_end_row: 0,
      max_data_row: 500,
      name: '',
      description: '',
    });

    this.formSubmitted = false;
  }

  initNewLineItem() {
    this.editMode = false;
    this.currentJobId = null;
    this.cronForm.reset({
      timing: '',
      cron_url: '',
      concat_base_url: false,
      description: '',
    });
    this.showModal = true;
  }

  getCronJobs() {
    this.gridApiService.getCronJobs().subscribe((response: any) => {
      if (response.status) {
        this.cronStatus = response.data.cron_status?.jobs || {};
        this.isRunning = response.data.cron_status?.isRunning;
        this.listItems = this.getTableData(response.data.cron_list);
      }
    });
  }

  stopCronJobs() {
    this.gridApiService.stopCronJobs().subscribe((response: any) => {
      if (response.status) {
        this.cronStatus = response.data.jobs || {};
        this.isRunning = response.data.isRunning;
        this.listItems = this.getTableData(this.listItems);
      }
    });
  }

  stopCronJob(id: number) {
    this.gridApiService.stopCronJob(id).subscribe((response: any) => {
      if (response.status) {
        this.cronStatus = response.data.jobs || {};
        this.isRunning = response.data.isRunning;
        this.listItems = this.getTableData(this.listItems);
      }
    });
  }

  detailCronJob(uuid: any) {
    this.router.navigate(['/cron-setup/details', uuid]);
  }

  startCronJob(id: number) {
    this.gridApiService.startCronJob(id).subscribe((response: any) => {
      if (response.status) {
        this.cronStatus = response.data.jobs || {};
        this.isRunning = response.data.isRunning;
        this.listItems = this.getTableData(this.listItems);
      }
    });
  }

  restartCronJobs() {
    this.gridApiService.restartCronJobs().subscribe((response: any) => {
      if (response.status) {
        this.cronStatus = response.data.cron_status?.jobs || {};
        this.isRunning = response.data.cron_status?.isRunning;
        this.listItems = this.getTableData(response.data.cron_list);
      }
    });
  }

  getTableData(cron_list: any[] = []) {
    const result: any[] = [];
    cron_list.forEach((item: any) => {
      result.push({
        id: item.id,
        uuid: item.uuid,
        timing: item.timing,
        cron_url: item.cron_url,
        concat_base_url: item.concat_base_url,
        description: item.description,
        status: this.cronStatus[item.id]?.status || 'stopped',
      });
    });
    return result;
  }

  editItem(item: any) {
    this.editMode = true;
    this.currentJobId = item.id;

    this.cronForm.patchValue({
      timing: item.timing,
      cron_url: item.cron_url,
      concat_base_url: item.concat_base_url,
      description: item.description,
    });

    this.showModal = true;

    // if (this.myForm.valid) {
    //   this.gridApiService.editCronJob(item.id, this.myForm.valid).subscribe((response: any) => {
    //     if (response.status) {
    //       this.cronStatus = response.data.cron_status?.jobs || {};
    //       this.isRunning = response.data.cron_status?.isRunning;
    //       this.listItems = this.getTableData(response.data.cron_list);
    //     }
    //   });
    // }
  }
  removeItem(item: any) {
    Swal.fire({
      icon: 'warning',
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      showCancelButton: true,
      confirmButtonText: 'Delete',
      padding: '2em',
    }).then(async (result) => {
      if (result.value) {
        this.gridApiService.deleteCronJob(item.id).subscribe((response: any) => {
          if (response.status) {
            this.cronStatus = response.data.cron_status?.jobs || {};
            this.isRunning = response.data.cron_status?.isRunning;
            this.listItems = this.getTableData(response.data.cron_list);
          }
        });
      }
    });
  }

  onCronFormSubmit() {
    if (this.cronForm.invalid) {
      this.markFormGroupTouched(this.cronForm);
      return;
    }

    const formData = this.cronForm.value;

    if (this.editMode && this.currentJobId) {
      // Update existing job
      this.updateCronJob(this.currentJobId, formData);
    } else {
      // Create new job
      this.createCronJob(formData);
    }
  }

  createCronJob(data: any) {
    
    this.gridApiService.createCronJobs(data).subscribe({
      next: (response) => {
        this.toastr.success('Cron job created successfully');
        this.resetForm();
        this.getCronJobs(); // Refresh your list
      },
      error: (err) => {
        this.toastr.error('Failed to create cron job');
      },
    });
  }

  updateCronJob(id: number, data: any) {
    this.gridApiService.editCronJob(id, data).subscribe({
      next: (response) => {
        this.cronStatus = response.data.cron_status?.jobs || {};
        this.isRunning = response.data.cron_status?.isRunning;
        this.listItems = this.getTableData(response.data.cron_list);
        this.toastr.success('Cron job updated successfully');
        this.resetForm();
        this.getCronJobs(); // Refresh your list
      },
      error: (err) => {
        this.toastr.error('Failed to update cron job');
      },
    });
  }

  resetForm() {
    this.cronForm.reset();
    this.editMode = false;
    this.currentJobId = null;
    this.showModal = false;
  }

  // Helper method to mark all fields as touched
  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach((control) => {
      control.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
}
