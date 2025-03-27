import { Component, OnInit } from '@angular/core';
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

@Component({
  selector: 'app-approval-workflow-assignment',
  standalone: true,
  imports: [FormlyModule, CommonSharedModule, FormlyBootstrapModule, ReactiveFormsModule, FormlyConfigModule, FormsModule, CommonModule, NgSelectModule],
  templateUrl: './approval-workflow-assignment.component.html',
  styleUrl: './approval-workflow-assignment.component.scss',
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
      this.uniqueId = params.get('id');
    });
    this.form = this.fb.group({
      approvalWorkflow: this.fb.group({
        id: [null, Validators.required],
        name: [{ value: '', disabled: true }, Validators.required],
        slug: ['', Validators.required],
      }),
      approvalWorkflowAssignments: this.fb.array([]),
    });
  }

  async ngOnInit() {
    // // get email template details
    // await this.getEmailTemplates();

    // get approval workflow details
    await this.getApprovalWorkflowDetail();

    // // get process and assignment details
    // await this.getTemplateAssignment();

    this.userId = this.localStorageService.getData('user_data') && JSON.parse(this.localStorageService.getData('user_data')).main.id;
  }

  async getEmailTemplates() {
    const payload = {
      includes: [
        {
          join_type: 'INNER',
          table_name: 'email_template_process',
          join_condition: 'email_template_process.id = email_templates.email_template_process_id',
        },
      ],
      company_id: 1,
      search_all: [
        {
          value: '1',
          operator: '=',
          column_name: 'email_templates.status_id',
        },
        {
          value: this.uniqueId,
          operator: '=',
          column_name: 'email_template_process.uuid',
        },
      ],
      limit_range: 1000,
      print_query: false,
      start_index: 0,
      sort_columns: [['email_templates.name', 'asc']],
      primary_table: 'email_templates',
      select_columns: [
        ['email_templates.id', 'value'],
        ['email_templates.name', 'label'],
      ],
    };
    this.commonService.getCommonList(payload).subscribe({
      next: (response: any) => {
        if (response.code === 200 && response.status) {
          if (response.data.records.length) {
            for (let each of response.data.records) {
              this.templateList.push({ label: each.label, value: each.value });
            }
          }
        }
      },
    });
  }

  async getApprovalWorkflowDetail() {
    const payload = {
      company_id: 1,
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
      limit_range: 1,
      print_query: true,
      start_index: 0,
      primary_table: 'approval_workflows',
      select_columns: [['approval_workflows.id'], ['approval_workflows.slug'], ['approval_workflows.name']],
    };
    this.commonService.getCommonList(payload).subscribe({
      next: (response: any) => {
        if (response.code === 200 && response.status) {
          if (response.data.records.length) {
            this.form.controls['approvalWorkflow'].patchValue({
              ...response.data.records[0],
            });
          }
        }
      },
    });
  }

  async getTemplateAssignment() {
    const payload = {
      company_id: 1,
      includes: [
        {
          join_type: 'INNER',
          table_name: 'email_template_assignments',
          join_condition: 'email_template_process.id = email_template_assignments.email_template_process_id',
        },
      ],
      search_all: [
        {
          value: this.uniqueId,
          operator: '=',
          column_name: 'email_template_process.uuid',
        },
        {
          value: '3',
          operator: '!=',
          column_name: 'email_template_process.status_id',
        },
      ],
      limit_range: 1,
      print_query: true,
      start_index: 0,
      primary_table: 'email_template_process',
      select_columns: [
        ['email_template_process.id'],
        ['email_template_process.slug'],
        ['email_template_assignments.id', 'eta_id'],
        ['email_template_assignments.template_id'],
        ['email_template_assignments.recipient_type'],
        ['email_template_assignments.email_to'],
      ],
    };
    this.loading = true;
    this.commonService.getCommonList(payload).subscribe({
      next: (response: any) => {
        if (response.code === 200 && response.status) {
          this.loading = false;
          if (response.data.records) {
            if (response.data.records.length) {
              const lineItemsArray: any = this.form.get('email_template_assignments') as FormArray;
              let temp_assgn_ids: number[] = [];
              for (let each of response.data.records) {
                lineItemsArray.push(
                  this.fb.group({
                    id: each.eta_id,
                    recipient_type: [each.recipient_type, Validators.required],
                    email_to: [each.email_to, Validators.required],
                    template_id: [each.template_id, Validators.required],
                    email_template_assignment_id: [each.eta_id, Validators.required],
                    cc_bcc: this.fb.array([]),
                    email_tag_mail: [null],
                    user_list: [null],
                  })
                );
                if (each.approver_type === 'tag') {
                  this.getTags(each.email_to, lineItemsArray.controls[lineItemsArray.length - 1]);
                }
                if (each.approver_type === 'user_id') {
                  this.getUsers(lineItemsArray.controls[lineItemsArray.length - 1], '');
                }
                if (each.approver_type === 'role_id') {
                  this.getRoles(lineItemsArray.controls[lineItemsArray.length - 1], '');
                }
                temp_assgn_ids.push(each.eta_id);
              }
            } else {
              this.addApproverAssignment();
            }
          } else {
            const key = 'failed_to_fetch_the_entity_details';
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
  }

  get emailTemplateAssignments() {
    const emailRecpArray = this.form.get('email_template_assignments') as FormArray;
    return emailRecpArray?.controls?.length ? emailRecpArray.controls : [];
  }

  get approvalWorkflow() {
    return this.form.get('approvalWorkflow')?.getRawValue();
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
      approval_order_no: [null, Validators.required],
      approver: [null, Validators.required],
      user_list: [null],
      role_list: [null],
      tag_list: [null],
      tag: [null, Validators.required],
      users: [null, Validators.required],
      roles: [null, Validators.required],
    });

    // Push the new form group
    lineItemsArray.push(newFormGroup);

    // Pass the newly added FormGroup to the function
    this.clearUserRoleTagValues(newFormGroup);
  }

  removeEmailTemplateAssignment(index: number): void {
    const lineItemsArray = this.form.get('email_template_assignments') as FormArray;
    lineItemsArray.removeAt(index);
  }

  clearUserRoleTagValues(formGroup: any) {
    // console.log('formGroup', formGroup.controls['approver_type']);
    switch (formGroup.controls['approver_type'].value) {
      case 'role_id':
        this.getRoles(formGroup, '');
        break;
      case 'user_id':
        this.getUsers(formGroup, '');
        break;
      default:
        this.getTags(formGroup, '');
    }
  }

  // getTemplateAssignmentTags(tagId: number, formGroup: any) {
  //   let payload: any = {
  //     company_id: 1,
  //     search_all: [
  //       {
  //         value: '3',
  //         operator: '!=',
  //         column_name: 'email_template_recipient_tags.status_id',
  //       },
  //       {
  //         value: tagId,
  //         operator: '=',
  //         column_name: 'email_template_recipient_tags.id',
  //       },
  //     ],
  //     search_any: [],
  //     limit_range: 1,
  //     print_query: true,
  //     start_index: 0,
  //     primary_table: 'email_template_recipient_tags',
  //     select_columns: [['email_template_recipient_tags.id'], ['email_template_recipient_tags.slug'], ['email_template_recipient_tags.query_information']],
  //   };
  //   this.commonService.getCommonList(payload).subscribe({
  //     next: (response: any) => {
  //       if (response.code === 200 && response.status) {
  //         if (response.data.records.length) {
  //           const query_information_string = response.data.records[0].query_information;
  //           const query_information = JSON.parse(query_information_string);
  //           if (query_information.search_all.length) {
  //             query_information.search_all.forEach((each: any) => {
  //               if (each.value === '@process.user_id') {
  //                 each.value = this.userId;
  //               }
  //             });
  //           }
  //           this.commonService.getCommonList(query_information).subscribe({
  //             next: (response: any) => {
  //               if (response.data.records) {
  //                 let emailName = '';
  //                 if (response.data.records.length) {
  //                   for (let each of response.data.records) {
  //                     emailName = emailName ? emailName + ', ' + each.email : each.email;
  //                     formGroup.get('email_tag_mail')?.setValue(emailName);
  //                   }
  //                 } else {
  //                   formGroup.get('email_tag_mail')?.setValue('No email id is present');
  //                 }
  //               }
  //             },
  //           });
  //         }
  //       }
  //     },
  //   });
  // }

  getUsers(formGroup: any, uname?: string) {
    let payload = {
      company_id: 1,
      search_all: [
        {
          value: '1',
          operator: '=',
          column_name: 'status_id',
        },
      ],
      limit_range: 25,
      print_query: false,
      start_index: 0,
      sort_columns: [['email', 'asc']],
      primary_table: 'users',
      select_columns: [
        ['email', 'value'],
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

  getRoles(formGroup: any, role_name?: string) {
    let payload = {
      company_id: 1,
      search_all: [
        {
          value: '1',
          operator: '=',
          column_name: 'status_id',
        },
      ],
      limit_range: 25,
      print_query: false,
      start_index: 0,
      sort_columns: [['name', 'asc']],
      primary_table: 'roles',
      select_columns: [
        ['name', 'value'],
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

  getTags(formGroup: any, tag_name?: string) {
    let payload = {
      company_id: 1,
      search_all: [
        {
          value: '1',
          operator: '=',
          column_name: 'status_id',
        },
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
    this.form.markAllAsTouched();
    if (this.form.valid) {
      let no_of_tables: number = 2;
      let no_of_child_tables: number = 2;
      const payload: any = {
        data: {},
        table: ['email_template_process', 'email_template_assignments'],
        action: ['select', 'hard_delete'],
        columns: {
          table1: ['id'],
        },
        conditions: {
          table1: [
            {
              id: this.approvalWorkflow.id,
            },
          ],
          table2: [
            {
              email_template_process_id: '@table1.id',
            },
          ],
        },
        table_mapping: ['table1', 'table2'],
      };
      const lineItemsArray: any = this.form.get('email_template_assignments') as FormArray;

      // add data for template assignment
      for (let templates of lineItemsArray.controls) {
        no_of_tables++;
        payload.data['table' + no_of_tables] = [
          {
            email_to: templates.controls['email_to'].value,
            created_at: true,
            created_by: true,
            template_id: templates.controls['template_id'].value,
            recipient_type: templates.controls['recipient_type'].value,
            email_template_process_id: '@table1.id',
          },
        ];

        // add action for template assignment
        payload.action.push('insert');

        // table mapping for template assignment
        payload.table_mapping.push('table' + no_of_tables);

        // table for template assignment
        payload.table.push('email_template_assignments');

        let ccBccLineItems: any = templates.controls['cc_bcc'] as FormArray;

        // add data for cc bcc template
        let parent_table = no_of_tables;
        for (let ccBccTemplates of ccBccLineItems.controls) {
          no_of_child_tables = no_of_tables + 1;
          payload.data['table' + no_of_child_tables] = [
            {
              email_to: ccBccTemplates.controls['email_to'].value,
              created_at: true,
              created_by: true,
              recipient_type: ccBccTemplates.controls['recipient_type'].value,
              send_type: ccBccTemplates.controls['send_type'].value,
              email_template_assignment_id: '@table' + parent_table + '.id',
            },
          ];

          // add action for template assignment
          payload.action.push('insert');

          // table mapping for template assignment
          payload.table_mapping.push('table' + no_of_child_tables);

          // table for template assignment
          payload.table.push('email_template_cc_bcc');
          no_of_tables = no_of_child_tables;
        }
      }

      this.gridApiService.executeRecords(payload).subscribe({
        next: (response: any) => {
          this.loading = false;
          if (response.code === 200 && response.status) {
            this.toastr.success('Record updated successfully', 'Success');
          }
        },
      });
    } else {
      this.toastr.error('Enter all required fields', 'Error');
    }
  }
}
