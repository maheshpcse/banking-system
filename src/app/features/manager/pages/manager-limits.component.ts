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
  readonly pageSize = 5;
  page = 1;

  constructor(private readonly admin: AdminService, private readonly alerts: AlertService) {}

  get pages(): number {
    return Math.max(1, Math.ceil(this.items.length / this.pageSize));
  }

  get paged(): User[] {
    const start = (this.page - 1) * this.pageSize;
    return this.items.slice(start, start + this.pageSize);
  }

  ngOnInit(): void {
    withShimmerDelay(this.admin.listLimitRequests(), SHIMMER_MS).subscribe({
      next: (items) => {
        this.items = items;
        this.page = 1;
        this.pageLoading = false;
      },
      error: async (err) => {
        this.pageLoading = false;
        await this.alerts.error(err?.error?.message || 'Unable to load limit requests');
      }
    });
  }

  prev(): void {
    if (this.page > 1) {
      this.page -= 1;
    }
  }

  next(): void {
    if (this.page < this.pages) {
      this.page += 1;
    }
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
    if (this.page > this.pages) {
      this.page = this.pages;
    }
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
    if (this.page > this.pages) {
      this.page = this.pages;
    }
  }
}
