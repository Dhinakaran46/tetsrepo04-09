import { Component, TemplateRef, ViewChild, AfterViewInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { DataTableComponent } from '../../components/datatable/datatable.component';
import { HttpClientModule } from '@angular/common/http';
import { animate, style, transition, trigger } from '@angular/animations';
import { ActivatedRoute, Router } from '@angular/router';

import { GridApiService } from '../../service/common/grid.service';
import { ToastrService } from 'ngx-toastr';
import { TranslateService } from '@ngx-translate/core';
import { CommonSharedModule } from '../../shared/common/common.module';
import { Store } from '@ngrx/store';
import Swal from 'sweetalert2';
import { ExportService } from '../../service/common/export.service';
import { LocalStorageService } from '../../service/common/local-storage.service';
import { MenuMapService } from '../../service/common/menu-map.service';
import { Title } from '@angular/platform-browser';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { LoaderComponent } from '../../components/loader/loader.component';
import { Subscription } from 'rxjs';

enum Tabs {
  pending_on_me = 'pending_on_me',
  pending = 'pending',
  completed = 'completed',
  delegated_on_me = 'delegated_on_me',
}
export interface ExportResponse {
  blob: Blob;
  fileName: string;
}

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

@Component({
  selector: 'app-approval-requests',
  standalone: true,
  imports: [CommonSharedModule, HttpClientModule, DataTableComponent, LoaderComponent, ReactiveFormsModule],
  templateUrl: './approval-requests.component.html',
  styleUrl: './approval-requests.component.scss',
  animations: [
    trigger('toggleAnimation', [
      transition(':enter', [style({ opacity: 0, transform: 'scale(0.95)' }), animate('100ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))]),
      transition(':leave', [animate('75ms', style({ opacity: 0, transform: 'scale(0.95)' }))]),
    ]),
  ],
  providers: [DatePipe],
})
export class ApprovalRequestsComponent implements AfterViewInit, OnDestroy {
  store: any;
  @ViewChild('actionTemplate') actionTemplate!: TemplateRef<any>;
  @ViewChild('statusTemplate') statusTemplate!: TemplateRef<any>;
  @ViewChild('approvalStatusTemplate') approvalStatusTemplate!: TemplateRef<any>;
  @ViewChild('approverListTemplate') approverListTemplate!: TemplateRef<any>;
  @ViewChild('pendingApproverListTemplate') pendingApproverListTemplate!: TemplateRef<any>;
  customTemplates: { [key: string]: TemplateRef<any> } = {};

  user_id: any;
  column: any = '';
  query: any = '';

  activeTab = Tabs.pending_on_me;
  selectcolumns: any[] = [];
  headercolumns: any[] = [];
  approvalStatusData: any = {
    pending_on_me: ['approval_needed'],
    pending: ['pending'],
    completed: ['approval_completed', 'approval_rejected'],
    delegated_on_me: ['approval_needed'],
  };
  headerColumnData: any[] = [];
  items: any[] = [];
  totalItems: number = 0;
  currentPage: number = 1;
  resultsPerPage: number = 10;
  enableCheckBox: boolean = false;
  masterInfo: any;
  policyData: any = null;
  loading: boolean = false;
  gridloading: boolean = true;

  title: any = '';
  listQuery: any = '';
  defaultQuery: any = '';
  user_info: any;
  grid_records_delete: any;
  config: any;
  attachedPolicies: any[] = [];
  requestTabs: any[] = [
    {
      name: Tabs.pending_on_me,
    },
    {
      name: Tabs.pending,
    },
    {
      name: Tabs.completed,
    },
    {
      name: Tabs.delegated_on_me,
    },
  ];
  isInfoModalOpen: boolean = false;
  approvalForm!: FormGroup;
  submitted = false;
  selectedRequest: any = null;
  reviewStatusSub!: Subscription;

  statuses: any = {
    1: {
      value: 'table_status_val_0',
      border_color: 'badge-outline-success',
    },
    2: {
      value: 'table_status_val_1',
      border_color: 'badge-outline-danger',
    },
    3: {
      value: 'table_status_val_2',
      border_color: 'badge-outline-secondary',
    },
  };

  constructor(
    private toastr: ToastrService,
    private gridApiService: GridApiService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private datepipe: DatePipe,
    private router: Router,
    public storeData: Store<any>,
    private exportService: ExportService,
    private datePipe: DatePipe,
    private translate: TranslateService,
    private localStorageService: LocalStorageService,
    private commonService: MenuMapService,
    private titleService: Title,
    private fb: FormBuilder
  ) {
    this.initStore();
  }

  ngAfterViewInit() {
    this.config = JSON.parse(this.localStorageService.getData('config'));
    const pageInfo = this.route.snapshot.data['pageInfo'] || '';
    this.user_info = JSON.parse(this.localStorageService.getData('user_data'));
    this.resultsPerPage = parseInt(this.config.grid_pagination_default);
    this.grid_records_delete = this.config.grid_enable_associated_records_deletion;
    this.approvalForm = this.fb.group({
      review_status: ['approval_completed', Validators.required],
      reason: [''],
    });
    this.reviewStatusSub = this.approvalForm.get('review_status')?.valueChanges.subscribe((status) => {
      const reasonControl = this.approvalForm.get('reason');

      if (status === 'approval_rejected') {
        reasonControl?.setValidators([Validators.required]);
      } else {
        reasonControl?.clearValidators();
      }

      reasonControl?.updateValueAndValidity();
    })!;

    this.user_id = this.user_info.main?.id;
    if (pageInfo && this.resultsPerPage) {
      if (this.user_info.main?.policies) {
        this.policyData = this.user_info.main?.policies || null;
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

  ngOnDestroy(): void {
    if (this.reviewStatusSub) {
      this.reviewStatusSub.unsubscribe();
    }
  }

  setHeader() {
    this.headerColumnData = [
      {
        header: 'name',
        clause_type: 'where',
        field_value: 'approval_process_job_workflows.approval_process_job_name',
        is_sortable: 'true',
        column_order: '1.00',
        column_width: '1.00',
        is_searchable: 'true',
        is_grid_column: 'true',
      },
      ...(this.activeTab !== Tabs.pending
        ? [
            // {
            //   header: 'approver_type',
            //   clause_type: 'where',
            //   field_value: 'approval_process_job_workflows.approver_type',
            //   is_sortable: 'true',
            //   column_order: '2.00',
            //   column_width: '1.00',
            //   is_searchable: 'true',
            //   is_grid_column: 'true',
            // },
            // {
            //   header: 'approval_level',
            //   clause_type: 'where',
            //   field_value: 'approval_process_job_workflows.approver_order_no',
            //   is_sortable: 'true',
            //   column_order: '3.00',
            //   column_width: '1.00',
            //   is_searchable: 'true',
            //   is_grid_column: 'true',
            // },
            {
              header: 'details',
              clause_type: 'where',
              field_value: 'approval_process_job_workflows.details',
              is_sortable: 'true',
              column_order: '3.00',
              column_width: '1.00',
              is_searchable: 'true',
              is_grid_column: 'true',
            },
          ]
        : [
            {
              header: 'details',
              clause_type: 'where',
              field_value: 'approval_process_job_workflows.details',
              is_sortable: 'true',
              column_order: '3.00',
              column_width: '1.00',
              is_searchable: 'true',
              is_grid_column: 'true',
            },
          ]),
      ...(this.activeTab === Tabs.delegated_on_me
        ? [
            {
              header: 'delegated_by',
              clause_type: 'where',
              field_value: `u_delegator.email`,
              is_sortable: 'true',
              column_order: '4.00',
              column_width: '1.00',
              is_searchable: 'true',
              is_grid_column: 'true',
            },
            {
              header: 'start_date',
              clause_type: 'where',
              field_value: `d.start_date`,
              is_sortable: 'true',
              column_order: '5.00',
              column_width: '1.00',
              is_searchable: 'true',
              is_grid_column: 'true',
            },
            {
              header: 'end_date',
              clause_type: 'where',
              field_value: `d.end_date`,
              is_sortable: 'true',
              column_order: '6.00',
              column_width: '1.00',
              is_searchable: 'true',
              is_grid_column: 'true',
            },
            {
              header: 'details',
              clause_type: 'where',
              field_value: 'approval_process_job_workflows.details',
              is_sortable: 'true',
              column_order: '3.00',
              column_width: '1.00',
              is_searchable: 'true',
              is_grid_column: 'true',
            },
          ]
        : []),
      // {
      //   header: 'name',
      //   clause_type: 'where',
      //   field_value: "concat(ud1.first_name, ' ', ud1.last_name)",
      //   is_sortable: 'true',
      //   column_order: '2.00',
      //   column_width: '2.00',
      //   is_searchable: 'true',
      //   is_grid_column: 'true',
      // },
      {
        header: 'requested_by',
        clause_type: 'where',
        field_value: 'u1.email',
        is_sortable: 'true',
        column_order: '7.00',
        column_width: '1.00',
        is_searchable: 'true',
        is_grid_column: 'true',
      },
      ...(this.activeTab === Tabs.pending
        ? [
            {
              header: 'pending_with',
              clause_type: 'where',
              field_value: 'pending.approver_type',
              is_sortable: 'true',
              column_order: '8.00',
              column_width: '1.00',
              is_searchable: 'true',
              is_grid_column: 'true',
            },
            {
              header: 'pending_level',
              clause_type: 'where',
              field_value: 'pending.approver_order_no',
              is_sortable: 'true',
              column_order: '9.00',
              column_width: '1.00',
              is_searchable: 'true',
              is_grid_column: 'true',
            },
            {
              header: 'pending_approvers',
              clause_type: 'where',
              field_value: 'pending.pending_approvers',
              is_sortable: 'false',
              column_order: '0.00',
              column_width: '0.00',
              is_searchable: 'false',
              is_grid_column: 'false',
            },
          ]
        : []),
      ...(this.activeTab === Tabs.completed
        ? [
            {
              header: 'reviewed_by',
              clause_type: 'where',
              field_value: 'u2.email',
              is_sortable: 'true',
              column_order: '10.00',
              column_width: '3.00',
              is_searchable: 'true',
              is_grid_column: 'true',
            },
            {
              header: 'review_status',
              clause_type: 'where',
              field_value: 'approval_process_job_workflows.review_status',
              is_sortable: 'true',
              column_order: '11.00',
              column_width: '1.00',
              is_searchable: 'true',
              is_grid_column: 'true',
            },
            {
              header: 'reason',
              clause_type: 'where',
              field_value: 'approval_process_job_workflows.reason',
              is_sortable: 'true',
              column_order: '12.00',
              column_width: '1.00',
              is_searchable: 'true',
              is_grid_column: 'true',
            },
          ]
        : []),
      // {
      //   header: 'status',
      //   clause_type: 'where',
      //   field_value: 'approval_process_job_workflow_users.status_id',
      //   is_sortable: 'true',
      //   column_order: '13.00',
      //   column_width: '1.00',
      //   is_searchable: 'false',
      //   is_grid_column: 'true',
      // },
      {
        header: 'screen_id',
        clause_type: 'where',
        field_value: 'approval_process_job_workflows.screen_id',
        is_sortable: 'false',
        column_order: '0.00',
        column_width: '0.00',
        is_searchable: 'false',
        is_grid_column: 'false',
      },
      {
        header: 'url',
        clause_type: 'where',
        field_value: 'approval_process_job_workflows.url',
        is_sortable: 'false',
        column_order: '16.00',
        column_width: '1.00',
        is_searchable: 'false',
        is_grid_column: 'false',
      },
      ...(this.activeTab !== Tabs.pending
        ? [
            {
              header: 'approval_process_job_workflow_id',
              clause_type: 'where',
              field_value: 'approval_process_job_workflow_users.approval_process_job_workflow_id',
              is_sortable: 'false',
              column_order: '0.00',
              column_width: '0.00',
              is_searchable: 'false',
              is_grid_column: 'false',
            },
          ]
        : []),
      {
        header: 'approval_process_job_id',
        clause_type: 'where',
        field_value: 'approval_process_job_workflows.approval_process_job_id',
        is_sortable: 'false',
        column_order: '0.00',
        column_width: '0.00',
        is_searchable: 'false',
        is_grid_column: 'false',
      },
      ...(this.activeTab !== Tabs.pending
        ? [
            {
              header: 'approvers',
              clause_type: 'where',
              field_value: `(
            SELECT string_agg(u3.email, ', ')
            FROM users u3
            WHERE u3.id IN (
              SELECT apjwu1.user_id 
              FROM approval_process_job_workflow_users apjwu1 
              WHERE apjwu1.approval_process_job_workflow_id = approval_process_job_workflow_users.approval_process_job_workflow_id
                AND apjwu1.status_id != 3
            )
          )`,
              is_sortable: 'false',
              column_order: '0.00',
              column_width: '0.00',
              is_searchable: 'false',
              is_grid_column: 'false',
            },
          ]
        : []),
    ];
  }

  setDefaultQuery() {
    this.defaultQuery = {
      pending_on_me: {
        print_query: true,
        company_id: 1,
        primary_table: 'approval_process_job_workflow_users',
        start_index: 0,
        limit_range: 10,
        sort_columns: [['approval_process_job_workflows.approval_process_job_id', 'desc']],
        group_by: [
          'approval_process_job_workflows.approval_process_job_name',
          'ud1.first_name',
          'ud1.last_name',
          'u1.email',
          'u2.email',
          'approval_process_job_workflows.review_status',
          'approval_process_job_workflows.approver_type',
          'approval_process_job_workflows.approver_order_no',
          'approval_process_job_workflows.reason',
          'approval_process_job_workflow_users.status_id',
          'approval_process_job_workflows.screen_id',
          'approval_process_job_workflows.url',
          'approval_process_job_workflow_users.approval_process_job_workflow_id',
          'approval_process_job_workflows.approval_process_job_id',
          'approval_process_job_workflows.details',
        ],
        includes: [
          {
            join_type: 'INNER',
            table_name: 'approval_process_job_workflows',
            join_condition: `approval_process_job_workflows.id = approval_process_job_workflow_users.approval_process_job_workflow_id 
              AND approval_process_job_workflows.review_status IN (${this.approvalStatusData[this.activeTab].map((status: string) => `'${status}'`).join(',')})
              AND approval_process_job_workflows.status_id != 3`,
          },
          {
            join_type: 'LEFT',
            table_name: 'users u1',
            join_condition: 'u1.id = approval_process_job_workflows.user_id AND u1.status_id != 3',
          },
          {
            join_type: 'LEFT',
            table_name: 'user_details ud1',
            join_condition: 'ud1.user_id = u1.id',
          },
          {
            join_type: 'LEFT',
            table_name: 'users u2',
            join_condition: 'u2.id = approval_process_job_workflows.reviewed_by AND u2.status_id != 3',
          },
          {
            join_type: 'LEFT',
            table_name: 'user_details ud2',
            join_condition: 'ud2.user_id = u2.id',
          },
        ],
        // having_conditions: null,
        // having_any_conditions: null,
        search_all: [
          {
            column_name: 'approval_process_job_workflow_users.status_id',
            value: 3,
            operator: '!=',
          },
          {
            column_name: 'approval_process_job_workflow_users.user_id',
            value: this.user_info.main.id,
            operator: '=',
          },
        ],
        search_any: [],
        select_columns: [...this.headerColumnData.map((column: { field_value: any; header: any }) => [column.field_value, column.header])],
      },
      pending: {
        print_query: true,
        company_id: 1,
        primary_table: 'approval_process_job_workflows',
        start_index: 0,
        limit_range: 10,
        sort_columns: [['approval_process_job_workflows.id', 'desc']],
        group_by: [
          'approval_process_job_workflows.id',
          'approval_process_job_workflows.approval_process_job_name',
          'ud1.first_name',
          'ud1.last_name',
          'u1.email',
          'u2.email',
          'approval_process_job_workflows.reason',
          'approval_process_job_workflows.screen_id',
          'approval_process_job_workflows.url',
          'approval_process_job_workflows.approval_process_job_id',
          'pending.approver_type',
          'pending.approver_order_no',
          'pending.pending_approvers',
          'approval_process_job_workflows.details',
        ],
        includes: [
          {
            join_type: 'INNER',
            table_name: `(
              SELECT DISTINCT
                apjw_inner.approval_process_job_id,
                apjw_inner.company_id
              FROM approval_process_job_workflow_users apjwu
              INNER JOIN approval_process_job_workflows apjw_inner
                ON apjwu.company_id = apjw_inner.company_id
                AND apjwu.approval_process_job_workflow_id = apjw_inner.id
              WHERE (
                apjwu.user_id = ${this.user_info.main.id} -- direct user
                OR (
                  EXISTS (
                    SELECT 1
                    FROM delegations d
                    WHERE d.delegated_user_id = ${this.user_info.main.id}
                      AND d.user_id = apjwu.user_id
                      AND d.company_id = apjwu.company_id
                      AND NOW() BETWEEN d.start_date AND d.end_date
                  )
                  AND apjw_inner.reviewed_by IS NULL
                )
                OR apjw_inner.reviewed_by = ${this.user_info.main.id} -- user has reviewed (delegated)
              )
              AND apjwu.status_id != 3
              AND apjwu.company_id = 1
            )  user_jobs`,
            join_condition: `approval_process_job_workflows.approval_process_job_id = user_jobs.approval_process_job_id 
              AND approval_process_job_workflows.company_id = user_jobs.company_id
              AND approval_process_job_workflows.status_id != 3`,
          },
          {
            join_type: 'LEFT',
            table_name: 'users u1',
            join_condition: 'u1.id = approval_process_job_workflows.user_id AND u1.status_id != 3',
          },
          {
            join_type: 'LEFT',
            table_name: 'user_details ud1',
            join_condition: 'ud1.user_id = u1.id',
          },
          {
            join_type: 'LEFT',
            table_name: 'users u2',
            join_condition: 'u2.id = approval_process_job_workflows.reviewed_by AND u2.status_id != 3',
          },
          {
            join_type: 'LEFT',
            table_name: 'user_details ud2',
            join_condition: 'ud2.user_id = u2.id',
          },
          {
            join_type: 'LEFT',
            table_name: `LATERAL (
              SELECT awf.approver_type, awf.approver_order_no, (
                  SELECT string_agg(u4.email, ', ')
                  FROM users u4
                  WHERE u4.id IN (
                    SELECT apjwu1.user_id
                    FROM approval_process_job_workflow_users apjwu1
                    WHERE apjwu1.approval_process_job_workflow_id = awf.id
                      AND apjwu1.status_id != 3
                  )
                ) pending_approvers
              FROM approval_process_job_workflows awf
              WHERE awf.approval_process_job_id = approval_process_job_workflows.approval_process_job_id
                AND awf.review_status = 'approval_needed'
                AND awf.status_id != 3
                AND awf.company_id = approval_process_job_workflows.company_id
              ORDER BY awf.approver_order_no ASC
            ) pending`,
            join_condition: 'true',
          },
        ],
        // having_conditions: null,
        // having_any_conditions: null,
        search_all: [
          {
            column_name: 'approval_process_job_workflows.review_status',
            value: 'approval_needed',
            operator: '=',
          },
          {
            column_name: 'approval_process_job_workflows.status_id',
            value: 3,
            operator: '!=',
          },
          {
            column_name: 'approval_process_job_workflows.company_id',
            value: 1,
            operator: '=',
          },
        ],
        search_any: [],
        select_columns: [...this.headerColumnData.map((column: { field_value: any; header: any }) => [column.field_value, column.header])],
      },
      completed: {
        print_query: true,
        company_id: 1,
        primary_table: 'approval_process_job_workflow_users',
        start_index: 0,
        limit_range: 10,
        sort_columns: [['approval_process_job_workflows.approval_process_job_id', 'desc']],
        group_by: [
          'approval_process_job_workflows.approval_process_job_name',
          'ud1.first_name',
          'ud1.last_name',
          'u1.email',
          'u2.email',
          'approval_process_job_workflows.review_status',
          'approval_process_job_workflows.approver_type',
          'approval_process_job_workflows.approver_order_no',
          'approval_process_job_workflows.reason',
          'approval_process_job_workflow_users.status_id',
          'approval_process_job_workflows.screen_id',
          'approval_process_job_workflows.url',
          'approval_process_job_workflow_users.approval_process_job_workflow_id',
          'approval_process_job_workflows.approval_process_job_id',
          'approval_process_job_workflows.details',
        ],
        includes: [
          {
            join_type: 'INNER',
            table_name: 'approval_process_job_workflows',
            join_condition: `
              approval_process_job_workflows.company_id = approval_process_job_workflow_users.company_id 
              AND approval_process_job_workflows.status_id != 3
              AND approval_process_job_workflows.approval_process_job_id IN (
                SELECT DISTINCT 
                    apjw1.approval_process_job_id
                FROM 
                    approval_process_job_workflows apjw1
                LEFT JOIN approval_process_job_workflow_users apjwu1
                  ON apjwu1.approval_process_job_workflow_id = apjw1.id
                  AND apjwu1.company_id = apjw1.company_id
                  AND apjwu1.status_id != 3
                  AND apjwu1.user_id = ${this.user_info.main.id}
                LEFT JOIN delegations d
                  ON d.delegated_user_id = ${this.user_info.main.id}
                  AND d.status_id != 3
                  AND d.company_id = apjw1.company_id
                  AND apjw1.processed_at BETWEEN d.start_date AND d.end_date
                WHERE apjw1.company_id = approval_process_job_workflow_users.company_id
                  AND apjw1.status_id != 3
                  AND (
                    apjwu1.id IS NOT NULL                          -- directly assigned
                    OR (apjw1.reviewed_by = ${this.user_info.main.id} AND d.id IS NOT NULL) -- acted as delegate
                  )
              )
              AND (
                approval_process_job_workflows.review_status = 'approval_rejected'
                OR (
                  approval_process_job_workflows.review_status = 'approval_completed'
                  AND approval_process_job_workflows.approver_order_no = (
                    SELECT
                      MAX(approver_order_no)
                    FROM
                      approval_process_job_workflows apjw2
                    WHERE
                      apjw2.approval_process_job_id = approval_process_job_workflows.approval_process_job_id
                      AND apjw2.status_id != 3
                      AND apjw2.company_id = approval_process_job_workflow_users.company_id
                  )
                  AND (
                    SELECT
                      COUNT(*)
                    FROM
                      approval_process_job_workflows apjw3
                    WHERE
                      apjw3.approval_process_job_id = approval_process_job_workflows.approval_process_job_id
                      AND apjw3.status_id != 3
                      AND apjw3.company_id = approval_process_job_workflow_users.company_id
                      AND apjw3.review_status = 'approval_completed'
                  ) = (
                    SELECT
                      COUNT(*)
                    FROM
                      approval_process_job_workflows apjw4
                    WHERE
                      apjw4.approval_process_job_id = approval_process_job_workflows.approval_process_job_id
                      AND apjw4.status_id != 3
                      AND apjw4.company_id = approval_process_job_workflow_users.company_id
                  )
                )
              )
              AND approval_process_job_workflows.id = approval_process_job_workflow_users.approval_process_job_workflow_id
            `,
          },
          {
            join_type: 'LEFT',
            table_name: 'users u1',
            join_condition: 'u1.id = approval_process_job_workflows.user_id AND u1.status_id != 3',
          },
          {
            join_type: 'LEFT',
            table_name: 'user_details ud1',
            join_condition: 'ud1.user_id = u1.id',
          },
          {
            join_type: 'LEFT',
            table_name: 'users u2',
            join_condition: 'u2.id = approval_process_job_workflows.reviewed_by AND u2.status_id != 3',
          },
          {
            join_type: 'LEFT',
            table_name: 'user_details ud2',
            join_condition: 'ud2.user_id = u2.id',
          },
        ],
        // having_conditions: null,
        // having_any_conditions: null,
        search_all: [
          {
            column_name: 'approval_process_job_workflow_users.status_id',
            value: 1,
            operator: '=',
          },
          {
            column_name: 'approval_process_job_workflow_users.company_id',
            value: 1,
            operator: '=',
          },
        ],
        search_any: [],
        select_columns: [...this.headerColumnData.map((column: { field_value: any; header: any }) => [column.field_value, column.header])],
      },
      delegated_on_me: {
        print_query: true,
        company_id: 1,
        primary_table: 'approval_process_job_workflow_users',
        start_index: 0,
        limit_range: 10,
        sort_columns: [['approval_process_job_workflows.approval_process_job_id', 'desc']],
        group_by: [
          'approval_process_job_workflows.approval_process_job_name',
          'ud1.first_name',
          'ud1.last_name',
          'u1.email',
          'u2.email',
          'approval_process_job_workflows.review_status',
          'approval_process_job_workflows.approver_type',
          'approval_process_job_workflows.approver_order_no',
          'approval_process_job_workflows.reason',
          'approval_process_job_workflow_users.status_id',
          'approval_process_job_workflows.screen_id',
          'approval_process_job_workflows.url',
          'approval_process_job_workflow_users.approval_process_job_workflow_id',
          'approval_process_job_workflows.approval_process_job_id',
          'u_delegator.email',
          'd.start_date',
          'd.end_date',
          'approval_process_job_workflows.details',
        ],
        includes: [
          {
            join_type: 'INNER',
            table_name: 'delegations d',
            join_condition: `D.delegated_user_id = ${this.user_info.main?.id} 
            AND d.status_id != 3 
            AND d.company_id = approval_process_job_workflow_users.company_id
            AND NOW() BETWEEN d.start_date AND d.end_date
            AND approval_process_job_workflow_users.user_id = d.user_id`,
          },
          {
            join_type: 'INNER',
            table_name: 'approval_process_job_workflows',
            join_condition: `approval_process_job_workflows.id = approval_process_job_workflow_users.approval_process_job_workflow_id 
              AND approval_process_job_workflows.review_status IN (${this.approvalStatusData[this.activeTab].map((status: string) => `'${status}'`).join(',')})
              AND approval_process_job_workflows.status_id != 3`,
          },
          {
            join_type: 'LEFT',
            table_name: 'users u1',
            join_condition: 'u1.id = approval_process_job_workflows.user_id AND u1.status_id != 3',
          },
          {
            join_type: 'LEFT',
            table_name: 'user_details ud1',
            join_condition: 'ud1.user_id = u1.id',
          },
          {
            join_type: 'LEFT',
            table_name: 'users u2',
            join_condition: 'u2.id = approval_process_job_workflows.reviewed_by AND u2.status_id != 3',
          },
          {
            join_type: 'LEFT',
            table_name: 'user_details ud2',
            join_condition: 'ud2.user_id = u2.id',
          },
          {
            join_type: 'LEFT',
            table_name: 'users u_delegator',
            join_condition: 'u_delegator.id = d.user_id',
          },
        ],
        // having_conditions: null,
        // having_any_conditions: null,
        search_all: [
          {
            column_name: 'approval_process_job_workflow_users.status_id',
            value: 3,
            operator: '!=',
          },
        ],
        search_any: [],
        select_columns: [...this.headerColumnData.map((column: { field_value: any; header: any }) => [column.field_value, column.header])],
      },
    };
    this.listQuery = JSON.parse(JSON.stringify(this.defaultQuery[this.activeTab]));
  }

  async setActiveTab(tab: Tabs) {
    this.activeTab = tab;
    this.query = '';
    this.setHeader();
    this.setDefaultQuery();
    this.fetchData(this.listQuery);
    this.cdr.detectChanges();
  }

  async initStore() {
    this.storeData
      .select((d) => d.index)
      .subscribe((d) => {
        this.store = d;
      });
  }

  sortColumn(column: any) {
    this.column = column;

    //this.listQuery.start_index = this.currentPage;
    this.listQuery.limit_range = this.resultsPerPage;
    this.listQuery.sort_columns = [[this.column.field_value, this.column.sortDirection]];
    this.fetchData(this.listQuery);
  }

  advancedSearchData(data: any) {
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
    const orgListQuery = this.defaultQuery[this.activeTab];
    if (whereConditions.length == 0 && havingConditions.length == 0) {
      if (condition == 'AND') {
        clonedListQuery.search_all = [...orgListQuery.search_all];
      } else {
        clonedListQuery.search_any = [...orgListQuery.search_any];
      }
      this.fetchData(clonedListQuery);
      return;
    }
    if (havingConditions.length > 0) {
      if (condition == 'AND') {
        clonedListQuery.having_conditions = [...havingConditions];
      } else {
        clonedListQuery.having_any_conditions = [...havingConditions];
      }
    }
    if (condition == 'AND') {
      if (whereConditions.length === 1 && whereConditions[0].column_name === '') {
        clonedListQuery.search_all = [];
        clonedListQuery.search_all = [...orgListQuery.search_all];
      } else {
        clonedListQuery.search_all = [];
        clonedListQuery.search_all = [...orgListQuery.search_all, ...whereConditions];
      }
      clonedListQuery.start_index = 0;
      this.currentPage = 1;

      this.fetchData(clonedListQuery);
    } else {
      if (whereConditions.length === 1 && whereConditions[0].column_name === '') {
        clonedListQuery.search_any = [...clonedListQuery.search_any];
      } else {
        clonedListQuery.search_any = [...clonedListQuery.search_any, ...whereConditions];
      }
      clonedListQuery.start_index = 0;
      this.currentPage = 1;

      this.fetchData(clonedListQuery);
    }
  }
  searchData(input: any) {
    const clonedListQuery = this.listQuery;
    if (input.where.data.length) {
      const query = input.where.data;
      const search = input.where.search;
      if (search == '') {
        const orgListQuery = this.defaultQuery[this.activeTab];

        clonedListQuery.search_any = [];
        clonedListQuery.search_any = [...orgListQuery.search_any];
        this.fetchData(clonedListQuery);
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
    this.fetchData(clonedListQuery);
  }

  exportTable(item: any) {
    if (this.masterInfo.permissions.export_excel) {
      this.loading = true;
      if (this.masterInfo.children.export_excel && this.masterInfo.children.export_excel.component_class_name == 'export_module') {
        this.exportItem(item);
      } else {
        const query = { ...this.listQuery };
        query.limit_range = 1000000;
        const export_download = this.masterInfo?.Listname.replace('_grid', '') + '_table_data';
        this.gridApiService
          .getAllRecords(
            this.localStorageService.replaceUniqueId(
              this.localStorageService.formatPayloadWithPolicyConditions(query, this.policyData, this.attachedPolicies),
              '$session_user_id',
              this.user_info.main.id
            )
          )
          .subscribe(
            (response) => {
              if (response.status && response.code === 200) {
                if (response.data.records && response.data.headers) {
                  const filteredData = this.filterAndTransformData(response.data.headers, response.data.records);
                  if (item.type == 'pdf') {
                    this.exportService.exportToPDF(filteredData, export_download);
                  } else {
                    this.exportService.exportToExcel(filteredData, export_download);
                  }
                  this.loading = false;
                }
              } else {
                this.loading = false;
                this.items = [];
                this.totalItems = 0;

                const key = response.message;
                const errorMessage = this.translate.instant(key);
                this.toastr.error(errorMessage, 'Error');
              }
            },
            (error) => {
              this.loading = false;
              const key = 'error';
              const errorMessage = this.translate.instant(key);
              this.toastr.error(errorMessage, 'Error');
            }
          );
      }
    }
  }

  private filterAndTransformData(headers: any[], records: any[]): any[] {
    const filteredHeaders = headers.filter((header) => header.header !== 'id' && header.header !== 'uuid');

    const transformedRecords = records.map((record) => {
      const transformedRecord: any = {};

      filteredHeaders.forEach((header) => {
        const translationKey = `${header.header}`;

        const translatedHeader = this.translate.instant(translationKey);

        if (header.field_type_id == '5') {
          transformedRecord[translatedHeader] = this.datePipe.transform(record[header.header], 'yyyy-MM-dd');
        } else if (header.field_type_id == '7') {
          transformedRecord[translatedHeader] = this.datePipe.transform(record[header.header], 'yyyy-MM-ddTHH:mm:ss');
        } else if (header.header == 'status') {
          transformedRecord[translatedHeader] = this.getStatusTranslation(record[header.header]);
        } else {
          transformedRecord[translatedHeader] = record[header.header];
        }
      });

      return transformedRecord;
    });

    return transformedRecords;
  }

  private getStatusTranslation(status: string): string {
    return this.translate.instant(this.statuses[status].value);
  }

  fetchAttachedPolicies(params: FetchDataParams) {
    this.gridApiService.getAttachedPolicies({ entity_name: params.primary_table }).subscribe(
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
        field: 'approval_process_job_workflows.approval_process_job_name',
        clause_type: 'where',
        sorting: true,
        title: this.translate.instant('job_name'),
        field_type_id: 3,
        searchable: true,
        is_grid_column: true,
        enable: true,
      },
      {
        order_no: 3,
        status_id: 1,
        company_id: 1,
        field: 'approval_process_job_workflows.details',
        clause_type: 'where',
        sorting: true,
        title: this.translate.instant('details'),
        field_type_id: 3,
        searchable: false,
        is_grid_column: true,
        enable: true,
      },
      // {
      //   order_no: 3,
      //   status_id: 1,
      //   company_id: 1,
      //   field: 'approval_process_job_workflows.approver_type',
      //   clause_type: 'where',
      //   sorting: true,
      //   title: this.translate.instant('approver_type'),
      //   field_type_id: 3,
      //   searchable: false,
      //   is_grid_column: true,
      //   enable: true,
      // },
      // {
      //   order_no: 4,
      //   status_id: 1,
      //   company_id: 1,
      //   field: 'approval_process_job_workflows.approver_order_no',
      //   clause_type: 'where',
      //   sorting: true,
      //   title: this.translate.instant('approval_level'),
      //   field_type_id: 1,
      //   searchable: true,
      //   is_grid_column: true,
      //   enable: true,
      // },
      // {
      //   order_no: 2,
      //   status_id: 1,
      //   company_id: 1,
      //   field: "concat(ud1.first_name, ' ', ud1.last_name)",
      //   clause_type: 'where',
      //   sorting: true,
      //   title: this.translate.instant('requested_user_name'),
      //   field_type_id: 3,
      //   searchable: true,
      //   is_grid_column: true,
      //   enable: true,
      // },
      {
        order_no: 5,
        status_id: 1,
        company_id: 1,
        field: 'u1.email',
        clause_type: 'where',
        sorting: true,
        title: this.translate.instant('requested_by'),
        field_type_id: 3,
        searchable: true,
        is_grid_column: true,
        enable: true,
      },
      ...(this.activeTab === Tabs.completed
        ? [
            {
              order_no: 6,
              status_id: 1,
              company_id: 1,
              field: 'approval_process_job_workflows.reason',
              clause_type: 'where',
              sorting: true,
              title: this.translate.instant('reason'),
              field_type_id: 3,
              searchable: true,
              is_grid_column: true,
              enable: true,
            },
            {
              order_no: 7,
              status_id: 1,
              company_id: 1,
              field: 'approval_process_job_workflows.review_status',
              clause_type: 'where',
              sorting: true,
              title: this.translate.instant('review_status'),
              field_type_id: 3,
              searchable: true,
              is_grid_column: true,
              enable: true,
            },
            {
              order_no: 8,
              status_id: 1,
              company_id: 1,
              field: 'u2.email',
              clause_type: 'where',
              sorting: true,
              title: this.translate.instant('reviewed_by'),
              field_type_id: 3,
              searchable: true,
              is_grid_column: true,
              enable: true,
            },
            // {
            //   order_no: 2,
            //   status_id: 1,
            //   company_id: 1,
            //   field: "concat(ud2.first_name, ' ', ud2.last_name)",
            //   clause_type: 'where',
            //   sorting: true,
            //   title: this.translate.instant('requested_user_name'),
            //   field_type_id: 3,
            //   searchable: true,
            //   is_grid_column: true,
            //   enable: true,
            // },
          ]
        : []),

      {
        order_no: 9,
        status_id: 1,
        company_id: 1,
        field: 'approval_process_job_workflows.review_status',
        clause_type: 'where',
        sorting: false,
        title: this.translate.instant('review_status'),
        field_type_id: 3,
        searchable: false,
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
        enable: false,
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

  fetchData(params: FetchDataParams) {
    params.limit_range = this.resultsPerPage;
    const payload = this.localStorageService.replaceUniqueId(
      this.localStorageService.formatPayloadWithPolicyConditions(params, this.policyData, this.attachedPolicies),
      '$session_user_id',
      this.user_info.main.id
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

          console.log('data : ', data);
          // Check if only 'view' or 'view' + 'export_excel' are enabled
          const isOnlyViewOrViewExport =
            (!this.masterInfo.permissions.export_excel || this.masterInfo.permissions.export_excel === true) &&
            (!this.masterInfo.permissions.create || this.masterInfo.permissions.create === true) &&
            Object.keys(this.masterInfo.permissions).every((key) => key === 'export_excel' || key === 'create' || this.masterInfo.permissions[key] === false);

          // Include serial number column if enabled in config
          if (this.config.grid_show_serial_number == 'true') {
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
            } else if (item.header === 'review_status') {
              return {
                ...item,
                customTemplate: this.approvalStatusTemplate,
              };
            } else if (item.header === 'table_column_action') {
              return {
                ...item,
                customTemplate: this.actionTemplate,
              };
            } else if (item.header === 'approver_type') {
              return {
                ...item,
                customTemplate: this.approverListTemplate,
              };
            } else if (item.header === 'pending_with') {
              return {
                ...item,
                customTemplate: this.pendingApproverListTemplate,
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
                  const transformedDate = this.datepipe.transform(new Date(formattedItem[key]), 'yyyy-MM-dd HH:mm:ss');
                  if (transformedDate) {
                    formattedItem[key] = transformedDate;
                  }
                }
              }

              if (this.config.grid_show_serial_number == 'true') {
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

  isDate(value: any): boolean {
    // Check if the value is a valid date
    return !isNaN(Date.parse(value));
  }

  formatDate(value: string): string | null {
    return this.datepipe.transform(value, 'yyyy-MM-dd');
  }

  capitalizeFirstLetter(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  handleCustomAction(action: string) {
    if (action === 'addNew' && this.masterInfo.children.add) {
      this.router.navigate([`${this.masterInfo.children.add.target}`]);
    }
  }

  exportItem(item: any) {
    if (this.masterInfo.children.export_excel) {
      this.gridApiService.exportAllRecords(this.masterInfo.children.export_excel.id).subscribe({
        next: (response: ExportResponse) => {
          try {
            const blob = new Blob([response.blob], {
              type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });

            if (item.type === 'excel') {
              // Excel case
              const url = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = response.fileName;

              // Trigger download
              document.body.appendChild(link);
              link.click();

              // Cleanup
              document.body.removeChild(link);
              window.URL.revokeObjectURL(url);
              this.loading = false;
            } else if (item.type === 'pdf') {
              // Convert Excel to PDF
              this.convertExcelToPDF(blob, response.fileName.replace('.xlsx', '.pdf'));
              this.loading = false;
            }
          } catch (err) {
            this.loading = false;
            console.error('Download error:', err);
            this.toastr.error('Error downloading file');
          }
        },
        error: (error) => {
          this.loading = false;
          console.error('Export error:', error);
          this.toastr.error('Error exporting data');
        },
      });
    }
  }

  convertExcelToPDF(blob: Blob, pdfFileName: string) {
    const reader = new FileReader();

    // Read the Excel file
    reader.onload = (event: any) => {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: 'array' });

      // Extract the first sheet
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      // Convert the sheet to JSON
      const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Generate a PDF
      const doc = new jsPDF();
      let y = 10; // Start at y=10 for the first line

      // Loop through the sheetData and add it to the PDF
      sheetData.forEach((row: any) => {
        const rowText = row.join('  '); // Join columns with a space
        doc.text(rowText, 10, y);
        y += 10; // Move down for the next row
      });

      // Save the PDF
      doc.save(pdfFileName);
    };

    // Read the Blob as an ArrayBuffer
    reader.readAsArrayBuffer(blob);
  }

  commonTranslate(msg: any) {
    return this.translate.instant(msg);
  }

  viewItem(item: any) {
    if (this.masterInfo.children.details) {
      const targetRoute = this.masterInfo.children.details.target.replace(':uuid', item.approval_process_job_id);
      this.router.navigate([targetRoute]);
    }
  }

  navigateToDetailPage(item: any) {
    const fullUrl = `${item.url}${item.screen_id}`;
    this.router.navigate([fullUrl]);
  }

  onPageChange(event: { page: number; start_index: number }) {
    this.currentPage = event.page;
    this.listQuery.start_index = event.start_index;
    this.listQuery.limit_range = this.resultsPerPage;
    this.fetchData(this.listQuery);
  }

  onResultsPerPageChange(event: { resultsPerPage: number; start_index: number }) {
    this.currentPage = 1;
    this.resultsPerPage = event.resultsPerPage;
    this.listQuery.start_index = event.start_index;
    this.listQuery.limit_range = event.resultsPerPage;
    this.fetchData(this.listQuery);
  }

  openApprovalProcessPopup(item: any, status: 'approval_completed' | 'approval_rejected') {
    this.isInfoModalOpen = true;
    this.selectedRequest = item;
    this.approvalForm.controls['review_status'].setValue(status);
  }

  closeApprovalProcessPopup() {
    this.isInfoModalOpen = false;
    this.selectedRequest = null;
  }

  onSubmit() {
    this.submitted = true;
    if (this.approvalForm.invalid) {
      this.approvalForm.markAllAsTouched();
      return;
    }
    if (this.activeTab === Tabs.delegated_on_me) {
      const nowUtc = new Date().toISOString();

      const startUtc = new Date(this.selectedRequest.start_date).toISOString();
      const endUtc = new Date(this.selectedRequest.end_date).toISOString();

      const isWithinRange = nowUtc >= startUtc && nowUtc <= endUtc;

      if (!isWithinRange) return;
    }

    const payload: any = {
      data: {
        table1: [
          {
            reason: this.approvalForm.value.reason,
            review_status: this.approvalForm.value.review_status,
            processed_at: new Date(),
            reviewed_by: this.user_id,
          },
        ],
      },
      table: ['approval_process_job_workflows'],
      action: ['update'],
      conditions: {
        table1: [
          {
            id: this.selectedRequest.approval_process_job_workflow_id,
            review_status: 'approval_needed',
          },
        ],
      },
      table_mapping: ['table1'],
    };
    this.loading = true;
    this.gridApiService.executeRecords(payload).subscribe({
      next: (response: any) => {
        this.loading = false;
        if (response.code === 200 && response.status) {
          this.toastr.success('Record updated successfully', 'Success');
          this.setActiveTab(Tabs.pending_on_me);
        } else {
          this.toastr.error('Error updating record', 'Error');
        }
      },
      error: (error) => {
        this.loading = false;
        this.toastr.error('Error updating record', 'Error');
      },
    });
    this.closeApprovalProcessPopup();
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.approvalForm.get(fieldName);
    return field ? field.invalid && (field.touched || this.submitted) : false;
  }

  getErrorMessage(fieldName: string): string {
    const field = this.approvalForm.get(fieldName);
    if (field) {
      if (field.hasError('required')) {
        return 'required_message';
      }
      if (field.hasError('maxlength')) {
        return `Maximum length exceeded (${field.errors?.['maxlength'].requiredLength} characters allowed)`;
      }
      if (field.hasError('min')) {
        return `Minimum value is ${field.errors?.['min'].min}`;
      }
      if (field.hasError('viewMandatory')) {
        return '"view" option is mandatory';
      }
    }
    return '';
  }
}
