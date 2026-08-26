import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/auth.guard';
import { RoleGuard } from './core/role.guard';
import { BillingOperatorGuard } from './core/billing-operator.guard';

const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./features/home/home.module').then((m) => m.HomeModule)
  },
  {
    path: 'novabill',
    loadChildren: () => import('./features/novabill/novabill.module').then((m) => m.NovabillModule)
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.module').then((m) => m.AuthModule)
  },
  {
    path: 'dashboard',
    canActivate: [AuthGuard],
    loadChildren: () => import('./features/dashboard/dashboard.module').then((m) => m.DashboardModule)
  },
  {
    path: 'transfer',
    canActivate: [AuthGuard],
    loadChildren: () => import('./features/transfer/transfer.module').then((m) => m.TransferModule)
  },
  {
    path: 'transactions',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./features/transactions/transactions.module').then((m) => m.TransactionsModule)
  },
  {
    path: 'settings',
    canActivate: [AuthGuard],
    loadChildren: () => import('./features/settings/settings.module').then((m) => m.SettingsModule)
  },
  {
    path: 'notifications',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./features/notifications/notifications.module').then((m) => m.NotificationsModule)
  },
  {
    path: 'admin',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['admin'] },
    loadChildren: () => import('./features/admin/admin.module').then((m) => m.AdminModule)
  },
  {
    path: 'manager',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['manager'], allowSuperAdmin: true },
    loadChildren: () => import('./features/manager/manager.module').then((m) => m.ManagerModule)
  },
  {
    path: 'billing',
    canActivate: [AuthGuard, BillingOperatorGuard],
    loadChildren: () =>
      import('./features/billing-app/billing-app.module').then((m) => m.BillingAppModule)
  },
  {
    path: 'error',
    loadChildren: () => import('./features/error/error.module').then((m) => m.ErrorModule)
  },
  { path: '**', redirectTo: 'error/404' }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      scrollPositionRestoration: 'enabled',
      anchorScrolling: 'enabled',
      scrollOffset: [0, 0],
      onSameUrlNavigation: 'reload'
    })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
