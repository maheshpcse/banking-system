import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AdminRequestRow, AdminService } from '../../../core/services/admin.service';
import { AlertService } from '../../../core/services/alert.service';
import { SHIMMER_MS, shimmerPause, withShimmerDelay } from '../../../core/utils/shimmer';
import { formatStatusLabel } from '../../../core/utils/status-label';

type RequestFilter = 'all' | 'under_review' | 'active' | 'rejected' | 'blocked' | 'deactivated';

@Component({
  selector: 'app-admin-requests',
  templateUrl: './admin-requests.component.html',
  styleUrls: ['./admin-shared.scss']
})
export class AdminRequestsComponent implements OnInit, OnDestroy {
  requests: AdminRequestRow[] = [];
  pageLoading = true;
  listLoading = false;
  statusFilter: RequestFilter = 'all';
  readonly filters: { id: RequestFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'under_review', label: 'Under Review' },
    { id: 'active', label: 'Active' },
    { id: 'rejected', label: 'Rejected' },
    { id: 'blocked', label: 'Blocked' },
    { id: 'deactivated', label: 'Deactivated' }
  ];
  readonly formatStatus = formatStatusLabel;
  private sub?: Subscription;

  constructor(private readonly admin: AdminService, private readonly alerts: AlertService) {}

  get filtered(): AdminRequestRow[] {
    if (this.statusFilter === 'all') {
      return this.requests;
    }
    if (this.statusFilter === 'active') {
      return this.requests.filter((r) => r.status === 'active' || r.status === 'approved');
    }
    return this.requests.filter((r) => r.status === this.statusFilter);
  }

  ngOnInit(): void {
    this.sub = this.admin.requests$.subscribe((rows) => (this.requests = rows));
    withShimmerDelay(this.admin.refreshRequests(), SHIMMER_MS).subscribe({
      next: () => {
        this.pageLoading = false;
      },
      error: async (err) => {
        this.pageLoading = false;
        await this.alerts.error(err?.error?.message || 'Unable to load opening requests');
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  setFilter(id: RequestFilter): void {
    if (this.statusFilter === id) {
      return;
    }
    this.statusFilter = id;
    this.listLoading = true;
    shimmerPause(SHIMMER_MS).subscribe(() => {
      this.listLoading = false;
    });
  }

  async approve(row: AdminRequestRow): Promise<void> {
    await this.alerts.confirmAction({
      text: `Approve account opening for ${row.fullName}? This issues an account number and activates the ATM card.`,
      confirmText: 'Approve',
      loadingText: 'Issuing account number…',
      action: async () => this.admin.approveRequest(row.id),
      successMessage: (user) =>
        user?.accountNumber
          ? `Issued ••••${String(user.accountNumber).slice(-4)}`
          : 'Approved.',
      errorMessage: (err) =>
        (err as { error?: { message?: string } })?.error?.message || 'Unable to approve application'
    });
  }

  async reject(row: AdminRequestRow): Promise<void> {
    await this.alerts.confirmAction({
      text: `Reject application for ${row.fullName}?`,
      confirmText: 'Reject',
      loadingText: 'Rejecting…',
      action: async () => this.admin.rejectRequest(row.id),
      successMessage: 'Application rejected.',
      errorMessage: (err) =>
        (err as { error?: { message?: string } })?.error?.message || 'Unable to reject application'
    });
  }
}
