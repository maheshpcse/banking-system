import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AdminRequestRow, AdminService } from '../../../core/services/admin.service';
import { AlertService } from '../../../core/services/alert.service';
import { withShimmerDelay } from '../../../core/utils/shimmer';

@Component({
  selector: 'app-admin-requests',
  templateUrl: './admin-requests.component.html',
  styleUrls: ['./admin-shared.scss']
})
export class AdminRequestsComponent implements OnInit, OnDestroy {
  requests: AdminRequestRow[] = [];
  pageLoading = true;
  private sub?: Subscription;

  constructor(private readonly admin: AdminService, private readonly alerts: AlertService) {}

  ngOnInit(): void {
    this.sub = this.admin.requests$.subscribe((rows) => (this.requests = rows));
    withShimmerDelay(this.admin.refreshRequests(), 500).subscribe({
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
      loadingText: 'Rejecting application…',
      action: async () => this.admin.rejectRequest(row.id, 'Additional verification required.'),
      successMessage: 'Application rejected.',
      errorMessage: (err) =>
        (err as { error?: { message?: string } })?.error?.message || 'Unable to reject application'
    });
  }
}
