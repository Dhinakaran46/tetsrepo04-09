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

@Component({
  selector: 'app-email-template-assignment',
  standalone: true,
  imports: [FormlyModule, CommonSharedModule, FormlyBootstrapModule, ReactiveFormsModule, FormlyConfigModule, FormsModule, CommonModule],
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

  constructor(
    private fb: FormBuilder,
    public translate: TranslateService,
    public location: Location,
    public router: Router,
    public commonService: MenuMapService,
    private gridApiService: GridApiService,
    private toastr: ToastrService
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
      limit_range: 1,
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
            console.log('this.emailTemplateProcessDetail : ', this.emailTemplateProcessDetail);
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
              const lineItemsArray = this.form.get('email_template_assignments') as FormArray;
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
                  })
                );
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
      limit_range: 1,
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
                  console.log('eachTemp : ', eachTemp.controls['email_template_assignment_id'].value);
                  const lineItemsArray = eachTemp.get('cc_bcc') as FormArray;
                  lineItemsArray.push(
                    this.fb.group({
                      eta_id: eachTemp.controls['email_template_assignment_id'].value,
                      send_type: [ccBcc.send_type, Validators.required],
                      recipient_type: [ccBcc.recipient_type, Validators.required],
                      email_to: [ccBcc.email_to, Validators.required],
                    })
                  );
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
      })
    );
  }

  removeCcBccGroup(i: number, j: number): void {
    const lineItemsArray = this.form.get('email_template_assignments.' + i + '.cc_bcc') as FormArray;
    lineItemsArray.removeAt(j);
  }

  submit(): void {
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
      console.log('payload : ', payload);
    } else {
      this.toastr.error('Enter all required fields', 'Error');
    }
  }
}
