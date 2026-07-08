import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, Validators } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { FormlyModule } from '@ngx-formly/core';
import { FormlyBootstrapModule } from '@ngx-formly/bootstrap';
import { FormlyConfigModule } from '../../formly/formly-config.module';
import { Location } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { MenuMapService } from '../../service/common/menu-map.service';
import { GridApiService } from '../../service/common/grid.service';
import { ToastrService } from 'ngx-toastr';
import { CommonSharedModule } from '../../shared/common/common.module';
import { LocalStorageService } from '../../service/common/local-storage.service';
import { NgSelectModule } from '@ng-select/ng-select';

@Component({
  selector: 'app-whatsapp-template-assignment',
  standalone: true,
  imports: [FormlyModule, CommonSharedModule, FormlyBootstrapModule, ReactiveFormsModule, FormlyConfigModule, FormsModule, NgSelectModule],
  templateUrl: './whatsapp-template-assignment.component.html',
  styleUrl: './whatsapp-template-assignment.component.scss',
})
export class WhatsappTemplateAssignmentComponent implements OnInit {
  form: FormGroup;
  whatsappTempAssignmentId: string;
  whatsappTemplateProcessDetail: { name: string; id: number }[] = [];
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
      notification_template_process: this.fb.group({
        notification_template_process_id: [null, Validators.required],
      }),
      notification_template_assignments: this.fb.array([]),
    });

    // get uuid from route
    const currentRoute = this.router.routerState.snapshot.url;
    this.whatsappTempAssignmentId = String(currentRoute.split('/')[currentRoute.split('/').length - 1]);
  }

  async ngOnInit() {
    // get whatsapp assignment tag details
    await this.getWhatsappTemplateTag();

    // get whatsapp template details
    await this.getWhatsappTemplates();

    // get whatsapp template process details
    await this.getWhatsappTemplateProcess();

    // get process and assignment details
    await this.getTemplateAssignment();

    this.userId = this.localStorageService.getData('user_data') && JSON.parse(this.localStorageService.getData('user_data')).main.id;
  }

  async getWhatsappTemplateTag() {
    const payload = {
      company_id: 1,
      search_all: [
        {
          value: '3',
          operator: '!=',
          column_name: 'notification_template_recipient_tags.status_id',
        },
        {
          value: 'whatsapp',
          operator: '!=',
          column_name: 'notification_template_recipient_tags.notification_type',
        },
      ],
      limit_range: 1000,
      print_query: true,
      start_index: 0,
      primary_table: 'notification_template_recipient_tags',
      select_columns: [
        ['notification_template_recipient_tags.id'],
        ['notification_template_recipient_tags.slug'],
        ['notification_template_recipient_tags.name'],
      ],
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

  async getWhatsappTemplates() {
    const payload = {
      includes: [
        {
          join_type: 'INNER',
          table_name: 'notification_template_process',
          join_condition: 'notification_template_process.id = notification_templates.notification_template_process_id',
        },
      ],
      company_id: 1,
      search_all: [
        {
          value: '1',
          operator: '=',
          column_name: 'notification_templates.status_id',
        },
        {
          value: this.whatsappTempAssignmentId,
          operator: '=',
          column_name: 'notification_template_process.uuid',
        },
      ],
      limit_range: 1000,
      print_query: false,
      start_index: 0,
      sort_columns: [['notification_templates.name', 'asc']],
      primary_table: 'notification_templates',
      select_columns: [
        ['notification_templates.id', 'value'],
        ['notification_templates.name', 'label'],
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

  async getWhatsappTemplateProcess() {
    const payload = {
      company_id: 1,
      search_all: [
        {
          value: '3',
          operator: '!=',
          column_name: 'notification_template_process.status_id',
        },
        {
          value: this.whatsappTempAssignmentId,
          operator: '=',
          column_name: 'notification_template_process.uuid',
        },
      ],
      limit_range: 1,
      print_query: true,
      start_index: 0,
      primary_table: 'notification_template_process',
      select_columns: [['notification_template_process.id'], ['notification_template_process.slug']],
    };
    this.commonService.getCommonList(payload).subscribe({
      next: (response: any) => {
        if (response.code === 200 && response.status) {
          if (response.data.records.length) {
            this.whatsappTemplateProcessDetail.push({
              id: response.data.records[0].id,
              name: response.data.records[0].slug,
            });
            this.form.controls['notification_template_process'].setValue({ notification_template_process_id: response.data.records[0].id });
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
          table_name: 'notification_template_assignments',
          join_condition: 'notification_template_process.id = notification_template_assignments.notification_template_process_id',
        },
      ],
      search_all: [
        {
          value: this.whatsappTempAssignmentId,
          operator: '=',
          column_name: 'notification_template_process.uuid',
        },
        {
          value: '3',
          operator: '!=',
          column_name: 'notification_template_process.status_id',
        },
      ],
      limit_range: 1000,
      print_query: true,
      start_index: 0,
      primary_table: 'notification_template_process',
      select_columns: [
        ['notification_template_process.id'],
        ['notification_template_process.slug'],
        ['notification_template_assignments.id', 'eta_id'],
        ['notification_template_assignments.template_id'],
        ['notification_template_assignments.recipient_type'],
        ['notification_template_assignments.notification_to'],
      ],
    };
    this.loading = true;
    this.commonService.getCommonList(payload).subscribe({
      next: (response: any) => {
        if (response.code === 200 && response.status) {
          this.loading = false;
          if (response.data.records) {
            if (response.data.records.length) {
              const lineItemsArray: any = this.form.get('notification_template_assignments') as FormArray;
              let temp_assgn_ids: number[] = [];
              for (let each of response.data.records) {
                lineItemsArray.push(
                  this.fb.group({
                    id: each.eta_id,
                    recipient_type: [each.recipient_type, Validators.required],
                    notification_to: [each.notification_to, Validators.required],
                    template_id: [each.template_id, Validators.required],
                    whatsapp_template_assignment_id: [each.eta_id, Validators.required],
                    cc_bcc: this.fb.array([]),
                    whatsapp_tag_number: [null],
                    user_list: [null],
                  })
                );
                if (each.recipient_type === 'tag') {
                  this.getTemplateAssignmentTags(each.notification_to, lineItemsArray.controls[lineItemsArray.length - 1]);
                }
                if (each.recipient_type === 'user_id') {
                  this.getUsers(lineItemsArray.controls[lineItemsArray.length - 1], '');
                }
                temp_assgn_ids.push(each.eta_id);
              }
            } else {
              this.addWhatsappTemplateAssignment();
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

  getTemplateAssignmentTags(tagId: number, formGroup: any) {
    let payload: any = {
      company_id: 1,
      search_all: [
        {
          value: '3',
          operator: '!=',
          column_name: 'notification_template_recipient_tags.status_id',
        },
        {
          value: tagId,
          operator: '=',
          column_name: 'notification_template_recipient_tags.id',
        },
      ],
      search_any: [],
      limit_range: 1000,
      print_query: true,
      start_index: 0,
      primary_table: 'notification_template_recipient_tags',
      select_columns: [
        ['notification_template_recipient_tags.id'],
        ['notification_template_recipient_tags.slug'],
        ['notification_template_recipient_tags.query_information'],
      ],
    };
    this.commonService.getCommonList(payload).subscribe({
      next: (response: any) => {
        if (response.code === 200 && response.status) {
          if (response.data.records.length) {
            const query_information_string = response.data.records[0].query_information;
            const query_information = JSON.parse(query_information_string);
            if (query_information.search_all?.length) {
              query_information.search_all.forEach((each: any) => {
                if (each.value === '@process.user_id') {
                  each.value = this.userId;
                }
              });
            }

            this.commonService.getCommonList(query_information).subscribe({
              next: (response: any) => {
                if (response.data.records) {
                  let whatsappName = '';
                  if (response.data.records.length) {
                    for (let each of response.data.records) {
                      whatsappName = each.country_code + ' ' + each.phone_number;
                      formGroup.get('whatsapp_tag_number')?.setValue(whatsappName);
                    }
                  } else {
                    formGroup.get('whatsapp_tag_number')?.setValue('No phone number id is present');
                  }
                }
              },
            });
          }
        }
      },
    });
  }

  getTemplateAssignmentList() {
    const lineItemsArray = this.form.get('notification_template_assignments') as FormArray;
    return lineItemsArray?.controls?.length ? lineItemsArray.controls : [];
  }

  addWhatsappTemplateAssignment(): void {
    const lineItemsArray = this.form.get('notification_template_assignments') as FormArray;
    lineItemsArray.push(
      this.fb.group({
        id: [0],
        recipient_type: ['tag', Validators.required],
        notification_to: [null, Validators.required],
        template_id: [null, Validators.required],
        whatsapp_template_assignment_id: [0],
        cc_bcc: this.fb.array([]),
        whatsapp_tag_number: [null],
        user_list: [null],
      })
    );
  }

  removeWhatsappTemplateAssignment(index: number): void {
    const lineItemsArray = this.form.get('notification_template_assignments') as FormArray;
    lineItemsArray.removeAt(index);
  }

  clearUserTagValues(formGroup: any) {
    formGroup.controls['notification_to'].reset();
    formGroup.controls['whatsapp_tag_number'].reset();

    if (formGroup.controls['recipient_type'].value === 'user_id') {
      this.getUsers(formGroup, '');
    }
  }

  getUsers(formGroup: any, pno?: string) {
    let payload: any = {
      company_id: 1,
      includes: [],
      limit_range: 25,
      print_query: false,
      start_index: 0,
      sort_columns: [['user_information.email', 'asc']],
      primary_table: 'user_information',
      select_columns: [
        ['user_information.phone_number', 'value'],
        ["concat(user_information.email, ' - ', user_information.phone_number)", 'label'],
      ],
    };
    if (pno) {
      payload.search_all = [
        {
          value: '%' + pno + '%',
          operator: 'ILIKE',
          column_name: 'user_information.phone_number',
        },
      ];
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
      const payload: any = {
        data: {},
        table: ['notification_template_process', 'notification_template_assignments'],
        action: ['select', 'hard_delete'],
        columns: {
          table1: ['id'],
        },
        conditions: {
          table1: [
            {
              id: this.whatsappTemplateProcessDetail[0].id,
            },
          ],
          table2: [
            {
              notification_template_process_id: '@table1.id',
            },
          ],
        },
        table_mapping: ['table1', 'table2'],
      };
      const lineItemsArray: any = this.form.get('notification_template_assignments') as FormArray;

      // add data for template assignment
      for (let templates of lineItemsArray.controls) {
        no_of_tables++;
        payload.data['table' + no_of_tables] = [
          {
            notification_to: templates.controls['notification_to'].value,
            created_at: true,
            created_by: true,
            template_id: templates.controls['template_id'].value,
            recipient_type: templates.controls['recipient_type'].value,
            notification_template_process_id: '@table1.id',
          },
        ];

        // add action for template assignment
        payload.action.push('insert');

        // table mapping for template assignment
        payload.table_mapping.push('table' + no_of_tables);

        // table for template assignment
        payload.table.push('notification_template_assignments');
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



