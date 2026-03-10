import { Component, OnInit, OnDestroy, Input, AfterContentInit, EventEmitter, Output } from '@angular/core';
import { CommonSharedModule } from '../../shared/common/common.module';
import { FormBuilderComponent } from '../form-builder/form-builder.component';
import { GridApiService } from '../../service/common/grid.service';
import { RouteUpdateService } from '../../service/common/route-update.service';
import { ActivatedRoute } from '@angular/router';
import { LocalStorageService } from '../../service/common/local-storage.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TreeViewItemComponent } from './tree-view-item/tree-view-item.component';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import { lastValueFrom, Subject, takeUntil } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Store } from '@ngrx/store';
import { Title } from '@angular/platform-browser';
import { MenuMapService } from '../../service/common/menu-map.service';
import { commonConfig } from '../../config/common.config';

interface FetchDataParams {
  entity_name: any;
  start_index: number;
  limit_range: number;
  sort_columns: any;
  search_any: any;
  search_all: any;
  cte: any;
  having_conditions: any;
  hnditions: any;
  group_by: any;
  includes: any;
}

@Component({
  selector: 'app-tree-builder',
  standalone: true,
  imports: [CommonSharedModule, FormBuilderComponent, TreeViewItemComponent, TranslateModule],
  templateUrl: './tree-builder.component.html',
  styleUrl: './tree-builder.component.scss',
})
export class TreeBuilderComponent implements OnInit, OnDestroy, AfterContentInit {
  private destroy$ = new Subject<void>();
  @Input() grid_params: any = null;
  @Input() uuid: any = null;
  @Output() deleteTriggred = new EventEmitter<any>();
  pageInfo: any;
  treeData: any[] = [];
  flatData: any[] = [];
  treeview: string[] = [];
  selectedNode: any = null;
  uniqueId!: string | null;
  // Form Builder Integration
  showForm = false;
  formType: 'add' | 'edit' = 'add';
  formUuid: string | null = null;
  formEntityName: string = '';
  formEntityType: string = '';
  formDefaultData: any = {};
  defaultFormModel: any = {};

  permissions: any = {
    create: false,
    edit: false,
    delete: false,
  };
  store: any;
  companyId: number;
  config!: any;
  query: any = '';
  userId: any;
  primmaryTable: any;
  masterInfo: any;
  policyData: any = null;
  loading: boolean = false;
  EntityName: string | null = null;
  noPermission: boolean = false;
  title: any = '';
  listQuery: any = '';
  userInfo: any;
  attachedPolicies: any[] = [];
  apiUrl = localStorage.getItem('lcp_api_base_url') || environment.apiUrl;
  commonSearchQuery: any = {};
  defaultQuery: any = '';
  isUUid: boolean = true;
  grid_records_delete: any;
  constructor(
    private route: ActivatedRoute,
    private gridApiService: GridApiService,
    private routeUpdateService: RouteUpdateService,
    private localStorageService: LocalStorageService,
    private translate: TranslateService,
    private toastr: ToastrService,
    private titleService: Title,
    public storeData: Store<any>,
    private commonService: MenuMapService
  ) {
    this.initStore();
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      const uuid = params.get('uuid');
      if (id) {
        this.isUUid = false;
      } else {
        this.isUUid = true;
      }
      const value = id || uuid;
      this.uniqueId = value;
    });
    const userData = JSON.parse(this.localStorageService.getData('user_data') || '{}');
    this.companyId = userData.main?.company_id;
  }

  async ngOnInit() {
    this.config = JSON.parse(this.localStorageService.getData('config'));
    this.route.data.pipe(takeUntil(this.destroy$)).subscribe((data) => {
      this.pageInfo = data['pageInfo'];
      if (this.pageInfo) {
        this.permissions = this.pageInfo.permissions;
        this.EntityName = this.pageInfo.fullEntity;
        this.primmaryTable = this?.pageInfo?.additionalData?.primary_table || null;
        if(this.pageInfo?.children?.['add']?.entity_name) {
          this.setFormDefaultData(this.pageInfo?.children?.['add']?.entity_name);
        }
      }
    });
  }

  async ngAfterContentInit() {
    if (this.EntityName) {
      const routes = await this.routeUpdateService.getPageInfo(this.EntityName);
      const defaultPermission = routes && routes.length ? routes[0].data.defaultPermission : null;
      this.setupPageInfo(this.pageInfo, defaultPermission);
    } else {
      const defaultPermission = this.route.snapshot.data['defaultPermission'] || '';
      this.setupPageInfo(this.pageInfo, defaultPermission);
    }
  }

    private parseJSONField(value: any) {
    try {
      return typeof value === 'string' ? JSON.parse(value) : value;
    } catch (error) {
      console.error('JSON Parsing Error:', error);
      return value;
    }
  }

  private setFormDefaultData(entity_name: string) {
    const listParams = {
      company_id: 1,
      print_query: false,
      primary_table: 'master_entities',
      start_index: 0,
      limit_range: 1,
      sort_columns: [['master_entities.id', 'desc']],
      select_columns: [['master_entities.form_information']],
      search_all: [
        { column_name: 'master_entities.entity_name', operator: '=', value: entity_name },
        { column_name: 'master_entities.entity_type', operator: '=', value: 'form_builder_module' },
        { column_name: 'master_entities.status_id', operator: '=', value: '1' },
      ],
    };

    this.gridApiService.getAllList(listParams).subscribe(
      (response) => {
        if (response.status && response.data?.records?.length > 0) {
          let formEntity = response.data.records[0];
          this.defaultFormModel = this.parseJSONField(formEntity.form_information)?.model || {};
        } else {
          this.toastr.error('Invalid entity details given.');

        }
      },
      (error) => {
        const key = 'error';
        const errorMessage = this.translate.instant(key);
        this.toastr.error(errorMessage, 'Error');
      }
    );
  }


  setupPageInfo(pageInfo: any, defaultPermission: any) {
    this.userInfo = JSON.parse(this.localStorageService.getData('user_data'));
    this.grid_records_delete = this.config.grid_enable_associated_records_deletion;
    if (defaultPermission !== true) {
      this.noPermission = true;
      return;
    }

    if (pageInfo) {
      if (this.userInfo.main?.policies) {
        this.policyData = this.userInfo.main?.policies || null;
      }

      this.masterInfo = pageInfo;

      const masterListConfig = pageInfo;

      const translateTitle = this.commonTranslate(masterListConfig.fullEntity);
      this.titleService.setTitle(translateTitle);

      if (this.EntityName) {
        this.title = this.EntityName;
      } else {
        this.title = masterListConfig.fullEntity;
      }

      this.defaultQuery = masterListConfig.ListQuery;
      this.listQuery = JSON.parse(JSON.stringify(this.defaultQuery));
      this.listQuery.start_index = 0;

      if (this.EntityName) {
        this.listQuery.entity_name = this.EntityName;
      }

      this.fetchAttachedPolicies(this.listQuery);
      // this.loadTreeData(this.listQuery);
    } else {
      this.title = 'Default Title';
    }
  }

  fetchAttachedPolicies(params: FetchDataParams) {
    this.gridApiService.getAttachedPolicies({ entity_name: params.entity_name }).subscribe(
      (response) => {
        if (response.status && response.code === 200) {
          this.EntityName = params.entity_name;
          this.attachedPolicies = response.data.attached_policies || [];
        }
      },
      (error) => {
        const key = 'error';
        const errorMessage = this.commonTranslate(key);
        this.toastr.error(errorMessage, 'Error');
      },
      () => {
        this.loadTreeData(this.listQuery);
      }
    );
  }

  async initStore() {
    this.storeData
      .select((d) => d.index)
      .subscribe((d) => {
        this.store = d;
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTreeData(payload: any = {}) {
    this.loading = true;
    let query = this.localStorageService.replaceUniqueId(
      this.localStorageService.formatPayloadWithPolicyConditions(
        {
          ...this.defaultQuery,
          ...payload,
        },
        this.policyData,
        this.attachedPolicies
      ),
      '$session_user_id',
      this.userInfo.main.id
    );
    if (this.uniqueId) {
      payload.unique_id = this.uniqueId;
    }
    if (this.uuid) {
      payload.unique_id = this.uuid;
    }
    if (this.grid_params) {
      payload.grid_params = this.grid_params;
    }
    if (this.attachedPolicies) {
      payload.attached_policies = this.attachedPolicies;
    }
    payload = this.localStorageService.replaceUniqueId(payload, '$unique_id', this.uniqueId || '');

    this.gridApiService.getAllRecords(query).subscribe({
      next: (res: any) => {
        if (res.code === 200 && res.status) {
          this.flatData = res.data.records;
          this.treeData = this.buildHierarchy(this.flatData);
        }
      },
      error: (err) => {
        console.error('Error loading tree data:', err);
        this.toastr.error(this.commonTranslate('error_loading_tree'));
      },
      complete: () => {
        this.loading = false;
      },
    });
  }

  buildHierarchy(flat: any[]): any[] {
    const map: any = {};
    const roots: any[] = [];

    flat.forEach((item) => {
      map[item.id] = { ...item, children: [] };
    });

    flat.forEach((item) => {
      if (item.parent_id && map[item.parent_id]) {
        map[item.parent_id].children.push(map[item.id]);
      } else {
        roots.push(map[item.id]);
      }
    });

    return roots;
  }

  onNodeSelected(node: any) {
    this.selectedNode = node;
    if (this.permissions.edit) {
      this.showForm = false;
      setTimeout(() => {
        this.formType = 'edit';
        this.formUuid = node.uuid;
        this.formEntityName = this.pageInfo.children?.['edit']?.entity_name || this.pageInfo.fullEntity;
        this.formEntityType = 'edit';
        this.showForm = true;
      }, 0);
    } else {
      this.showForm = false;
    }
  }

 setParentId(obj: any, parentId: any = null) {
  if (typeof obj !== "object" || obj === null) return;

  for (const key in obj) {
    const value = obj[key];

    if (typeof value === "object" && value !== null) {

      // set parent_id if exists
      if ("parent_id" in value) {
        value.parent_id = parentId;
      }

      // recursive call
      this.setParentId(value, parentId);
    }
  }

  return obj;
}
  onAddRoot() {
    if (!this.permissions.create) {
      this.toastr.warning(this.commonTranslate('no_permission_create'));
      return;
    }
    this.selectedNode = null;
    this.showForm = false;
    setTimeout(() => {
      this.formType = 'add';
      this.formUuid = null;
      this.formEntityName = this.pageInfo.children?.['add']?.entity_name || this.pageInfo.fullEntity;
      this.formEntityType = 'add';
      this.formDefaultData = { parent_id: null };
      this.showForm = true;
    }, 0);
  }

  onAddChild(parent: any) {
    if (!this.permissions.create) {
      this.toastr.warning(this.commonTranslate('no_permission_create'));
      return;
    }
    this.selectedNode = null;
    this.showForm = false;
    setTimeout(() => {
      this.formType = 'add';
      this.formUuid = null;
      this.formEntityName = this.pageInfo.children?.['add']?.entity_name || this.pageInfo.fullEntity;
      this.formEntityType = 'add';
      this.formDefaultData = this.setParentId(this.defaultFormModel, parent.id);
      this.showForm = true;
    }, 0);
  }

  getRecursiveIds(node: any): number[] {
    let ids = [node.id];
    if (node.children) {
      node.children.forEach((child: any) => {
        ids = [...ids, ...this.getRecursiveIds(child)];
      });
    }
    return ids;
  }

  onFormSuccess(event: any) {
    this.toastr.success(this.commonTranslate('record_saved_successfully'));
    this.loadTreeData();
    // Keep form open but maybe refresh it?
    if (this.formType === 'add') {
      this.showForm = false;
    }
  }

  private async executeJob(inputObject: any): Promise<void> {
    if (inputObject.record_info.id) {
      let job_query_information = this.localStorageService.replaceUniqueId(inputObject.query_information, '$unique_id', inputObject.record_info.id);

      const gparams = this.collectRecordGParams(inputObject.record_info);
      Object.keys(gparams).forEach((key) => {
        job_query_information = this.localStorageService.replaceUniqueId(job_query_information, `$${key}`, gparams[key]);
      });

      try {
        const response = await lastValueFrom(this.gridApiService.executeTransaction(job_query_information));
        if (!response.status) {
          throw new Error(response.message);
        }
      } catch (error: any) {
        throw error;
      }
    }
  }

  private collectRecordGParams(recordInfo: any): Record<string, any> {
    const gparams: Record<string, any> = {};

    if (!recordInfo || typeof recordInfo !== 'object') {
      return gparams;
    }

    Object.keys(recordInfo).forEach((key) => {
      if (key.startsWith('gparam_') && recordInfo[key] !== undefined && recordInfo[key] !== null) {
        gparams[key] = recordInfo[key];
      }
    });

    const aggregated = recordInfo.gparam;
    if (typeof aggregated === 'string' && aggregated.trim()) {
      try {
        const decoded = decodeURIComponent(aggregated);
        const parsed = JSON.parse(decoded);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          Object.keys(parsed).forEach((key) => {
            if (key.startsWith('gparam_') && parsed[key] !== undefined && parsed[key] !== null) {
              gparams[key] = parsed[key];
            }
          });
        }
      } catch {
        try {
          const parsed = JSON.parse(aggregated);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            Object.keys(parsed).forEach((key) => {
              if (key.startsWith('gparam_') && parsed[key] !== undefined && parsed[key] !== null) {
                gparams[key] = parsed[key];
              }
            });
          }
        } catch {}
      }
    }

    return gparams;
  }

  commonTranslate(msg: any) {
    return this.translate.instant(msg);
  }

  directDeleteItem(item: any) {
    Swal.fire({
      icon: 'warning',
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      showCancelButton: true,
      confirmButtonText: 'Delete',
      padding: '2em',
    }).then(async (result) => {
      if (result.value) {
        try {
          const jobResponse = await this.localStorageService.getMasterEntity({
            record_info: item,
            entity_name: this.masterInfo.children.delete.entity_name,
            entity_type: this.masterInfo.children.delete.component_class_name,
          });

          if (jobResponse) {
            await this.executeJob({ ...jobResponse, record_info: item });
            Swal.fire({ title: 'Deleted!', text: 'Node has been deleted.', icon: 'success' });
            this.deleteTriggred.emit();
            this.loadTreeData(this.listQuery);
            this.showForm = false;
          }
        } catch (error: any) {
          const key = 'error';
          const errorMessage = this.commonTranslate(key);
          this.toastr.error(errorMessage, error.message);
        }
      }
    });
  }

  onDeleteNode(item: any) {
    if (this.masterInfo.children.delete && this.masterInfo.children.delete.component_class_name === commonConfig.ENTITY_TYPES.JOB_BUILDER_MODULE) {
      if (this.grid_records_delete == 'true') {
        const procedureParams = { proc_name: 'check_for_related_records', params: { entity_name: this.listQuery.entity_name, record_id: item.id } };
        this.commonService.procedureCall(procedureParams).subscribe({
          next: (response: { code: number; status: boolean; data: any; message: string }) => {
            if (response.code === 200 && response.status && response.data) {
              const res = response.data?.[0]?.result || [];

              if (Object.keys(res).length > 0) {
                let htmlInput =
                  `
                    <span>` +
                  this.commonTranslate('config_delete_msg_0') +
                  `</span><br><br>
                    <table style="width: 100%; text-align: center; border-collapse: collapse;">
                    <thead>
                      <tr>
                        <th style="border: 1px solid #ddd; padding: 8px;">` +
                  this.commonTranslate('config_delete_msg_1') +
                  `</th>
                        <th style="border: 1px solid #ddd; padding: 8px;">` +
                  this.commonTranslate('config_delete_msg_2') +
                  `</th>
                      </tr> </thead><tbody>
                  `;

                Object.entries(res).forEach(([key, value]) => {
                  htmlInput += `
                      <tr>
                        <td style="border: 1px solid #ddd; padding: 8px;">${key}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">${value}</td>
                      </tr>
                    `;
                });

                htmlInput += `</tbody></table>`;

                Swal.fire({
                  title: `<span style="color: orange;">` + this.commonTranslate('config_delete_msg_3') + `!</span>`,
                  html: htmlInput,
                  customClass: {
                    title: 'swal-title',
                  },
                });
              } else {
                this.directDeleteItem(item);
              }
            } else {
              const key = 'error';
              const errorMessage = this.commonTranslate(key);
              this.toastr.error(errorMessage, 'Error');
            }
          },
          error: (error) => {
            console.error('Error fetching data:', error);
            //this.loading = false;
          },
          complete: () => {
            //this.loading = false;
          },
        });
      } else {
        this.directDeleteItem(item);
      }
    }
  }
}
