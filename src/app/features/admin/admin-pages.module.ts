import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { AdminOverviewComponent } from './pages/admin-overview.component';
import { AdminCustomersComponent } from './pages/admin-customers.component';
import { AdminRequestsComponent } from './pages/admin-requests.component';
import { AdminStaffComponent } from './pages/admin-staff.component';
import { AdminNotificationsComponent } from './pages/admin-notifications.component';

/**
 * Admin page components, shared between the mint Banking `/admin` shell
 * and the Apex Console `/console` shell (Super Admin only). Keeping the
 * declarations here lets both shells reuse the exact same components/TS
 * while each shell applies its own theme on top.
 */
@NgModule({
  declarations: [
    AdminOverviewComponent,
    AdminCustomersComponent,
    AdminRequestsComponent,
    AdminStaffComponent,
    AdminNotificationsComponent
  ],
  imports: [SharedModule],
  exports: [
    AdminOverviewComponent,
    AdminCustomersComponent,
    AdminRequestsComponent,
    AdminStaffComponent,
    AdminNotificationsComponent
  ]
})
export class AdminPagesModule {}
