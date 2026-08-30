import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { AdminPagesModule } from '../admin/admin-pages.module';
import { AccountSettingsModule } from '../settings/settings.module';
import { SuperAdminShellComponent } from './super-admin-shell.component';
import { SaIconModule } from './icons/sa-icon.module';
import { SuperAdminDataLabComponent } from './pages/super-admin-data-lab.component';
import { AdminOverviewComponent } from '../admin/pages/admin-overview.component';
import { AdminCustomersComponent } from '../admin/pages/admin-customers.component';
import { AdminRequestsComponent } from '../admin/pages/admin-requests.component';
import { AdminStaffComponent } from '../admin/pages/admin-staff.component';
import { AdminNotificationsComponent } from '../admin/pages/admin-notifications.component';
import { AccountSettingsComponent } from '../settings/account-settings.component';

const routes: Routes = [
  {
    path: '',
    component: SuperAdminShellComponent,
    children: [
      { path: '', component: AdminOverviewComponent },
      { path: 'customers', component: AdminCustomersComponent },
      { path: 'requests', component: AdminRequestsComponent },
      { path: 'staff', component: AdminStaffComponent },
      { path: 'notifications', component: AdminNotificationsComponent },
      { path: 'data-lab', component: SuperAdminDataLabComponent },
      { path: 'account', component: AccountSettingsComponent }
    ]
  }
];

@NgModule({
  declarations: [SuperAdminShellComponent, SuperAdminDataLabComponent],
  imports: [
    SharedModule,
    AdminPagesModule,
    AccountSettingsModule,
    SaIconModule,
    RouterModule.forChild(routes)
  ]
})
export class SuperAdminModule {}
