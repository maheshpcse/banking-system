import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { AdminRequestRow, AdminService } from '../../../core/services/admin.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AlertService } from '../../../core/services/alert.service';
import { withShimmerDelay } from '../../../core/utils/shimmer';

@Component({
  selector: 'app-manager-overview',
  templateUrl: './manager-overview.component.html',
  styleUrls: ['./manager-shared.scss']
})
export class ManagerOverviewComponent implements OnInit {
  pageLoading = true;
  customers = 0;
  pending = 0;
  unread = 0;

  constructor(
    private readonly admin: AdminService,
    private readonly notifications: NotificationService,
    private readonly alerts: AlertService
  ) {}

  ngOnInit(): void {
    withShimmerDelay(
      forkJoin({
        customers: this.admin.refreshCustomers(1, 5),
        requests: this.admin.refreshRequests()
      }),
      500
    ).subscribe({
      next: ({ customers, requests }) => {
        this.customers = customers.pagination.total;
        this.pending = requests.filter((r: AdminRequestRow) => r.status === 'under_review').length;
        this.unread = this.notifications.unreadCount;
        this.pageLoading = false;
      },
      error: async (err: { error?: { message?: string } }) => {
        this.pageLoading = false;
        await this.alerts.error(err?.error?.message || 'Unable to load manager desk');
      }
    });
  }
}
