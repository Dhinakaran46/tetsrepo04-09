import { Component, OnInit, OnDestroy, Input, AfterContentInit } from '@angular/core';
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
import { Subject, takeUntil } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Store } from '@ngrx/store';
import { Title } from '@angular/platform-browser';

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

  permissions: any = {
    create: false,
    edit: false,
    delete: false,
  };
  store: any;
  companyId: number;
  config!: any;
  query: any = '';
  user_id: any;
  masterInfo: any;
  policyData: any = null;
  loading: boolean = false;
  EntityName: string | null = null;
  noPermission: boolean = false;
  title: any = '';
  listQuery: any = '';
  user_info: any;
  attachedPolicies: any[] = [];
  apiUrl = localStorage.getItem('lcp_api_base_url') || environment.apiUrl;
  commonSearchQuery: any = {};
  defaultQuery: any = '';
  isUUid: boolean = true;
  constructor(
    private route: ActivatedRoute,
    private gridApiService: GridApiService,
    private routeUpdateService: RouteUpdateService,
    private localStorageService: LocalStorageService,
    private translate: TranslateService,
    private toastr: ToastrService,
    private titleService: Title,
    public storeData: Store<any>
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
        // this.loadTreeData(this.pageInfo.ListQuery);
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

  setupPageInfo(pageInfo: any, defaultPermission: any) {
    this.user_info = JSON.parse(this.localStorageService.getData('user_data'));
    if (defaultPermission !== true) {
      this.noPermission = true;
      return;
    }

    if (pageInfo) {
      if (this.user_info.main?.policies) {
        this.policyData = this.user_info.main?.policies || null;
      }

      this.masterInfo = pageInfo;

      const masterListConfig = pageInfo;

      const translateTitle = this.translate.instant(masterListConfig.fullEntity);
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
      this.loadTreeData(this.listQuery);
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
        const errorMessage = this.translate.instant(key);
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
      this.user_info.main.id
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
    console.log('Final Query Payload for Tree Data:', query);
    this.gridApiService.getAllRecords(query).subscribe({
      next: (res: any) => {
        if (res.code === 200 && res.status) {
          this.flatData = res.data.records;
          this.treeData = this.buildHierarchy(this.flatData);
        }
      },
      error: (err) => {
        console.error('Error loading tree data:', err);
        this.toastr.error(this.translate.instant('error_loading_tree'));
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
    this.formType = 'edit';
    this.formUuid = node.uuid;
    this.formEntityName = this.pageInfo.children?.['edit']?.entity_name || this.pageInfo.fullEntity;
    this.formEntityType = 'edit';
    this.showForm = true;
  }

  onAddRoot() {
    this.selectedNode = null;
    this.formType = 'add';
    this.formUuid = null;
    this.formEntityName = this.pageInfo.children?.['add']?.entity_name || this.pageInfo.fullEntity;
    this.formEntityType = 'add';
    this.formDefaultData = { parent_id: null };
    this.showForm = true;
  }

  onAddChild(parent: any) {
    this.selectedNode = null;
    this.formType = 'add';
    this.formUuid = null;
    this.formEntityName = this.pageInfo.children?.['add']?.entity_name || this.pageInfo.fullEntity;
    this.formEntityType = 'add';
    this.formDefaultData = { parent_id: parent.id };
    this.showForm = true;
  }

  async onDeleteNode(node: any) {
    const result = await Swal.fire({
      title: this.translate.instant('are_you_sure'),
      text: this.translate.instant('delete_warning'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: this.translate.instant('yes_delete'),
    });

    if (result.isConfirmed) {
      // Find all children recursively to delete?
      // The framework usually handles Soft Delete. If it's a hierarchy, we might need a stored procedure.
      // For now, let's use the executeRecords pattern for a single node or rely on backend triggers.
      const idsToDelete = this.getRecursiveIds(node);

      const deletePayload = {
        action: ['update'],
        table: [this.pageInfo.ListQuery.primary_table],
        table_mapping: ['table1'],
        data: {
          table1: [{ status_id: 3, deleted_at: 'now()' }],
        },
        conditions: {
          table1: [{ id: idsToDelete[0] }], // Simplified: Backend should handle children
        },
      };

      // If the framework expects bulk delete:
      // We'll iterate or use IN operator if the generic API supports it.
      // Based on MenuItemComponent, it iterates.

      for (const id of idsToDelete) {
        await this.deleteSingleItem(id);
      }

      this.toastr.success(this.translate.instant('record_deleted_successfully'));
      if (this.selectedNode?.id === node.id) {
        this.showForm = false;
        this.selectedNode = null;
      }
      this.loadTreeData();
    }
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

  async deleteSingleItem(id: number) {
    const payload = {
      action: ['update'],
      table: [this.pageInfo.ListQuery.primary_table],
      table_mapping: ['table1'],
      data: {
        table1: [{ status_id: 3, deleted_at: 'now()' }],
      },
      conditions: {
        table1: [{ id: id }],
      },
    };
    return this.gridApiService.executeRecords(payload).toPromise();
  }

  onFormSuccess(event: any) {
    this.toastr.success(this.translate.instant('record_saved_successfully'));
    this.loadTreeData();
    // Keep form open but maybe refresh it?
    if (this.formType === 'add') {
      this.showForm = false;
    }
  }
}
