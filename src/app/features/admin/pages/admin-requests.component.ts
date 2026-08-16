import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AdminRequestRow, AdminService } from '../../../core/services/admin.service';
import { AlertService } from '../../../core/services/alert.service';

@Component({
  selector: 'app-admin-requests',
  templateUrl: './admin-requests.component.html',
  styleUrls: ['./admin-shared.scss']
})
export class AdminRequestsComponent implements OnInit, OnDestroy {
  requests: AdminRequestRow[] = [];
  private sub?: Subscription;

  constructor(private readonly admin: AdminService, private readonly alerts: AlertService) {}

  ngOnInit(): void {
    this.sub = this.admin.requests$.subscribe((rows) => (this.requests = rows));
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
      successMessage: (user) => (user?.accountNumber ? `Issued ${user.accountNumber}` : 'Approved.')
    });
  }

  async reject(row: AdminRequestRow): Promise<void> {
    const outcome = await this.alerts.confirmAction({
      text: `Reject application for ${row.fullName}?`,
      confirmText: 'Reject',
      loadingText: 'Rejecting application…',
      action: async () => {
        this.admin.rejectRequest(row.id, 'Additional verification required.');
        return true;
      },
      successMessage: 'Application rejected.'
    });
    // success modal already shown; keep title Success (common titles)
    void outcome;
  }
}
