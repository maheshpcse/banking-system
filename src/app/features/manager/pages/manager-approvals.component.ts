import { Component } from '@angular/core';
import { AdminRequestsComponent } from '../../admin/pages/admin-requests.component';
import { AdminService } from '../../../core/services/admin.service';
import { AlertService } from '../../../core/services/alert.service';

@Component({
  selector: 'app-manager-approvals',
  templateUrl: '../../admin/pages/admin-requests.component.html',
  styleUrls: ['../../admin/pages/admin-shared.scss']
})
export class ManagerApprovalsComponent extends AdminRequestsComponent {
  constructor(admin: AdminService, alerts: AlertService) {
    super(admin, alerts);
  }
}
