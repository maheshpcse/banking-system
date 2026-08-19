import { Component, OnInit } from '@angular/core';
import { User } from '../../../core/models/banking.models';
import { AdminService } from '../../../core/services/admin.service';
import { AlertService } from '../../../core/services/alert.service';
import { withShimmerDelay } from '../../../core/utils/shimmer';

@Component({
  selector: 'app-admin-staff',
  templateUrl: './admin-staff.component.html',
  styleUrls: ['./admin-shared.scss']
})
export class AdminStaffComponent implements OnInit {
  pageLoading = true;
  items: User[] = [];

  constructor(private readonly admin: AdminService, private readonly alerts: AlertService) {}

  ngOnInit(): void {
    withShimmerDelay(this.admin.listStaffPending(), 450).subscribe({
      next: (items) => {
        this.items = items;
        this.pageLoading = false;
      },
      error: async (err) => {
        this.pageLoading = false;
        await this.alerts.error(
          err?.error?.message || 'Unable to load pending staff. Super Admin access is required.'
        );
      }
    });
  }

  async approve(user: User): Promise<void> {
    await this.alerts.confirmAction({
      text: `Activate ${user.fullName} (${user.role}) for portal sign-in?`,
      confirmText: 'Activate',
      loadingText: 'Activating staff…',
      action: async () => this.admin.approveStaff(user.id),
      successMessage: 'Staff member activated.',
      errorMessage: (err) =>
        (err as { error?: { message?: string } })?.error?.message || 'Unable to activate staff'
    });
    this.items = this.admin.listStaffPendingSnapshot();
  }

  async reject(user: User): Promise<void> {
    await this.alerts.confirmAction({
      text: `Decline registration for ${user.fullName}? They will not be able to sign in.`,
      confirmText: 'Decline',
      loadingText: 'Updating registration…',
      action: async () => this.admin.rejectStaff(user.id),
      successMessage: 'Staff registration declined.',
      errorMessage: (err) =>
        (err as { error?: { message?: string } })?.error?.message || 'Unable to decline staff'
    });
    this.items = this.admin.listStaffPendingSnapshot();
  }
}
