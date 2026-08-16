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
    this.admin.refreshCustomers().subscribe((users) => {
      this.customers = users.filter((u) => (u.role || 'customer') === 'customer').length;
    });
    this.admin.refreshRequests().subscribe((rows) => {
      this.pending = rows.filter((r) => r.status === 'under_review').length;
    });
    this.notifications.refresh().subscribe(() => {
      this.unread = this.notifications.unreadCount;
    });
  }
}
