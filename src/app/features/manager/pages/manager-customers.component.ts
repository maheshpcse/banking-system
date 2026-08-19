import { Component } from '@angular/core';
import { AdminCustomersComponent } from '../../admin/pages/admin-customers.component';
import { AdminService } from '../../../core/services/admin.service';
import { AlertService } from '../../../core/services/alert.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-manager-customers',
  templateUrl: '../../admin/pages/admin-customers.component.html',
  styleUrls: ['../../admin/pages/admin-shared.scss']
})
export class ManagerCustomersComponent extends AdminCustomersComponent {
  constructor(admin: AdminService, alerts: AlertService, auth: AuthService) {
    super(admin, alerts, auth);
  }
}
