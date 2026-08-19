import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { ManagerShellComponent } from './manager-shell.component';
import { ManagerOverviewComponent } from './pages/manager-overview.component';
import { ManagerCustomersComponent } from './pages/manager-customers.component';
import { ManagerApprovalsComponent } from './pages/manager-approvals.component';
import { ManagerReportsComponent } from './pages/manager-reports.component';
import { ManagerBillingComponent } from './pages/manager-billing.component';
import { ManagerLimitsComponent } from './pages/manager-limits.component';

const routes: Routes = [
  {
    path: '',
    component: ManagerShellComponent,
    children: [
      { path: '', component: ManagerOverviewComponent },
      { path: 'customers', component: ManagerCustomersComponent },
      { path: 'approvals', component: ManagerApprovalsComponent },
      { path: 'limits', component: ManagerLimitsComponent },
      { path: 'reports', component: ManagerReportsComponent },
      { path: 'billing', component: ManagerBillingComponent }
    ]
  }
];

@NgModule({
  declarations: [
    ManagerShellComponent,
    ManagerOverviewComponent,
    ManagerCustomersComponent,
    ManagerApprovalsComponent,
    ManagerLimitsComponent,
    ManagerReportsComponent,
    ManagerBillingComponent
  ],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class ManagerModule {}
