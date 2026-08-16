import { Component, OnInit } from '@angular/core';
import { AdminService } from '../../../core/services/admin.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-admin-overview',
  templateUrl: './admin-overview.component.html',
  styleUrls: ['./admin-shared.scss']
})
export class AdminOverviewComponent implements OnInit {
  customers = 0;
  pending = 0;
  unread = 0;

  constructor(private readonly admin: AdminService, private readonly notifications: NotificationService) {}

  ngOnInit(): void {
    this.customers = this.admin.listUsers().filter((u) => (u.role || 'customer') === 'customer').length;
    this.pending = this.admin.listRequests().filter((r) => r.status === 'under_review').length;
    this.unread = this.notifications.unreadCount;
  }
}
