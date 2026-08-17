import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { AdminService } from '../../../core/services/admin.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AlertService } from '../../../core/services/alert.service';
import { withShimmerDelay } from '../../../core/utils/shimmer';

@Component({
  selector: 'app-admin-overview',
  templateUrl: './admin-overview.component.html',
  styleUrls: ['./admin-shared.scss']
})
export class AdminOverviewComponent implements OnInit {
  customers = 0;
  pending = 0;
  unread = 0;
  pageLoading = true;

  constructor(
    private readonly admin: AdminService,
    private readonly notifications: NotificationService,
    private readonly alerts: AlertService
  ) {}

  ngOnInit(): void {
    withShimmerDelay(
      forkJoin({
        customers: this.admin.refreshCustomers(1, 5),
        requests: this.admin.refreshRequests(),
        notifications: this.notifications.refresh()
      }),
      500
    ).subscribe({
      next: ({ customers, requests }) => {
        this.customers = customers.pagination.total;
        this.pending = requests.filter((r) => r.status === 'under_review').length;
        this.unread = this.notifications.unreadCount;
        this.pageLoading = false;
      },
      error: async (err) => {
        this.pageLoading = false;
        await this.alerts.error(err?.error?.message || 'Unable to load operations desk');
      }
    });
  }
}
