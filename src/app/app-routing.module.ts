import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/auth.guard';

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
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
  { path: '**', redirectTo: 'dashboard' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
