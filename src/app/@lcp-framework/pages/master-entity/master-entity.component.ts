import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
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
    IconXComponent,
    IconSendComponent,
    IconSaveComponent,
    IconEyeComponent,
    IconDownloadComponent,
    IconXCircleComponent,
    IconPlusCircleComponent,
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
  store: any;
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
  infoContents: any = {
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
            select_columns: [['users.id'], ['users.email', 'user_mail'], ["concat(user_details.first_name, ' ', user_details.last_name)", 'full_name']],
            includes: [
              {
                table_name: 'user_details',
                join_type: 'INNER',
                join_condition: 'users.id = user_details.user_id',
              },
            ],
            group_by: ['users.id', 'user_details.first_name', 'user_details.last_name'],
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
                column_name: "concat(user_details.first_name, ' ', user_details.last_name)",
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
            department_id: {
              company_id: 1,
              search_all: [
                {
                  value: '1',
                  operator: '=',
                  column_name: 'departments.status_id',
                },
              ],
              limit_range: 1000,
              print_query: false,
              start_index: 0,
              sort_columns: [['departments.name', 'asc']],
              primary_table: 'departments',
              select_columns: [
                ['id', 'value'],
                ['name', 'label'],
              ],
            },
            designation_id: {
              company_id: 1,
              search_all: [
                {
                  value: '1',
                  operator: '=',
                  column_name: 'designations.status_id',
                },
              ],
              limit_range: 1000,
              print_query: false,
              start_index: 0,
              sort_columns: [['designations.name', 'asc']],
              primary_table: 'designations',
              select_columns: [
                ['id', 'value'],
                ['name', 'label'],
              ],
            },
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
            data: {
              table1: [
                {
                  deleted_at: true,
                  deleted_by: true,
                },
              ],
            },
            table: ['users'],
            action: ['delete'],
            conditions: {
              table1: [
                {
                  id: '$unique_id',
                },
              ],
            },
            reset_unique: {
              table1: [
                {
                  column_name: 'email',
                  column_length: 100,
                },
                {
                  column_name: 'username',
                  column_length: 100,
                },
              ],
            },
            table_mapping: ['table1'],
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
                  email_template_process_slug: 'user-created',
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
            user_details: {
              includes: [
                {
                  join_type: 'INNER',
                  table_name: 'user_details',
                  join_condition: 'users.id = user_details.user_id',
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
                ['user_details.code'],
                ['user_details.first_name'],
                ['user_details.last_name'],
                ['user_details.designation_id'],
                ['user_details.department_id'],
                ['user_details.dob'],
                ['user_details.phone_number'],
                ['user_details.country_code'],
                ['user_details.gender'],
                ['user_details.user_time_zone'],
                ['user_details.address'],
                ['user_details.culture'],
                ['user_details.profile_pic'],
              ],
            },
          },
        },
      ],
    },
  };
  selectedInfoTab: number = 0;
  popupInformation: any = null;
  popupName: string = 'reportInfo';
  popupInfoEditorOptions = { ...this.editorOptions, language: 'sql', cursorStyle: 'line', readOnly: true, automaticLayout: true, minimap: { enabled: false } };
  copied = false;

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
    private titleService: Title
  ) {
    this.initStore();
  }

  ngOnInit() {
    this.id = this.route.snapshot.params['id'] || null;
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

    // If "id" is not available we need consider it as "Add", otherwise "Edit"
    if (!this.id) {
      this.editTitle = false;
    } else {
      this.editTitle = true;
      this.loadData(this.id);
    }
    this.titleChange();
  }

  // ngAfterViewInit() {
  //   if (this.monacoEditor && this.monacoEditor._editorContainer) {
  //     const editorElement = this.monacoEditor._editorContainer.nativeElement;

  //     const resizeObserver = new ResizeObserver(() => {
  //       // Access the editor instance from the DOM element, if possible
  //       const monacoInstance = (editorElement as any).editorInstance;
  //       if (monacoInstance && typeof monacoInstance.layout === 'function') {
  //         monacoInstance.layout();
  //       }
  //     });

  //     resizeObserver.observe(editorElement);
  //   }
  // }

  // ngAfterViewInit() {
  //   if (this.monacoEditor && this.monacoEditor._editorContainer) {
  //     const editorElement = this.monacoEditor._editorContainer.nativeElement;

  //     // Try observing the window resize as a fallback
  //     window.addEventListener('resize', () => {
  //       console.log('Observing element:', editorElement);
  //       this.adjustEditorHeight(editorElement);
  //     });

  //     // Still, attempt to use ResizeObserver as well
  //     const resizeObserver = new ResizeObserver(() => {
  //       this.adjustEditorHeight(editorElement);
  //     });

  //     resizeObserver.observe(editorElement);
  //   }
  // }

  // private adjustEditorHeight(editorElement: any) {
  //   const newHeight = editorElement.clientHeight;
  //   editorElement.style.height = `${newHeight}px`;

  //   console.log('Adjusted Height:', newHeight);

  //   const monacoInstance = (editorElement as any).editorInstance;
  //   if (monacoInstance && typeof monacoInstance.layout === 'function') {
  //     monacoInstance.layout();
  //   }
  // }

  async initStore() {
    this.storeData
      .select((d) => d.index)
      .subscribe((d) => {
        this.store = d;
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
      associateTable: [''],
      wizardType: [''],
      reportType: [this.commonConfig.REPORT_TYPES.LCP],
      wizardGroup: [''],
      export_template_id: [''],
      dashboard_wizard_rows: [''],
      dashboard_wizard_columns: [''],
      dashboard_wizard_order_no: ['0.01', [this.decimalValidator]],
      queryInformation: [''],
      reportInformation: [''],
      dashboard_wizard_options: [''],
      formInformation: [''],
      addQueryInformation: [''],
      editQueryInformation: [''],
      presetQueryInformation: [''],
      staticPageContent: [''],
      items: this.fb.array([]),
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
    items.push(
      this.fb.group({
        fieldName: ['', [Validators.required, Validators.maxLength(100)]],
        displayName: ['', [Validators.required, Validators.maxLength(100)]],
        orderNo: ['', [Validators.required, Validators.min(0)]],
        isGridColumn: ['true', Validators.required],
        isSearchable: ['true', Validators.required],
        clauseType: ['where', Validators.required],
        isSortable: ['true', Validators.required],
        fieldType: [this.commonConfig.field_types[0].value, Validators.required],
      })
    );
  }

  removeItem(index: number) {
    const items = this.form.get('items') as FormArray;
    if (items.length > 0) {
      items.removeAt(index);
    } else {
      this.toastr.warning('At least one item is required.');
    }
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
          "CASE WHEN COUNT(master_entity_line_items.id) = 0 THEN null ELSE COALESCE(Json_agg(DISTINCT jsonb_build_object('id', master_entity_line_items.id,'field_name', master_entity_line_items.field_name,'display_name', master_entity_line_items.display_name,'order_no', master_entity_line_items.order_no,'is_grid_column', master_entity_line_items.is_grid_column,'is_searchable', master_entity_line_items.is_searchable,'is_sortable', master_entity_line_items.is_sortable,'field_type_id', master_entity_line_items.field_type_id, 'clause_type', master_entity_line_items.clause_type))) END",
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
            entityType: entity.entity_type,
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
            dashboard_wizard_options: entity.dashboard_wizard_options ? this.prettyJSON(entity.dashboard_wizard_options) : '',
          });

          const items = this.form.get('items') as FormArray;
          //items.clear();
          if (entity.items && entity.items.length > 0) {
            entity.items.forEach((item: any) => {
              items.push(
                this.fb.group({
                  fieldName: [item.field_name, Validators.required],
                  displayName: [item.display_name, Validators.required],
                  orderNo: [item.order_no, [Validators.required, Validators.min(0)]],
                  isGridColumn: [item.is_grid_column, Validators.required],
                  isSearchable: [item.is_searchable, Validators.required],
                  clauseType: [item?.clause_type || 'where', Validators.required],
                  isSortable: [item.is_sortable, Validators.required],
                  fieldType: [item.field_type_id, Validators.required],
                })
              );
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
        ...(formData.primaryTable && { primary_table: formData.primaryTable }),
        ...(formData.statusId && { status_id: formData.statusId }),
        ...(formData.isAdminModule && { is_admin_module: formData.isAdminModule ? formData.isAdminModule : false }),

        ...(formData.associateTable && { associated_tables: this.prepareJSON(formData.associateTable, true) }),
        ...(formData.queryInformation && { query_information: this.prepareJSON(formData.queryInformation, true) }),
        ...(formData.reportInformation && { report_information: this.prepareJSON(formData.reportInformation, true) }),
        ...(formData.formInformation && { form_information: this.prepareJSON(formData.formInformation, true) }),
        ...(formData.addQueryInformation && { add_query_information: this.prepareJSON(formData.addQueryInformation, true) }),
        ...(formData.editQueryInformation && { edit_query_information: this.prepareJSON(formData.editQueryInformation, true) }),
        ...(formData.presetQueryInformation && { preset_query_information: this.prepareJSON(formData.presetQueryInformation, true) }),
        ...(formData.staticPageContent && { static_page_content: formData.staticPageContent }),
        ...(formData.wizardType && { dashboard_wizard_type: formData.wizardType }),
        ...(formData.reportType && { report_type: formData.reportType }),
        ...(formData.wizardGroup && { dashboard_wizard_group_id: formData.wizardGroup }),

        ...(formData.export_template_id && { export_template_id: formData.export_template_id }),
        ...(formData.dashboard_wizard_rows && { dashboard_wizard_rows: formData.dashboard_wizard_rows }),
        ...(formData.dashboard_wizard_columns && { dashboard_wizard_columns: formData.dashboard_wizard_columns }),
        ...(formData.dashboard_wizard_order_no && { dashboard_wizard_order_no: formData.dashboard_wizard_order_no }),
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

    if (formData.items && formData.items.length > 0) {
      const items = formData.items.map((item: any) => ({
        master_grid_id: '@table1.id',
        field_name: item.fieldName,
        display_name: item.displayName,
        order_no: item.orderNo,
        is_grid_column: item.isGridColumn,
        is_searchable: item.isSearchable,
        clause_type: item?.clauseType || 'where',
        is_sortable: item.isSortable,
        field_type_id: item.fieldType,
      }));
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
        ...(formData.primaryTable ? { primary_table: formData.primaryTable } : { primary_table: null }),
        ...(formData.statusId ? { status_id: formData.statusId } : { status_id: null }),
        ...(formData.isAdminModule ? { is_admin_module: formData.isAdminModule } : { is_admin_module: false }),

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
        ...(formData.staticPageContent ? { static_page_content: formData.staticPageContent } : { static_page_content: null }),
        ...(formData.wizardType ? { dashboard_wizard_type: formData.wizardType } : { dashboard_wizard_type: null }),
        ...(formData?.reportType ? { report_type: formData.reportType } : { report_type: this.commonConfig.REPORT_TYPES.LCP }),
        ...(formData.wizardGroup ? { dashboard_wizard_group_id: formData.wizardGroup } : { dashboard_wizard_group_id: null }),

        ...(formData.export_template_id ? { export_template_id: formData.export_template_id } : { export_template_id: null }),
        ...(formData.dashboard_wizard_rows ? { dashboard_wizard_rows: formData.dashboard_wizard_rows } : { dashboard_wizard_rows: null }),
        ...(formData.dashboard_wizard_columns ? { dashboard_wizard_columns: formData.dashboard_wizard_columns } : { dashboard_wizard_columns: null }),
        ...(formData.dashboard_wizard_order_no ? { dashboard_wizard_order_no: formData.dashboard_wizard_order_no } : { dashboard_wizard_order_no: null }),
        ...(formData.dashboard_wizard_options
          ? { dashboard_wizard_options: this.prepareJSON(formData.dashboard_wizard_options, true) }
          : { dashboard_wizard_options: null }),
      },
    ];

    this.update_json_schema.data['table1'] = master;
    this.update_json_schema.conditions['table1'] = [{ uuid: id }];

    this.update_json_schema.conditions['table2'] = [{ master_grid_id: '@table1.id' }];

    if (formData.items && formData.items.length > 0) {
      const items = formData.items.map((item: any) => ({
        master_grid_id: '@table1.id',
        field_name: item.fieldName,
        display_name: item.displayName,
        order_no: item.orderNo,
        is_grid_column: item.isGridColumn,
        is_searchable: item.isSearchable,
        clause_type: item?.clauseType || 'where',
        is_sortable: item.isSortable,
        field_type_id: item.fieldType,
      }));

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

  prettyJSON(data: any) {
    return JSON.stringify(JSON.parse(JSON.stringify(data)), null, 2);
  }

  onSubmit() {
    this.submitted = true;

    const formData = this.form.value;
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
        console.log(`Field: ${field}, Status: ${control.status}, Errors: ${JSON.stringify(control.errors)}`);
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
    }
    return '';
  }

  openInfoPopUp(popup: string) {
    this.isInfoModalOpen = true;
    this.popupName = popup;
    this.selectedInfoTab = 0;
    this.popupInformation = {
      header: this.infoContents[this.popupName].header,
      tabNames: this.infoContents[this.popupName].examples.map((example: any) => example.name),
      data: JSON.stringify(this.infoContents[this.popupName].examples[this.selectedInfoTab].data, null, 2),
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

  // Function to switch tabs
  selectTab(index: number) {
    this.selectedInfoTab = index;
    this.popupInformation = {
      ...this.popupInformation,
      data: JSON.stringify(this.infoContents[this.popupName].examples[this.selectedInfoTab].data, null, 2),
    };
  }
}
