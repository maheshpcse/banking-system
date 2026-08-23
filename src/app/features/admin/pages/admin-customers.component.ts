import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountStatus, Transaction, User, UserRole } from '../../../core/models/banking.models';
import { AdminPagination, AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { SHIMMER_MS, shimmerPause, withShimmerDelay } from '../../../core/utils/shimmer';
import { formatStatusLabel } from '../../../core/utils/status-label';

type RoleFilter = 'all' | 'customer' | 'manager' | 'admin';
type TxFilter = 'all' | 'deposit' | 'withdraw' | 'transfer_in' | 'transfer_out';
type TxView = 'timeline' | 'chart' | 'table';

@Component({
  selector: 'app-admin-customers',
  templateUrl: './admin-customers.component.html',
  styleUrls: ['./admin-shared.scss']
})
export class AdminCustomersComponent implements OnInit, OnDestroy {
  users: User[] = [];
  pagination: AdminPagination = { page: 1, limit: 5, total: 0, pages: 1 };
  pageLoading = true;
  /** Table-area shimmer when role filters / paging change after first paint */
  listLoading = false;
  menuOpenId: string | null = null;
  viewing: User | null = null;
  drawerOpen = false;
  drawerLoading = false;
  roleFilter: RoleFilter = 'customer';
  readonly roleFilters: { id: RoleFilter; label: string }[] = [
    { id: 'all', label: 'All Roles' },
    { id: 'customer', label: 'Customers' },
    { id: 'manager', label: 'Managers' },
    { id: 'admin', label: 'Admins' }
  ];

  txModalOpen = false;
  txModalUser: User | null = null;
  txItems: Transaction[] = [];
  txLoading = false;
  /** Shimmer when switching Timeline / Chart / Table inside the account modal */
  txViewLoading = false;
  txFilter: TxFilter = 'all';
  txView: TxView = 'timeline';
  readonly txFilters: { id: TxFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'deposit', label: 'Deposits' },
    { id: 'withdraw', label: 'Withdrawals' },
    { id: 'transfer_out', label: 'Sent' },
    { id: 'transfer_in', label: 'Received' }
  ];

  readonly formatStatus = formatStatusLabel;
  private drawerCloseTimer: ReturnType<typeof setTimeout> | null = null;
  private txModalCloseTimer: ReturnType<typeof setTimeout> | null = null;
  private subUsers?: Subscription;
  private subPage?: Subscription;

  constructor(
    protected readonly admin: AdminService,
    protected readonly alerts: AlertService,
    protected readonly auth: AuthService
  ) {}

  get isSuperAdmin(): boolean {
    return !!this.auth.currentUser?.isSuperAdmin;
  }

  get pageTitle(): string {
    return this.isSuperAdmin ? 'Directory' : 'Customers';
  }

  get pageLede(): string {
    return this.isSuperAdmin
      ? 'View and control customers, managers, and admins across NovaBank.'
      : 'Activate, block, deactivate, or remove customer accounts.';
  }

  get chartBars(): { label: string; total: number; pct: number }[] {
    const buckets: Record<string, number> = {
      deposit: 0,
      withdraw: 0,
      transfer_in: 0,
      transfer_out: 0
    };
    this.txItems.forEach((tx) => {
      buckets[tx.type] = (buckets[tx.type] || 0) + Number(tx.amount || 0);
    });
    const max = Math.max(1, ...Object.values(buckets));
    return Object.entries(buckets).map(([label, total]) => ({
      label: this.formatStatus(label),
      total,
      pct: Math.round((total / max) * 100)
    }));
  }

  ngOnInit(): void {
    this.subUsers = this.admin.users$.subscribe(
      (users) => (this.users = users.filter((u) => !u.isSuperAdmin))
    );
    this.subPage = this.admin.pagination$.subscribe((pagination) => (this.pagination = pagination));
    if (this.isSuperAdmin) {
      this.roleFilter = 'all';
    }
    this.loadPage(1, true);
  }

  ngOnDestroy(): void {
    this.subUsers?.unsubscribe();
    this.subPage?.unsubscribe();
    if (this.drawerCloseTimer) {
      clearTimeout(this.drawerCloseTimer);
    }
    if (this.txModalCloseTimer) {
      clearTimeout(this.txModalCloseTimer);
    }
    this.setDrawerBodyClass(false);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.menuOpenId = null;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.txModalOpen) {
      this.closeTxModal();
      return;
    }
    if (this.viewing) {
      this.closeView();
    }
  }

  setRoleFilter(id: RoleFilter): void {
    if (this.roleFilter === id) {
      return;
    }
    this.roleFilter = id;
    this.loadPage(1, false);
  }

  loadPage(page: number, initial = false): void {
    if (initial) {
      this.pageLoading = true;
    } else {
      this.listLoading = true;
    }
    const opts =
      this.isSuperAdmin && this.roleFilter === 'all'
        ? { scope: 'all' as const }
        : this.isSuperAdmin
          ? { role: this.roleFilter }
          : undefined;
    withShimmerDelay(this.admin.refreshCustomers(page, 5, opts), SHIMMER_MS).subscribe({
      next: () => {
        this.pageLoading = false;
        this.listLoading = false;
        this.menuOpenId = null;
      },
      error: async (err) => {
        this.pageLoading = false;
        this.listLoading = false;
        await this.alerts.error(err?.error?.message || 'Unable to load directory');
      }
    });
  }

  toggleMenu(event: Event, userId: string): void {
    event.stopPropagation();
    this.menuOpenId = this.menuOpenId === userId ? null : userId;
  }

  /** Open drawer with fade/slide, then shimmer while detail loads. */
  viewUser(user: User): void {
    this.menuOpenId = null;
    if (this.drawerCloseTimer) {
      clearTimeout(this.drawerCloseTimer);
      this.drawerCloseTimer = null;
    }
    this.viewing = { ...user };
    this.drawerLoading = true;
    this.drawerOpen = false;
    this.setDrawerBodyClass(true);
    // Double rAF so the closed state paints before the open transition runs.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.drawerOpen = true;
      });
    });

    withShimmerDelay(this.admin.getCustomer(user.id), SHIMMER_MS).subscribe({
      next: (detail) => {
        this.viewing = detail;
        this.drawerLoading = false;
      },
      error: () => {
        this.drawerLoading = false;
      }
    });
  }

  closeView(): void {
    this.drawerOpen = false;
    this.drawerLoading = false;
    this.setDrawerBodyClass(false);
    if (this.drawerCloseTimer) {
      clearTimeout(this.drawerCloseTimer);
    }
    this.drawerCloseTimer = setTimeout(() => {
      this.viewing = null;
      this.drawerCloseTimer = null;
    }, 400);
  }

  openTxModal(user: User): void {
    this.menuOpenId = null;
    if (this.txModalCloseTimer) {
      clearTimeout(this.txModalCloseTimer);
      this.txModalCloseTimer = null;
    }
    this.txModalUser = user;
    this.txFilter = 'all';
    this.txView = 'timeline';
    this.txViewLoading = false;
    this.loadTransactions(user.id);
    this.txModalOpen = false;
    this.setDrawerBodyClass(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.txModalOpen = true;
      });
    });
  }

  closeTxModal(): void {
    this.txModalOpen = false;
    this.setDrawerBodyClass(false);
    if (this.txModalCloseTimer) {
      clearTimeout(this.txModalCloseTimer);
    }
    this.txModalCloseTimer = setTimeout(() => {
      this.txModalUser = null;
      this.txItems = [];
      this.txViewLoading = false;
      this.txModalCloseTimer = null;
    }, 380);
  }

  loadTransactions(userId: string): void {
    this.txLoading = true;
    const type = this.txFilter === 'all' ? undefined : this.txFilter;
    withShimmerDelay(
      this.admin.getCustomerTransactions(userId, { limit: 30, type }),
      SHIMMER_MS
    ).subscribe({
      next: (res) => {
        this.txItems = res.items || [];
        this.txLoading = false;
      },
      error: () => {
        this.txItems = [];
        this.txLoading = false;
      }
    });
  }

  setTxFilter(id: TxFilter): void {
    if (this.txFilter === id) {
      return;
    }
    this.txFilter = id;
    if (this.txModalUser) {
      this.loadTransactions(this.txModalUser.id);
    }
  }

  setTxView(view: TxView): void {
    if (this.txView === view) {
      return;
    }
    this.txView = view;
    this.txViewLoading = true;
    shimmerPause(SHIMMER_MS).subscribe(() => {
      this.txViewLoading = false;
    });
  }

  /** Body class tracks overlay state — NavBar stays visible (overlays stack above it). */
  private setDrawerBodyClass(open: boolean): void {
    if (typeof document === 'undefined') {
      return;
    }
    if (open) {
      document.body.classList.add('nb-drawer-open');
    } else if (!this.drawerOpen && !this.txModalOpen) {
      document.body.classList.remove('nb-drawer-open');
    }
  }

  async setStatus(user: User, status: AccountStatus): Promise<void> {
    this.menuOpenId = null;
    await this.alerts.confirmAction({
      text: `Set ${user.fullName} to ${this.formatStatus(status)}?`,
      confirmText: 'Update',
      loadingText: 'Updating status…',
      action: async () => this.admin.setStatus(user.id, status),
      successMessage: () => `Status updated to ${this.formatStatus(status)}.`,
      errorMessage: (err) =>
        (err as { error?: { message?: string } })?.error?.message || 'Unable to update status'
    });
  }

  async resetLoginAttempts(user: User): Promise<void> {
    this.menuOpenId = null;
    await this.alerts.confirmAction({
      text: `Reset the sign-in lock for ${user.fullName}? They will be able to try signing in again immediately.`,
      confirmText: 'Reset lock',
      loadingText: 'Resetting sign-in lock…',
      action: async () => this.admin.resetLoginAttempts(user.id),
      successMessage: 'Sign-in lock cleared.',
      errorMessage: (err) =>
        (err as { error?: { message?: string } })?.error?.message || 'Unable to reset sign-in lock'
    });
  }

  async remove(user: User): Promise<void> {
    this.menuOpenId = null;
    await this.alerts.confirmAction({
      text: `Delete ${user.fullName} from the operations directory?`,
      confirmText: 'Delete',
      loadingText: 'Removing user…',
      action: async () => {
        await this.admin.removeUser(user.id);
        return true;
      },
      successMessage: 'User removed from directory.',
      errorMessage: (err) =>
        (err as { error?: { message?: string } })?.error?.message || 'Unable to remove user'
    });
  }

  prev(): void {
    if (this.pagination.page > 1) {
      this.loadPage(this.pagination.page - 1, false);
    }
  }

  next(): void {
    if (this.pagination.page < this.pagination.pages) {
      this.loadPage(this.pagination.page + 1, false);
    }
  }

  roleLabel(role?: UserRole | string): string {
    return this.formatStatus(role || 'customer');
  }
}
