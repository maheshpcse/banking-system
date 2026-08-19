import { Component, OnInit } from '@angular/core';
import { User } from '../../../core/models/banking.models';
import { AdminService } from '../../../core/services/admin.service';
import { AlertService } from '../../../core/services/alert.service';
import { withShimmerDelay } from '../../../core/utils/shimmer';
import { formatStatusLabel } from '../../../core/utils/status-label';

type StaffFilter = 'all' | 'pending_approval' | 'active' | 'rejected';

@Component({
  selector: 'app-admin-staff',
  templateUrl: './admin-staff.component.html',
  styleUrls: ['./admin-shared.scss']
})
export class AdminStaffComponent implements OnInit {
  pageLoading = true;
  items: User[] = [];
  statusFilter: StaffFilter = 'all';
  readonly filters: { id: StaffFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'pending_approval', label: 'Pending' },
    { id: 'active', label: 'Active' },
    { id: 'rejected', label: 'Rejected' }
  ];
  readonly formatStatus = formatStatusLabel;

  constructor(private readonly admin: AdminService, private readonly alerts: AlertService) {}

  get filtered(): User[] {
    if (this.statusFilter === 'all') {
      return this.items;
    }
    return this.items.filter((u) => (u.staffStatus || 'active') === this.statusFilter);
  }

  ngOnInit(): void {
    this.reload(true);
  }

  setFilter(id: StaffFilter): void {
    this.statusFilter = id;
  }

  reload(initial = false): void {
    if (initial) {
      this.pageLoading = true;
    }
    const request$ = initial
      ? withShimmerDelay(this.admin.listStaff('all'), 450)
      : this.admin.listStaff('all');
    request$.subscribe({
      next: (items) => {
        this.items = items;
        this.pageLoading = false;
      },
      error: async (err) => {
        this.pageLoading = false;
        await this.alerts.error(
          err?.error?.message || 'Unable to load staff. Super Admin access is required.'
        );
      }
    });
  }

  async approve(user: User): Promise<void> {
    await this.alerts.confirmAction({
      text: `Activate ${user.fullName} (${this.formatStatus(user.role)}) for portal sign-in?`,
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
