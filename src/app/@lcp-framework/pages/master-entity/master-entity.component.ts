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
  selector: 'app-add-master-entity',
  standalone: true,
  imports: [
    CommonSharedModule,
    MonacoEditorModule,
    ReactiveFormsModule,
  ],
  templateUrl: './master-entity.component.html',
  styleUrl: './master-entity.component.scss',
  animations: [
    trigger('toggleAnimation', [
      transition(':enter', [style({ opacity: 0, transform: 'scale(0.95)' }), animate('100ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))]),
      transition(':leave', [animate('75ms', style({ opacity: 0, transform: 'scale(0.95)' }))]),
    ]),
  ],
})
export class MasterEntityComponent implements OnInit {
  readonly linkTypeComponentCase = 'component';
  readonly linkTypeChildComponentCase = 'child_component';
  store: any = initialState;
  form!: FormGroup;
  items: any = [];
  entity_types: any = [];
  action_types: any[] = [];
  field_types: any[] = [];
  tables_list: any = [];
  wizard_type_list: any[] = [];
  report_type_list: any[] = [];
  id: number | null = null;
  editTitle = false;
  submitted = false;
  commonConfig = commonConfig;
  existing_actions: string[] = [];
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
    action: ['insert', 'insert', 'insert'],
    table: ['master_entities', 'permissions', 'master_entity_line_items'],
    table_mapping: ['table1', 'table2', 'table3'],
    data: {
      table1: [],
      table2: [],
      table3: [],
    },
  };

  update_json_schema: any = {
    // it will be removed
    action: ['update', 'hard_delete', 'insert', 'hard_delete', 'insert'],
    table: ['master_entities', 'master_entity_line_items', 'master_entity_line_items', 'permissions', 'permissions'],
    table_mapping: ['table1', 'table2', 'table3', 'table4', 'table5'],
    data: {
      table1: [],
      table3: [],
      table5: [],
    },
    conditions: {
      table1: [],
      table2: [],
      table4: [],
    },
  };

  exportTemplates: any[] = [];
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
            primary_table: 'users',
            start_index: 0,
            limit_range: 15,
            attached_policies: ['user_filer1'],
            sort_columns: [['users.id', 'desc']],
            search_all: [
              {
                column_name: 'users.deleted_at',
                value: null,
                operator: 'IS',
              },
            ],
            search_any: [
              {
                column_name: 'users.deleted_at',
                value: null,
                operator: 'IS',
              },
            ],
            select_columns: [['users.id'], ['tenant_users.email', 'user_mail'], ["concat(tenant_users.first_name, ' ', tenant_users.last_name)", 'full_name']],
            includes: [
              {
                table_name: 'tenant_users',
                join_type: 'INNER',
                join_condition: 'tenant_users.id = users.tenant_user_id',
              },
            ],
            group_by: ['users.id', 'tenant_users.first_name', 'tenant_users.last_name'],
            having_conditions: [
              {
                column_name: 'users.deleted_at',
                value: null,
                operator: 'IS',
              },
            ],
            having_any_conditions: [
              {
                value: '%Mukesh%',
                operator: 'ILIKE',
                column_name: "concat(tenant_users.first_name, ' ', tenant_users.last_name)",
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
            primary_table: 'users',
            start_index: 0,
            limit_range: 15,
            attached_policies: ['user_filer1'],
            sort_columns: [['users.id', 'desc']],
            search_all: [
              {
                column_name: 'users.deleted_at',
                value: null,
                operator: 'IS',
              },
            ],
            search_any: [
              {
                column_name: 'users.deleted_at',
                value: null,
                operator: 'IS',
              },
            ],
            select_columns: [['users.id'], ['tenant_users.email', 'user_mail'], ["concat(tenant_users.first_name, ' ', tenant_users.last_name)", 'full_name']],
            includes: [
              {
                table_name: 'tenant_users',
                join_type: 'INNER',
                join_condition: 'tenant_users.id = users.tenant_user_id',
              },
            ],
            group_by: ['users.id', 'tenant_users.first_name', 'tenant_users.last_name'],
            having_conditions: [
              {
                column_name: 'users.deleted_at',
                value: null,
                operator: 'IS',
              },
            ],
            having_any_conditions: [
              {
                value: '%Mukesh%',
                operator: 'ILIKE',
                column_name: "concat(tenant_users.first_name, ' ', tenant_users.last_name)",
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
            primary_table: 'users',
            start_index: 0,
            limit_range: 15,
            attached_policies: ['user_filer1'],
            sort_columns: [['users.id', 'desc']],
            search_all: [
              {
                column_name: 'users.deleted_at',
                value: null,
                operator: 'IS',
              },
            ],
            search_any: [
              {
                column_name: 'users.deleted_at',
                value: null,
                operator: 'IS',
              },
            ],
            select_columns: [['users.id'], ['tenant_users.email', 'user_mail'], ["concat(tenant_users.first_name, ' ', tenant_users.last_name)", 'full_name']],
            includes: [
              {
                table_name: 'tenant_users',
                join_type: 'INNER',
                join_condition: 'tenant_users.id = users.tenant_user_id',
              },
            ],
            group_by: ['users.id', 'tenant_users.first_name', 'tenant_users.last_name'],
            having_conditions: [
              {
                column_name: 'users.deleted_at',
                value: null,
                operator: 'IS',
              },
            ],
            having_any_conditions: [
              {
                value: '%Mukesh%',
                operator: 'ILIKE',
                column_name: "concat(tenant_users.first_name, ' ', tenant_users.last_name)",
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
              table: 'tenant_users',
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
                  role: '$tenant_users.role',
                  email: '$tenant_users.email',
                  username: '$tenant_users.username',
                  status_id: '$users.status_id',
                  created_at: true,
                  created_by: true,
                  updated_at: true,
                  updated_by: true,
                },
              ],
              table2: [
                {
                  dob: '$tenant_users.dob',
                  code: '$users.code',
                  gender: '$tenant_users.gender',
                  address: '$tenant_users.address',
                  culture: '$tenant_users.culture',
                  user_id: '@table1.id',
                  last_name: '$tenant_users.last_name',
                  created_at: true,
                  created_by: true,
                  first_name: '$tenant_users.first_name',
                  updated_at: true,
                  updated_by: true,
                  profile_pic: '$tenant_users.profile_pic',
                  phone_number: '$tenant_users.phone_number',
                  department_id: '$users.department_id',
                  designation_id: '$users.designation_id',
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
            table: ['users', 'tenant_users', 'user_roles', 'email_process_jobs'],
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
                  email: '$tenant_users.email',
                  username: '$tenant_users.username',
                  status_id: '$users.status_id',
                  updated_at: true,
                  updated_by: true,
                },
              ],
              table2: [
                {
                  dob: '$tenant_users.dob',
                  code: '$users.code',
                  gender: '$tenant_users.gender',
                  address: '$tenant_users.address',
                  culture: '$tenant_users.culture',
                  last_name: '$tenant_users.last_name',
                  first_name: '$tenant_users.first_name',
                  updated_at: true,
                  updated_by: true,
                  profile_pic: '$tenant_users.profile_pic',
                  phone_number: '$tenant_users.phone_number',
                  department_id: '$users.department_id',
                  designation_id: '$users.designation_id',
                },
              ],
              table4: [
                {
                  role_id: '$user_roles.role_id',
                  user_id: '@table1.id',
                },
              ],
            },
            table: ['users', 'tenant_users', 'user_roles', 'user_roles'],
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
              tenant_users: {
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
                key: 'tenant_users',
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
                  column_name: 'users.uuid',
                },
                {
                  value: '3',
                  operator: '!=',
                  column_name: 'users.status_id',
                },
              ],
              limit_range: 1,
              print_query: false,
              start_index: 0,
              sort_columns: [['users.id', 'asc']],
              primary_table: 'users',
              select_columns: [['email'], ['username'], ['role'], ['status_id']],
            },
            user_roles: {
              group_by: ['user_roles.user_id'],
              includes: [
                {
                  join_type: 'INNER',
                  table_name: 'users',
                  join_condition: 'users.id = user_roles.user_id',
                },
              ],
              company_id: 1,
              search_all: [
                {
                  value: '$unique_id',
                  operator: '=',
                  column_name: 'users.uuid',
                },
                {
                  value: '3',
                  operator: '!=',
                  column_name: 'users.status_id',
                },
              ],
              limit_range: 15,
              print_query: false,
              start_index: 0,
              sort_columns: [['user_roles.user_id', 'desc']],
              primary_table: 'user_roles',
              select_columns: [['json_agg(user_roles.role_id::int)', 'role_id']],
            },
            tenant_users: {
              includes: [
                {
                  join_type: 'INNER',
                  table_name: 'tenant_users',
                  join_condition: 'tenant_users.id = users.tenant_user_id',
                },
              ],
              company_id: 1,
              search_all: [
                {
                  value: '$unique_id',
                  operator: '=',
                  column_name: 'users.uuid',
                },
                {
                  value: '3',
                  operator: '!=',
                  column_name: 'users.status_id',
                },
              ],
              limit_range: 1,
              print_query: false,
              start_index: 0,
              sort_columns: [['users.id', 'asc']],
              primary_table: 'users',
              select_columns: [
                ['users.code'],
                ['tenant_users.first_name'],
                ['tenant_users.last_name'],
                ['users.designation_id'],
                ['users.department_id'],
                ['tenant_users.dob'],
                ['tenant_users.phone_number'],
                ['tenant_users.country_code'],
                ['tenant_users.gender'],
                ['tenant_users.user_time_zone'],
                ['tenant_users.address'],
                ['tenant_users.culture'],
                ['tenant_users.profile_pic'],
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
            enable_sticky_header: 'yes',
            show_serial_number: 'yes',
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
  masterEntities: any[] = [];
  masterEntitiesForChildProcess: any[] = [];
  entitiesForChildProcess: any[] = [];
  entitiesForDashboardWizard: any[] = [];
  staticPageEntities: any[] = [];

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
  ) {
  }

  ngOnInit() {
    this.initStore();
    this.id = this.route.snapshot.params['id'] || this.route.snapshot.params['uuid'] || null;
    this.initForm();
    this.constructRedirectUrl();
    this.initWizardGroupForm();
    this.loadWizardGroups();
    this.loadExportTemplates();
    //this.loadWizardTypes();

    // To load all the lookups
    this.field_types = this.commonConfig.field_types;
    this.entity_types = this.commonConfig.entity_types;
    this.action_types = this.commonConfig.action_types;
    this.wizard_type_list = this.commonConfig.wizard_type;
    this.report_type_list = this.commonConfig.report_type;
    this.fetchAllTables();

    // To listen "entityType" on value change
    this.form.get('entityType')?.valueChanges.subscribe((value) => {
      this.updateFormValidation(value);
    });

    // Clear dashboard_entity_name whenever wizard type changes to avoid stale values
    // (e.g. switching between ENTITY and GRID uses the same field for different data)
    this.form.get('wizardType')?.valueChanges.subscribe(() => {
      this.form.get('dashboard_entity_name')?.setValue('');
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

    // If "id" is not available we need consider it as "Add", otherwise "Edit"
    if (!this.id) {
      this.editTitle = false;
    } else {
      this.editTitle = true;
      this.loadData(this.id);
    }
    this.titleChange();
    this.fetchAllMasterEntities();
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
      entityType: ['', Validators.required],
      permissions: ['', [Validators.required, viewMandatoryValidator()]],
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
      staticPageContent: [''],
      items: this.fb.array([]),
      exportTemplateFileName: [''],
    });

    // Initialize edit item form
    this.editItemForm = this.fb.group({
      fieldName: [''],
      displayName: [''],
      orderNo: [''],
      isGridColumn: [''],
      isSearchable: [''],
      clauseType: [''],
      isSortable: [''],
      fieldType: [''],
      linkType: [''],
      linkAction: [''],
      fieldHtmlContent: [''],
      enumValues: [''],
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

  updateFormValidation(entityType: any) {
    this.form.clearValidators();

    const primaryTableControl = this.form.get('primaryTable');

    const itemsControl = this.form.get('items');

    if (entityType == commonConfig.ENTITY_TYPES.FORM_BUILDER_MODULE) {
      primaryTableControl?.setValidators([Validators.required, Validators.maxLength(100)]);
      itemsControl?.setValidators([Validators.required, Validators.minLength(1)]);
    }
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
      fieldName: ['', [Validators.required, Validators.maxLength(1000)]],
      displayName: ['', [Validators.required, Validators.maxLength(100)]],
      orderNo: ['', [Validators.required, Validators.min(0)]],
      isGridColumn: ['true', Validators.required],
      isSearchable: ['true', Validators.required],
      clauseType: ['where', Validators.required],
      isSortable: ['true', Validators.required],
      fieldType: [this.commonConfig.field_types[0].value, Validators.required],
      linkType: ['none', Validators.required],
      linkAction: [''],
      fieldHtmlContent: [''],
      enumValues: [''],
    });
    this.setupLinkModeAutoUpdate(group);
    items.push(group);
  }

  removeItem(index: number) {
    const items = this.form.get('items') as FormArray;
    if (items.length > 0) {
      items.removeAt(index);
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
      fieldName: [currentItem.get('fieldName')?.value, Validators.required],
      displayName: [currentItem.get('displayName')?.value, Validators.required],
      orderNo: [currentItem.get('orderNo')?.value, [Validators.required, Validators.min(0)]],
      isGridColumn: [currentItem.get('isGridColumn')?.value, Validators.required],
      isSearchable: [currentItem.get('isSearchable')?.value, Validators.required],
      clauseType: [currentItem.get('clauseType')?.value, Validators.required],
      isSortable: [currentItem.get('isSortable')?.value, Validators.required],
      fieldType: [currentItem.get('fieldType')?.value, Validators.required],
      linkType: [currentItem.get('linkType')?.value, Validators.required],
      linkAction: [currentItem.get('linkAction')?.value],
      fieldHtmlContent: [currentItem.get('fieldHtmlContent')?.value],
      enumValues: [currentItem.get('enumValues')?.value],
    });

    this.setupLinkModeAutoUpdate(this.editItemForm);
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
      primary_table: 'master_entities',
      start_index: 0,
      limit_range: 1,
      sort_columns: [['master_entities.id', 'desc']],
      select_columns: [
        ['master_entities.*'],
        ["COALESCE(Json_agg(DISTINCT jsonb_build_object('name', permissions.name)))", 'permissions'],
        [
          "CASE WHEN COUNT(master_entity_line_items.id) = 0 THEN null ELSE COALESCE(Json_agg(DISTINCT jsonb_build_object('id', master_entity_line_items.id,'field_name', master_entity_line_items.field_name,'display_name', master_entity_line_items.display_name,'field_html_content', master_entity_line_items.field_html_content,'order_no', master_entity_line_items.order_no,'link_type', master_entity_line_items.link_type,'link_action', master_entity_line_items.link_action,'link_mode', master_entity_line_items.link_mode,'is_grid_column', master_entity_line_items.is_grid_column,'is_searchable', master_entity_line_items.is_searchable,'is_sortable', master_entity_line_items.is_sortable,'field_type_id', master_entity_line_items.field_type_id, 'clause_type', master_entity_line_items.clause_type, 'enum_values', master_entity_line_items.enum_values))) END",
          'items',
        ],
      ],
      includes: [
        {
          table_name: 'permissions',
          join_type: 'INNER',
          join_condition: `master_entities.id = permissions.entity_id AND master_entities.uuid = '${id}'`,
        },
        {
          table_name: 'master_entity_line_items',
          join_type: 'LEFT',
          join_condition: `master_entities.id = master_entity_line_items.master_grid_id AND master_entities.uuid = '${id}'`,
        },
      ],
      group_by: ['master_entities.id'],
    };

    this.gridApiService.getAllList(params).subscribe(
      (response) => {
        if (response.status && response.code === 200) {
          const entity = response.data.records[0];
          this.existing_actions = this.populateSelectedActionTypes(entity.permissions);

          this.form.patchValue({
            name: entity.name,
            entityName: entity.entity_name,
            permissions: this.existing_actions,
            associateTable: entity.associated_tables ? this.prettyJSON(entity.associated_tables) : '',
            primaryTable: entity.primary_table && entity.primary_table != 'null' ? entity.primary_table : '',
            statusId: entity.status_id,
            isAdminModule: entity.is_admin_module,
            header_entity_id: entity.header_entity_id,
            footer_entity_id: entity.footer_entity_id,
            draftMode: entity.draft_mode || false,
            entityType: entity.entity_type,
            entity_configurations: entity.entity_configurations ? this.prettyJSON(entity.entity_configurations) : '',
            queryInformation: entity.query_information ? this.prettyJSON(entity.query_information) : '',
            reportInformation: entity.report_information ? this.prettyJSON(entity.report_information) : '',
            formInformation: entity.form_information ? this.prettyJSON(entity.form_information) : '',
            addQueryInformation: entity.add_query_information ? this.prettyJSON(entity.add_query_information) : '',
            editQueryInformation: entity.edit_query_information ? this.prettyJSON(entity.edit_query_information) : '',
            presetQueryInformation: entity.preset_query_information ? this.prettyJSON(entity.preset_query_information) : '',
            staticPageContent: entity.static_page_content,
            wizardType: entity.dashboard_wizard_type,
            reportType: entity?.report_type || this.commonConfig.REPORT_TYPES.LCP,
            wizardGroup: entity.dashboard_wizard_group_id,
            export_template_id: entity.export_template_id,
            dashboard_wizard_rows: entity.dashboard_wizard_rows,
            dashboard_wizard_columns: entity.dashboard_wizard_columns,
            dashboard_wizard_order_no: entity.dashboard_wizard_order_no,
            reload_timeout: entity.reload_timeout,
            dashboard_entity_name: entity.dashboard_entity_name,
            dashboard_wizard_options: entity.dashboard_wizard_options ? this.prettyJSON(entity.dashboard_wizard_options) : '',
            exportTemplateFileName: entity.export_template_file_name || '',
          });

          const items = this.form.get('items') as FormArray;
          //items.clear();
          if (entity.items && entity.items.length > 0) {
            entity.items.forEach((item: any) => {
              const linkType = item.link_type || 'none';
              const linkAction = item.link_action || '';
              // linkMode will be set by logic, not user
              const group = this.fb.group({
                fieldName: [item.field_name, Validators.required],
                displayName: [item.display_name, Validators.required],
                orderNo: [item.order_no, [Validators.required, Validators.min(0)]],
                isGridColumn: [item.is_grid_column, Validators.required],
                isSearchable: [item.is_searchable, Validators.required],
                clauseType: [item?.clause_type || 'where', Validators.required],
                isSortable: [item.is_sortable, Validators.required],
                fieldType: [item.field_type_id, Validators.required],
                linkType: [linkType, Validators.required],
                linkAction: [linkAction],
                fieldHtmlContent: [item.field_html_content],
                enumValues: [item.enum_values ? this.prettyJSON(item.enum_values) : null],
              });
              this.setupLinkModeAutoUpdate(group, linkAction);
              items.push(group);
            });
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

  populateSelectedActionTypes(permissions: any) {
    const permissionList = permissions.map((item: any) => {
      const actionType = this.action_types.find((elem: any) => elem.value == item.name);
      return actionType ? actionType.value : '';
    });
    return permissionList;
  }

  getAddParams(formData: any) {
    const formDataName = commonConfig.PREFIX_SHORTCODE[formData.entityType] + '_' + formData.name;
    const entitySlug = this.localStorageService.generateSlugWithTimestamp(formDataName);

    const master = [
      {
        name: formData.name,
        entity_name: entitySlug,
        entity_type: formData.entityType,
        export_template_file_name: formData.exportTemplateFileName || null,
        ...(formData.primaryTable && { primary_table: formData.primaryTable }),
        ...(formData.statusId && { status_id: formData.statusId }),
        ...(formData.isAdminModule && { is_admin_module: formData.isAdminModule ? formData.isAdminModule : false }),
        ...(formData.header_entity_id && { header_entity_id: formData.header_entity_id }),
        ...(formData.footer_entity_id && { footer_entity_id: formData.footer_entity_id }),
        ...(formData.draftMode && { draft_mode: formData.draftMode ? formData.draftMode : false }),
        ...(formData.associateTable && { associated_tables: this.prepareJSON(formData.associateTable, true) }),
        ...(formData.queryInformation && { query_information: this.prepareJSON(formData.queryInformation, true) }),
        ...(formData.reportInformation && { report_information: this.prepareJSON(formData.reportInformation, true) }),
        ...(formData.formInformation && { form_information: this.prepareJSON(formData.formInformation, true) }),
        ...(formData.addQueryInformation && { add_query_information: this.prepareJSON(formData.addQueryInformation, true) }),
        ...(formData.editQueryInformation && { edit_query_information: this.prepareJSON(formData.editQueryInformation, true) }),
        ...(formData.presetQueryInformation && { preset_query_information: this.prepareJSON(formData.presetQueryInformation, true) }),
        ...(formData.entity_configurations && { entity_configurations: this.prepareJSON(formData.entity_configurations, true) }),
        ...(formData.staticPageContent && { static_page_content: formData.staticPageContent }),
        ...(formData.wizardType && { dashboard_wizard_type: formData.wizardType }),
        ...(formData.reportType && { report_type: formData.reportType }),
        ...(formData.wizardGroup && { dashboard_wizard_group_id: formData.wizardGroup }),

        ...(formData.export_template_id && { export_template_id: formData.export_template_id }),
        ...(formData.dashboard_wizard_rows && { dashboard_wizard_rows: formData.dashboard_wizard_rows }),
        ...(formData.dashboard_wizard_columns && { dashboard_wizard_columns: formData.dashboard_wizard_columns }),
        ...(formData.dashboard_wizard_order_no && { dashboard_wizard_order_no: formData.dashboard_wizard_order_no }),
        ...(formData.reload_timeout && { reload_timeout: formData.reload_timeout }),
        ...(formData.dashboard_entity_name && { dashboard_entity_name: formData.dashboard_entity_name }),
        ...(formData.dashboard_wizard_options && { dashboard_wizard_options: this.prepareJSON(formData.dashboard_wizard_options, true) }),
      },
    ];

    const permissions = formData.permissions.map((action_type_name: any, pindex: number) => ({
      entity_id: '@table1.id',
      name: action_type_name,
      slug: `${action_type_name}_${entitySlug}`,
      order_no: pindex + 1,
      status_id: commonConfig.STATUS.ACTIVE,
    }));

    // Use FormArray controls to get linkMode dynamically
    const itemsArray = this.form.get('items') as FormArray;
    if (itemsArray && itemsArray.length > 0) {
      const items = itemsArray.controls.map((control: any) => {
        const linkActionValue = control.value.linkAction;
        let link_mode = 'none';
        if (control.value.linkType === 'component' || control.value.linkType === 'child_component') {
          const entity = this.masterEntities.find((e: any) => e.value === linkActionValue);
          if (entity) {
            if (entity.entity_type === 'static_page_builder_module') {
              link_mode = 'popup_details';
            } else if (entity.entity_type === 'form_builder_module') {
              link_mode = 'popup_edit';
            } else if (entity.entity_type === 'grid_builder_module') {
              link_mode = control.value.linkType === 'child_component' ? 'popup_grid' : 'child_grid';
            }
          }
        }
        return {
          master_grid_id: '@table1.id',
          field_name: control.value.fieldName,
          display_name: control.value.displayName,
          order_no: control.value.orderNo,
          is_grid_column: control.value.isGridColumn,
          is_searchable: control.value.isSearchable,
          clause_type: control.value.clauseType || 'where',
          is_sortable: control.value.isSortable,
          field_type_id: control.value.fieldType,
          link_type: control.value.linkType,
          link_action: control.value.linkAction,
          link_mode,
          field_html_content: control.value.fieldHtmlContent,
          enum_values: this.prepareOptionalJSON(control.value.enumValues),
        };
      });
      this.insert_json_schema.data['table3'] = items;
    }

    this.insert_json_schema.data['table1'] = master;
    this.insert_json_schema.data['table2'] = permissions;

    return this.insert_json_schema;
  }

  getEditParams(formData: any, id: any) {
    const master = [
      {
        name: formData.name,
        entity_type: formData.entityType,
        export_template_file_name: formData.exportTemplateFileName || null,
        ...(formData.primaryTable ? { primary_table: formData.primaryTable } : { primary_table: null }),
        ...(formData.statusId ? { status_id: formData.statusId } : { status_id: null }),
        ...(formData.isAdminModule ? { is_admin_module: formData.isAdminModule } : { is_admin_module: false }),
        ...(formData.header_entity_id ? { header_entity_id: formData.header_entity_id } : { header_entity_id: null }),
        ...(formData.footer_entity_id ? { footer_entity_id: formData.footer_entity_id } : { footer_entity_id: null }),
        ...(formData.draftMode ? { draft_mode: formData.draftMode } : { draft_mode: false }),
        ...(formData.associateTable ? { associated_tables: this.prepareJSON(formData.associateTable, true) } : { associated_tables: null }),
        ...(formData.queryInformation ? { query_information: this.prepareJSON(formData.queryInformation, true) } : { query_information: null }),
        ...(formData.reportInformation ? { report_information: this.prepareJSON(formData.reportInformation, true) } : { report_information: null }),
        ...(formData.formInformation ? { form_information: this.prepareJSON(formData.formInformation, true) } : { form_information: null }),
        ...(formData.addQueryInformation ? { add_query_information: this.prepareJSON(formData.addQueryInformation, true) } : { add_query_information: null }),
        ...(formData.editQueryInformation
          ? { edit_query_information: this.prepareJSON(formData.editQueryInformation, true) }
          : { edit_query_information: null }),
        ...(formData.presetQueryInformation
          ? { preset_query_information: this.prepareJSON(formData.presetQueryInformation, true) }
          : { preset_query_information: null }),
        ...(formData.entity_configurations
          ? { entity_configurations: this.prepareJSON(formData.entity_configurations, true) }
          : { entity_configurations: null }),
        ...(formData.staticPageContent ? { static_page_content: formData.staticPageContent } : { static_page_content: null }),
        ...(formData.wizardType ? { dashboard_wizard_type: formData.wizardType } : { dashboard_wizard_type: null }),
        ...(formData?.reportType ? { report_type: formData.reportType } : { report_type: this.commonConfig.REPORT_TYPES.LCP }),
        ...(formData.wizardGroup ? { dashboard_wizard_group_id: formData.wizardGroup } : { dashboard_wizard_group_id: null }),

        ...(formData.export_template_id ? { export_template_id: formData.export_template_id } : { export_template_id: null }),
        ...(formData.dashboard_wizard_rows ? { dashboard_wizard_rows: formData.dashboard_wizard_rows } : { dashboard_wizard_rows: null }),
        ...(formData.dashboard_wizard_columns ? { dashboard_wizard_columns: formData.dashboard_wizard_columns } : { dashboard_wizard_columns: null }),
        ...(formData.dashboard_wizard_order_no ? { dashboard_wizard_order_no: formData.dashboard_wizard_order_no } : { dashboard_wizard_order_no: null }),
        ...(formData.reload_timeout ? { reload_timeout: formData.reload_timeout } : { reload_timeout: null }),
        ...(formData.dashboard_entity_name ? { dashboard_entity_name: formData.dashboard_entity_name } : { dashboard_entity_name: null }),
        ...(formData.dashboard_wizard_options
          ? { dashboard_wizard_options: this.prepareJSON(formData.dashboard_wizard_options, true) }
          : { dashboard_wizard_options: null }),
      },
    ];

    this.update_json_schema.data['table1'] = master;
    this.update_json_schema.conditions['table1'] = [{ uuid: id }];

    this.update_json_schema.conditions['table2'] = [{ master_grid_id: '@table1.id' }];

    // Use FormArray controls to get linkMode dynamically
    const itemsArray = this.form.get('items') as FormArray;
    if (itemsArray && itemsArray.length > 0) {
      const items = itemsArray.controls.map((control: any) => {
        const linkActionValue = control.value.linkAction;
        let link_mode = 'none';
        if (control.value.linkType === 'component' || control.value.linkType === 'child_component') {
          const entity = this.masterEntities.find((e: any) => e.value === linkActionValue);
          if (entity) {
            if (entity.entity_type === 'static_page_builder_module') {
              link_mode = 'popup_details';
            } else if (entity.entity_type === 'form_builder_module') {
              link_mode = 'popup_edit';
            } else if (entity.entity_type === 'grid_builder_module') {
              link_mode = control.value.linkType === 'child_component' ? 'popup_grid' : 'child_grid';
            }
          }
        }
        return {
          master_grid_id: '@table1.id',
          field_name: control.value.fieldName,
          display_name: control.value.displayName,
          order_no: control.value.orderNo,
          is_grid_column: control.value.isGridColumn,
          is_searchable: control.value.isSearchable,
          clause_type: control.value.clauseType || 'where',
          is_sortable: control.value.isSortable,
          field_type_id: control.value.fieldType,
          link_type: control.value.linkType,
          link_action: control.value.linkAction,
          field_html_content: control.value.fieldHtmlContent,
          enum_values: this.prepareOptionalJSON(control.value.enumValues),
          link_mode,
        };
      });
      this.update_json_schema.data['table3'] = items;
    }

    // Determine newly added items
    let newly_added_items: any[] = formData.permissions
      .filter((item: string) => !this.existing_actions.includes(item))
      .map((action_type_name: any) => ({
        entity_id: '@table1.id',
        name: action_type_name,
        slug: `${action_type_name}_${formData.entityName}`,
        order_no: '1',
        status_id: '1',
      }));

    // Determine removed items
    let removable_items = this.existing_actions
      .filter((item) => !formData.permissions.includes(item))
      .map((action_type_name: any) => ({
        entity_id: '@table1.id',
        name: action_type_name,
      }));

    this.update_json_schema.conditions['table4'] = removable_items;

    this.update_json_schema.data['table5'] = newly_added_items;
    return this.update_json_schema;
  }

  // prepareJSON(data: any): string {
  //   return JSON.stringify(JSON.parse(data));
  // }
  prepareJSON(data: any, replace_param: boolean = false): string {
    try {
      // Parse the input data into a JavaScript object
      const parsedData = JSON.parse(data);

      // Convert the object back to a JSON string
      let jsonString = JSON.stringify(parsedData);

      // Perform replacements if replace_param is true
      if (replace_param) {
        jsonString = jsonString
          .replace(/@table/g, '##table')
          .replace(/{{{/g, '{#{') // Replace {{{ with {#{
          .replace(/}}}/g, '}#}'); // Replace }}} with }#}
      }

      return jsonString;
    } catch (error) {
      console.error('Error preparing JSON:', error);
      throw new Error('Invalid JSON input');
    }
  }

  prepareOptionalJSON(data: any, replace_param: boolean = false): string | null {
    if (data === null || data === undefined) {
      return null;
    }

    if (typeof data === 'string' && data.trim() === '') {
      return null;
    }

    const source = typeof data === 'string' ? data : JSON.stringify(data);
    return this.prepareJSON(source, replace_param);
  }

  prettyJSON(data: any) {
    return JSON.stringify(JSON.parse(JSON.stringify(data)), null, 2);
  }

  onSubmit() {
    this.submitted = true;

    const formData = this.form.getRawValue();
    const payload = this.id ? this.getEditParams(formData, this.id) : this.getAddParams(formData);

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
    return this.form.invalid || (this.form.value.entityType === commonConfig.ENTITY_TYPES.GRID_BUILDER_MODULE && this.itemsControls.length === 0);
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

  fetchAllMasterEntities() {
    const params = {
      company_id: 1,
      print_query: false,
      primary_table: 'master_entities',
      start_index: 0,
      limit_range: 1000,
      sort_columns: [['master_entities.id', 'desc']],
      select_columns: [
        ['master_entities.entity_name', 'value'],
        ['master_entities.name', 'label'],
        ['master_entities.entity_type', 'entity_type'],
        ['master_entities.primary_table', 'primary_table'],
      ],
    };
    this.gridApiService.getAllList(params).subscribe(
      (response) => {
        if (response.status && response.code === 200) {
          // For 'component' linkType
          this.masterEntities = response.data.records.filter(
            (entity: any) => entity.entity_type === 'static_page_builder_module' || entity.entity_type === 'form_builder_module'
          );
          this.staticPageEntities = response.data.records.filter(
            (entity: any) => entity.entity_type === this.commonConfig.ENTITY_TYPES.STATIC_PAGE_BUILDER_MODULE
          );
          // For 'child_process' linkType (only grid_builder_module)
          this.masterEntitiesForChildProcess = response.data.records.filter(
            (entity: any) => entity.entity_type === this.commonConfig.ENTITY_TYPES.GRID_BUILDER_MODULE
          );
          this.entitiesForChildProcess = response.data.records.filter(
            (entity: any) =>
              ![
                this.commonConfig.ENTITY_TYPES.STATIC_PAGE_BUILDER_MODULE,
                // this.commonConfig.ENTITY_TYPES.DASHBOARD_WIZARD_BUILDER_MODULE,
                this.commonConfig.ENTITY_TYPES.CHART_BUILDER_MODULE,
                this.commonConfig.ENTITY_TYPES.FORM_BUILDER_MODULE,
                this.commonConfig.ENTITY_TYPES.JOB_BUILDER_MODULE,
                this.commonConfig.ENTITY_TYPES.TREE_BUILDER_MODULE,
                this.commonConfig.ENTITY_TYPES.CAROUSEL_MODULE,
                this.commonConfig.ENTITY_TYPES.MENU_MODULE,
                this.commonConfig.ENTITY_TYPES.EXPORT_MODULE,
                this.commonConfig.ENTITY_TYPES.IMPORT_MODULE,
                this.commonConfig.ENTITY_TYPES.MIGRATION_MODULE,
                this.commonConfig.ENTITY_TYPES.USER_ROLE_PERMISSION_MAP_MODULE,
                this.commonConfig.ENTITY_TYPES.ENTITY_USER_ROLE_MAP_MODULE,
                this.commonConfig.ENTITY_TYPES.ENTITY_FORM_MODULE,
                this.commonConfig.ENTITY_TYPES.EXPORT_TEMPLATE_MODULE,
                this.commonConfig.ENTITY_TYPES.IMPORT_JOB_DETAIL_MODULE,
                this.commonConfig.ENTITY_TYPES.IMPORT_TEMPLATE_MODULE,
                this.commonConfig.ENTITY_TYPES.USER_ROLE_POLICY_MODULE,
                this.commonConfig.ENTITY_TYPES.POLICY_ADD_EDIT_MODULE,
              ].includes(entity.entity_type),
          );
          this.entitiesForDashboardWizard = [...this.entitiesForChildProcess];
        }
      },
      (error) => {
        const key = 'error';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
      }
    );
  }

  setupLinkModeAutoUpdate(group: FormGroup, initialLinkAction?: string) {
    // Set linkMode based on linkAction selection
    const linkTypeControl = group.get('linkType');
    const linkActionControl = group.get('linkAction');
    // Add a property to hold the current linkMode
    (group as any)._linkMode = 'none';
    // Helper to set linkMode
    const setLinkMode = (entityName: string) => {
      const type = linkTypeControl?.value;
      let entity;
      if (type === 'component' || type === 'child_component') {
        entity = this.masterEntities.find((e: any) => e.value === entityName);
      } else if (type === 'popup_grid') {
        entity = this.masterEntitiesForChildProcess.find((e: any) => e.value === entityName);
      } else if (type === 'child_grid') {
        entity = this.masterEntitiesForChildProcess.find((e: any) => e.value === entityName);
      }
      if (entity) {
        if (entity.entity_type === 'static_page_builder_module') {
          (group as any)._linkMode = 'popup_details';
        } else if (entity.entity_type === 'form_builder_module') {
          (group as any)._linkMode = 'popup_edit';
        } else if (entity.entity_type === 'grid_builder_module' && type === 'child_component') {
          (group as any)._linkMode = 'popup_grid';
        } else {
          (group as any)._linkMode = 'none';
        }
      } else {
        (group as any)._linkMode = 'none';
      }
    };
    // Initial set if value provided
    if (initialLinkAction) {
      setLinkMode(initialLinkAction);
    }
    // Subscribe to changes
    linkActionControl?.valueChanges.subscribe((entityName: string) => {
      if (
        linkTypeControl?.value === 'component' ||
        linkTypeControl?.value === 'child_component' ||
        linkTypeControl?.value === 'child_grid' ||
        linkTypeControl?.value === 'popup_grid'
      ) {
        setLinkMode(entityName);
      } else {
        (group as any)._linkMode = 'none';
      }
    });
    // Also update on linkType change
    linkTypeControl?.valueChanges.subscribe((type: string) => {
      if (type !== 'component' && type !== 'child_component' && type !== 'child_grid' && type !== 'popup_grid') {
        (group as any)._linkMode = 'none';
      } else {
        setLinkMode(linkActionControl?.value);
      }
    });
  }
}



