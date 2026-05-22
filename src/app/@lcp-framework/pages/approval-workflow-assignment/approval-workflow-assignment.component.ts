import { Component, OnInit, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, Validators } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { FormlyModule } from '@ngx-formly/core';
import { FormlyBootstrapModule } from '@ngx-formly/bootstrap';
import { FormlyConfigModule } from '../../formly/formly-config.module';
import { CommonModule, Location } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MenuMapService } from '../../service/common/menu-map.service';
import { GridApiService } from '../../service/common/grid.service';
import { ToastrService } from 'ngx-toastr';
import { CommonSharedModule } from '../../shared/common/common.module';
import { LocalStorageService } from '../../service/common/local-storage.service';
import { NgSelectModule } from '@ng-select/ng-select';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { EditorComponent } from 'ngx-monaco-editor-v2';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { LoaderComponent } from '../../components/loader/loader.component';
import { AutocompleteFormComponent } from '../../components/autocomplete-form/autocomplete-form.component';

@Component({
  selector: 'app-approval-workflow-assignment',
  standalone: true,
  imports: [
    FormlyModule,
    CommonSharedModule,
    LoaderComponent,
    FormlyBootstrapModule,
    ReactiveFormsModule,
    FormlyConfigModule,
    MonacoEditorModule,
    FormsModule,
    CommonModule,
    NgSelectModule,
  ],
  templateUrl: './approval-workflow-assignment.component.html',
  styleUrl: './approval-workflow-assignment.component.scss',
  animations: [
    trigger('slideDownUp', [
      state('true', style({ height: '*', opacity: 1 })),
      state('false', style({ height: '0px', opacity: 0 })),
      transition('false <=> true', animate('300ms ease-in-out')),
    ]),
  ],
})
export class ApprovalWorkflowAssignmentComponent implements OnInit {
  form: FormGroup;
  uniqueId: string | null = null;
  loading: boolean = false;
  approverTags: {
    id: number;
    name: string;
  }[] = [];
  templateList: { label: string; value: number }[] = [];
  userId: number = 0;
  options: any[] = [];
  approverTypes: any[] = [
    { label: 'Tag', value: 'tag' },
    { label: 'User', value: 'user_id' },
    { label: 'Role', value: 'role_id' },
  ];
  userList: any[] = [];
  roleList: any[] = [];
  tagList: any[] = [];
  emailTemplateList: { id: number; name: string }[] = [];
  whatsappTemplateList: { id: number; name: string }[] = [];

  editorOptions = { theme: 'vs-dark', language: 'json', tabSize: 1, insertSpaces: true };
  isDarkTheme = true; // Default theme
  @ViewChild('monacoEditor') monacoEditor: EditorComponent | undefined;

  isInfoModalOpen: boolean = false;
  infoContents: any = {
    approve_query_information: {
      header: 'Approve Query Information',
      comments: [],
      data: ['select * from users limit 1', 'select * from user_details limit 1'],
    },
    reject_query_information: {
      header: 'Reject Query Information',
      comments: [],
      data: ['select * from users limit 1', 'select * from user_details limit 1'],
    },
  };
  popupInformation: any = null;
  popupInfoEditorOptions = { ...this.editorOptions, cursorStyle: 'line', readOnly: true, automaticLayout: true, minimap: { enabled: false } };
  copied = false;

  constructor(
    private fb: FormBuilder,
    public translate: TranslateService,
    public location: Location,
    public router: Router,
    private route: ActivatedRoute,
    public commonService: MenuMapService,
    private gridApiService: GridApiService,
    private toastr: ToastrService,
    public localStorageService: LocalStorageService
  ) {
    this.route.paramMap.subscribe((params) => {
      this.uniqueId = params.get('uuid');
    });
    this.form = this.fb.group({
      approvalWorkflow: this.fb.group({
        id: [null, Validators.required],
        name: [{ value: '' }, Validators.required],
        slug: ['', Validators.required],
      }),
      approvalWorkflowAssignments: this.fb.array([]),
    });
  }

  async ngOnInit() {
    await this.getEmailTemplateList();

    await this.getWhatsappTemplateList();

    // get approval workflow details
    await this.getApprovalWorkflowDetail();

    this.userId = this.localStorageService.getData('user_data') && JSON.parse(this.localStorageService.getData('user_data')).main.id;
  }

  async getApprovalWorkflowDetail() {
    const payload = {
      company_id: 1,
      group_by: ['approval_workflows.id', 'approval_workflows.name', 'approval_workflows.slug'],
      search_all: [
        {
          value: '3',
          operator: '!=',
          column_name: 'approval_workflows.status_id',
        },
        {
          value: this.uniqueId,
          operator: '=',
          column_name: 'approval_workflows.uuid',
        },
      ],
      includes: [
        {
          join_type: 'LEFT',
          table_name: 'approval_workflow_assignments',
          join_condition: 'approval_workflow_assignments.approval_workflow_slug = approval_workflows.slug AND approval_workflow_assignments.status_id != 3',
        },
      ],
      limit_range: 1,
      print_query: true,
      start_index: 0,
      primary_table: 'approval_workflows',
      select_columns: [
        ['approval_workflows.id'],
        ['approval_workflows.slug'],
        ['approval_workflows.name'],
        [
          `COALESCE(JSON_AGG(
              DISTINCT JSONB_BUILD_OBJECT(
                'id', approval_workflow_assignments.id, 
                'approver_order_no', approval_workflow_assignments.approver_order_no, 
                'approver_type', approval_workflow_assignments.approver_type,
                'approver', approval_workflow_assignments.approver,
                'approve_query_information', approval_workflow_assignments.approve_query_information,
                'reject_query_information', approval_workflow_assignments.reject_query_information,
                'approved_mail', approval_workflow_assignments.approve_mail_id,
                'reject_mail', approval_workflow_assignments.reject_mail_id,
                'approved_whatsapp', approval_workflow_assignments.approve_whatsapp_id,
                'reject_whatsapp', approval_workflow_assignments.reject_whatsapp_id
              )
          ) FILTER (WHERE approval_workflow_assignments.id IS NOT NULL), '[]')`,
          'approval_assignments',
        ],
      ],
    };
    this.commonService.getCommonList(payload).subscribe({
      next: (response: any) => {
        if (response.code === 200 && response.status) {
          if (response.data.records.length) {
            this.form.controls['approvalWorkflow'].patchValue({
              id: response.data.records[0].id,
              slug: response.data.records[0].slug,
              name: response.data.records[0].name,
              accept_email: response.data.records[0].approved_mail ? response.data.records[0].approved_mail : null,
              reject_email: response.data.records[0].reject_mail ? response.data.records[0].reject_mail : null,
              accept_whatsapp: response.data.records[0].approved_whatsapp ? response.data.records[0].approved_whatsapp : null,
              reject_whatsapp: response.data.records[0].reject_whatsapp ? response.data.records[0].reject_whatsapp : null,
            });
            if (response.data.records[0]?.approval_assignments.length) {
              const lineItemsArray: any = this.form.get('approvalWorkflowAssignments') as FormArray;

              response.data.records[0]?.approval_assignments.map(
                (
                  each: {
                    id: any;
                    approver_type: string;
                    approver_order_no: any;
                    approver: any;
                    approve_query_information: any[];
                    reject_query_information: any[];
                    approved_mail: number | null;
                    reject_mail: number | null;
                    approved_whatsapp: number | null;
                    reject_whatsapp: number | null;
                  },
                  index: any
                ) => {
                  lineItemsArray.push(
                    this.fb.group({
                      id: [each.id],
                      approver_type: [each.approver_type || 'tag', Validators.required],
                      approver_order_no: [each.approver_order_no, Validators.required],
                      approver: [each.approver, Validators.required],
                      approval_workflow_slug: [response.data.records[0].slug, Validators.required],
                      approve_query_information: [this.prettyJSON(each.approve_query_information || []), Validators.required],
                      reject_query_information: [this.prettyJSON(each.reject_query_information || []), Validators.required],
                      accordian: false,
                      user_list: [null],
                      role_list: [null],
                      tag_list: [null],
                      accept_email: each.approved_mail,
                      reject_email: each.reject_mail,
                      accept_whatsapp: each.approved_whatsapp,
                      reject_whatsapp: each.reject_whatsapp,
                      tag: [each.approver_type === 'tag' ? each.approver?.split(',') : null],
                      users: [
                        each.approver_type === 'user_id'
                          ? each.approver
                              ?.split(',')
                              .map(Number)
                              .filter((n: number) => !isNaN(n))
                          : null,
                      ],
                      roles: [
                        each.approver_type === 'role_id'
                          ? each.approver
                              ?.split(',')
                              .map(Number)
                              .filter((n: number) => !isNaN(n))
                          : null,
                      ],
                    })
                  );
                  if (each.approver_type === 'tag') {
                    this.getTags(lineItemsArray.controls[lineItemsArray.length - 1], index, '');
                  }
                  if (each.approver_type === 'user_id') {
                    this.getUsers(lineItemsArray.controls[lineItemsArray.length - 1], index, '');
                  }
                  if (each.approver_type === 'role_id') {
                    this.getRoles(lineItemsArray.controls[lineItemsArray.length - 1], index, '');
                  }
                }
              );
            } else {
              this.addApproverAssignment();
              const lineItemsArray = this.form.get('approvalWorkflowAssignments') as FormArray;
              lineItemsArray.controls[lineItemsArray.length - 1].patchValue({
                approval_workflow_slug: response.data.records[0].slug,
              });
            }
          }
        }
      },
    });
  }

  async getEmailTemplateList() {
    const payload = {
      company_id: 1,
      group_by: ['notification_templates.id', 'notification_templates.name'],
      search_all: [
        {
          value: 'email',
          operator: '=',
          column_name: 'notification_templates.notification_type',
        },
        {
          value: '3',
          operator: '!=',
          column_name: 'notification_templates.status_id',
        },
      ],
      limit_range: 1000,
      print_query: true,
      start_index: 0,
      primary_table: 'notification_templates',
      select_columns: [['notification_templates.id'], ['notification_templates.name']],
    };
    this.commonService.getCommonList(payload).subscribe({
      next: (response: any) => {
        if (response.status) {
          this.emailTemplateList = response.data.records;
        }
      },
    });
  }

  async getWhatsappTemplateList() {
    const payload = {
      company_id: 1,
      group_by: ['notification_templates.id', 'notification_templates.name'],
      search_all: [
        {
          value: '3',
          operator: '!=',
          column_name: 'notification_templates.status_id',
        },
        {
          value: 'whatsapp',
          operator: '=',
          column_name: 'notification_templates.notification_type',
        },
      ],
      limit_range: 100,
      print_query: true,
      start_index: 0,
      primary_table: 'notification_templates',
      select_columns: [['notification_templates.id'], ['notification_templates.name']],
    };
    this.commonService.getCommonList(payload).subscribe({
      next: (response: any) => {
        if (response.status) {
          this.whatsappTemplateList = response.data.records;
        }
      },
    });
  }

  get approvalWorkflow() {
    return this.form.get('approvalWorkflow')?.getRawValue();
  }

  get approvalWorkflowAssignments() {
    return this.form.get('approvalWorkflowAssignments')?.getRawValue();
  }

  getApproverAssignmentList() {
    const lineItemsArray = this.form.get('approvalWorkflowAssignments') as FormArray;
    return lineItemsArray?.controls?.length ? lineItemsArray.controls : [];
  }

  addApproverAssignment(): void {
    const lineItemsArray = this.form.get('approvalWorkflowAssignments') as FormArray;
    const newFormGroup = this.fb.group({
      id: [0],
      approver_type: ['tag', Validators.required],
      approver_order_no: [null, Validators.required],
      approver: [null, Validators.required],
      approval_workflow_slug: ['', Validators.required],
      approve_query_information: ['[]', Validators.required],
      reject_query_information: ['[]', Validators.required],
      accordian: false,
      user_list: [null],
      role_list: [null],
      tag_list: [null],
      tag: [null],
      users: [null],
      roles: [null],
      accept_email: [null],
      reject_email: [null],
      accept_whatsapp: [null],
      reject_whatsapp: [null],
    });

    // Push the new form group
    lineItemsArray.push(newFormGroup);

    // Pass the newly added FormGroup to the function
    this.clearUserRoleTagValues(newFormGroup);
  }

  removeApprovalWorkflowAssignment(index: number): void {
    const lineItemsArray = this.form.get('approvalWorkflowAssignments') as FormArray;
    lineItemsArray.removeAt(index);
    // Update `approver_order_no` for remaining items
    lineItemsArray.controls.forEach((control, idx) => {
      control.patchValue({ approver_order_no: idx + 1 }); // Set order as sequential
    });
  }

  clearUserRoleTagValues(formGroup: any, index?: number) {
    formGroup.get('approver')?.setValue(null);
    switch (formGroup.controls['approver_type'].value) {
      case 'role_id':
        this.getRoles(formGroup, index || this.approvalWorkflowAssignments.length - 1, '');
        break;
      case 'user_id':
        this.getUsers(formGroup, index || this.approvalWorkflowAssignments.length - 1, '');
        break;
      default:
        this.getTags(formGroup, index || this.approvalWorkflowAssignments.length - 1, '');
    }
  }

  updateApprovers(formGroup: any, index?: number) {
    switch (formGroup.controls['approver_type'].value) {
      case 'role_id':
        formGroup?.patchValue({
          approver: formGroup.controls['roles'].value.join(','),
          users: null,
          tag: null,
        });
        break;
      case 'user_id':
        formGroup?.patchValue({
          approver: formGroup.controls['users'].value.join(','),
          roles: null,
          tag: null,
        });
        break;
      default:
        formGroup?.patchValue({
          approver: formGroup.controls['tag'].value.join(','),
          users: null,
          roles: null,
        });
    }
  }

  fetchMappedData(key: string, index: number) {
    let ids: any[] = [];
    this.approvalWorkflowAssignments.map((each: any, i: number) => {
      if (index !== i && each[key]?.length) ids = [...ids, ...each[key]];
    });
    return ids;
  }

  getUsers(formGroup: any, index: number, uname?: string) {
    // const mappedUsers = this.fetchMappedData('users', index);
    let payload = {
      company_id: 1,
      search_all: [
        {
          value: '1',
          operator: '=',
          column_name: 'status_id',
        },
        // ...(mappedUsers.length > 0
        //   ? [
        //       {
        //         value: mappedUsers,
        //         operator: 'NOT IN',
        //         column_name: 'id',
        //       },
        //     ]
        //   : []),
      ],
      limit_range: 25,
      print_query: false,
      start_index: 0,
      sort_columns: [['email', 'asc']],
      primary_table: 'users',
      select_columns: [
        ['id', 'value'],
        ['email', 'label'],
      ],
    };
    if (uname) {
      payload.search_all.push({
        value: '%' + uname || '' + '%',
        operator: 'ILIKE',
        column_name: 'email',
      });
    }
    this.commonService.getCommonList(payload).subscribe({
      next: (response: any) => {
        if (response.code === 200 && response.status) {
          if (response.data.records.length) {
            formGroup.get('user_list')?.setValue(response.data.records);
          }
        }
      },
    });
  }

  getRoles(formGroup: any, index: number, role_name?: string) {
    // const mappedRoles = this.fetchMappedData('roles', index);
    let payload = {
      company_id: 1,
      search_all: [
        {
          value: '1',
          operator: '=',
          column_name: 'status_id',
        },
        // ...(mappedRoles.length > 0
        //   ? [
        //       {
        //         value: mappedRoles,
        //         operator: 'NOT IN',
        //         column_name: 'id',
        //       },
        //     ]
        //   : []),
      ],
      limit_range: 25,
      print_query: false,
      start_index: 0,
      sort_columns: [['name', 'asc']],
      primary_table: 'roles',
      select_columns: [
        ['id', 'value'],
        ['name', 'label'],
      ],
    };
    if (role_name) {
      payload.search_all.push({
        value: '%' + role_name || '' + '%',
        operator: 'ILIKE',
        column_name: 'name',
      });
    }
    this.commonService.getCommonList(payload).subscribe({
      next: (response: any) => {
        if (response.code === 200 && response.status) {
          if (response.data.records.length) {
            formGroup.get('role_list')?.setValue(response.data.records);
          }
        }
      },
    });
  }

  getTags(formGroup: any, index: number, tag_name?: string) {
    // const mappedTags = this.fetchMappedData('tag', index);
    let payload = {
      company_id: 1,
      search_all: [
        {
          value: '1',
          operator: '=',
          column_name: 'status_id',
        },
        // ...(mappedTags.length > 0
        //   ? [
        //       {
        //         value: mappedTags,
        //         operator: 'NOT IN',
        //         column_name: 'slug',
        //       },
        //     ]
        //   : []),
      ],
      limit_range: 25,
      print_query: false,
      start_index: 0,
      sort_columns: [['name', 'asc']],
      primary_table: 'approval_workflow_approver_tags',
      select_columns: [
        ['slug', 'value'],
        ['name', 'label'],
      ],
    };
    if (tag_name) {
      payload.search_all.push({
        value: '%' + tag_name || '' + '%',
        operator: 'ILIKE',
        column_name: 'name',
      });
    }
    this.commonService.getCommonList(payload).subscribe({
      next: (response: any) => {
        if (response.code === 200 && response.status) {
          if (response.data.records.length) {
            formGroup.get('tag_list')?.setValue(response.data.records);
          }
        }
      },
    });
  }

  submit(): void {
    console.log(this.form.value);
    //[
    //"update van_load_request set trac_process_status = 'posted' where id = $unique_id"
    //]
    if (this.form.valid) {
      const payload: any = {
        data: {
          table2: this.approvalWorkflowAssignments.map((each: any) => {
            return {
              approver_order_no: each.approver_order_no,
              approval_workflow_slug: each.approval_workflow_slug || this.approvalWorkflow.slug,
              approver_type: each.approver_type,
              approver: each.approver,
              approve_query_information: this.parseJSON(each.approve_query_information || '[]'),
              reject_query_information: this.parseJSON(each.reject_query_information || '[]'),
              created_by: true,
              updated_by: true,
              status_id: 1,
              created_at: true,
              updated_at: true,
              approve_mail_id: each.accept_email,
              reject_mail_id: each.reject_email,
              approve_whatsapp_id: each.accept_whatsapp,
              reject_whatsapp_id: each.reject_whatsapp,
            };
          }),
        },
        table: ['approval_workflow_assignments', 'approval_workflow_assignments'],
        action: ['hard_delete', 'insert'],
        conditions: {
          table1: [
            {
              approval_workflow_slug: this.approvalWorkflow.slug,
            },
          ],
        },
        table_mapping: ['table1', 'table2'],
      };
      this.loading = true;
      this.gridApiService.executeRecords(payload).subscribe({
        next: (response: any) => {
          this.loading = false;
          if (response.code === 200 && response.status) {
            this.toastr.success('Record updated successfully', 'Success');
          }
        },
        error: (err: any) => {
          this.toastr.error('Failed to update record', 'Error');
          this.loading = false;
        },
      });
    } else {
      this.loading = false;
      this.toastr.error('Enter all required fields', 'Error');
    }
  }

  updateAccordianState(formGroup: any) {
    formGroup.get('accordian')?.setValue(!formGroup.get('accordian')?.value);
  }

  prepareJSON(data: any): string {
    return JSON.stringify(JSON.parse(data));
  }

  parseJSON(data: string): any {
    return JSON.parse(data);
  }

  prettyJSON(data: any) {
    return JSON.stringify(data, null, 2);
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
