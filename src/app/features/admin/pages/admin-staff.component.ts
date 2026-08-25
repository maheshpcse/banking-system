import { Component, OnInit } from '@angular/core';
import { AccountStatus, User } from '../../../core/models/banking.models';
import { AdminService } from '../../../core/services/admin.service';
import { AlertService } from '../../../core/services/alert.service';
import { SHIMMER_MS, shimmerPause, withShimmerDelay } from '../../../core/utils/shimmer';
import { formatStatusLabel } from '../../../core/utils/status-label';

type StaffFilter = 'all' | 'pending_approval' | 'active' | 'rejected';

@Component({
  selector: 'app-admin-staff',
  templateUrl: './admin-staff.component.html',
  styleUrls: ['./admin-shared.scss']
})
export class AdminStaffComponent implements OnInit {
  pageLoading = true;
  listLoading = false;
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
    if (this.statusFilter === id) {
      return;
    }
    this.statusFilter = id;
    this.listLoading = true;
    shimmerPause(SHIMMER_MS).subscribe(() => {
      this.listLoading = false;
    });
  }

  reload(initial = false): void {
    if (initial) {
      this.pageLoading = true;
    } else {
      this.listLoading = true;
    }
    withShimmerDelay(this.admin.listStaff('all'), SHIMMER_MS).subscribe({
      next: (items) => {
        this.items = items;
        this.pageLoading = false;
        this.listLoading = false;
      },
      error: async (err) => {
        this.pageLoading = false;
        this.listLoading = false;
        await this.alerts.error(
          err?.error?.message || 'Unable to load staff. Super Admin access is required.'
        );
      }
    });
  }

  isActiveStaff(user: User): boolean {
    const staff = user.staffStatus || 'active';
    const account = user.accountStatus || 'active';
    return staff === 'active' && account !== 'deleted';
  }

  canDeactivateStaff(user: User): boolean {
    return this.isActiveStaff(user) && user.accountStatus !== 'blocked';
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
      loadingText: 'Declining…',
      action: async () => this.admin.rejectStaff(user.id),
      successMessage: 'Staff registration declined.',
      errorMessage: (err) =>
        (err as { error?: { message?: string } })?.error?.message || 'Unable to decline staff'
    });
    this.items = this.admin.listStaffPendingSnapshot();
  }

  async setStaffStatus(user: User, status: AccountStatus): Promise<void> {
    await this.alerts.confirmAction({
      text: `Set ${user.fullName} to ${this.formatStatus(status)}?`,
      confirmText: 'Update',
      loadingText: 'Updating status…',
      action: async () => this.admin.setStaffStatus(user.id, status),
      successMessage: () => `Staff status updated to ${this.formatStatus(status)}.`,
      errorMessage: (err) =>
        (err as { error?: { message?: string } })?.error?.message || 'Unable to update staff status'
    });
    this.items = this.admin.listStaffPendingSnapshot();
  }

  async removeStaff(user: User): Promise<void> {
    await this.alerts.confirmAction({
      text: `Permanently delete ${user.fullName} from the staff directory?`,
      confirmText: 'Delete',
      loadingText: 'Deleting staff…',
      action: async () => {
        await this.admin.removeStaff(user.id);
        return true;
      },
      successMessage: 'Staff account deleted.',
      errorMessage: (err) =>
        (err as { error?: { message?: string } })?.error?.message || 'Unable to delete staff'
    });
    this.items = this.admin.listStaffPendingSnapshot();
  }
}
