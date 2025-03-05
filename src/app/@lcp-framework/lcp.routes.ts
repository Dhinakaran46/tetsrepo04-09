import { Routes } from '@angular/router';
import { AppLayout } from '../layouts/app-layout';
import { AuthLayout } from '../layouts/auth-layout';
import { CoverLoginComponent } from './pages/login/login.component';
import { authGuard } from './guards/auth.guard';
import { ProfileComponent } from './pages/profile/profile.component';
import { ChangePwdComponent } from './pages/changepwd/changepwd.component';
import { ForgetpwdComponent } from './pages/forgetpwd/forgetpwd.component';
import { ResetpwdComponent } from './pages/forgetpwd/resetpwd/resetpwd.component';
import { NotFoundComponent } from './components/not-found/not-found.component';
import { AccessDeniedComponent } from './components/access-denied/access-denied.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { loginGuard } from './guards/login.guard';
import { permissionGuardFactory } from './guards/permission.guard';
import { ImportMasterComponent } from './pages/import-master/import-master.component';
import { DocumentationComponent } from './pages/documentation/documentation.component';
import { ImportConfirmDeactivateGuard } from './guards/impotrt-confirm-deactivate.guard';
import { ExampleClientDatatableComponent } from './pages/example-client-datatable/example-client-datatable.component';
import { EmailTemplateAssignmentComponent } from './pages/email-template-assignment/email-template-assignment.component';
export const routes: Routes = [
  {
    path: 'not-found',
    component: NotFoundComponent,
    title: 'Not Found',
  },

  {
    path: 'documentation',
    component: DocumentationComponent,
    canActivate: [authGuard],
    canActivateChild: [permissionGuardFactory()],
    title: 'Documentation',
  },
  {
    path: '',
    component: AppLayout,
    canActivate: [authGuard],
    canActivateChild: [permissionGuardFactory()],
    children: [
      {
        path: '',
        component: DashboardComponent,
        title: 'Dashboard',
        data: {
          defaultPermission: true,
        },
      },
      {
        path: 'dashboard',
        component: DashboardComponent,
        title: 'Dashboard',
        data: {
          defaultPermission: true,
        },
      },
      {
        path: 'profile',
        component: ProfileComponent,
        title: 'Profile',
        data: {
          defaultPermission: true,
        },
      },
      {
        path: 'change-password',
        component: ChangePwdComponent,
        title: 'Change Password',
        data: {
          defaultPermission: true,
        },
      },
      {
        path: 'access-denied',
        component: AccessDeniedComponent,
        title: 'Access Denied',
        data: {
          defaultPermission: true,
        },
      },
      // {
      //   path: 'import',
      //   component: ImportMasterComponent,
      //   canDeactivate: [ImportConfirmDeactivateGuard],
      //   title: 'Import Master',
      //   data: {
      //     defaultPermission: true,
      //   },
      // },
      {
        path: 'exampletable',
        component: ExampleClientDatatableComponent,

        title: 'Example Client DataTable',
        data: {
          defaultPermission: true,
        },
      },
    ],
  },
  {
    path: '',
    component: AuthLayout,
    canActivate: [loginGuard],
    children: [
      {
        path: 'login',
        component: CoverLoginComponent,
        title: 'Login',
      },
      {
        path: 'forget-password',
        component: ForgetpwdComponent,
        title: 'Forget Password',
      },
      {
        path: 'reset-password/:uuid/:id',
        component: ResetpwdComponent,
        title: 'Reset password',
      },
    ],
  },
  { path: '**', redirectTo: '/not-found', pathMatch: 'full' },
];
