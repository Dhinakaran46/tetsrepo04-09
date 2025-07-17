import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, Validators } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { FormlyModule } from '@ngx-formly/core';
import { FormlyBootstrapModule } from '@ngx-formly/bootstrap';
import { FormlyConfigModule } from '../../formly/formly-config.module';
import { CommonModule, Location } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { MenuMapService } from '../../service/common/menu-map.service';
import { GridApiService } from '../../service/common/grid.service';
import { ToastrService } from 'ngx-toastr';
import { CommonSharedModule } from '../../shared/common/common.module';
import { LocalStorageService } from '../../service/common/local-storage.service';
import { NgSelectModule } from '@ng-select/ng-select';

@Component({
  selector: 'app-email-template-assignment',
  standalone: true,
  imports: [FormlyModule, CommonSharedModule, FormlyBootstrapModule, ReactiveFormsModule, FormlyConfigModule, FormsModule, CommonModule, NgSelectModule],
  templateUrl: './email-template-assignment.component.html',
  styleUrl: './email-template-assignment.component.scss',
})
export class EmailTemplateAssignmentComponent implements OnInit {
  form: FormGroup;
  emailTempAssignmentId: string;
  emailTemplateProcessDetail: { name: string; id: number }[] = [];
  loading: boolean = false;
  recipientTags: {
    id: number;
    name: string;
  }[] = [];
  templateList: { label: string; value: number }[] = [];
  userId: number = 0;
  options: any[] = [];

  constructor(
    private fb: FormBuilder,
    public translate: TranslateService,
    public location: Location,
    public router: Router,
    public commonService: MenuMapService,
    private gridApiService: GridApiService,
    private toastr: ToastrService,
    public localStorageService: LocalStorageService
  ) {
    this.form = this.fb.group({
      email_template_process: this.fb.group({
        email_template_process_id: [null, Validators.required],
      }),
      email_template_assignments: this.fb.array([]),
    });

    // get uuid from route
    const currentRoute = this.router.routerState.snapshot.url;
    this.emailTempAssignmentId = String(currentRoute.split('/')[currentRoute.split('/').length - 1]);
  }

  async ngOnInit() {
    // get email assignment tag details
    await this.getEmailTemplateTag();

    // get email template details
    await this.getEmailTemplates();

    // get email template process details
    await this.getEmailTemplateProcess();

    // get process and assignment details
    await this.getTemplateAssignment();

    this.userId = this.localStorageService.getData('user_data') && JSON.parse(this.localStorageService.getData('user_data')).main.id;
  }

  async getEmailTemplateTag() {
    const payload = {
      company_id: 1,
      search_all: [
        {
          value: '3',
          operator: '!=',
          column_name: 'email_template_recipient_tags.status_id',
        },
      ],
      limit_range: 1000,
      print_query: true,
      start_index: 0,
      primary_table: 'email_template_recipient_tags',
      select_columns: [['email_template_recipient_tags.id'], ['email_template_recipient_tags.slug'], ['email_template_recipient_tags.name']],
    };
    this.commonService.getCommonList(payload).subscribe({
      next: (response: any) => {
        if (response.code === 200 && response.status) {
          this.loading = false;
          if (response.data.records) {
            response.data.records.forEach((each: any) => {
              this.recipientTags.push({
                id: each.id,
                name: each.name,
              });
            });
          }
        }
      },
    });
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
          value: this.emailTempAssignmentId,
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

  async getEmailTemplateProcess() {
    const payload = {
      company_id: 1,
      search_all: [
        {
          value: '3',
          operator: '!=',
          column_name: 'email_template_process.status_id',
        },
        {
          value: this.emailTempAssignmentId,
          operator: '=',
          column_name: 'email_template_process.uuid',
        },
      ],
      limit_range: 1,
      print_query: true,
      start_index: 0,
      primary_table: 'email_template_process',
      select_columns: [['email_template_process.id'], ['email_template_process.slug']],
    };
    this.commonService.getCommonList(payload).subscribe({
      next: (response: any) => {
        if (response.code === 200 && response.status) {
          if (response.data.records.length) {
            this.emailTemplateProcessDetail.push({
              id: response.data.records[0].id,
              name: response.data.records[0].slug,
            });
            this.form.controls['email_template_process'].setValue({ email_template_process_id: response.data.records[0].id });
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
          value: this.emailTempAssignmentId,
          operator: '=',
          column_name: 'email_template_process.uuid',
        },
        {
          value: '3',
          operator: '!=',
          column_name: 'email_template_process.status_id',
        },
      ],
      limit_range: 1000,
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
                if (each.recipient_type === 'tag') {
                  this.getTemplateAssignmentTags(each.email_to, lineItemsArray.controls[lineItemsArray.length - 1]);
                }
                if (each.recipient_type === 'user_id') {
                  this.getUsers(lineItemsArray.controls[lineItemsArray.length - 1], '');
                }
                temp_assgn_ids.push(each.eta_id);
              }
              this.getCcBccAssignments(temp_assgn_ids);
            } else {
              this.addEmailTemplateAssignment();
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

  async getCcBccAssignments(assignmentIds: number[]) {
    let payload: any = {
      company_id: 1,
      includes: [
        {
          join_type: 'INNER',
          table_name: 'email_template_cc_bcc',
          join_condition: 'email_template_assignments.id = email_template_cc_bcc.email_template_assignment_id',
        },
      ],
      search_any: [],
      limit_range: 1000,
      print_query: true,
      start_index: 0,
      primary_table: 'email_template_assignments',
      select_columns: [
        ['email_template_assignments.id', 'eta_id'],
        ['email_template_cc_bcc.recipient_type'],
        ['email_template_cc_bcc.email_to'],
        ['email_template_cc_bcc.send_type'],
      ],
    };
    for (let each of assignmentIds) {
      payload.search_any.push({
        value: each,
        operator: '=',
        column_name: 'email_template_cc_bcc.email_template_assignment_id',
      });
    }
    this.loading = true;
    this.commonService.getCommonList(payload).subscribe({
      next: (response: any) => {
        if (response.code === 200 && response.status) {
          this.loading = false;
          if (response.data.records) {
            const lineItemsArray = this.form.get('email_template_assignments') as FormArray;
            lineItemsArray.controls.forEach((eachTemp: any) => {
              for (let ccBcc of response.data.records) {
                if (ccBcc.eta_id === eachTemp.controls['email_template_assignment_id'].value) {
                  const lineItemsArray: any = eachTemp.get('cc_bcc') as FormArray;
                  lineItemsArray.push(
                    this.fb.group({
                      eta_id: eachTemp.controls['email_template_assignment_id'].value,
                      send_type: [ccBcc.send_type, Validators.required],
                      recipient_type: [ccBcc.recipient_type, Validators.required],
                      email_to: [ccBcc.email_to, Validators.required],
                      email_tag_mail: [null],
                      user_list: [null],
                    })
                  );

                  if (ccBcc.recipient_type === 'tag') {
                    this.getTemplateAssignmentTags(ccBcc.email_to, lineItemsArray.controls[lineItemsArray.length - 1]);
                  }

                  if (ccBcc.recipient_type === 'user_id') {
                    this.getUsers(lineItemsArray.controls[lineItemsArray.length - 1], '');
                  }
                }
              }
            });
          }
        }
      },
    });
  }

  get emailTemplateAssignments() {
    const emailRecpArray = this.form.get('email_template_assignments') as FormArray;
    return emailRecpArray?.controls?.length ? emailRecpArray.controls : [];
  }

  getTemplateAssignmentList() {
    const lineItemsArray = this.form.get('email_template_assignments') as FormArray;
    return lineItemsArray?.controls?.length ? lineItemsArray.controls : [];
  }

  addEmailTemplateAssignment(): void {
    const lineItemsArray = this.form.get('email_template_assignments') as FormArray;
    lineItemsArray.push(
      this.fb.group({
        id: [0],
        recipient_type: ['tag', Validators.required],
        email_to: [null, Validators.required],
        template_id: [null, Validators.required],
        email_template_assignment_id: [0],
        cc_bcc: this.fb.array([]),
        email_tag_mail: [null],
        user_list: [null],
      })
    );
  }

  removeEmailTemplateAssignment(index: number): void {
    const lineItemsArray = this.form.get('email_template_assignments') as FormArray;
    lineItemsArray.removeAt(index);
  }

  getCcBccControls(i: number) {
    const lineItemsArray = this.form.get('email_template_assignments.' + i + '.cc_bcc') as FormArray;
    return lineItemsArray?.controls?.length ? lineItemsArray.controls : [];
  }

  addCcBccGroup(i: number): void {
    const lineItemsArray = this.form.get('email_template_assignments.' + i + '.cc_bcc') as FormArray;
    lineItemsArray.push(
      this.fb.group({
        eta_id: 0,
        send_type: ['cc', Validators.required],
        recipient_type: ['tag', Validators.required],
        email_to: ['', Validators.required],
        email_tag_mail: [null],
        user_list: [null],
      })
    );
  }

  removeCcBccGroup(i: number, j: number): void {
    const lineItemsArray = this.form.get('email_template_assignments.' + i + '.cc_bcc') as FormArray;
    lineItemsArray.removeAt(j);
  }

  clearUserTagValues(formGroup: any) {
    formGroup.controls['email_to'].reset();
    formGroup.controls['email_tag_mail'].reset();

    if (formGroup.controls['recipient_type'].value === 'user_id') {
      this.getUsers(formGroup, '');
    }
  }

  getTemplateAssignmentTags(tagId: number, formGroup: any) {
    let payload: any = {
      company_id: 1,
      search_all: [
        {
          value: '3',
          operator: '!=',
          column_name: 'email_template_recipient_tags.status_id',
        },
        {
          value: tagId,
          operator: '=',
          column_name: 'email_template_recipient_tags.id',
        },
      ],
      search_any: [],
      limit_range: 1000,
      print_query: true,
      start_index: 0,
      primary_table: 'email_template_recipient_tags',
      select_columns: [['email_template_recipient_tags.id'], ['email_template_recipient_tags.slug'], ['email_template_recipient_tags.query_information']],
    };
    this.commonService.getCommonList(payload).subscribe({
      next: (response: any) => {
        if (response.code === 200 && response.status) {
          if (response.data.records.length) {
            const query_information_string = response.data.records[0].query_information;
            const query_information = JSON.parse(query_information_string);
            if (query_information.search_all.length) {
              query_information.search_all.forEach((each: any) => {
                if (each.value === '@process.user_id') {
                  each.value = this.userId;
                }
              });
            }
            this.commonService.getCommonList(query_information).subscribe({
              next: (response: any) => {
                if (response.data.records) {
                  let emailName = '';
                  if (response.data.records.length) {
                    for (let each of response.data.records) {
                      emailName = emailName ? emailName + ', ' + each.email : each.email;
                      formGroup.get('email_tag_mail')?.setValue(emailName);
                    }
                  } else {
                    formGroup.get('email_tag_mail')?.setValue('No email id is present');
                  }
                }
              },
            });
          }
        }
      },
    });
  }

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
        value: '%' + uname + '%',
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
              id: this.emailTemplateProcessDetail[0].id,
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
