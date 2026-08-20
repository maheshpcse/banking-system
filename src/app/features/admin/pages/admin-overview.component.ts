import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AlertService } from '../../../core/services/alert.service';
import { SHIMMER_MS, withShimmerDelay } from '../../../core/utils/shimmer';

@Component({
  selector: 'app-admin-overview',
  templateUrl: './admin-overview.component.html',
  styleUrls: ['./admin-shared.scss']
})
export class AdminOverviewComponent implements OnInit {
  customers = 0;
  managers = 0;
  admins = 0;
  staffPending = 0;
  pending = 0;
  unread = 0;
  pageLoading = true;

  constructor(
    private readonly admin: AdminService,
    private readonly auth: AuthService,
    private readonly notifications: NotificationService,
    private readonly alerts: AlertService
  ) {}

  get isSuperAdmin(): boolean {
    return !!this.auth.currentUser?.isSuperAdmin;
  }

  ngOnInit(): void {
    withShimmerDelay(
      forkJoin({
        customers: this.admin.refreshCustomers(1, 5, this.isSuperAdmin ? { scope: 'all' } : undefined),
        requests: this.admin.refreshRequests(),
        analytics: this.admin.getAnalytics(),
        notifications: this.notifications.refresh()
      }),
      SHIMMER_MS
    ).subscribe({
      next: ({ customers, requests, analytics }) => {
        this.customers = analytics?.customers?.total ?? customers.pagination.total;
        this.managers = (analytics as { staff?: { managers?: number } })?.staff?.managers || 0;
        this.admins = (analytics as { staff?: { admins?: number } })?.staff?.admins || 0;
        this.staffPending = (analytics as { staff?: { pending?: number } })?.staff?.pending || 0;
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
