import { Component, OnInit } from '@angular/core';
import { User } from '../../../core/models/banking.models';
import { AdminService } from '../../../core/services/admin.service';
import { AlertService } from '../../../core/services/alert.service';
import { SHIMMER_MS, withShimmerDelay } from '../../../core/utils/shimmer';

@Component({
  selector: 'app-manager-limits',
  templateUrl: './manager-limits.component.html',
  styleUrls: ['./manager-shared.scss']
})
export class ManagerLimitsComponent implements OnInit {
  pageLoading = true;
  items: User[] = [];

  constructor(private readonly admin: AdminService, private readonly alerts: AlertService) {}

  ngOnInit(): void {
    withShimmerDelay(this.admin.listLimitRequests(), SHIMMER_MS).subscribe({
      next: (items) => {
        this.items = items;
        this.pageLoading = false;
      },
      error: async (err) => {
        this.pageLoading = false;
        await this.alerts.error(err?.error?.message || 'Unable to load limit requests');
      }
    });
  }

  async approve(user: User): Promise<void> {
    await this.alerts.confirmAction({
      text: `Approve new daily limits for ${user.fullName}?`,
      confirmText: 'Approve',
      loadingText: 'Applying limits…',
      action: async () => this.admin.approveLimitRequest(user.id, 'Approved by manager'),
      successMessage: 'Limits updated for the customer.',
      errorMessage: (err) =>
        (err as { error?: { message?: string } })?.error?.message || 'Unable to approve limits'
    });
    this.items = this.admin.listLimitRequestsSnapshot();
  }

  async reject(user: User): Promise<void> {
    await this.alerts.confirmAction({
      text: `Reject limit change for ${user.fullName}?`,
      confirmText: 'Reject',
      loadingText: 'Updating request…',
      action: async () => this.admin.rejectLimitRequest(user.id, 'Rejected by manager'),
      successMessage: 'Limit request rejected.',
      errorMessage: (err) =>
        (err as { error?: { message?: string } })?.error?.message || 'Unable to reject limits'
    });
    this.items = this.admin.listLimitRequestsSnapshot();
  }
}
