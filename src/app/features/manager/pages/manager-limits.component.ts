import { Component, OnInit } from '@angular/core';
import { User } from '../../../core/models/banking.models';
import { AdminService } from '../../../core/services/admin.service';
import { AlertService } from '../../../core/services/alert.service';
import { SHIMMER_MS, shimmerPause, withShimmerDelay } from '../../../core/utils/shimmer';

type LimitTab = 'pending' | 'approved' | 'rejected';

@Component({
  selector: 'app-manager-limits',
  templateUrl: './manager-limits.component.html',
  styleUrls: ['./manager-shared.scss']
})
export class ManagerLimitsComponent implements OnInit {
  pageLoading = true;
  listLoading = false;
  items: User[] = [];
  status: LimitTab = 'pending';
  readonly pageSize = 5;
  page = 1;

  readonly tabs: Array<{ id: LimitTab; label: string }> = [
    { id: 'pending', label: 'Pending' },
    { id: 'approved', label: 'Approved' },
    { id: 'rejected', label: 'Rejected' }
  ];

  constructor(private readonly admin: AdminService, private readonly alerts: AlertService) {}

  get pages(): number {
    return Math.max(1, Math.ceil(this.items.length / this.pageSize));
  }

  get paged(): User[] {
    const start = (this.page - 1) * this.pageSize;
    return this.items.slice(start, start + this.pageSize);
  }

  ngOnInit(): void {
    this.load(true);
  }

  setStatus(status: LimitTab): void {
    if (this.status === status) {
      return;
    }
    this.status = status;
    this.load(false);
  }

  prev(): void {
    if (this.page <= 1) {
      return;
    }
    this.flashPage(() => {
      this.page -= 1;
    });
  }

  next(): void {
    if (this.page >= this.pages) {
      return;
    }
    this.flashPage(() => {
      this.page += 1;
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
    this.load(false);
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
    this.load(false);
  }

  requestStatus(user: User): string {
    return String(user.pendingLimitRequest?.status || 'none');
  }

  private load(initial: boolean): void {
    if (initial) {
      this.pageLoading = true;
    } else {
      this.listLoading = true;
    }
    withShimmerDelay(this.admin.listLimitRequests(this.status), SHIMMER_MS).subscribe({
      next: (items) => {
        this.items = items;
        this.page = 1;
        this.pageLoading = false;
        this.listLoading = false;
      },
      error: async (err) => {
        this.pageLoading = false;
        this.listLoading = false;
        await this.alerts.error(err?.error?.message || 'Unable to load limit requests');
      }
    });
  }

  private flashPage(mutate: () => void): void {
    this.listLoading = true;
    shimmerPause(SHIMMER_MS).subscribe(() => {
      mutate();
      this.listLoading = false;
    });
  }
}
