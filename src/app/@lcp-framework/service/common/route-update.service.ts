import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { Router, Route, Routes } from '@angular/router';
// import { MasterListComponent } from '../../pages/master-list/master-list.component';
// import { MenuMappingComponent } from '../../pages/menu-mapping/menu-mapping.component';
// import { StaticPageComponent } from '../../pages/static-page/static-page.component';
// import { JobPageComponent } from '../../pages/job-page/job-page.component';
// import { FormBuilderComponent } from '../../pages/form-builder/form-builder.component';

import { LocalStorageService } from './local-storage.service';
import { BehaviorSubject, firstValueFrom, Observable } from 'rxjs';
// import { MasterEntityComponent } from '../../pages/master-entity/master-entity.component';
// import { LanguageMappingComponent } from '../../pages/language-mapping/language-mapping.component';
// import { DocumentationComponent } from '../../pages/documentation/documentation.component';
// import { ConfigurationComponent } from '../../pages/configuration/configuration.component';
// import { BarcodePrintingComponent } from '../../pages/barcode-printing/barcode-printing.component';
import { environment } from '../../../../environments/environment';
// import { UserRolePermissionComponent } from '../../pages/user-role-permission/user-role-permission.component';
// import { ImportMasterComponent } from '../../pages/import-master/import-master.component';
// import { ImportTemplateComponent } from '../../pages/import-template/import-template.component';
// import { ExportTemplateComponent } from '../../pages/export-template/export-template.component';
// import { ImportJobDetailsComponent } from '../../pages/import-job-details/import-job-details.component';
// import { PolicyComponent } from '../../pages/policy/policy.component';
// import { UserRolePolicyComponent } from '../../pages/user-role-policy/user-role-policy.component';
// import { EmailTemplateAssignmentComponent } from '../../pages/email-template-assignment/email-template-assignment.component';
import { commonConfig } from '../../config/common.config';
@Injectable({
  providedIn: 'root',
})
export class RouteUpdateService {
  apiUrl = localStorage.getItem('lcp_api_base_url') || environment.apiUrl;
  private permissionsListSubject = new BehaviorSubject<any>(null);
  routeList: { path: string; component: any }[] = [];

  private renderer: Renderer2;

  constructor(private rendererFactory: RendererFactory2, private router: Router, private localStore: LocalStorageService) {
    this.renderer = this.rendererFactory.createRenderer(null, null);

    const permissionsList = this.localStore.getData('user_data') ? JSON.parse(this.localStore.getData('user_data')).permissions : null;

    this.permissionsListSubject.next(permissionsList);
  }

  setPermissionsList(permissions: any) {
    this.permissionsListSubject.next(permissions);
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

  changeFavicon(url: any): void {
    const favicon = this.renderer.selectRootElement('#common-favicon', true);
    this.renderer.setAttribute(favicon, 'href', url);
  }

  updateRoutesWithGridPermission(routeDataArray: any[]): Observable<Route[]> {
    return new Observable((observer) => {
      this.getPermissionListJSON().subscribe((permissionListJSON) => {
        if (permissionListJSON) {
          const dynamicRoutes = routeDataArray
            .filter((routeData: any) => routeData.entity_name && routeData.component_class_name)
            .map((routeData: any) => {
              const viewPermissionKey = `view_${routeData.entity_name}`;

              const createPermissionKey = `add_${routeData.entity_name}`;
              const editPermissionKey = `edit_${routeData.entity_name}`;
              const deletePermissionKey = `delete_${routeData.entity_name}`;
              const exportExcelPermissionKey = `export_excel_${routeData.entity_name}`;
              const exportPDFPermissionKey = `export_pdf_${routeData.entity_name}`;
              const detailsPermissionKey = `details_${routeData.entity_name}`;
              const assignPermissionKey = `assign_${routeData.entity_name}`;
              const printPermissionKey = `print_${routeData.entity_name}`;
              const recordExportPermissionKey = `record_export_${routeData.entity_name}`;
              const emailResendPermissionKey = `email_resend_${routeData.entity_name}`;
              const generateVectorPermissionKey = `generate_vector_${routeData.entity_name}`;
              const childDetailsPermissionKey = `child_details_${routeData.entity_name}`;
              const popupCreatePermissionKey = `popup_add_${routeData.entity_name}`;
              const popupEditPermissionKey = `popup_edit_${routeData.entity_name}`;
              const popupDetailsPermissionKey = `popup_details_${routeData.entity_name}`;
              const resetPasswordPermissionKey = `reset_password_${routeData.entity_name}`;

              const idColumn = `${routeData.primary_table}.id`;
              const deletedAtColumn = `${routeData.primary_table}.status_id`;
              const targetPath = routeData.target.startsWith('/') ? routeData.target.slice(1) : routeData.target;

              const sortCol = [[idColumn, 'desc']];
              const searchAllCol = [
                {
                  column_name: deletedAtColumn,
                  value: 3,
                  operator: '!=',
                },
              ];

              let finalAllCol = [];
              if (routeData.entity_name == 'app_error_log') {
                finalAllCol = [
                  ...searchAllCol,
                  {
                    column_name: 'request_logs.res_status',
                    value: false,
                    operator: '=',
                  },
                ];
              } else if (routeData.entity_name == 'user') {
                finalAllCol = [
                  ...searchAllCol,
                  {
                    value: ['super_admin', 'company_admin'],
                    operator: 'NOT IN',
                    column_name: 'users.role',
                  },
                ];
              } else if (routeData.entity_name == 'master_entity') {
                finalAllCol = [
                  ...searchAllCol,
                  {
                    column_name: `${routeData.primary_table}.entity_type`,
                    value: 'help_page_module',
                    operator: '!=',
                  },
                ];
              } else {
                finalAllCol = searchAllCol;
              }

              //const children = routeDataArray.filter((childRoute) => childRoute.parent_id === routeData.id && childRoute.action_slug);
              const children = routeDataArray.reduce((acc, childRoute) => {
                if (childRoute.parent_id === routeData.id && childRoute.action_slug) {
                  acc[childRoute.action_slug] = childRoute;
                }
                return acc;
              }, {});
              // const componentMap: any = {
              //   grid_builder_module: MasterListComponent,
              //   menu_module: MenuMappingComponent,
              //   static_page_builder_module: StaticPageComponent,
              //   form_builder_module: FormBuilderComponent,

              //   entity_user_role_map_module: UserRolePermissionComponent,
              //   entity_form_module: MasterEntityComponent,
              //   language_contents_module: LanguageMappingComponent,
              //   job_builder_module: JobPageComponent,
              //   export_module: JobPageComponent,
              //   help_page_module: DocumentationComponent,
              //   configurations_module: ConfigurationComponent,
              //   import_module: ImportMasterComponent,
              //   import_template_module: ImportTemplateComponent,
              //   export_template_module: ExportTemplateComponent,
              //   import_job_detail_module: ImportJobDetailsComponent,
              //   policy_add_edit_module: PolicyComponent,
              //   user_role_policy_module: UserRolePolicyComponent,
              //   email_template_assignment_module: EmailTemplateAssignmentComponent,
              // };

              const componentMap: any = {
                grid_builder_module: () => import('../../pages/master-list/master-list.component').then((m) => m.MasterListComponent),
                menu_module: () => import('../../pages/menu-mapping/menu-mapping.component').then((m) => m.MenuMappingComponent),
                static_page_builder_module: () => import('../../pages/static-page/static-page.component').then((m) => m.StaticPageComponent),
                form_builder_module: () => import('../../pages/form-builder/form-builder.component').then((m) => m.FormBuilderComponent),
                entity_user_role_map_module: () =>
                  import('../../pages/user-role-permission/user-role-permission.component').then((m) => m.UserRolePermissionComponent),
                entity_form_module: () => import('../../pages/master-entity/master-entity.component').then((m) => m.MasterEntityComponent),
                about_lcp_form_module: () => import('../../pages/aboutlcp/aboutlcp.component').then((m) => m.AboutlcpComponent),
                ai_playground_module: () => import('../../pages/ai-playground/ai-playground.component').then((m) => m.AiPlaygroundComponent),
                query_builder_module: () => import('../../pages/query-builder/query-builder.component').then((m) => m.QueryBuilderComponent),
                language_contents_module: () => import('../../pages/language-mapping/language-mapping.component').then((m) => m.LanguageMappingComponent),
                job_builder_module: () => import('../../pages/job-page/job-page.component').then((m) => m.JobPageComponent),
                export_module: () => import('../../pages/job-page/job-page.component').then((m) => m.JobPageComponent),
                help_page_module: () => import('../../pages/documentation/documentation.component').then((m) => m.DocumentationComponent),
                configurations_module: () => import('../../pages/configuration/configuration.component').then((m) => m.ConfigurationComponent),
                user_configurations_module: () =>
                  import('../../pages/user-configuration/user-configuration.component').then((m) => m.UserConfigurationComponent),
                cron_setting_module: () => import('../../pages/cron-setting/cron-setting.component').then((m) => m.CronSettingComponent),
                import_module: () => import('../../pages/import-master/import-master.component').then((m) => m.ImportMasterComponent),
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
                child_process_setting_module: () =>
                  import('../../pages/child-process-setting/child-process-setting.component').then((m) => m.ChildProcessSettingComponent),
                carousel_module: () => import('../../pages/carousel/carousel.component').then((m) => m.CarouselComponent),
                barcode_print_module: () => import('../../pages/barcode-printing/barcode-printing.component').then((m) => m.BarcodePrintingComponent),
                common_permission_module: () => import('../../pages/static-page/static-page.component').then((m) => m.StaticPageComponent),
              };

              const route: Route = {
                path: targetPath,

                loadComponent: componentMap[routeData.component_class_name] || null,
                title: routeData.entity_name,
                data: {
                  pageInfo: {
                    targetPath: targetPath,
                    fullEntity: routeData.entity_name,
                    title: routeData.entity_name,
                    Listname: routeData.entity_name,
                    action_slug: routeData.action_slug,
                    draft_mode: routeData.draft_mode,
                    ListQuery: {
                      print_query: true,
                      company_id: 0,
                      entity_name: routeData.entity_name,
                      cte: routeData.cte,
                      start_index: 0,
                      limit_range: 10,
                      //sort_columns: sortCol,
                      search_all: finalAllCol,
                      search_any: [],
                    },
                    enable_row_checkbox: false,
                    permissions: {
                      create: permissionListJSON[createPermissionKey] || false,
                      edit: permissionListJSON[editPermissionKey] || false,
                      delete: permissionListJSON[deletePermissionKey] || false,
                      export_excel: permissionListJSON[exportExcelPermissionKey] || false,
                      export_pdf: permissionListJSON[exportPDFPermissionKey] || false,
                      details: permissionListJSON[detailsPermissionKey] || false,
                      assign: permissionListJSON[assignPermissionKey] || false,
                      print: permissionListJSON[printPermissionKey] || false,
                      record_export: permissionListJSON[recordExportPermissionKey] || false,
                      email_resend: permissionListJSON[emailResendPermissionKey] || false,
                      generate_vector: permissionListJSON[generateVectorPermissionKey] || false,
                      child_details: permissionListJSON[childDetailsPermissionKey] || false,
                      popup_create: permissionListJSON[popupCreatePermissionKey] || false,
                      popup_edit: permissionListJSON[popupEditPermissionKey] || false,
                      popup_details: permissionListJSON[popupDetailsPermissionKey] || false,
                      reset_password: permissionListJSON[resetPasswordPermissionKey] || false,
                    },
                    children: children,
                  },
                  defaultPermission: permissionListJSON[viewPermissionKey] || false,
                  defaultKey: viewPermissionKey,
                },
              };

              // route.children = children;

              return route;
            });

          observer.next(dynamicRoutes);
          observer.complete();
        }
      });
    });
  }

  async getPageInfo(entity_name: any): Promise<any> {
    const action_types = commonConfig.action_types;
    const user_data_raw = this.localStore.getData('user_data');
    if (!user_data_raw || user_data_raw === 'undefined') return null;

    const user_data = JSON.parse(user_data_raw);
    const routeDataArray = user_data?.unorgmenuList || [];

    const permissionListJSON = await firstValueFrom(this.getPermissionListJSON());
    console.log(permissionListJSON)
    if (!permissionListJSON || !routeDataArray.length) return null;

    if (permissionListJSON && routeDataArray) {
      const dynamicRoutes = routeDataArray
        .filter((routeData: any) => routeData.entity_name === entity_name && routeData.component_class_name)
        .map((routeData: any) => {
          const viewPermissionKey = `view_${routeData.entity_name}`;
          const createPermissionKey = `add_${routeData.entity_name}`;
          const editPermissionKey = `edit_${routeData.entity_name}`;
          const deletePermissionKey = `delete_${routeData.entity_name}`;
          const exportExcelPermissionKey = `export_excel_${routeData.entity_name}`;
          const exportPDFPermissionKey = `export_pdf_${routeData.entity_name}`;
          const detailsPermissionKey = `details_${routeData.entity_name}`;
          const assignPermissionKey = `assign_${routeData.entity_name}`;
          const printPermissionKey = `print_${routeData.entity_name}`;
          const recordExportPermissionKey = `record_export_${routeData.entity_name}`;
          const emailResendPermissionKey = `email_resend_${routeData.entity_name}`;
          const generateVectorPermissionKey = `generate_vector_${routeData.entity_name}`;
          const childDetailsPermissionKey = `child_details_${routeData.entity_name}`;
          const popupCreatePermissionKey = `popup_add_${routeData.entity_name}`;
          const popupEditPermissionKey = `popup_edit_${routeData.entity_name}`;
          const popupDetailsPermissionKey = `popup_details_${routeData.entity_name}`;
          const resetPasswordPermissionKey = `reset_password_${routeData.entity_name}`;

          const idColumn = `${routeData.primary_table}.id`;
          const deletedAtColumn = `${routeData.primary_table}.status_id`;

          const targetPath = routeData.target.startsWith('/') ? routeData.target.slice(1) : routeData.target;

          const sortCol = [[idColumn, 'desc']];
          const searchAllCol = [
            {
              column_name: deletedAtColumn,
              value: 3,
              operator: '!=',
            },
          ];

          let finalAllCol: any = searchAllCol;
          if (routeData.entity_name == 'app_error_log') {
            finalAllCol = [
              ...searchAllCol,
              {
                column_name: 'request_logs.res_status',
                value: false,
                operator: '=',
              },
            ];
          } else if (routeData.entity_name == 'user') {
            finalAllCol = [
              ...searchAllCol,
              {
                value: ['super_admin', 'company_admin'],
                operator: 'NOT IN',
                column_name: 'users.role',
              },
            ];
          } else if (routeData.entity_name == 'master_entity') {
            finalAllCol = [
              ...searchAllCol,
              {
                column_name: `${routeData.primary_table}.entity_type`,
                value: 'help_page_module',
                operator: '!=',
              },
            ];
          }

          console.log(routeDataArray)
          const children = routeDataArray.reduce((acc: any, childRoute: any) => {
            if (childRoute.parent_id === routeData.id && childRoute.action_slug) {
              acc[childRoute.action_slug] = childRoute;
            }
            return acc;
          }, {});

          
          if (
            routeData.action_slug === 'child_details' &&
            Object.keys(children).length === 0
          ) {
            // Build ALL possible action_slug patterns:
            const possibleActionSlugs = action_types.map(
              (a: any) => `menu_${a.value}_${routeData.entity_name}`
            );
            console.log("possibleActionSlugs", possibleActionSlugs);
            // Filter matching menu items
            const matchedItems = routeDataArray.filter(
              (r: any) =>
                r.id !== routeData.id &&
                r.action_slug &&
                possibleActionSlugs.includes(r.name)
            );
         
            matchedItems.forEach((r: any) => {
              if (!children[r.action_slug]) {
                children[r.action_slug] = r;
              }
            });
         
            // Debug:
             console.log("Matched Actions =>", possibleActionSlugs);
             console.log("matchedItems", matchedItems)
          }


          const componentMap: any = {
            grid_builder_module: () => import('../../pages/master-list/master-list.component').then((m) => m.MasterListComponent),
            menu_module: () => import('../../pages/menu-mapping/menu-mapping.component').then((m) => m.MenuMappingComponent),
            static_page_builder_module: () => import('../../pages/static-page/static-page.component').then((m) => m.StaticPageComponent),
            form_builder_module: () => import('../../pages/form-builder/form-builder.component').then((m) => m.FormBuilderComponent),
            entity_user_role_map_module: () =>
              import('../../pages/user-role-permission/user-role-permission.component').then((m) => m.UserRolePermissionComponent),
            entity_form_module: () => import('../../pages/master-entity/master-entity.component').then((m) => m.MasterEntityComponent),
            about_lcp_form_module: () => import('../../pages/aboutlcp/aboutlcp.component').then((m) => m.AboutlcpComponent),
            ai_playground_module: () => import('../../pages/ai-playground/ai-playground.component').then((m) => m.AiPlaygroundComponent),
            query_builder_module: () => import('../../pages/query-builder/query-builder.component').then((m) => m.QueryBuilderComponent),
            language_contents_module: () => import('../../pages/language-mapping/language-mapping.component').then((m) => m.LanguageMappingComponent),
            job_builder_module: () => import('../../pages/job-page/job-page.component').then((m) => m.JobPageComponent),
            export_module: () => import('../../pages/job-page/job-page.component').then((m) => m.JobPageComponent),
            help_page_module: () => import('../../pages/documentation/documentation.component').then((m) => m.DocumentationComponent),
            configurations_module: () => import('../../pages/configuration/configuration.component').then((m) => m.ConfigurationComponent),
            user_configurations_module: () => import('../../pages/user-configuration/user-configuration.component').then((m) => m.UserConfigurationComponent),
            cron_setting_module: () => import('../../pages/cron-setting/cron-setting.component').then((m) => m.CronSettingComponent),
            import_module: () => import('../../pages/import-master/import-master.component').then((m) => m.ImportMasterComponent),
            import_template_module: () => import('../../pages/import-template/import-template.component').then((m) => m.ImportTemplateComponent),
            export_template_module: () => import('../../pages/export-template/export-template.component').then((m) => m.ExportTemplateComponent),
            import_job_detail_module: () => import('../../pages/import-job-details/import-job-details.component').then((m) => m.ImportJobDetailsComponent),
            policy_add_edit_module: () => import('../../pages/policy/policy.component').then((m) => m.PolicyComponent),
            user_role_policy_module: () => import('../../pages/user-role-policy/user-role-policy.component').then((m) => m.UserRolePolicyComponent),
            email_template_assignment_module: () =>
              import('../../pages/email-template-assignment/email-template-assignment.component').then((m) => m.EmailTemplateAssignmentComponent),
            approval_workflow_assignment_module: () =>
              import('../../pages/approval-workflow-assignment/approval-workflow-assignment.component').then((m) => m.ApprovalWorkflowAssignmentComponent),
            approval_requests_module: () => import('../../pages/approval-requests/approval-requests.component').then((m) => m.ApprovalRequestsComponent),
            approval_requests_tracking_module: () =>
              import('../../pages/approval-requests-tracking/approval-requests-tracking.component').then((m) => m.ApprovalRequestsTrackingComponent),
            child_process_setting_module: () =>
              import('../../pages/child-process-setting/child-process-setting.component').then((m) => m.ChildProcessSettingComponent),
            carousel_module: () => import('../../pages/carousel/carousel.component').then((m) => m.CarouselComponent),
            common_permission_module: () => import('../../pages/static-page/static-page.component').then((m) => m.StaticPageComponent),
          };

          const route: Route = {
            path: targetPath,
            loadComponent: componentMap[routeData.component_class_name] || null,
            title: routeData.entity_name,
            data: {
              pageInfo: {
                targetPath: targetPath,
                fullEntity: routeData.entity_name,
                title: routeData.entity_name,
                Listname: routeData.entity_name,
                action_slug: routeData.action_slug,
                draft_mode: routeData.draft_mode,
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
                  create: permissionListJSON[createPermissionKey] || false,
                  edit: permissionListJSON[editPermissionKey] || false,
                  delete: permissionListJSON[deletePermissionKey] || false,
                  export_excel: permissionListJSON[exportExcelPermissionKey] || false,
                  export_pdf: permissionListJSON[exportPDFPermissionKey] || false,
                  details: permissionListJSON[detailsPermissionKey] || false,
                  assign: permissionListJSON[assignPermissionKey] || false,
                  print: permissionListJSON[printPermissionKey] || false,
                  record_export: permissionListJSON[recordExportPermissionKey] || false,
                  email_resend: permissionListJSON[emailResendPermissionKey] || false,
                  generate_vector: permissionListJSON[generateVectorPermissionKey] || false,
                  child_details: permissionListJSON[childDetailsPermissionKey] || false,
                  popup_create: permissionListJSON[popupCreatePermissionKey] || false,
                  popup_edit: permissionListJSON[popupEditPermissionKey] || false,
                  popup_details: permissionListJSON[popupDetailsPermissionKey] || false,
                  reset_password: permissionListJSON[resetPasswordPermissionKey] || false,
                },
                children: children,
              },
              defaultPermission: permissionListJSON[viewPermissionKey] || false,
              defaultKey: viewPermissionKey,
            },
          };

          return route;
        });

      return dynamicRoutes;
    }
    return null;
  }

  addDynamicRoutes() {
    const resn = JSON.parse(this.localStore.getData('config'));
    if (resn) {
      this.changeFavicon(this.apiUrl + '/' + resn.favicon);
    }

    const user_data = this.localStore.getData('user_data') ? JSON.parse(this.localStore.getData('user_data')) : null;
    const unorgmenuList = user_data && user_data?.unorgmenuList ? user_data?.unorgmenuList : null;
    if (unorgmenuList) {
      this.updateRoutesWithGridPermission(unorgmenuList).subscribe((dynamicRoutes) => {
        const config = this.router.config;
        const appLayoutRoute = config.find((route) => route.path === '');

        if (appLayoutRoute && appLayoutRoute.children) {
          appLayoutRoute.children.unshift(...dynamicRoutes);
          this.router.resetConfig(config);
        }
      });
    }
  }
}
