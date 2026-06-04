import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { Router, Route, Routes } from '@angular/router';
import { LocalStorageService } from './local-storage.service';
import { BehaviorSubject, firstValueFrom, Observable, switchMap } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { commonConfig } from '../../config/common.config';

@Injectable({
  providedIn: 'root',
})
export class RouteUpdateService {
  apiUrl = this.localStore.getData('lcp_api_base_url') || environment.apiUrl;

  private permissionsListSubject = new BehaviorSubject<any>(null);
  routeList: { path: string; component: any }[] = [];

  private renderer: Renderer2;

  // ΓöÇΓöÇΓöÇ Single source of truth for component map ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  private readonly componentMap: Record<string, () => Promise<any>> = {
    grid_builder_module: () => import('../../pages/master-list/master-list.component').then((m) => m.MasterListComponent),
    menu_module: () => import('../../pages/menu-mapping/menu-mapping.component').then((m) => m.MenuMappingComponent),
    static_page_builder_module: () => import('../../pages/static-page/static-page.component').then((m) => m.StaticPageComponent),
    form_builder_module: () => import('../../pages/form-builder/form-builder.component').then((m) => m.FormBuilderComponent),
    entity_user_role_map_module: () => import('../../pages/user-role-permission/user-role-permission.component').then((m) => m.UserRolePermissionComponent),
    user_company_map_module: () => import('../../pages/user-company-map/user-company-map.component').then((m) => m.UserCompanyMapComponent),
    entity_form_module: () => import('../../pages/master-entity/master-entity.component').then((m) => m.MasterEntityComponent),
    about_lcp_form_module: () => import('../../pages/aboutlcp/aboutlcp.component').then((m) => m.AboutlcpComponent),
    ai_playground_module: () => import('../../pages/ai-playground/ai-playground.component').then((m) => m.AiPlaygroundComponent),
    query_builder_module: () => import('../../pages/query-builder/query-builder.component').then((m) => m.QueryBuilderComponent),
    language_contents_module: () => import('../../pages/language-mapping/language-mapping.component').then((m) => m.LanguageMappingComponent),
    job_builder_module: () => import('../../pages/job-page/job-page.component').then((m) => m.JobPageComponent),
    export_module: () => import('../../pages/job-page/job-page.component').then((m) => m.JobPageComponent),
    configurations_module: () => import('../../pages/configuration/configuration.component').then((m) => m.ConfigurationComponent),
    user_configurations_module: () => import('../../pages/user-configuration/user-configuration.component').then((m) => m.UserConfigurationComponent),
    cron_setting_module: () => import('../../pages/cron-setting/cron-setting.component').then((m) => m.CronSettingComponent),
    import_module: () => import('../../pages/import-master/import-master.component').then((m) => m.ImportMasterComponent),
    migrate_entity: () => import('../../pages/migrate-entity/migrate-entity.component').then((m) => m.MigrateEntityComponent),
    import_template_module: () => import('../../pages/import-template/import-template.component').then((m) => m.ImportTemplateComponent),
    export_template_module: () => import('../../pages/export-template/export-template.component').then((m) => m.ExportTemplateComponent),
    import_job_detail_module: () => import('../../pages/import-job-details/import-job-details.component').then((m) => m.ImportJobDetailsComponent),
    policy_add_edit_module: () => import('../../pages/policy/policy.component').then((m) => m.PolicyComponent),
    user_role_policy_module: () => import('../../pages/user-role-policy/user-role-policy.component').then((m) => m.UserRolePolicyComponent),
    email_template_assignment_module: () =>
      import('../../pages/email-template-assignment/email-template-assignment.component').then((m) => m.EmailTemplateAssignmentComponent),
    whatsapp_template_assignment_module: () =>
      import('../../pages/whatsapp-template-assignment/whatsapp-template-assignment.component').then((m) => m.WhatsappTemplateAssignmentComponent),
    approval_workflow_assignment_module: () =>
      import('../../pages/approval-workflow-assignment/approval-workflow-assignment.component').then((m) => m.ApprovalWorkflowAssignmentComponent),
    approval_requests_module: () => import('../../pages/approval-requests/approval-requests.component').then((m) => m.ApprovalRequestsComponent),
    approval_requests_tracking_module: () =>
      import('../../pages/approval-requests-tracking/approval-requests-tracking.component').then((m) => m.ApprovalRequestsTrackingComponent),
    child_process_setting_module: () => import('../../pages/child-process-setting/child-process-setting.component').then((m) => m.ChildProcessSettingComponent),
    carousel_module: () => import('../../pages/carousel/carousel.component').then((m) => m.CarouselComponent),
    barcode_print_module: () => import('../../pages/barcode-printing/barcode-printing.component').then((m) => m.BarcodePrintingComponent),
    common_permission_module: () => import('../../pages/static-page/static-page.component').then((m) => m.StaticPageComponent),
    tree_builder_module: () => import('../../pages/tree-builder/tree-builder.component').then((m) => m.TreeBuilderComponent),
    target_keywords_embeddings_module: () =>
      import('../../pages/target-keywords-embeddings/target-keywords-embeddings.component').then((m) => m.TargetKeywordsEmbeddingsComponent),
    audit_log_management_module: () => import('../../pages/audit-log-management/audit-log-management.component').then((m) => m.AuditLogManagementComponent),
    chart_builder_module: () => import('../../pages/chart-builder/chart-builder.component').then((m) => m.ChartBuilderComponent),
  };

  constructor(private rendererFactory: RendererFactory2, private router: Router, private localStore: LocalStorageService) {
    this.renderer = this.rendererFactory.createRenderer(null, null);
    const permissionsList = this.getMenuData()?.permissions ?? null;
    this.permissionsListSubject.next(permissionsList);
  }

  setPermissionsList(permissions: any) {
    this.permissionsListSubject.next(permissions);
  }

  changeFavicon(url: any): void {
    const favicon = this.renderer.selectRootElement('#common-favicon', true);
    this.renderer.setAttribute(favicon, 'href', url);
  }

  // ΓöÇΓöÇΓöÇ Private helpers ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

  /** Safely parse and return user_data from localStorage */
  private getMenuData(): any | null {
    try {
      const raw = this.localStore.getData('user_data');
      return raw && raw !== 'undefined' ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  /** Returns the flat menu list used for dynamic route building */
  private getMenuList(): any[] {
    return this.getMenuData()?.unorgmenuList ?? [];
  }

  private getPermissionListJSON(): Observable<any> {
    return this.permissionsListSubject.asObservable();
  }

  private extractRoutes(routes: Routes, parentPath: string = ''): void {
    for (const route of routes) {
      const path = parentPath + '/' + (route.path || '');
      if (route.component) {
        this.routeList.push({ path, component: route.component });
      }
      if (route.children) {
        this.extractRoutes(route.children, path);
      }
    }
  }

  /** Builds all permission keys for a given entity name */
  private buildPermissionKeys(entityName: string) {
    return {
      view: `view_${entityName}`,
      create: `add_${entityName}`,
      edit: `edit_${entityName}`,
      delete: `delete_${entityName}`,
      exportExcel: `export_excel_${entityName}`,
      exportPDF: `export_pdf_${entityName}`,
      details: `details_${entityName}`,
      assign: `assign_${entityName}`,
      print: `print_${entityName}`,
      recordExport: `record_export_${entityName}`,
      emailResend: `email_resend_${entityName}`,
      generateVector: `generate_vector_${entityName}`,
      childDetails: `child_details_${entityName}`,
      popupCreate: `popup_add_${entityName}`,
      popupEdit: `popup_edit_${entityName}`,
      popupDetails: `popup_details_${entityName}`,
      resetPassword: `reset_password_${entityName}`,
      getCode: `get_code_${entityName}`,
    };
  }

  /** Resolves the search_all filter array for a given route, with entity-specific overrides */
  private buildSearchAllCol(routeData: any): any[] {
    const deletedAtColumn = `${routeData.primary_table}.status_id`;
    const base = [{ column_name: deletedAtColumn, value: 3, operator: '!=' }];

    if (routeData.entity_name === 'app_error_log') {
      return [...base, { column_name: 'request_logs.res_status', value: false, operator: '=' }];
    }
    if (routeData.entity_name === 'user') {
      return [...base, { value: ['super_admin', 'company_admin'], operator: 'NOT IN', column_name: 'tenant_users.role' }];
    }
    if (routeData.entity_name === 'master_entity') {
      return [...base, { column_name: `${routeData.primary_table}.entity_type`, value: 'help_page_module', operator: '!=' }];
    }
    return base;
  }

  /** Builds the children map for a route entry */
  private buildChildren(routeData: any, routeDataArray: any[]): Record<string, any> {
    return routeDataArray.reduce((acc: any, childRoute: any) => {
      if (childRoute.parent_id === routeData.id && childRoute.action_slug) {
        acc[childRoute.action_slug] = childRoute;
      }
      return acc;
    }, {});
  }

  /** Builds a Route object from a menu item + permissions */
  private buildRoute(routeData: any, routeDataArray: any[], permissionListJSON: any): Route {
    const keys = this.buildPermissionKeys(routeData.entity_name);
    const targetPath = routeData.target.startsWith('/') ? routeData.target.slice(1) : routeData.target;
    const finalAllCol = this.buildSearchAllCol(routeData);
    const children = this.buildChildren(routeData, routeDataArray);

    return {
      path: targetPath,
      loadComponent: this.componentMap[routeData.component_class_name] || null,
      title: routeData.entity_name,
      data: {
        pageInfo: {
          targetPath,
          fullEntity: routeData.entity_name,
          title: routeData.entity_name,
          Listname: routeData.entity_name,
          action_slug: routeData.action_slug,
          draft_mode: routeData.draft_mode,
          entity_configurations: routeData.entity_configurations,
          ListQuery: {
            print_query: true,
            company_id: 0,
            entity_name: routeData.entity_name,
            cte: routeData.cte,
            start_index: 0,
            limit_range: 10,
            search_all: finalAllCol,
            search_any: [],
          },
          enable_row_checkbox: false,
          permissions: {
            create: permissionListJSON[keys.create] || false,
            edit: permissionListJSON[keys.edit] || false,
            delete: permissionListJSON[keys.delete] || false,
            export_excel: permissionListJSON[keys.exportExcel] || false,
            export_pdf: permissionListJSON[keys.exportPDF] || false,
            details: permissionListJSON[keys.details] || false,
            assign: permissionListJSON[keys.assign] || false,
            print: permissionListJSON[keys.print] || false,
            record_export: permissionListJSON[keys.recordExport] || false,
            email_resend: permissionListJSON[keys.emailResend] || false,
            generate_vector: permissionListJSON[keys.generateVector] || false,
            child_details: permissionListJSON[keys.childDetails] || false,
            popup_create: permissionListJSON[keys.popupCreate] || false,
            popup_edit: permissionListJSON[keys.popupEdit] || false,
            popup_details: permissionListJSON[keys.popupDetails] || false,
            reset_password: permissionListJSON[keys.resetPassword] || false,
            get_code: permissionListJSON[keys.getCode] || false,
          },
          children,
          additionalData: {
            primary_table: routeData.primary_table,
            entity_id: routeData.entity_id,
          },
        },
        defaultPermission: permissionListJSON[keys.view] || false,
        defaultKey: keys.view,
        dynamicLcpRoute: true,
      },
    };
  }

  // ΓöÇΓöÇΓöÇ Public API ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

  updateRoutesWithGridPermission(routeDataArray: any[]): Observable<Route[]> {
    return this.getPermissionListJSON().pipe(
      switchMap((permissionListJSON) => {
        const dynamicRoutes = routeDataArray
          .filter((r: any) => r.entity_name && r.component_class_name && !!this.componentMap[r.component_class_name])
          .map((r: any) => this.buildRoute(r, routeDataArray, permissionListJSON));

        return [dynamicRoutes];
      })
    );
  }

  getComponentLoader(entityName: string): (() => Promise<any>) | null {
    const menuItem = this.getMenuList().find((item: any) => item.entity_name === entityName);
    return menuItem?.component_class_name ? this.getComponentLoaderByClass(menuItem.component_class_name) : null;
  }

  getComponentLoaderByClass(componentClassName: string): (() => Promise<any>) | null {
    return this.componentMap[componentClassName] || null;
  }

  async getPageInfo(entity_name: any): Promise<any> {
    const action_types = commonConfig.action_types;
    const routeDataArray = this.getMenuList();
    const permissionListJSON = await firstValueFrom(this.getPermissionListJSON());

    if (!permissionListJSON || !routeDataArray.length) return null;

    return routeDataArray
      .filter((r: any) => r.entity_name === entity_name && r.component_class_name)
      .map((routeData: any) => {
        const route = this.buildRoute(routeData, routeDataArray, permissionListJSON);

        // Extra logic specific to getPageInfo: fallback child_details resolution
        if (routeData.action_slug === 'child_details' && Object.keys(route.data!['pageInfo'].children).length === 0) {
          const possibleActionSlugs = action_types.map((a: any) => `menu_${a.value}_${routeData.entity_name}`);
          const matchedItems = routeDataArray.filter((r: any) => r.id !== routeData.id && r.action_slug && possibleActionSlugs.includes(r.name));
          matchedItems.forEach((r: any) => {
            if (!route.data!['pageInfo'].children[r.action_slug]) {
              route.data!['pageInfo'].children[r.action_slug] = r;
            }
          });
        }

        return route;
      });
  }

  addDynamicRoutes() {
    try {
      const config = this.localStore.getData('config');
      if (config) {
        const resn = JSON.parse(config);
        if (resn?.favicon) {
          this.changeFavicon(this.apiUrl + '/' + resn.favicon);
        }
      }
    } catch {
      // non-critical ΓÇö favicon failure should not block routing
    }

    const unorgmenuList = this.getMenuList();
    if (!unorgmenuList.length) return;

    this.updateRoutesWithGridPermission(unorgmenuList).subscribe((dynamicRoutes) => {
      const routerConfig = this.router.config;
      const appLayoutRoute = routerConfig.find((route) => route.path === '');
      if (appLayoutRoute?.children) {
        appLayoutRoute.children = appLayoutRoute.children.filter((route: any) => !route.data?.dynamicLcpRoute);
        appLayoutRoute.children.push(...dynamicRoutes);
        this.router.resetConfig(routerConfig);
      }
    });
    try {
      const config = this.localStore.getData('config');
      if (config) {
        const resn = JSON.parse(config);
        if (resn?.favicon) {
          this.changeFavicon(this.apiUrl + '/' + resn.favicon);
        }
      }
    } catch {
      // non-critical ΓÇö favicon failure should not block routing
    }
  }
}


