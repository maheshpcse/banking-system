import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountStatus, User } from '../../../core/models/banking.models';
import { AdminService } from '../../../core/services/admin.service';
import { AlertService } from '../../../core/services/alert.service';
import { AuthService } from '../../../core/services/auth.service';
import { SHIMMER_MS, shimmerPause, withShimmerDelay } from '../../../core/utils/shimmer';
import { formatStatusLabel } from '../../../core/utils/status-label';

type StaffFilter = 'all' | 'pending_approval' | 'active' | 'rejected';

@Component({
  selector: 'app-admin-staff',
  templateUrl: './admin-staff.component.html',
  styleUrls: ['./admin-shared.scss']
})
export class AdminStaffComponent implements OnInit, OnDestroy {
  pageLoading = true;
  listLoading = false;
  items: User[] = [];
  statusFilter: StaffFilter = 'all';
  draftStatus: StaffFilter = 'all';
  filterDrawerMounted = false;
  filterDrawerOpen = false;
  readonly filters: { id: StaffFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'pending_approval', label: 'Pending' },
    { id: 'active', label: 'Active' },
    { id: 'rejected', label: 'Rejected' }
  ];
  readonly formatStatus = formatStatusLabel;
  private filterDrawerCloseTimer: ReturnType<typeof setTimeout> | null = null;
  private listShimmerSub?: Subscription;

  constructor(
    private readonly admin: AdminService,
    private readonly alerts: AlertService,
    private readonly auth: AuthService
  ) {}

  get isSuperAdmin(): boolean {
    return !!this.auth.currentUser?.isSuperAdmin;
  }

  get filterLabel(): string {
    return this.filters.find((f) => f.id === this.statusFilter)?.label || 'All';
  }

  get statusSelectOptions(): Array<{ value: string; label: string }> {
    return this.filters.map((f) => ({ value: f.id, label: f.label }));
  }

  get filtered(): User[] {
    if (this.statusFilter === 'all') {
      return this.items;
    }
    return this.items.filter((u) => (u.staffStatus || 'active') === this.statusFilter);
  }

  ngOnInit(): void {
    this.reload(true);
  }

  ngOnDestroy(): void {
    this.listShimmerSub?.unsubscribe();
    if (this.filterDrawerCloseTimer) {
      clearTimeout(this.filterDrawerCloseTimer);
    }
    this.setFilterDrawerBodyClass(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.filterDrawerMounted) {
      this.closeFilterDrawer();
    }
  }

  setFilter(id: StaffFilter): void {
    if (this.statusFilter === id) {
      return;
    }
    this.statusFilter = id;
  }

  openFilterDrawer(): void {
    if (this.filterDrawerCloseTimer) {
      clearTimeout(this.filterDrawerCloseTimer);
      this.filterDrawerCloseTimer = null;
    }
    this.draftStatus = this.statusFilter;
    this.filterDrawerMounted = true;
    this.filterDrawerOpen = false;
    this.setFilterDrawerBodyClass(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.filterDrawerOpen = true;
      });
    });
  }

  closeFilterDrawer(): void {
    this.filterDrawerOpen = false;
    this.setFilterDrawerBodyClass(false);
    if (this.filterDrawerCloseTimer) {
      clearTimeout(this.filterDrawerCloseTimer);
    }
    this.filterDrawerCloseTimer = setTimeout(() => {
      this.filterDrawerMounted = false;
      this.filterDrawerCloseTimer = null;
    }, 380);
  }

  applyFilters(): void {
    this.statusFilter = this.draftStatus;
    this.closeFilterDrawer();
    this.flashList();
  }

  resetFilters(): void {
    this.draftStatus = 'all';
    this.applyFilters();
  }

  private flashList(): void {
    this.listShimmerSub?.unsubscribe();
    this.listLoading = true;
    this.listShimmerSub = shimmerPause(SHIMMER_MS).subscribe(() => {
      this.listLoading = false;
    });
  }

  private setFilterDrawerBodyClass(open: boolean): void {
    if (typeof document === 'undefined') {
      return;
    }
    if (open) {
      document.body.classList.add('nb-drawer-open');
    } else {
      document.body.classList.remove('nb-drawer-open');
    }
  }

  reload(initial = false): void {
    if (initial) {
      this.pageLoading = true;
      withShimmerDelay(this.admin.listStaff('all'), SHIMMER_MS).subscribe({
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
      return;
    }

    this.admin.listStaff('all').subscribe({
      next: (items) => {
        this.items = items;
      },
      error: async (err) => {
        await this.alerts.error(
          err?.error?.message || 'Unable to load staff. Super Admin access is required.'
        );
      }
    });
  }

  isActiveStaff(user: User): boolean {
    const staff = user.staffStatus || 'active';
    const login = user.loginStatus || 'active';
    return staff === 'active' && login !== 'deleted';
  }

  canDeactivateStaff(user: User): boolean {
    return this.isActiveStaff(user) && (user.loginStatus || 'active') !== 'blocked';
  }

  loginStatusOf(user: User): string {
    return user.loginStatus || 'active';
  }

  isLoginBlocked(user: User): boolean {
    return this.loginStatusOf(user) === 'blocked';
  }

  isLoginDeactivated(user: User): boolean {
    return this.loginStatusOf(user) === 'deactivated';
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
      text: `Set login access for ${user.fullName} to ${this.formatStatus(status)}?`,
      confirmText: 'Update',
      loadingText: 'Updating login status…',
      action: async () => this.admin.setStaffStatus(user.id, status),
      successMessage: () => `Staff login status updated to ${this.formatStatus(status)}.`,
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
