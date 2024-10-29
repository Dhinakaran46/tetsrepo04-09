import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { Router, Route, Routes } from '@angular/router';
import { MasterListComponent } from '../../pages/master-list/master-list.component';
import { MenuMappingComponent } from '../../pages/menu-mapping/menu-mapping.component';
import { StaticPageComponent } from '../../pages/static-page/static-page.component';
import { JobPageComponent } from '../../pages/job-page/job-page.component';
import { FormBuilderComponent } from '../../pages/form-builder/form-builder.component';

import { LocalStorageService } from './local-storage.service';
import { BehaviorSubject, Observable } from 'rxjs';
import { MasterEntityComponent } from '../../pages/master-entity/master-entity.component';
import { LanguageMappingComponent } from '../../pages/language-mapping/language-mapping.component';
import { DocumentationComponent } from '../../pages/documentation/documentation.component';
import { ConfigurationComponent } from '../../pages/configuration/configuration.component';
import { environment } from '../../../../environments/environment';
import { UserRolePermissionComponent } from '../../pages/user-role-permission/user-role-permission.component';
import { ImportMasterComponent } from '../../pages/import-master/import-master.component';

@Injectable({
  providedIn: 'root',
})
export class RouteUpdateService {
  apiUrl = environment.apiUrl;
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
              //console.log(routeData);
              //const slugParts = routeData.entity_name.split('_grid_');
              const viewPermissionKey = `view_${routeData.entity_name}`;

              const createPermissionKey = `add_${routeData.entity_name}`;
              const editPermissionKey = `edit_${routeData.entity_name}`;
              const deletePermissionKey = `delete_${routeData.entity_name}`;
              const exportPermissionKey = `export_${routeData.entity_name}`;
              const detailsPermissionKey = `details_${routeData.entity_name}`;
              const assignPermissionKey = `assign_${routeData.entity_name}`;
              const printPermissionKey = `print_${routeData.entity_name}`;
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
              const componentMap: any = {
                grid_builder_module: MasterListComponent,
                menu_module: MenuMappingComponent,
                static_page_builder_module: StaticPageComponent,
                form_builder_module: FormBuilderComponent,

                entity_user_role_map_module: UserRolePermissionComponent,
                entity_form_module: MasterEntityComponent,
                language_contents_module: LanguageMappingComponent,
                job_builder_module: JobPageComponent,
                help_page_module: DocumentationComponent,
                configurations_module: ConfigurationComponent,
                import_module: ImportMasterComponent,
              };

              const route: Route = {
                path: targetPath,
                component: componentMap[routeData.component_class_name],
                title: routeData.entity_name,
                data: {
                  pageInfo: {
                    targetPath: targetPath,
                    fullEntity: routeData.entity_name,
                    title: routeData.entity_name,
                    Listname: routeData.entity_name,
                    action_slug: routeData.action_slug,
                    ListQuery: {
                      print_query: true,
                      company_id: 0,
                      entity_name: routeData.entity_name,
                      start_index: 0,
                      limit_range: 10,
                      sort_columns: sortCol,
                      search_all: finalAllCol,
                      search_any: [],
                    },
                    enable_row_checkbox: false,
                    permissions: {
                      create: permissionListJSON[createPermissionKey] || false,
                      edit: permissionListJSON[editPermissionKey] || false,
                      delete: permissionListJSON[deletePermissionKey] || false,
                      export: permissionListJSON[exportPermissionKey] || false,
                      details: permissionListJSON[detailsPermissionKey] || false,
                      assign: permissionListJSON[assignPermissionKey] || false,
                      print: permissionListJSON[printPermissionKey] || false,
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

          // setTimeout(() => {
          //   const routes1 = this.router.config;
          //   this.extractRoutes(routes1);
          //   setTimeout(() => {
          //     console.log('routes....', this.routeList);
          //   }, 5000);
          // }, 2000);
        }
      });
    }
  }
}
