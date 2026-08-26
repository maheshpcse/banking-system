import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import {
  AccountStatus,
  LoginStatus,
  Transaction,
  User,
  UserRole,
  effectiveBankingStatus
} from '../../../core/models/banking.models';
import { AdminPagination, AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { SHIMMER_MS, shimmerPause, withShimmerDelay } from '../../../core/utils/shimmer';
import { formatStatusLabel, statusPillClass } from '../../../core/utils/status-label';

type RoleFilter = 'all' | 'customer' | 'manager' | 'admin';
type LoginStatusFilter = 'all' | LoginStatus;
type BankingStatusFilter =
  | 'all'
  | 'active'
  | 'blocked'
  | 'suspended'
  | 'deactivated'
  | 'under_review'
  | 'address_required'
  | 'rejected';
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
  /** Table-area shimmer when role/status filters / paging change after first paint */
  listLoading = false;
  menuOpenId: string | null = null;
  viewing: User | null = null;
  drawerOpen = false;
  drawerLoading = false;
  roleFilter: RoleFilter = 'customer';
  loginStatusFilter: LoginStatusFilter = 'all';
  bankingStatusFilter: BankingStatusFilter = 'all';
  readonly roleFilters: { id: RoleFilter; label: string }[] = [
    { id: 'all', label: 'All Roles' },
    { id: 'customer', label: 'Customers' },
    { id: 'manager', label: 'Managers' },
    { id: 'admin', label: 'Admins' }
  ];
  readonly loginStatusFilters: { id: LoginStatusFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'active', label: 'Active' },
    { id: 'blocked', label: 'Blocked' },
    { id: 'deactivated', label: 'Deactivated' },
    { id: 'deleted', label: 'Deleted' }
  ];
  readonly bankingStatusFilters: { id: BankingStatusFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'active', label: 'Active' },
    { id: 'blocked', label: 'Blocked' },
    { id: 'suspended', label: 'Suspended' },
    { id: 'deactivated', label: 'Deactivated' },
    { id: 'under_review', label: 'Under review' },
    { id: 'address_required', label: 'Address required' },
    { id: 'rejected', label: 'Rejected' }
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
  readonly statusPillClass = statusPillClass;
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
      : 'Manage customer sign-in and banking ledger access separately.';
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

  setLoginStatusFilter(id: LoginStatusFilter): void {
    if (this.loginStatusFilter === id) {
      return;
    }
    this.loginStatusFilter = id;
    this.loadPage(1, false);
  }

  setBankingStatusFilter(id: BankingStatusFilter): void {
    if (this.bankingStatusFilter === id) {
      return;
    }
    this.bankingStatusFilter = id;
    this.loadPage(1, false);
  }

  loadPage(page: number, initial = false): void {
    if (initial) {
      this.pageLoading = true;
    } else {
      this.listLoading = true;
    }
    const opts: {
      scope?: 'all' | 'customers';
      role?: string;
      loginStatus?: string;
      bankingStatus?: string;
    } = {};
    if (this.isSuperAdmin && this.roleFilter === 'all') {
      opts.scope = 'all';
    } else if (this.isSuperAdmin) {
      opts.role = this.roleFilter;
    }
    if (this.loginStatusFilter && this.loginStatusFilter !== 'all') {
      opts.loginStatus = this.loginStatusFilter;
    }
    if (this.bankingStatusFilter && this.bankingStatusFilter !== 'all') {
      opts.bankingStatus = this.bankingStatusFilter;
    }
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

  loginStatusOf(user: User): LoginStatus {
    return user.loginStatus || 'active';
  }

  bankingStatusOf(user: User): AccountStatus {
    return effectiveBankingStatus(user) || 'pending';
  }

  /** Hide the ⋮ menu for deleted login (and non-customer roles). */
  showActionMenu(user: User): boolean {
    if ((user.role || 'customer') !== 'customer') {
      return false;
    }
    return this.loginStatusOf(user) !== 'deleted';
  }

  isLoginBlocked(user: User): boolean {
    return this.loginStatusOf(user) === 'blocked';
  }

  isLoginActive(user: User): boolean {
    return this.loginStatusOf(user) === 'active';
  }

  isLoginDeactivated(user: User): boolean {
    return this.loginStatusOf(user) === 'deactivated';
  }

  isBankingActiveLike(user: User): boolean {
    const status = this.bankingStatusOf(user);
    return status === 'active' || status === 'approved';
  }

  isBankingBlocked(user: User): boolean {
    return this.bankingStatusOf(user) === 'blocked';
  }

  isBankingSuspended(user: User): boolean {
    return this.bankingStatusOf(user) === 'suspended';
  }

  isBankingDeactivated(user: User): boolean {
    return this.bankingStatusOf(user) === 'deactivated';
  }

  isBankingKycPending(user: User): boolean {
    const status = this.bankingStatusOf(user);
    return (
      status === 'address_required' ||
      status === 'under_review' ||
      status === 'rejected' ||
      status === 'pending'
    );
  }

  bankingRestrictedWhileLoginActive(user: User): boolean {
    return this.isLoginActive(user) && (this.isBankingBlocked(user) || this.isBankingSuspended(user) || this.isBankingDeactivated(user));
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

  async setLoginStatus(user: User, status: LoginStatus): Promise<void> {
    this.menuOpenId = null;
    await this.alerts.confirmAction({
      text: `Set login access for ${user.fullName} to ${this.formatStatus(status)}?`,
      confirmText: 'Update login',
      loadingText: 'Updating login status…',
      action: async () => this.admin.setLoginStatus(user.id, status),
      successMessage: () => `Login status updated to ${this.formatStatus(status)}.`,
      errorMessage: (err) =>
        (err as { error?: { message?: string } })?.error?.message || 'Unable to update login status'
    });
  }

  async setBankingStatus(user: User, status: AccountStatus): Promise<void> {
    this.menuOpenId = null;
    await this.alerts.confirmAction({
      text: `Set banking access for ${user.fullName} to ${this.formatStatus(status)}?`,
      confirmText: 'Update banking',
      loadingText: 'Updating banking status…',
      action: async () => this.admin.setBankingStatus(user.id, status),
      successMessage: () => `Banking status updated to ${this.formatStatus(status)}.`,
      errorMessage: (err) =>
        (err as { error?: { message?: string } })?.error?.message ||
        'Unable to update banking status'
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
