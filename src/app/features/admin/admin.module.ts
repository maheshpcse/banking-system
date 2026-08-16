import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { AdminShellComponent } from './admin-shell.component';
import { AdminOverviewComponent } from './pages/admin-overview.component';
import { AdminCustomersComponent } from './pages/admin-customers.component';
import { AdminRequestsComponent } from './pages/admin-requests.component';
import { AdminNotificationsComponent } from './pages/admin-notifications.component';

const routes: Routes = [
  {
    path: '',
    component: AdminShellComponent,
    children: [
      { path: '', component: AdminOverviewComponent },
      { path: 'customers', component: AdminCustomersComponent },
      { path: 'requests', component: AdminRequestsComponent },
      { path: 'notifications', component: AdminNotificationsComponent }
    ]
  }
];

@NgModule({
  declarations: [
    AdminShellComponent,
    AdminOverviewComponent,
    AdminCustomersComponent,
    AdminRequestsComponent,
    AdminNotificationsComponent
  ],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class AdminModule {}
