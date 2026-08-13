import { Component, ElementRef, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { initialState } from '../../../store/index.reducer';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, ValidationErrors } from '@angular/forms';

import { CommonSharedModule } from '../../shared/common/common.module';
import { IconXComponent } from '../../shared/icon/icon-x';
import { IconSendComponent } from '../../shared/icon/icon-send';
import { IconSaveComponent } from '../../shared/icon/icon-save';
import { IconEyeComponent } from '../../shared/icon/icon-eye';
import { IconDownloadComponent } from '../../shared/icon/icon-download';
import { IconXCircleComponent } from '../../shared/icon/icon-x-circle';
import { IconPlusCircleComponent } from '../../shared/icon/icon-plus-circle';
import { GridApiService } from '../../service/common/grid.service';
import { ToastrService } from 'ngx-toastr';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { commonConfig } from '../../config/common.config';
import { LocalStorageService } from '../../service/common/local-storage.service';
import { AbstractControl, ValidatorFn } from '@angular/forms';
import { Location } from '@angular/common';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { EditorComponent } from 'ngx-monaco-editor-v2';
import { animate, style, transition, trigger } from '@angular/animations';
import { TranslateService } from '@ngx-translate/core';
import { Title } from '@angular/platform-browser';
import { OpenaiService } from '../../service/common/openai.service';

export function viewMandatoryValidator(): ValidatorFn {
  return (control: AbstractControl): { [key: string]: any } | null => {
    const selectedOptions = control.value;
    if (Array.isArray(selectedOptions) && selectedOptions.includes('view')) {
      return null; // Valid
    }
    return { viewMandatory: true }; // Invalid
  };
}

@Component({
  selector: 'app-add-master-approval-workflow',
  standalone: true,
  imports: [CommonSharedModule, MonacoEditorModule, ReactiveFormsModule],
  templateUrl: './master-approval-workflow.component.html',
  styleUrl: './master-approval-workflow.component.scss',
  animations: [
    trigger('toggleAnimation', [
      transition(':enter', [style({ opacity: 0, transform: 'scale(0.95)' }), animate('100ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))]),
      transition(':leave', [animate('75ms', style({ opacity: 0, transform: 'scale(0.95)' }))]),
    ]),
  ],
})
export class MasterApprovalWorkflowComponent implements OnInit {
  readonly approvalWorkflowEntityNamePrefix = 'master_approval_workflow';
  readonly lineItemTypeLineItem = 'line_item';
  readonly lineItemTypeApproveQuery = 'approve_query';
  readonly lineItemTypeRejectQuery = 'reject_query';
  store: any = initialState;
  form!: FormGroup;
  items: any = [];
  field_types: any[] = [];
  tables_list: any = [];
  wizard_type_list: any[] = [];
  report_type_list: any[] = [];
  id: number | null = null;
  editTitle = false;
  submitted = false;
  commonConfig = commonConfig;
  redirect_url: string = '';
  rowsLength: number = 26;

  editorOptions = { theme: 'vs-dark', language: 'sql', tabSize: 1, insertSpaces: true };
  htmlEditorOptions = { ...this.editorOptions, language: 'html' };
  // Modal editor options
  modalHtmlEditorOptions = { theme: 'vs-dark', language: 'html', tabSize: 2, insertSpaces: true, minimap: { enabled: false }, automaticLayout: true };
  modalJsonEditorOptions = { theme: 'vs-dark', language: 'json', tabSize: 2, insertSpaces: true, minimap: { enabled: false }, automaticLayout: true };
  isDarkTheme = true; // Default theme
  @ViewChild('monacoEditor') monacoEditor: EditorComponent | undefined;

  insert_json_schema: any = {
    // it will be removed
    action: ['insert', 'insert'],
    table: ['master_approval_workflows', 'master_approval_workflow_line_items'],
    table_mapping: ['table1', 'table2'],
    data: {
      table1: [],
      table2: [],
    },
  };

  update_json_schema: any = {
    action: ['update', 'hard_delete', 'insert'],
    table: ['master_approval_workflows', 'master_approval_workflow_line_items', 'master_approval_workflow_line_items'],
    table_mapping: ['table1', 'table2', 'table3'],
    data: {
      table1: [],
      table3: [],
    },
    conditions: {
      table1: [],
      table2: [],
    },
  };

  exportTemplates: any[] = [];
  emailTemplateList: { id: number; name: string }[] = [];
  whatsappTemplateList: { id: number; name: string }[] = [];
  // wizard group properties
  wizardGroups: any[] = [];
  showWizardGroupMenu: boolean = false;
  showWizardGroupModal: boolean = false;
  newWizardGroupName: string = '';
  wizardGroupForm!: FormGroup;
  isInfoModalOpen: boolean = false;
  // Edit modal properties
  isEditModalOpen: boolean = false;
  editItemIndex: number | null = null;
  editItemForm!: FormGroup;
  infoContents: any = {
    fieldHtmlContentInfo: {
      header: 'html_content_usage_examples',
      examples: [
        {
          name: 'All Examples',
          comments: ['These examples demonstrate how to use row_object properties in HTML templates for dynamic content rendering.'],
          data: [
            {
              title: 'Example 1: Conditional button based on name',
              description: 'Uses row_object.name to dynamically assign button color',
              html: `<button class="btn {{ row_object.name == 'Raj Supervisor' ? 'btn-danger' : 'btn-primary' }}">{{ row_object.name }}</button>`,
            },
            {
              title: 'Example 2: User card with nested ternary for role and status',
              description: 'Demonstrates multiple property usage: name, status, user_roles',
              html: `<div class="user-card {{ row_object.status == '1' ? 'btn-success' : 'btn-danger' }}">
      <span class="name">{{ row_object.name }}</span>
      <span class="{{ row_object.user_roles == 'Manager' ? 'inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 inset-ring inset-ring-gray-500/10' : 'inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 inset-ring inset-ring-red-600/10' }}">{{ row_object.user_roles }}</span>
    </div>`,
            },
            {
              title: 'Example 3: Numeric comparison for badge color',
              description: ['Uses row_object.code to determine badge color based on numeric threshold'],
              html: `<span class="badge {{ row_object.code >= 1003 ? 'btn-danger' : 'btn-success' }}">Age: {{ row_object.name }} {{ row_object.code }}</span>`,
            },
            {
              title: 'Example 4: Multi-condition button with nested ternary',
              description: ['Demonstrates chaining multiple status checks'],
              html: `<button class="btn {{ row_object.status == '1' ? 'btn-success' : row_object.status == '2' ? 'btn-warning' : 'btn-danger' }}">
      {{ row_object.name }}
    </button>`,
            },
          ],
        },
      ],
    },
    reportInfo: {
      header: 'sample_report_information',
      examples: [
        {
          name: 'example_1',
          comments: ['background_settings', 'layout_types'],
          data: {
            groupId: 'power_bi_group_id',
            reportId: 'power_bi_report_id',
            settings: {
              background: 1,
              barsHidden: true,
              layoutType: 1,
              filterPaneEnabled: false,
              navContentPaneEnabled: false,
            },
          },
        },
      ],
    },
    queryInfo: {
      header: 'sample_query_information',
      examples: [
        {
          name: 'example_1',
          comments: [],
          data: {
            cte: 'WITH test_constants AS ( SELECT 1 AS dummy_id )',
            company_id: 1,
            print_query: false,
            primary_table: 'user_information',
            start_index: 0,
            limit_range: 15,
            attached_policies: ['user_filer1'],
            sort_columns: [['user_information.id', 'desc']],
            search_all: [
              {
                column_name: 'user_information.deleted_at',
                value: null,
                operator: 'IS',
              },
            ],
            search_any: [
              {
                column_name: 'user_information.deleted_at',
                value: null,
                operator: 'IS',
              },
            ],
            select_columns: [['user_information.id'], ['user_information.email', 'user_mail'], ['user_information.full_name']],
            having_conditions: [
              {
                column_name: 'user_information.deleted_at',
                value: null,
                operator: 'IS',
              },
            ],
            having_any_conditions: [
              {
                value: '%Mukesh%',
                operator: 'ILIKE',
                column_name: 'user_information.full_name',
              },
            ],
          },
        },
      ],
    },
    formQueryInfo: {
      header: 'sample_query_information',
      examples: [
        {
          name: 'example_1',
          comments: [],
          data: {
            cte: 'WITH test_constants AS ( SELECT 1 AS dummy_id )',
            company_id: 1,
            print_query: false,
            primary_table: 'user_information',
            start_index: 0,
            limit_range: 15,
            attached_policies: ['user_filer1'],
            sort_columns: [['user_information.id', 'desc']],
            search_all: [
              {
                column_name: 'user_information.deleted_at',
                value: null,
                operator: 'IS',
              },
            ],
            search_any: [
              {
                column_name: 'user_information.deleted_at',
                value: null,
                operator: 'IS',
              },
            ],
            select_columns: [['user_information.id'], ['user_information.email', 'user_mail'], ['user_information.full_name']],
            having_conditions: [
              {
                column_name: 'user_information.deleted_at',
                value: null,
                operator: 'IS',
              },
            ],
            having_any_conditions: [
              {
                value: '%Mukesh%',
                operator: 'ILIKE',
                column_name: 'user_information.full_name',
              },
            ],
          },
        },
        {
          name: 'AI Conversion',
          leftEditor: {
            title: 'QUERY',
          },
          rightEditor: {
            title: 'JSON',
          },
        },
      ],
    },
    jobBuilderQueryInfo: {
      header: 'sample_query_information',
      examples: [
        {
          name: 'example_1',
          comments: [],
          data: {
            cte: 'WITH test_constants AS ( SELECT 1 AS dummy_id )',
            company_id: 1,
            print_query: false,
            primary_table: 'user_information',
            start_index: 0,
            limit_range: 15,
            attached_policies: ['user_filer1'],
            sort_columns: [['user_information.id', 'desc']],
            search_all: [
              {
                column_name: 'user_information.deleted_at',
                value: null,
                operator: 'IS',
              },
            ],
            search_any: [
              {
                column_name: 'user_information.deleted_at',
                value: null,
                operator: 'IS',
              },
            ],
            select_columns: [['user_information.id'], ['user_information.email', 'user_mail'], ['user_information.full_name']],
            having_conditions: [
              {
                column_name: 'user_information.deleted_at',
                value: null,
                operator: 'IS',
              },
            ],
            having_any_conditions: [
              {
                value: '%Mukesh%',
                operator: 'ILIKE',
                column_name: 'user_information.full_name',
              },
            ],
          },
        },
        {
          name: 'AI Conversion',
          leftEditor: {
            title: 'QUERY',
          },
          rightEditor: {
            title: 'JSON',
          },
        },
      ],
    },
    associatedTableInfo: {
      header: 'sample_associated_table_information',
      examples: [
        {
          name: 'example_1',
          comments: [],
          data: [
            {
              table: 'user_details',
              where_clause: 'user_id = $1',
            },
          ],
        },
      ],
    },
    addQueryInfo: {
      header: 'sample_add_json_information',
      examples: [
        {
          name: 'example_1',
          comments: [],
          data: {
            data: {
              table1: [
                {
                  role: '$users.role',
                  email: '$users.email',
                  username: '$users.username',
                  status_id: '$users.status_id',
                  created_at: true,
                  created_by: true,
                  updated_at: true,
                  updated_by: true,
                },
              ],
              table2: [
                {
                  dob: '$user_details.dob',
                  code: '$user_details.code',
                  gender: '$user_details.gender',
                  address: '$user_details.address',
                  culture: '$user_details.culture',
                  user_id: '@table1.id',
                  last_name: '$user_details.last_name',
                  created_at: true,
                  created_by: true,
                  first_name: '$user_details.first_name',
                  updated_at: true,
                  updated_by: true,
                  profile_pic: '$user_details.profile_pic',
                  phone_number: '$user_details.phone_number',
                  department_id: '$user_details.department_id',
                  designation_id: '$user_details.designation_id',
                },
              ],
              table3: [
                {
                  role_id: '$user_roles.role_id',
                  user_id: '@table1.id',
                },
              ],
              table4: [
                {
                  user_id: '@table1.id',
                  unique_id: '@table1.id',
                  created_at: true,
                  created_by: true,
                  prefill_data: '$model',
                  email_template_process_slug: 'user_created',
                },
              ],
            },
            table: ['users', 'user_details', 'user_roles', 'email_process_jobs'],
            action: ['insert', 'insert', 'insert', 'insert'],
            table_mapping: ['table1', 'table2', 'table3', 'table4'],
          },
        },
      ],
    },
    editQueryInfo: {
      header: 'sample_edit_json_information',
      examples: [
        {
          name: 'example_1',
          comments: [],
          data: {
            data: {
              table1: [
                {
                  email: '$users.email',
                  username: '$users.username',
                  status_id: '$users.status_id',
                  updated_at: true,
                  updated_by: true,
                },
              ],
              table2: [
                {
                  dob: '$user_details.dob',
                  code: '$user_details.code',
                  gender: '$user_details.gender',
                  address: '$user_details.address',
                  culture: '$user_details.culture',
                  last_name: '$user_details.last_name',
                  first_name: '$user_details.first_name',
                  updated_at: true,
                  updated_by: true,
                  profile_pic: '$user_details.profile_pic',
                  phone_number: '$user_details.phone_number',
                  department_id: '$user_details.department_id',
                  designation_id: '$user_details.designation_id',
                },
              ],
              table4: [
                {
                  role_id: '$user_roles.role_id',
                  user_id: '@table1.id',
                },
              ],
            },
            table: ['users', 'user_details', 'user_roles', 'user_roles'],
            action: ['update', 'update', 'hard_delete', 'insert'],
            conditions: {
              table1: [
                {
                  uuid: '$unique_id',
                },
              ],
              table2: [
                {
                  user_id: '@table1.id',
                },
              ],
              table3: [
                {
                  user_id: '@table1.id',
                },
              ],
            },
            table_mapping: ['table1', 'table2', 'table3', 'table4'],
          },
        },
      ],
    },
    formInfo: {
      header: 'sample_from_information',
      examples: [
        {
          name: 'normal_form_example',
          comments: [],
          data: {
            model: {
              users: {
                role: 'admin',
                email: null,
                role_id: null,
                username: null,
                status_id: 1,
              },
              user_roles: {
                role_id: [],
              },
              user_details: {
                dob: null,
                code: null,
                gender: 'male',
                address: null,
                culture: null,
                last_name: null,
                first_name: null,
                profile_pic: null,
                phone_number: null,
                department_id: null,
                designation_id: null,
              },
            },
            fields: [
              {
                key: 'users',
                wrappers: ['form-field'],
                fieldGroup: [
                  {
                    key: 'username',
                    type: 'input',
                    props: {
                      label: 'Username',
                      required: true,
                      placeholder: 'Enter username',
                    },
                  },
                  {
                    key: 'email',
                    type: 'input',
                    props: {
                      type: 'email',
                      label: 'Email',
                      required: true,
                      placeholder: 'Enter email',
                    },
                  },
                  {
                    type: '#status',
                  },
                ],
                fieldGroupClassName: 'grid grid-cols-1 gap-2 md:grid-cols-3',
              },
              {
                key: 'user_details',
                wrappers: ['form-field'],
                fieldGroup: [
                  {
                    key: 'code',
                    type: 'input',
                    props: {
                      label: 'Code',
                      required: true,
                      placeholder: 'Enter code',
                    },
                  },
                  {
                    key: 'first_name',
                    type: 'input',
                    props: {
                      label: 'First Name',
                      required: true,
                      placeholder: 'Enter first name',
                    },
                  },
                  {
                    key: 'last_name',
                    type: 'input',
                    props: {
                      label: 'Last Name',
                      placeholder: 'Enter last name',
                    },
                  },
                  {
                    key: 'department_id',
                    type: 'select',
                    hooks: {
                      onInit: true,
                    },
                    props: {
                      label: 'Department',
                    },
                    attached_policies: ['filterdepartmentstartswithe'],
                  },
                  {
                    key: 'designation_id',
                    type: 'select',
                    hooks: {
                      onInit: true,
                    },
                    props: {
                      label: 'Designation',
                    },
                  },
                  {
                    key: 'dob',
                    type: 'input',
                    props: {
                      type: 'date',
                      label: 'Date of Birth',
                      placeholder: 'Enter date of birth',
                    },
                  },
                  {
                    key: 'phone_number',
                    type: 'input',
                    props: {
                      label: 'Phone Number',
                      placeholder: 'Enter phone number',
                    },
                  },
                  {
                    key: 'gender',
                    type: 'radio',
                    props: {
                      label: 'Gender',
                      options: [
                        {
                          label: 'Male',
                          value: 'male',
                        },
                        {
                          label: 'Female',
                          value: 'female',
                        },
                        {
                          label: 'Others',
                          value: 'others',
                        },
                      ],
                      required: true,
                    },
                  },
                  {
                    key: 'culture',
                    type: 'input',
                    props: {
                      label: 'Culture',
                      placeholder: 'Enter culture',
                    },
                  },
                  {
                    key: 'address',
                    type: 'textarea',
                    props: {
                      rows: 3,
                      label: 'Address',
                      placeholder: 'Enter address',
                    },
                  },
                  {
                    key: 'profile_pic',
                    type: 'input',
                    props: {
                      type: 'hidden',
                    },
                    className: 'hidden',
                  },
                  {
                    key: 'profile_pic_file',
                    type: 'file',
                    props: {
                      label: 'Profile Picture',
                      accept: 'png',
                      max_size: '1mb',
                    },
                  },
                ],
                fieldGroupClassName: 'grid grid-cols-1 gap-2 md:grid-cols-3',
              },
              {
                key: 'user_roles',
                wrappers: ['form-field'],
                fieldGroup: [
                  {
                    key: 'role_id',
                    type: 'select-from-db',
                    templateOptions: {
                      label: 'Role',
                      table: 'roles',
                      multiple: true,
                      required: true,
                      labelColumn: 'name',
                      placeholder: 'Please select',
                      valueColumn: 'id',
                    },
                    attached_policies: ['filterrolesstartswiths'],
                  },
                ],
                fieldGroupClassName: 'grid grid-cols-1 gap-2 md:grid-cols-3',
              },
            ],
            options: {},
          },
        },
        {
          name: 'dynamic_form_example',
          comments: [],
          data: {
            model: {
              items: {
                sku: null,
                name: null,
                team_id: null,
                parent_id: null,
                status_id: 1,
                description: null,
                item_type_id: null,
                department_id: null,
                active_passive: 1,
                manufacturer_id: null,
                item_images_limit: 2048,
                enable_zain_tag_tracking: false,
                enable_serial_number_tracking: false,
                enable_sequential_lot_tracking: false,
              },
              item_uoms: [],
              item_images: [],
            },
            fields: [
              {
                key: 'items',
                wrappers: ['form-field'],
                fieldGroup: [
                  {
                    key: 'parent_id',
                    type: 'select-from-db',
                    props: {
                      label: 'Parent Item',
                      table: 'items',
                      labelColumn: 'name',
                      placeholder: 'Select Parent Item',
                      valueColumn: 'id',
                    },
                  },
                  {
                    key: 'sku',
                    type: 'input',
                    props: {
                      label: 'SKU',
                      required: true,
                      placeholder: 'Enter SKU',
                    },
                  },
                  {
                    key: 'name',
                    type: 'input',
                    props: {
                      label: 'Name',
                      required: true,
                      placeholder: 'Enter Name',
                    },
                  },
                  {
                    key: 'description',
                    type: 'textarea',
                    props: {
                      label: 'Description',
                      placeholder: 'Enter Description',
                    },
                  },
                  {
                    key: 'manufacturer_id',
                    type: 'select-from-db',
                    props: {
                      label: 'Manufacturer',
                      table: 'manufacturers',
                      labelColumn: 'name',
                      placeholder: 'Select Manufacturer',
                      valueColumn: 'id',
                    },
                  },
                  {
                    key: 'department_id',
                    type: 'select-from-db',
                    props: {
                      label: 'Department',
                      table: 'departments',
                      labelColumn: 'name',
                      placeholder: 'Select Department',
                      valueColumn: 'id',
                    },
                  },
                  {
                    key: 'team_id',
                    type: 'select-from-db',
                    props: {
                      label: 'Team',
                      table: 'teams',
                      labelColumn: 'name',
                      placeholder: 'Select Team',
                      valueColumn: 'id',
                    },
                  },
                  {
                    key: 'item_type_id',
                    type: 'select-from-db',
                    props: {
                      label: 'Item Type',
                      table: 'item_types',
                      labelColumn: 'name',
                      placeholder: 'Select Item Type',
                      valueColumn: 'id',
                    },
                  },
                  {
                    key: 'active_passive',
                    type: 'select',
                    props: {
                      label: 'Active/Passive',
                      options: [
                        {
                          label: 'Active',
                          value: 1,
                        },
                        {
                          label: 'Passive',
                          value: 2,
                        },
                      ],
                      required: true,
                    },
                  },
                  {
                    key: 'enable_serial_number_tracking',
                    type: 'checkbox',
                    props: {
                      label: 'Enable Serial Number Tracking',
                    },
                  },
                  {
                    key: 'enable_zain_tag_tracking',
                    type: 'checkbox',
                    props: {
                      label: 'Enable Zain Tag Tracking',
                    },
                  },
                  {
                    key: 'enable_sequential_lot_tracking',
                    type: 'checkbox',
                    props: {
                      label: 'Enable Sequential Lot Tracking',
                    },
                  },
                ],
                fieldGroupClassName: 'grid grid-cols-1 gap-4 md:grid-cols-4',
              },
              {
                template: "<h2 class='text-lg font-bold text-gray-800 border-b pb-2 mb-4'>Item Images</h2>",
              },
              {
                key: 'item_images',
                type: 'repeat-table',
                props: {
                  limit: 10,
                  required: false,
                },
                wrappers: ['form-field'],
                fieldArray: {
                  fieldGroup: [
                    {
                      key: 'image_path',
                      type: 'input',
                      props: {
                        type: 'hidden',
                      },
                      className: 'hidden',
                    },
                    {
                      key: 'image_path_file',
                      type: 'image',
                      props: {
                        label: 'Item Image',
                        required: false,
                      },
                      className: 'flex-1',
                    },
                    {
                      key: 'image_name',
                      type: 'input',
                      props: {
                        label: 'Image Name',
                        required: true,
                        placeholder: 'Enter Image Name',
                      },
                      className: 'flex-1',
                    },
                    {
                      key: 'description',
                      type: 'textarea',
                      props: {
                        label: 'Image Description',
                        placeholder: 'Enter Image Description',
                      },
                      className: 'flex-1',
                    },
                  ],
                  fieldGroupClassName: 'grid grid-cols-1 gap-2 md:grid-cols-4',
                },
              },
              {
                template: "<h2 class='text-lg font-bold text-gray-800 border-b pb-2 mb-4'>Item UOMs</h2>",
              },
              {
                key: 'item_uoms',
                type: 'repeat-table',
                props: {
                  limit: 5,
                  required: true,
                },
                wrappers: ['form-field'],
                fieldArray: {
                  fieldGroup: [
                    {
                      key: 'uom_id',
                      type: 'select-from-db',
                      hooks: {
                        onInit: true,
                      },
                      props: {
                        label: 'UOM',
                        table: 'units_of_measure',
                        required: true,
                        uniqueRow: true,
                        labelColumn: 'name',
                        placeholder: 'Select UOM',
                        valueColumn: 'id',
                      },
                    },
                    {
                      key: 'conversion_factor',
                      type: 'number',
                      props: {
                        label: 'Conversion Factor',
                        required: true,
                        placeholder: 'Enter Conversion Factor',
                      },
                    },
                    {
                      key: 'af_sqm_ops',
                      type: 'input',
                      props: {
                        label: 'AF SQM OPS',
                        placeholder: 'Enter AF SQM OPS',
                      },
                    },
                    {
                      key: 'af_sqm_st',
                      type: 'input',
                      props: {
                        label: 'AF SQM ST',
                        placeholder: 'Enter AF SQM ST',
                      },
                    },
                    {
                      key: 'length',
                      type: 'number',
                      props: {
                        label: 'Length',
                        required: false,
                        placeholder: 'Enter Length',
                      },
                    },
                    {
                      key: 'height',
                      type: 'number',
                      props: {
                        label: 'Height',
                        required: false,
                        placeholder: 'Enter Height',
                      },
                    },
                    {
                      key: 'width',
                      type: 'number',
                      props: {
                        label: 'Width',
                        required: false,
                        placeholder: 'Enter Width',
                      },
                    },
                    {
                      key: 'level',
                      type: 'select',
                      props: {
                        label: 'Level',
                        options: [
                          {
                            label: '1',
                            value: '1',
                          },
                          {
                            label: '2',
                            value: '2',
                          },
                          {
                            label: '3',
                            value: '3',
                          },
                        ],
                        required: true,
                        uniqueRow: true,
                      },
                    },
                    {
                      key: 'is_base_uom',
                      type: 'checkbox',
                      props: {
                        label: 'Is Base UOM',
                        uniqueRow: true,
                      },
                      defaultValue: false,
                    },
                  ],
                  fieldGroupClassName: 'grid grid-cols-1 gap-2 md:grid-cols-3',
                },
              },
            ],
          },
        },
        {
          name: 'validator_example',
          comments: [],
          data: {
            model: {
              demo: {
                email: null,
                comments: null,
                coupon_code: null,
                employee_id: null,
                website: null,
                username_field: null,
                dob: null,
                country_code: null,
                phone_number: null,
                first_name: null,
                last_name: null,
                address: null,
                email_no_html: null,
              },
            },
            fields: [
              {
                key: 'demo',
                wrappers: ['form-field'],
                fieldGroup: [
                  {
                    template: "<h3 class='text-md font-bold text-gray-700 col-span-full border-b pb-1 mb-1'>1. Standard Built-in Validators</h3>",
                  },
                  {
                    key: 'email',
                    type: 'input',
                    props: {
                      label: 'Email Address (email)',
                      placeholder: 'Enter email',
                    },
                    validators: {
                      validation: ['email'],
                    },
                  },
                  {
                    key: 'comments',
                    type: 'textarea',
                    props: {
                      label: 'Comments (noHtml)',
                      placeholder: 'Enter comments',
                    },
                    validators: {
                      validation: ['noHtml'],
                    },
                  },
                  {
                    key: 'coupon_code',
                    type: 'input',
                    props: {
                      label: 'Coupon Code (alphanumeric)',
                      placeholder: 'Enter coupon code',
                    },
                    validators: {
                      validation: ['alphanumeric'],
                    },
                  },
                  {
                    key: 'employee_id',
                    type: 'input',
                    props: {
                      label: 'Employee ID (numeric)',
                      placeholder: 'Enter employee ID',
                    },
                    validators: {
                      validation: ['numeric'],
                    },
                  },
                  {
                    key: 'website',
                    type: 'input',
                    props: {
                      label: 'Website URL (url)',
                      placeholder: 'https://example.com',
                    },
                    validators: {
                      validation: ['url'],
                    },
                  },
                  {
                    key: 'username_field',
                    type: 'input',
                    props: {
                      label: 'Username (username)',
                      placeholder: 'Enter username',
                    },
                    validators: {
                      validation: ['username'],
                    },
                  },
                  {
                    key: 'dob',
                    type: 'input',
                    props: {
                      type: 'date',
                      label: 'Date of Birth (noFutureDate)',
                    },
                    validators: {
                      validation: ['noFutureDate'],
                    },
                  },
                  {
                    template:
                      "<h3 class='text-md font-bold text-gray-700 col-span-full border-b pb-1 mb-1'>2. Sibling Symmetrical Validation (phoneAndCountry)</h3>",
                  },
                  {
                    key: 'country_code',
                    type: 'select-from-db',
                    props: {
                      label: 'Country Code',
                      table: 'phone_country_codes',
                      labelColumn: 'name',
                      valueColumn: 'id',
                      placeholder: 'Select country code',
                      phoneNumberField: 'phone_number',
                    },
                  },
                  {
                    key: 'phone_number',
                    type: 'input',
                    props: {
                      label: 'Phone Number',
                      placeholder: 'Enter phone number',
                      countryCodeField: 'country_code',
                    },
                  },
                  {
                    template: "<h3 class='text-md font-bold text-gray-700 col-span-full border-b pb-1 mb-1'>3. Custom Regex Validator</h3>",
                  },
                  {
                    key: 'first_name',
                    type: 'input',
                    props: {
                      label: 'First Name (letters & spaces only)',
                      placeholder: 'Enter first name',
                    },
                    validators: {
                      lettersOnly: {
                        expression: '/^[a-zA-Z\\s]+$/',
                        message: 'First name can only contain letters and spaces',
                      },
                    },
                  },
                  {
                    template: "<h3 class='text-md font-bold text-gray-700 col-span-full border-b pb-1 mb-1'>4. Custom Arrow Function Validator</h3>",
                  },
                  {
                    key: 'last_name',
                    type: 'input',
                    props: {
                      label: 'Last Name (profanity check)',
                      placeholder: 'Enter last name',
                    },
                    validators: {
                      noProfanity: {
                        expression: "(control) => control.value && ['badword', 'test'].includes(control.value.toLowerCase()) ? { noProfanity: true } : null",
                        message: 'Invalid last name entered',
                      },
                    },
                  },
                  {
                    template: "<h3 class='text-md font-bold text-gray-700 col-span-full border-b pb-1 mb-1'>5. Heuristic Opt-Out Configurations</h3>",
                  },
                  {
                    key: 'address',
                    type: 'textarea',
                    props: {
                      label: 'Address (disableValidation: true — all auto validators off)',
                      placeholder: 'Enter address',
                      disableValidation: true,
                    },
                  },
                  {
                    key: 'email_no_html',
                    type: 'input',
                    props: {
                      label: 'Email (disableValidation: [noHtml] — only email validator runs)',
                      placeholder: 'Enter email',
                      disableValidation: ['noHtml'],
                    },
                    validators: {
                      validation: ['email'],
                    },
                  },
                ],
                fieldGroupClassName: 'grid grid-cols-1 gap-4 md:grid-cols-3',
              },
            ],
            options: {},
          },
        },
      ],
    },
    presetQueryInfo: {
      header: 'sample_preset_json_information',
      examples: [
        {
          name: 'example_1',
          comments: [],
          data: {
            users: {
              company_id: 1,
              search_all: [
                {
                  value: '$unique_id',
                  operator: '=',
                  column_name: 'user_information.uuid',
                },
                {
                  value: '3',
                  operator: '!=',
                  column_name: 'user_information.status_id',
                },
              ],
              limit_range: 1,
              print_query: false,
              start_index: 0,
              sort_columns: [['user_information.id', 'asc']],
              primary_table: 'user_information',
              select_columns: [['email'], ['username'], ['role'], ['status_id']],
            },
            user_roles: {
              group_by: ['user_roles.user_id'],
              includes: [
                {
                  join_type: 'INNER',
                  table_name: 'user_information',
                  join_condition: 'user_information.id = user_roles.user_id',
                },
              ],
              company_id: 1,
              search_all: [
                {
                  value: '$unique_id',
                  operator: '=',
                  column_name: 'user_information.uuid',
                },
                {
                  value: '3',
                  operator: '!=',
                  column_name: 'user_information.status_id',
                },
              ],
              limit_range: 15,
              print_query: false,
              start_index: 0,
              sort_columns: [['user_roles.user_id', 'desc']],
              primary_table: 'user_roles',
              select_columns: [['json_agg(user_roles.role_id::int)', 'role_id']],
            },
            user_details: {
              company_id: 1,
              search_all: [
                {
                  value: '$unique_id',
                  operator: '=',
                  column_name: 'user_information.uuid',
                },
                {
                  value: '3',
                  operator: '!=',
                  column_name: 'user_information.status_id',
                },
              ],
              limit_range: 1,
              print_query: false,
              start_index: 0,
              sort_columns: [['user_information.id', 'asc']],
              primary_table: 'user_information',
              select_columns: [
                ['code'],
                ['first_name'],
                ['last_name'],
                ['designation_id'],
                ['department_id'],
                ['dob'],
                ['phone_number'],
                ['country_code'],
                ['gender'],
                ['user_time_zone'],
                ['address'],
                ['culture'],
                ['profile_pic'],
              ],
            },
          },
        },
      ],
    },
    entityConfigurationsInfo: {
      header: 'sample_entity_configurations_information',
      examples: [
        {
          name: 'example_1',
          comments: [],
          data: {
            grid_show_title: 'yes',
            grid_enable_sticky_header: 'yes',
            grid_show_serial_number: 'yes',
            grid_show_global_search: 'yes',
            grid_show_advanced_search: 'yes',
            grid_show_column_filter: 'yes',
            grid_enable_sticky_action_column: 'yes',
          },
        },
      ],
    },
  };
  selectedInfoTab: number = 0;
  popupInformation: any = null;
  popupName: string = 'reportInfo';
  popupInfoEditorOptions = { ...this.editorOptions, language: 'sql', cursorStyle: 'line', readOnly: true, automaticLayout: true, minimap: { enabled: false } };
  LeftEditorOptionsForAI = {
    ...this.editorOptions,
    language: 'sql',
    cursorStyle: 'line',
    readOnly: false,
    automaticLayout: true,
    minimap: { enabled: false },
    suggest: {
      showWords: true,
      showKeywords: true,
    },
    folding: true,
    wordWrap: 'on',
    tabSize: 4,
    insertSpaces: true,
    formatOnPaste: true,
    formatOnType: true,
  };
  RightEditorOptionsForAI = {
    ...this.editorOptions,
    language: 'json',
    cursorStyle: 'line',
    readOnly: false,
    automaticLayout: true,
    minimap: { enabled: false },
    formatOnPaste: true,
    formatOnType: true,
    autoClosingQuotes: 'always',
  };
  entityNameSuggestions: string[] = [];
  readonly entityNameSuggestionLimit = 1;
  allEntityNameSlugs: Set<string> = new Set();
  entityNameEditable = false;
  originalEntityName = '';
  entityNameError = '';
  isEntityNameModalOpen = false;
  entityNameModalError = '';
  entityNameModalSuggestions: string[] = [];
  entityNameModalForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private gridApiService: GridApiService,
    private toastr: ToastrService,
    private route: ActivatedRoute,
    private router: Router,
    public localStorageService: LocalStorageService,
    public storeData: Store<any>,
    public location: Location,
    private translate: TranslateService,
    private titleService: Title,
    private openaiService: OpenaiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.initStore();
    this.id = this.route.snapshot.params['id'] || this.route.snapshot.params['uuid'] || null;
    this.initForm();
    this.constructRedirectUrl();
    this.initWizardGroupForm();
    this.loadWizardGroups();
    this.loadExportTemplates();
    this.loadEmailTemplates();
    this.loadWhatsappTemplates();
    //this.loadWizardTypes();

    // To load all the lookups
    this.field_types = this.commonConfig.field_types;
    this.updateFormValidation();

    this.form.get('name')?.valueChanges.subscribe((name) => {
      if (!this.editTitle || this.entityNameEditable) {
        this.generateEntityNameSuggestions(name);
      }
      if (!(name || '').trim()) {
        this.form.get('entityName')?.setValue('', { emitEvent: false });
        this.entityNameSuggestions = [];
        this.entityNameError = '';
      }
    });

    setTimeout(() => {
      this.fetchAllTables();
      // If "id" is not available we need consider it as "Add", otherwise "Edit"
      if (!this.id) {
        this.editTitle = false;
      } else {
        this.editTitle = true;
        this.loadData(this.id);
      }
      this.titleChange();
      this.fetchAllMasterEntities();
      this.cdr.detectChanges();
    });
  }

  async initStore() {
    this.storeData
      .select((d) => d.index)
      .subscribe((d) => {
        queueMicrotask(() => {
          this.store = d;
          this.cdr.detectChanges();
        });
      });
  }

  titleChange() {
    const title = this.editTitle ? 'title_edit_entity' : 'title_add_entity';
    const translateTitle = this.translate.instant(title);
    this.titleService.setTitle(translateTitle);
  }

  decimalValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (value !== null && value !== undefined && !/^\d+(\.\d{1,2})?$/.test(value)) {
      return { decimalInvalid: true };
    }
    return null;
  }

  initForm() {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      entityName: [''],
      primaryTable: [''],
      statusId: [1],
      isAdminModule: [false],
      header_entity_id: [''],
      footer_entity_id: [''],
      draftMode: [false],
      associateTable: [''],
      wizardType: [''],
      reportType: [this.commonConfig.REPORT_TYPES.LCP],
      wizardGroup: [''],
      export_template_id: [''],
      dashboard_wizard_rows: [''],
      dashboard_wizard_columns: [''],
      dashboard_wizard_order_no: ['0.01', [this.decimalValidator]],
      reload_timeout: [''],
      dashboard_entity_name: [''],
      queryInformation: [''],
      reportInformation: [''],
      dashboard_wizard_options: [''],
      formInformation: [''],
      addQueryInformation: [''],
      editQueryInformation: [''],
      presetQueryInformation: [''],
      entity_configurations: [''],
      approve_mail_id: [null],
      reject_mail_id: [null],
      approve_whatsapp_id: [null],
      reject_whatsapp_id: [null],
      staticPageContent: [''],
      items: this.fb.array([]),
      exportTemplateFileName: [''],
    });

    // Initialize edit item form
    this.editItemForm = this.fb.group({
      type: [this.lineItemTypeLineItem],
      fieldName: [''],
      displayName: [''],
      orderNo: [''],
      defaultQuery: [false],
      isGridColumn: [''],
      isSearchable: [''],
      clauseType: [''],
      isSortable: [''],
      fieldType: [''],
      fieldHtmlContent: [''],
      enumValues: [''],
      approveQueryInformation: ['[]'],
      rejectQueryInformation: ['[]'],
      lineItemConfigurations: [''],
    });
  }

  initWizardGroupForm() {
    this.wizardGroupForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
    });
  }

  loadWizardGroups() {
    const params = {
      company_id: 1,
      print_query: true,
      primary_table: 'wizard_group',
      start_index: 0,
      limit_range: 1000,
      sort_columns: [['wizard_group.id', 'desc']],
      select_columns: [['wizard_group.*']],
    };

    this.gridApiService.getAllList(params).subscribe(
      (response) => {
        if (response.status && response.code === 200) {
          this.wizardGroups = response.data.records;
        }
      },
      (error) => {
        const key = 'error';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
      }
    );
  }

  loadExportTemplates() {
    const params = {
      company_id: 1,
      print_query: true,
      primary_table: 'export_templates',
      start_index: 0,
      limit_range: 1000,
      sort_columns: [['export_templates.id', 'desc']],
      select_columns: [['export_templates.id, export_templates.name']],
    };

    this.gridApiService.getAllList(params).subscribe(
      (response) => {
        if (response.status && response.code === 200) {
          this.exportTemplates = response.data.records;
        }
      },
      (error) => {
        const key = 'error';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
      }
    );
  }

  loadEmailTemplates() {
    const params = {
      company_id: 1,
      print_query: true,
      primary_table: 'notification_templates',
      start_index: 0,
      limit_range: 1000,
      sort_columns: [['notification_templates.id', 'desc']],
      search_all: [
        { value: 'email', operator: '=', column_name: 'notification_templates.notification_type' },
        { value: 3, operator: '!=', column_name: 'notification_templates.status_id' },
      ],
      select_columns: [['notification_templates.id'], ['notification_templates.name']],
    };

    this.gridApiService.getAllList(params).subscribe(
      (response) => {
        if (response.status && response.code === 200) {
          this.emailTemplateList = response.data.records || [];
        }
      },
      () => {
        const key = 'error';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
      }
    );
  }

  loadWhatsappTemplates() {
    const params = {
      company_id: 1,
      print_query: true,
      primary_table: 'notification_templates',
      start_index: 0,
      limit_range: 1000,
      sort_columns: [['notification_templates.id', 'desc']],
      search_all: [
        { value: 'whatsapp', operator: '=', column_name: 'notification_templates.notification_type' },
        { value: 3, operator: '!=', column_name: 'notification_templates.status_id' },
      ],
      select_columns: [['notification_templates.id'], ['notification_templates.name']],
    };

    this.gridApiService.getAllList(params).subscribe(
      (response) => {
        if (response.status && response.code === 200) {
          this.whatsappTemplateList = response.data.records || [];
        }
      },
      () => {
        const key = 'error';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
      }
    );
  }

  addNewWizardGroup() {
    if (this.wizardGroupForm.valid) {
      const newGroupName = this.wizardGroupForm.get('name')?.value;
      const params = {
        action: ['insert'],
        table: ['wizard_group'],
        table_mapping: ['table1'],
        data: {
          table1: [
            {
              name: newGroupName,
              slug: newGroupName,
            },
          ],
        },
      };

      this.gridApiService.executeRecords(params).subscribe(
        (response) => {
          if (response.status && response.code === 200) {
            const key = 'record_inserted_successfully';
            const successMessage = this.translate.instant(key);
            this.toastr.success(successMessage);

            this.loadWizardGroups();
            this.cancelAddWizardGroup();
          } else {
            const key = response.message;
            const errorMessage = this.translate.instant(key);
            this.toastr.error(errorMessage, 'Error');
          }
        },
        (error) => {
          const key = 'error';
          const errorMessage = this.translate.instant(key);
          this.toastr.error(errorMessage, 'Error');
        }
      );
    }
  }

  isWizardGroupFieldInvalid(fieldName: string): any {
    const field = this.wizardGroupForm.get(fieldName);
    return field?.invalid && (field.touched || field.dirty);
  }

  getWizardGroupErrorMessage(fieldName: string): string {
    const field = this.wizardGroupForm.get(fieldName);
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

  showAddNewWizardGroup() {
    this.showWizardGroupMenu = true;
  }

  cancelAddWizardGroup() {
    this.showWizardGroupMenu = false;
    this.wizardGroupForm.reset();
  }

  updateFormValidation() {
    this.form.clearValidators();

    const primaryTableControl = this.form.get('primaryTable');
    primaryTableControl?.setValidators([Validators.required, Validators.maxLength(100)]);
    primaryTableControl?.updateValueAndValidity();
    this.form.updateValueAndValidity();
  }

  constructRedirectUrl() {
    const currentUrl = this.router.url;
    let updatedUrl = currentUrl.replace(/\/edit\/\d+$/, '');
    this.redirect_url = updatedUrl.replace(/\/add$/, '');
  }

  toggleTheme() {
    this.isDarkTheme = !this.isDarkTheme;
    this.editorOptions = {
      ...this.editorOptions,
      theme: this.isDarkTheme ? 'vs-dark' : 'vs-light',
    };
  }

  fetchAllTables() {
    this.gridApiService.getAllTables().subscribe(
      (response) => {
        if (response.status && response.code === 200) {
          this.tables_list = response.data;
        }
      },
      (error) => {
        const key = 'error';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
      }
    );
  }

  addItem() {
    const items = this.form.get('items') as FormArray;
    const group = this.fb.group({
      type: [this.lineItemTypeLineItem, Validators.required],
      fieldName: ['', [Validators.required, Validators.maxLength(1000)]],
      displayName: ['', [Validators.required, Validators.maxLength(100)]],
      orderNo: ['', [Validators.required, Validators.min(0)]],
      defaultQuery: [false],
      isGridColumn: ['true', Validators.required],
      isSearchable: ['true', Validators.required],
      clauseType: ['where', Validators.required],
      isSortable: ['true', Validators.required],
      fieldType: [this.commonConfig.field_types[0].value, Validators.required],
      fieldHtmlContent: [''],
      enumValues: [''],
      approveQueryInformation: ['[]'],
      rejectQueryInformation: ['[]'],
      lineItemConfigurations: [''],
    });
    this.setupLineItemTypeAutoUpdate(group);
    items.push(group);
    this.applyDefaultQueryRules();
  }

  removeItem(index: number) {
    const items = this.form.get('items') as FormArray;
    if (items.length > 0) {
      items.removeAt(index);
      this.applyDefaultQueryRules();
    } else {
      this.toastr.warning('At least one item is required.');
    }
  }

  openEditModal(index: number) {
    this.editItemIndex = index;
    const items = this.form.get('items') as FormArray;
    const currentItem = items.at(index);

    // Create a separate form for editing
    this.editItemForm = this.fb.group({
      type: [currentItem.get('type')?.value || this.lineItemTypeLineItem, Validators.required],
      fieldName: [currentItem.get('fieldName')?.value, Validators.required],
      displayName: [currentItem.get('displayName')?.value, Validators.required],
      orderNo: [currentItem.get('orderNo')?.value, [Validators.required, Validators.min(0)]],
      defaultQuery: [!!currentItem.get('defaultQuery')?.value],
      isGridColumn: [currentItem.get('isGridColumn')?.value, Validators.required],
      isSearchable: [currentItem.get('isSearchable')?.value, Validators.required],
      clauseType: [currentItem.get('clauseType')?.value, Validators.required],
      isSortable: [currentItem.get('isSortable')?.value, Validators.required],
      fieldType: [currentItem.get('fieldType')?.value, Validators.required],
      fieldHtmlContent: [currentItem.get('fieldHtmlContent')?.value],
      enumValues: [currentItem.get('enumValues')?.value],
      approveQueryInformation: [currentItem.get('approveQueryInformation')?.value || '[]'],
      rejectQueryInformation: [currentItem.get('rejectQueryInformation')?.value || '[]'],
      lineItemConfigurations: [currentItem.get('lineItemConfigurations')?.value],
    });

    this.setupLineItemTypeAutoUpdate(this.editItemForm, false);
    this.isEditModalOpen = true;
  }

  closeEditModal() {
    this.isEditModalOpen = false;
    this.editItemIndex = null;
    this.editItemForm = this.fb.group({});
  }

  submitEditModal() {
    if (this.editItemForm.invalid) {
      this.toastr.error('Please fill in all required fields correctly.');
      return;
    }

    if (this.editItemIndex !== null) {
      const items = this.form.get('items') as FormArray;
      const itemToUpdate = items.at(this.editItemIndex);
      itemToUpdate.patchValue(this.editItemForm.value);
      this.applyTypeSpecificControls(itemToUpdate as FormGroup, true);
      this.applyDefaultQueryRules();
      this.toastr.success('Item updated successfully');
      this.closeEditModal();
    }
  }

  isEditFieldInvalid(field: string): boolean {
    const control = this.editItemForm?.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  getEditErrorMessage(field: string): string {
    const control = this.editItemForm?.get(field);
    if (control?.hasError('required')) {
      return 'This field is required';
    }
    if (control?.hasError('min')) {
      return 'Value must be greater than or equal to 0';
    }
    return '';
  }

  get itemsControls() {
    return (this.form.get('items') as FormArray).controls;
  }

  loadData(id: number) {
    const params = {
      company_id: 1,
      print_query: true,
      primary_table: 'master_approval_workflows',
      start_index: 0,
      limit_range: 1,
      sort_columns: [['master_approval_workflows.id', 'desc']],
      select_columns: [
        ['master_approval_workflows.*'],
        [
          "CASE WHEN COUNT(master_approval_workflow_line_items.id) = 0 THEN null ELSE COALESCE(Json_agg(DISTINCT jsonb_build_object('id', master_approval_workflow_line_items.id,'type', master_approval_workflow_line_items.type,'default_query', master_approval_workflow_line_items.default_query,'field_name', master_approval_workflow_line_items.field_name,'display_name', master_approval_workflow_line_items.display_name,'order_no', master_approval_workflow_line_items.order_no,'is_searchable', master_approval_workflow_line_items.is_searchable,'field_type_id', master_approval_workflow_line_items.field_type_id,'enum_values', master_approval_workflow_line_items.enum_values,'approve_query_information', master_approval_workflow_line_items.approve_query_information, 'reject_query_information', master_approval_workflow_line_items.reject_query_information))) END",
          'items',
        ],
      ],
      includes: [
        {
          table_name: 'master_approval_workflow_line_items',
          join_type: 'LEFT',
          join_condition: `master_approval_workflows.id = master_approval_workflow_line_items.master_approval_workflow_id AND master_approval_workflows.uuid = '${id}'`,
        },
      ],
      search_all: [
        {
          column_name: 'master_approval_workflows.uuid',
          value: this.id,
          operator: '=',
        },
      ],

      group_by: ['master_approval_workflows.id'],
    };

    this.gridApiService.getAllList(params).subscribe(
      (response) => {
        if (response.status && response.code === 200) {
          const entity = response.data.records[0];
          this.originalEntityName = entity.entity_name || '';

          const prefix = this.approvalWorkflowEntityNamePrefix;
          const entityNameSuffix =
            entity.entity_name && entity.entity_name.startsWith(prefix + '_') ? entity.entity_name.slice(prefix.length + 1) : entity.entity_name || '';

          this.form.patchValue({
            name: entity.name,
            entityName: entityNameSuffix,
            primaryTable: entity.primary_table && entity.primary_table != 'null' ? entity.primary_table : '',
            statusId: entity.status_id,
            queryInformation: entity.query_information ? this.prettyJSON(entity.query_information) : '',
            approve_mail_id: entity.approve_mail_id,
            reject_mail_id: entity.reject_mail_id,
            approve_whatsapp_id: entity.approve_whatsapp_id,
            reject_whatsapp_id: entity.reject_whatsapp_id,
          });

          const items = this.form.get('items') as FormArray;
          //items.clear();
          if (entity.items && entity.items.length > 0) {
            entity.items.forEach((item: any) => {
              const itemType = item.type || this.lineItemTypeLineItem;
              const group = this.fb.group({
                type: [itemType, Validators.required],
                fieldName: [item.field_name, Validators.required],
                displayName: [item.display_name, Validators.required],
                orderNo: [item.order_no, [Validators.required, Validators.min(0)]],
                defaultQuery: [!!item.default_query],
                isSearchable: [item.is_searchable, Validators.required],
                fieldType: [item.field_type_id, Validators.required],
                enumValues: [item.enum_values ? this.prettyJSON(item.enum_values) : ''],
                approveQueryInformation: [item.approve_query_information ? this.prettyJSON(item.approve_query_information) : null],
                rejectQueryInformation: [item.reject_query_information ? this.prettyJSON(item.reject_query_information) : null],
              });
              this.setupLineItemTypeAutoUpdate(group);
              this.applyTypeSpecificControls(group, true);
              items.push(group);
            });
            this.applyDefaultQueryRules();
          }
        }
      },
      (error) => {
        const key = 'error';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
      }
    );
  }

  getAddParams(formData: any) {
    const prefix = this.approvalWorkflowEntityNamePrefix;
    const suffix = (formData.entityName || '').trim();
    const fullEntityName = suffix
      ? prefix
        ? `${prefix}_${suffix}`
        : suffix
      : this.localStorageService.generateSlugWithTimestamp(prefix ? `${prefix}_${formData.name}` : formData.name);
    const entitySlug = fullEntityName;

    const master = [
      {
        name: formData.name,
        entity_name: entitySlug,
        ...(formData.primaryTable && { primary_table: formData.primaryTable }),
        ...(formData.statusId && { status_id: formData.statusId }),
        ...(formData.queryInformation && { query_information: this.prepareJSON(formData.queryInformation, true, 'Query Information') }),
        ...(formData.approve_mail_id && { approve_mail_id: formData.approve_mail_id }),
        ...(formData.reject_mail_id && { reject_mail_id: formData.reject_mail_id }),
        ...(formData.approve_whatsapp_id && { approve_whatsapp_id: formData.approve_whatsapp_id }),
        ...(formData.reject_whatsapp_id && { reject_whatsapp_id: formData.reject_whatsapp_id }),
      },
    ];

    const itemsArray = this.form.get('items') as FormArray;
    if (itemsArray && itemsArray.length > 0) {
      const items = itemsArray.controls.map((control: any) => {
        const itemType = control.value.type || this.lineItemTypeLineItem;
        const isQueryLineItem = this.isQueryType(itemType);
        const isApproveQuery = this.isApproveQueryType(itemType);
        const isRejectQuery = this.isRejectQueryType(itemType);

        return {
          master_approval_workflow_id: '@table1.id',
          type: itemType,
          default_query: isQueryLineItem ? !!control.value.defaultQuery : false,
          field_name: control.value.fieldName,
          display_name: control.value.displayName,
          order_no: control.value.orderNo,
          is_searchable: isQueryLineItem ? false : control.value.isSearchable,
          field_type_id: isQueryLineItem ? this.commonConfig.field_types[0]?.value : control.value.fieldType,
          enum_values: isQueryLineItem
            ? null
            : this.prepareOptionalJSON(control.value.enumValues, false, `Enum Values for ${control.value.displayName || control.value.fieldName}`),
          approve_query_information: isApproveQuery
            ? this.prepareTextArray(
                control.value.approveQueryInformation,
                `Approve Query Information for ${control.value.displayName || control.value.fieldName}`
              )
            : null,
          reject_query_information: isRejectQuery
            ? this.prepareTextArray(
                control.value.rejectQueryInformation,
                `Reject Query Information for ${control.value.displayName || control.value.fieldName}`
              )
            : null,
        };
      });
      this.insert_json_schema.data['table2'] = items;
    }

    this.insert_json_schema.data['table1'] = master;

    return this.insert_json_schema;
  }

  getEditParams(formData: any, id: any) {
    const newEntityName = this.originalEntityName;

    const master = [
      {
        name: formData.name,
        entity_name: newEntityName || null,
        ...(formData.primaryTable ? { primary_table: formData.primaryTable } : { primary_table: null }),
        ...(formData.statusId ? { status_id: formData.statusId } : { status_id: null }),
        ...(formData.queryInformation
          ? { query_information: this.prepareJSON(formData.queryInformation, true, 'Query Information') }
          : { query_information: null }),
        ...(formData.approve_mail_id ? { approve_mail_id: formData.approve_mail_id } : { approve_mail_id: null }),
        ...(formData.reject_mail_id ? { reject_mail_id: formData.reject_mail_id } : { reject_mail_id: null }),
        ...(formData.approve_whatsapp_id ? { approve_whatsapp_id: formData.approve_whatsapp_id } : { approve_whatsapp_id: null }),
        ...(formData.reject_whatsapp_id ? { reject_whatsapp_id: formData.reject_whatsapp_id } : { reject_whatsapp_id: null }),
      },
    ];

    this.update_json_schema.data['table1'] = master;
    this.update_json_schema.conditions['table1'] = [{ uuid: id }];

    this.update_json_schema.conditions['table2'] = [{ master_approval_workflow_id: '@table1.id' }];
    const itemsArray = this.form.get('items') as FormArray;
    if (itemsArray && itemsArray.length > 0) {
      const items = itemsArray.controls.map((control: any) => {
        const itemType = control.value.type || this.lineItemTypeLineItem;
        const isQueryLineItem = this.isQueryType(itemType);
        const isApproveQuery = this.isApproveQueryType(itemType);
        const isRejectQuery = this.isRejectQueryType(itemType);

        return {
          master_approval_workflow_id: '@table1.id',
          type: itemType,
          default_query: isQueryLineItem ? !!control.value.defaultQuery : false,
          field_name: control.value.fieldName,
          display_name: control.value.displayName,
          order_no: control.value.orderNo,
          is_searchable: isQueryLineItem ? false : control.value.isSearchable,
          field_type_id: isQueryLineItem ? this.commonConfig.field_types[0]?.value : control.value.fieldType,
          enum_values: isQueryLineItem
            ? null
            : this.prepareOptionalJSON(control.value.enumValues, false, `Enum Values for ${control.value.displayName || control.value.fieldName}`),
          approve_query_information: isApproveQuery
            ? this.prepareTextArray(
                control.value.approveQueryInformation,
                `Approve Query Information for ${control.value.displayName || control.value.fieldName}`
              )
            : null,
          reject_query_information: isRejectQuery
            ? this.prepareTextArray(
                control.value.rejectQueryInformation,
                `Reject Query Information for ${control.value.displayName || control.value.fieldName}`
              )
            : null,
        };
      });
      this.update_json_schema.data['table3'] = items;
    }

    return this.update_json_schema;
  }

  escapePlaceholders(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }
    if (typeof obj === 'string') {
      return obj
        .replace(/@table/g, '##table')
        .replace(/{{{/g, '{#{') // Replace {{{ with {#{
        .replace(/}}}/g, '}#}'); // Replace }}} with }#}
    }
    if (Array.isArray(obj)) {
      return obj.map((item) => this.escapePlaceholders(item));
    }
    if (typeof obj === 'object') {
      const result: any = {};
      for (const key of Object.keys(obj)) {
        result[key] = this.escapePlaceholders(obj[key]);
      }
      return result;
    }
    return obj;
  }

  prepareJSON(data: any, replace_param: boolean = false, fieldName: string = 'JSON field'): string {
    try {
      // Parse the input data into a JavaScript object
      let parsedData = typeof data === 'string' ? JSON.parse(data) : data;

      // Perform replacements if replace_param is true recursively on values only
      if (replace_param) {
        parsedData = this.escapePlaceholders(parsedData);
      }

      // Convert the object back to a JSON string
      return JSON.stringify(parsedData);
    } catch (error) {
      console.error(`Error preparing JSON for "${fieldName}":`, error);
      throw new Error(`Invalid JSON syntax in "${fieldName}".`);
    }
  }

  prepareOptionalJSON(data: any, replace_param: boolean = false, fieldName: string = 'JSON field'): string | null {
    if (data === null || data === undefined) {
      return null;
    }

    if (typeof data === 'string' && data.trim() === '') {
      return null;
    }

    const source = typeof data === 'string' ? data : JSON.stringify(data);
    return this.prepareJSON(source, replace_param, fieldName);
  }

  prepareTextArray(data: any, fieldName: string = 'text array'): string[] {
    if (data === null || data === undefined) {
      return [];
    }

    if (Array.isArray(data)) {
      return data.map((item) => (item === null || item === undefined ? '' : String(item).trim())).filter((item) => item !== '');
    }

    if (typeof data === 'string') {
      const trimmed = data.trim();
      if (!trimmed) {
        return [];
      }

      try {
        const parsed = JSON.parse(trimmed);
        if (!Array.isArray(parsed)) {
          throw new Error(`Invalid JSON type in "${fieldName}". Expected a JSON array.`);
        }
        return parsed.map((item) => (item === null || item === undefined ? '' : String(item).trim())).filter((item) => item !== '');
      } catch (error) {
        if (error instanceof Error && error.message.startsWith('Invalid JSON type')) {
          throw error;
        }
        throw new Error(`Invalid JSON syntax in "${fieldName}". Expected a JSON array, for example ["update ... where id = $unique_id"].`);
      }
    }

    throw new Error(`Invalid value in "${fieldName}". Expected a JSON array.`);
  }

  private getQueryInfoEditorValue(value: any): string {
    if (value === null || value === undefined) {
      return '[]';
    }
    if (Array.isArray(value)) {
      return JSON.stringify(value);
    }

    const stringValue = String(value).trim();
    return stringValue ? stringValue : '[]';
  }

  prettyJSON(data: any) {
    return JSON.stringify(JSON.parse(JSON.stringify(data)), null, 2);
  }

  onSubmit() {
    this.submitted = true;

    const formData = this.form.getRawValue();
    let payload;
    try {
      payload = this.id ? this.getEditParams(formData, this.id) : this.getAddParams(formData);
    } catch (error: any) {
      console.error('Error preparing payload:', error);
      this.toastr.error(error.message || 'Invalid JSON format in one of the fields.', 'Error');
      return;
    }

    this.gridApiService.executeRecords(payload).subscribe(
      (response) => {
        if (response.status && response.code === 200) {
          let key;
          if (this.id) {
            key = 'record_updated_successfully';
          } else {
            key = 'record_inserted_successfully';
          }

          const successMessage = this.translate.instant(key);
          this.toastr.success(successMessage);

          this.router.navigate([this.redirect_url]);
        } else {
          const key = response.message;
          console.log('Error key:', key);
          console.log('Error response:', response);
          const errorMessage = this.translate.instant(key);
          this.toastr.error(errorMessage, 'Error');
        }
      },
      (error) => {
        const key = 'error';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
      }
    );
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return field ? field.invalid && (field.touched || this.submitted) : false;
  }

  isFormInvalid() {
    if (this.form.invalid) return true;
    if (this.itemsControls.length === 0) return true;
    if (this.isEntityNameActive && !(this.form.get('entityName')?.value || '').trim()) return true;
    return false;
  }

  logFormStatus(): void {
    Object.keys(this.form.controls).forEach((field) => {
      const control = this.form.get(field);
      if (control) {
        console.warn(`Field: ${field}, Status: ${control.status}, Errors: ${JSON.stringify(control.errors)}`);
      }
    });
  }

  getErrorMessage(fieldName: string): string {
    const field = this.form.get(fieldName);
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

  isItemFieldInvalid(index: number, fieldName: string): boolean {
    const items = this.form.get('items') as FormArray;
    const field = items.at(index).get(fieldName);
    return field ? field.invalid && (field.touched || this.submitted) : false;
  }

  getItemErrorMessage(index: number, fieldName: string): string {
    const items = this.form.get('items') as FormArray;
    const field = items.at(index).get(fieldName);
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

      if (field.hasError('invalidJson')) {
        return field.errors?.['invalidJson']?.message || `Invalid JSON Syntax.`;
      }
      if (field.hasError('invalidJsonType')) {
        return `Invalid JSON Type: Expected ${field.errors?.['invalidJsonType'].expected} but got ${field.errors?.['invalidJsonType'].actual}`;
      }
      if (field.hasError('invalidArrayItemType')) {
        return (
          field.errors?.['invalidArrayItemType']?.message ||
          `Invalid Array Item Type: Expected ${field.errors?.['invalidArrayItemType'].expected} but got ${field.errors?.['invalidArrayItemType'].actual} at index ${field.errors?.['invalidArrayItemType'].index}.`
        );
      }
    }
    return '';
  }

  isApproveQueryType(type: string | null | undefined): boolean {
    return (type || '').toLowerCase() === this.lineItemTypeApproveQuery;
  }

  isRejectQueryType(type: string | null | undefined): boolean {
    return (type || '').toLowerCase() === this.lineItemTypeRejectQuery;
  }

  isQueryType(type: string | null | undefined): boolean {
    return this.isApproveQueryType(type) || this.isRejectQueryType(type);
  }

  isLineItemQuery(index: number): boolean {
    const items = this.form.get('items') as FormArray;
    const typeValue = items?.at(index)?.get('type')?.value;
    return this.isQueryType(typeValue);
  }

  isSingleQueryItem(index: number): boolean {
    const items = this.form.get('items') as FormArray;
    if (!items || items.length === 0 || !this.isLineItemQuery(index)) return false;
    const currentType = items.at(index).get('type')?.value;
    const sameTypeIndexes = items.controls.map((ctrl, i) => (ctrl.get('type')?.value === currentType ? i : -1)).filter((i) => i >= 0);
    return sameTypeIndexes.length === 1 && sameTypeIndexes[0] === index;
  }

  isEditItemQuery(): boolean {
    return this.isQueryType(this.editItemForm?.get('type')?.value);
  }

  isEditItemApproveQuery(): boolean {
    return this.isApproveQueryType(this.editItemForm?.get('type')?.value);
  }

  isEditItemRejectQuery(): boolean {
    return this.isRejectQueryType(this.editItemForm?.get('type')?.value);
  }

  isEditSingleQueryItem(): boolean {
    if (this.editItemIndex === null) return false;
    return this.isSingleQueryItem(this.editItemIndex);
  }

  private setupLineItemTypeAutoUpdate(group: FormGroup, syncDefaultQueryAcrossItems: boolean = true): void {
    const typeControl = group.get('type');
    const defaultQueryControl = group.get('defaultQuery');
    if (!typeControl || !defaultQueryControl) return;

    this.applyTypeSpecificControls(group, syncDefaultQueryAcrossItems);

    typeControl.valueChanges.subscribe(() => {
      this.applyTypeSpecificControls(group, syncDefaultQueryAcrossItems);
      if (syncDefaultQueryAcrossItems) {
        this.applyDefaultQueryRules(group);
      }
    });

    defaultQueryControl.valueChanges.subscribe((checked) => {
      if (!this.isQueryType(typeControl.value)) {
        defaultQueryControl.setValue(false, { emitEvent: false });
        return;
      }

      if (syncDefaultQueryAcrossItems && checked) {
        this.clearOtherDefaultQuerySelections(group);
      }

      if (syncDefaultQueryAcrossItems) {
        this.applyDefaultQueryRules(group);
      }
    });
  }

  private applyTypeSpecificControls(group: FormGroup, syncDefaultQueryAcrossItems: boolean): void {
    const typeValue = group.get('type')?.value;
    const isApproveQuery = this.isApproveQueryType(typeValue);
    const isRejectQuery = this.isRejectQueryType(typeValue);
    const isQuery = isApproveQuery || isRejectQuery;
    const existingApproveQueryInformation = group.get('approveQueryInformation')?.value;
    const existingRejectQueryInformation = group.get('rejectQueryInformation')?.value;
    const controlsToReset = ['isGridColumn', 'isSearchable', 'clauseType', 'isSortable', 'fieldType', 'fieldHtmlContent', 'enumValues'];

    if (isQuery) {
      controlsToReset.forEach((name) => {
        const control = group.get(name);
        if (!control) return;
        control.clearValidators();
        control.setErrors(null);
      });

      group.patchValue(
        {
          defaultQuery: true,
          isGridColumn: false,
          isSearchable: false,
          clauseType: 'where',
          isSortable: false,
          fieldType: this.commonConfig.field_types[0]?.value,
          approveQueryInformation: isApproveQuery ? this.getQueryInfoEditorValue(existingApproveQueryInformation) : null,
          rejectQueryInformation: isRejectQuery ? this.getQueryInfoEditorValue(existingRejectQueryInformation) : null,
          fieldHtmlContent: null,
          lineItemConfigurations: null,
        },
        { emitEvent: false }
      );
    } else {
      group.get('isGridColumn')?.setValidators([Validators.required]);
      group.get('isSearchable')?.setValidators([Validators.required]);
      group.get('clauseType')?.setValidators([Validators.required]);
      group.get('isSortable')?.setValidators([Validators.required]);
      group.get('fieldType')?.setValidators([Validators.required]);

      group.patchValue(
        {
          defaultQuery: false,
          isGridColumn: group.get('isGridColumn')?.value ?? 'true',
          isSearchable: group.get('isSearchable')?.value ?? 'true',
          clauseType: group.get('clauseType')?.value ?? 'where',
          isSortable: group.get('isSortable')?.value ?? 'true',
          fieldType: group.get('fieldType')?.value ?? this.commonConfig.field_types[0]?.value,
          approveQueryInformation: null,
          rejectQueryInformation: null,
        },
        { emitEvent: false }
      );
    }

    [...controlsToReset, 'approveQueryInformation', 'rejectQueryInformation', 'lineItemConfigurations'].forEach((name) => {
      group.get(name)?.updateValueAndValidity({ emitEvent: false });
    });

    if (!syncDefaultQueryAcrossItems && isQuery) {
      // Keep modal behavior deterministic even before submit.
      group.get('defaultQuery')?.setValue(!!group.get('defaultQuery')?.value, { emitEvent: false });
    }
  }

  private clearOtherDefaultQuerySelections(selectedGroup: FormGroup): void {
    const items = this.form.get('items') as FormArray;
    if (!items || items.length === 0) return;

    const selectedType = selectedGroup.get('type')?.value;

    items.controls.forEach((control) => {
      if (control === selectedGroup) return;
      if (control.get('type')?.value !== selectedType) return;
      control.get('defaultQuery')?.setValue(false, { emitEvent: false });
    });
  }

  private applyDefaultQueryRules(changedGroup?: FormGroup): void {
    const items = this.form.get('items') as FormArray;
    if (!items || items.length === 0) return;

    items.controls.forEach((control) => {
      if (!this.isQueryType(control.get('type')?.value)) {
        control.get('defaultQuery')?.setValue(false, { emitEvent: false });
      }
    });

    [this.lineItemTypeApproveQuery, this.lineItemTypeRejectQuery].forEach((queryType) => {
      const queryItems = items.controls.filter((control) => control.get('type')?.value === queryType);
      if (queryItems.length === 0) return;

      if (queryItems.length === 1) {
        queryItems[0].get('defaultQuery')?.setValue(true, { emitEvent: false });
        return;
      }

      if (changedGroup && changedGroup.get('type')?.value === queryType && changedGroup.get('defaultQuery')?.value) {
        queryItems.forEach((control) => {
          if (control !== changedGroup) {
            control.get('defaultQuery')?.setValue(false, { emitEvent: false });
          }
        });
        return;
      }

      const selectedDefaults = queryItems.filter((control) => !!control.get('defaultQuery')?.value);
      if (selectedDefaults.length === 0) {
        queryItems[0].get('defaultQuery')?.setValue(true, { emitEvent: false });
      } else if (selectedDefaults.length > 1) {
        selectedDefaults.slice(1).forEach((control) => {
          control.get('defaultQuery')?.setValue(false, { emitEvent: false });
        });
      }
    });
  }

  openInfoPopUp(popup: string) {
    this.isInfoModalOpen = true;
    this.popupName = popup;
    this.selectedInfoTab = 0;
    const currentExample = this.infoContents[this.popupName].examples[this.selectedInfoTab];
    this.popupInformation = {
      header: this.infoContents[this.popupName].header,
      tabNames: this.infoContents[this.popupName].examples.map((example: any) => example.name),
      data: currentExample.data ? JSON.stringify(currentExample.data, null, 2) : null,
      comments: currentExample.comments || [],
      hasSplitEditors: !!currentExample.leftEditor && !!currentExample.rightEditor,
      leftEditor: currentExample.leftEditor || null,
      rightEditor: currentExample.rightEditor || null,
      editorOptions: {
        ...this.popupInfoEditorOptions,
        minimap: { enabled: false },
      },
    };
  }

  closeInfoPopUp() {
    this.isInfoModalOpen = false;
    this.popupInformation = null;
  }

  /**
   * Standardized copy-to-clipboard method for all editor fields
   * Copies selected text if available, otherwise copies entire content
   * @param formControlName - The name of the form control containing the content to copy
   */
  copyEditorContent(formControlName: string): void {
    // First, check if there's a text selection
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();

    if (selectedText) {
      // Copy the selected text
      navigator.clipboard
        .writeText(selectedText)
        .then(() => {
          this.toastr.success('Selection copied to clipboard!', 'Success');
        })
        .catch((err) => {
          console.error('Failed to copy selection:', err);
          this.toastr.error('Failed to copy selection', 'Error');
        });
      return;
    }

    // If no selection, copy the entire content
    const content = this.form.get(formControlName)?.value;

    if (!content || content.trim() === '') {
      this.toastr.warning('No content to copy', 'Warning');
      return;
    }

    navigator.clipboard
      .writeText(content)
      .then(() => {
        this.toastr.success('Content copied to clipboard!', 'Success');
      })
      .catch((err) => {
        console.error('Failed to copy:', err);
        this.toastr.error('Failed to copy content', 'Error');
      });
  }

  /**
   * Copy content from modal popup editor
   * Copies selected text if available, otherwise copies entire content
   */
  copyModalContent(): void {
    // First, check if there's a text selection
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();

    if (selectedText) {
      // Copy the selected text
      navigator.clipboard
        .writeText(selectedText)
        .then(() => {
          this.toastr.success('Selection copied to clipboard!', 'Success');
        })
        .catch((err) => {
          console.error('Failed to copy selection:', err);
          this.toastr.error('Failed to copy selection', 'Error');
        });
      return;
    }

    // If no selection, copy the entire content
    const content = this.popupInformation?.data;

    if (!content || content.trim() === '') {
      this.toastr.warning('No content to copy', 'Warning');
      return;
    }

    navigator.clipboard
      .writeText(content)
      .then(() => {
        this.toastr.success('Content copied to clipboard!', 'Success');
      })
      .catch((err) => {
        console.error('Failed to copy:', err);
        this.toastr.error('Failed to copy content', 'Error');
      });
  }

  // Function to switch tabs
  selectTab(index: number) {
    this.selectedInfoTab = index;
    const currentExample = this.infoContents[this.popupName].examples[this.selectedInfoTab];
    this.popupInformation = {
      ...this.popupInformation,
      data: currentExample.data ? JSON.stringify(currentExample.data, null, 2) : null,
      comments: currentExample.comments || [],
      hasSplitEditors: !!currentExample.leftEditor && !!currentExample.rightEditor,
      leftEditor: currentExample.leftEditor || null,
      rightEditor: currentExample.rightEditor || null,
      isProcessing: false,
    };
  }

  convertToQuery() {
    const inputData = this.popupInformation.rightEditor.content;

    if (!inputData) {
      this.toastr.warning('Please Enter JSON.', 'Warning');
      return;
    }

    this.popupInformation.isProcessing = true;

    let payload = {
      input: inputData,
      type: 'convert_to_query',
    };

    this.openaiService.generateAiContent(payload).subscribe(
      (response) => {
        let responseData = response.data;
        if (this.popupInformation) {
          this.popupInformation.leftEditor.content = responseData;
          this.popupInformation.isProcessing = false;
        }
      },
      (error) => {
        console.error('API Error:', error);
        this.toastr.error('Error generating AI content', 'Error');
        this.popupInformation.isProcessing = false;
      }
    );
  }

  convertToJson() {
    const inputData = this.popupInformation.leftEditor.content;

    if (!inputData) {
      this.toastr.warning('Please Enter Query.', 'Warning');
      return;
    }

    this.popupInformation.isProcessing = true;

    let payload = {
      input: inputData,
      type: 'convert_to_json',
    };

    this.openaiService.generateAiContent(payload).subscribe(
      (response) => {
        let responseData = response.data;
        if (this.popupInformation) {
          this.popupInformation.rightEditor.content = JSON.stringify(responseData, null, 2);
          this.popupInformation.isProcessing = false;
        }
      },
      (error) => {
        console.error('API Error:', error);
        this.toastr.error('Error generating AI content', 'Error');
        this.popupInformation.isProcessing = false;
      }
    );
  }

  copyToClipboardData(content: string, type: string = '') {
    if (!content) {
      this.toastr.warning(`No ${type || 'data'} to copy`);
      return;
    }

    navigator.clipboard
      .writeText(content)
      .then(() => this.toastr.success(`${type || 'Content'} copied to clipboard!`))
      .catch((err) => {
        console.error('Clipboard copy failed:', err);
        this.toastr.error('Failed to copy text');
      });
  }

  get entityNamePrefix(): string {
    return this.approvalWorkflowEntityNamePrefix;
  }

  get isEntityNameActive(): boolean {
    return !!(this.form?.get('name')?.value || '').trim();
  }

  generateEntityNameSuggestions(name: string): void {
    const cleanName = (name || '').trim();
    if (!cleanName) {
      this.entityNameSuggestions = [];
      return;
    }
    const prefix = this.approvalWorkflowEntityNamePrefix;
    const slug = cleanName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    // First candidate is the plain slug; rest use meaningful word suffixes only — no timestamps or random chars
    const candidates = [
      slug,
      `${slug}_new`,
      `${slug}_copy`,
      `${slug}_alt`,
      `${slug}_v2`,
      `${slug}_v3`,
      `${slug}_extra`,
      `${slug}_main`,
      `${slug}_base`,
      `${slug}_core`,
    ];

    // Uniqueness check against full slug (prefix + suffix), deduplicate, apply limit
    const seen = new Set<string>();
    const results: string[] = [];
    for (const c of candidates) {
      if (!c || seen.has(c)) continue;
      seen.add(c);
      const fullSlug = prefix ? `${prefix}_${c}` : c;
      if (!this.allEntityNameSlugs.has(fullSlug)) {
        results.push(c);
        if (results.length >= this.entityNameSuggestionLimit) break;
      }
    }
    this.entityNameSuggestions = results;
  }

  selectEntityNameSuggestion(slug: string): void {
    this.form.get('entityName')?.setValue(slug);
    this.onEntityNameBlur();
  }

  enableEntityNameEdit(): void {
    this.entityNameEditable = true;
    this.generateEntityNameSuggestions(this.form.get('name')?.value);
  }

  openEntityNameEditModal(): void {
    this.entityNameModalForm = this.fb.group({
      entityName: [this.form.get('entityName')?.value || '', [Validators.required]],
    });
    this.entityNameModalError = '';
    this.generateEntityNameModalSuggestions();
    this.isEntityNameModalOpen = true;
  }

  closeEntityNameEditModal(): void {
    console.log('Closing modal and resetting state');
    this.isEntityNameModalOpen = false;
    this.entityNameModalError = '';
    this.entityNameModalSuggestions = [];
  }

  private generateEntityNameModalSuggestions(): void {
    const name = this.form.get('name')?.value;
    const cleanName = (name || '').trim();
    if (!cleanName) {
      this.entityNameModalSuggestions = [];
      return;
    }
    const prefix = this.approvalWorkflowEntityNamePrefix;
    const slug = cleanName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    const candidates = [
      slug,
      `${slug}_new`,
      `${slug}_copy`,
      `${slug}_alt`,
      `${slug}_v2`,
      `${slug}_v3`,
      `${slug}_extra`,
      `${slug}_main`,
      `${slug}_base`,
      `${slug}_core`,
    ];
    const seen = new Set<string>();
    const results: string[] = [];
    for (const c of candidates) {
      if (!c || seen.has(c)) continue;
      seen.add(c);
      const fullSlug = prefix ? `${prefix}_${c}` : c;
      if (!this.allEntityNameSlugs.has(fullSlug) || fullSlug === this.originalEntityName) {
        results.push(c);
        if (results.length >= this.entityNameSuggestionLimit) break;
      }
    }
    this.entityNameModalSuggestions = results;
  }

  onEntityNameModalBlur(): void {
    const suffix = (this.entityNameModalForm.get('entityName')?.value ?? '').trim();
    if (!suffix) {
      this.entityNameModalError = '';
      return;
    }
    const prefix = this.entityNamePrefix;
    const fullSlug = prefix ? `${prefix}_${suffix}` : suffix;
    if (fullSlug === this.originalEntityName) {
      this.entityNameModalError = '';
      return;
    }
    if (this.allEntityNameSlugs.has(fullSlug)) {
      this.entityNameModalError = 'This entity name already exists. Please choose a different slug.';
    } else {
      this.entityNameModalError = '';
    }
  }

  selectEntityNameModalSuggestion(slug: string): void {
    this.entityNameModalForm.get('entityName')?.setValue(slug);
    this.onEntityNameModalBlur();
  }

  submitEntityNameEditModal(): void {
    const suffix = (this.entityNameModalForm.get('entityName')?.value ?? '').trim();
    if (!suffix) return;

    const prefix = this.entityNamePrefix;
    const newEntityName = prefix ? `${prefix}_${suffix}` : suffix;

    if (newEntityName === this.originalEntityName) {
      this.closeEntityNameEditModal();
      return;
    }

    if (this.allEntityNameSlugs.has(newEntityName)) {
      this.entityNameModalError = 'This entity name already exists. Please choose a different slug.';
      return;
    }

    const payload = {
      action: ['update'],
      table: ['master_approval_workflows'],
      table_mapping: ['table1'],
      data: {
        table1: [{ entity_name: newEntityName }],
      },
      conditions: {
        table1: [{ uuid: this.id }],
      },
    };

    this.gridApiService.executeRecords(payload).subscribe({
      next: (response) => {
        if (response.status && response.code === 200) {
          this.allEntityNameSlugs.delete(this.originalEntityName);
          this.allEntityNameSlugs.add(newEntityName);
          this.originalEntityName = newEntityName;
          this.form.get('entityName')?.setValue(suffix, { emitEvent: false });
          this.toastr.success(this.translate.instant('record_updated_successfully'));
          (document.getElementById('closeEntitySlug') as HTMLElement)?.click();
          this.closeEntityNameEditModal();
        } else {
          this.toastr.error(this.translate.instant(response.message || 'error'), 'Error');
        }
      },
      error: () => {
        this.toastr.error(this.translate.instant('error'), 'Error');
      },
    });
  }

  onEntityNameBlur(): void {
    const suffix = (this.form.get('entityName')?.value ?? '').trim();
    if (!suffix) {
      this.entityNameError = '';
      return;
    }
    const prefix = this.entityNamePrefix;
    const fullSlug = prefix ? `${prefix}_${suffix}` : suffix;
    if (this.editTitle && fullSlug === this.originalEntityName) {
      this.entityNameError = '';
      return;
    }
    if (this.allEntityNameSlugs.has(fullSlug) && fullSlug !== this.originalEntityName) {
      this.entityNameError = 'This entity name already exists. Please choose a different slug.';
    } else {
      this.entityNameError = '';
    }
  }

  fetchAllMasterEntities() {
    const params = {
      company_id: 1,
      print_query: false,
      primary_table: 'master_approval_workflows',
      start_index: 0,
      limit_range: 1000,
      sort_columns: [['master_approval_workflows.id', 'desc']],
      select_columns: [['master_approval_workflows.entity_name', 'value']],
    };
    this.gridApiService.getAllList(params).subscribe(
      (response) => {
        if (response.status && response.code === 200) {
          const records = response.data.records || [];
          this.allEntityNameSlugs = new Set(records.map((e: any) => e.value as string));
          // regenerate suggestions now that slugs are loaded
          if (!this.editTitle) {
            this.generateEntityNameSuggestions(this.form.get('name')?.value);
          }
        }
      },
      (error) => {
        const key = 'error';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
      }
    );
  }
}
