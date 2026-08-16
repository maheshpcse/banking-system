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
    const ok = await this.alerts.confirm({
      text: `Approve account opening for ${row.fullName}? This issues an account number and activates the ATM card.`,
      confirmText: 'Approve'
    });
    if (!ok) return;
    const user = this.admin.approveRequest(row.id);
    await this.alerts.success(user?.accountNumber ? `Issued ${user.accountNumber}` : 'Approved.');
  }

  async reject(row: AdminRequestRow): Promise<void> {
    const ok = await this.alerts.confirm({
      text: `Reject application for ${row.fullName}?`,
      confirmText: 'Reject'
    });
    if (!ok) return;
    this.admin.rejectRequest(row.id, 'Additional verification required.');
    await this.alerts.warning('Application rejected.');
  }
}
