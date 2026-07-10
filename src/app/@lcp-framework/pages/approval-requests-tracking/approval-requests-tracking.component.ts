import { CommonModule, Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { LocalStorageService } from '../../service/common/local-storage.service';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { FormlyConfigModule } from '../../formly/formly-config.module';
import { FormlyBootstrapModule } from '@ngx-formly/bootstrap';
import { LoaderComponent } from '../../components/loader/loader.component';
import { FormlyModule } from '@ngx-formly/core';
import { CommonSharedModule } from '../../shared/common/common.module';
import { MenuMapService } from '../../service/common/menu-map.service';
import { TimezoneService } from '../../service/common/timezone.service';

@Component({
  selector: 'app-approval-requests-tracking',
  standalone: true,
  imports: [
    FormlyModule,
    CommonSharedModule,
    FormlyBootstrapModule,
    ReactiveFormsModule,
    FormlyConfigModule,
    FormsModule,
    CommonModule,
    NgSelectModule,
  ],
  templateUrl: './approval-requests-tracking.component.html',
  styleUrl: './approval-requests-tracking.component.scss',
})
export class ApprovalRequestsTrackingComponent implements OnInit {
  approverTypes: any = {
    user_id: 'User',
    role_id: 'Role',
    tag: 'Tag',
  };
  reviewStatuses: any = {
    approval_completed: 'Approved',
    approval_rejected: 'Rejected',
    pending: 'Pending',
    void: 'Void',
    approval_needed: 'Approval Requested',
  };
  approvalSteps: any[] = [];
  uniqueId: string | null = null;
  loading: boolean = false;

  constructor(
    private fb: FormBuilder,
    public translate: TranslateService,
    public location: Location,
    public router: Router,
    private route: ActivatedRoute,
    private toastr: ToastrService,
    public localStorageService: LocalStorageService,
    private commonService: MenuMapService,
    private timezoneService: TimezoneService
  ) {
    this.route.paramMap.subscribe((params) => {
      this.uniqueId = params.get('uuid');
    });
  }

  async ngOnInit(): Promise<void> {
    await this.getApprovalWorkflowDetail();
  }

  formatDate(dateTime: any) {
    return this.timezoneService.transformDateOnly(dateTime);
  }

  async getApprovalWorkflowDetail() {
    if (this.uniqueId) {
      const payload = {
        group_by: ['approval_process_job_workflows.id', 'ud1.email', 'ud2.email'],
        includes: [
          {
            join_type: 'LEFT',
            table_name: 'user_information ud1',
            join_condition: 'ud1.user_id = approval_process_job_workflows.user_id',
          },
          {
            join_type: 'LEFT',
            table_name: 'user_information ud2',
            join_condition: 'ud2.user_id = approval_process_job_workflows.reviewed_by',
          },
        ],
        company_id: 1,
        search_all: [
          {
            value: this.uniqueId,
            operator: '=',
            column_name: 'approval_process_job_workflows.approval_process_job_id',
          },
          {
            value: '3',
            operator: '!=',
            column_name: 'approval_process_job_workflows.status_id',
          },
        ],
        limit_range: 1,
        print_query: true,
        start_index: 0,
        sort_columns: [['approval_process_job_workflows.approver_order_no', 'asc']],
        primary_table: 'approval_process_job_workflows',
        select_columns: [
          ['approval_process_job_workflows.id', 'id'],
          ['approval_process_job_workflows.approval_process_job_name', 'name'],
          ['approval_process_job_workflows.approval_process_job_description', 'description'],
          ['approval_process_job_workflows.approver_order_no', 'approver_order_no'],
          ['approval_process_job_workflows.approver_type', 'approver_type'],
          ['approval_process_job_workflows.review_status', 'review_status'],
          ['approval_process_job_workflows.reason', 'reason'],
          [`TO_CHAR(approval_process_job_workflows.assigned_at, 'YYYY-MM-DD\" \"HH24:MI')`, 'assigned_at'],
          [`TO_CHAR(approval_process_job_workflows.processed_at, 'YYYY-MM-DD\" \"HH24:MI')`, 'processed_at'],
          ['ud2.email', 'reviewed_by'],
          ['ud1.email', 'requested_by'],
        ],
      };
      this.loading = true;
      this.commonService.getCommonList(payload).subscribe({
        next: (response: any) => {
          if (response.code === 200 && response.status) {
            this.loading = false;
            if (response.data.records) {
              this.approvalSteps = response.data.records;
            } else {
              const key = 'failed_to_approval_request_details';
              const errorMessage = this.translate.instant(key);
              this.toastr.error(errorMessage, 'Error');
            }
          } else {
            this.loading = false;
          }
        },
        error: (error: any) => {
          this.loading = false;
          console.error('Error fetching Approval Request details:', error);
        },
      });
    } else {
      this.loading = false;
      const key = 'invalid_approval_request';
      const errorMessage = this.translate.instant(key);
      this.toastr.error(errorMessage, 'Error');
    }
  }
}
