import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Subscription, firstValueFrom } from 'rxjs';
import { AccountStatus, User } from '../../../core/models/banking.models';
import { AdminPagination, AdminService } from '../../../core/services/admin.service';
import { AlertService } from '../../../core/services/alert.service';
import { withShimmerDelay } from '../../../core/utils/shimmer';

@Component({
  selector: 'app-admin-customers',
  templateUrl: './admin-customers.component.html',
  styleUrls: ['./admin-shared.scss']
})
export class AdminCustomersComponent implements OnInit, OnDestroy {
  users: User[] = [];
  pagination: AdminPagination = { page: 1, limit: 5, total: 0, pages: 1 };
  pageLoading = true;
  menuOpenId: string | null = null;
  viewing: User | null = null;
  private subUsers?: Subscription;
  private subPage?: Subscription;

  constructor(private readonly admin: AdminService, private readonly alerts: AlertService) {}

  ngOnInit(): void {
    this.subUsers = this.admin.users$.subscribe((users) => (this.users = users));
    this.subPage = this.admin.pagination$.subscribe((pagination) => (this.pagination = pagination));
    this.loadPage(1, true);
  }

  ngOnDestroy(): void {
    this.subUsers?.unsubscribe();
    this.subPage?.unsubscribe();
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.menuOpenId = null;
  }

  loadPage(page: number, initial = false): void {
    if (initial) {
      this.pageLoading = true;
    }
    const request$ = initial
      ? withShimmerDelay(this.admin.refreshCustomers(page, 5), 500)
      : this.admin.refreshCustomers(page, 5);

    request$.subscribe({
      next: () => {
        this.pageLoading = false;
        this.menuOpenId = null;
      },
      error: async (err) => {
        this.pageLoading = false;
        await this.alerts.error(err?.error?.message || 'Unable to load customers');
      }
    });
  }

  toggleMenu(event: Event, userId: string): void {
    event.stopPropagation();
    this.menuOpenId = this.menuOpenId === userId ? null : userId;
  }

  async viewUser(user: User): Promise<void> {
    this.menuOpenId = null;
    try {
      this.viewing = await firstValueFrom(this.admin.getCustomer(user.id));
    } catch {
      this.viewing = user;
    }
  }

  closeView(): void {
    this.viewing = null;
  }

  async setStatus(user: User, status: AccountStatus): Promise<void> {
    this.menuOpenId = null;
    await this.alerts.confirmAction({
      text: `Set ${user.fullName} to ${status}?`,
      confirmText: 'Update',
      loadingText: 'Updating status…',
      action: async () => this.admin.setStatus(user.id, status),
      successMessage: () => `Status updated to ${status}.`,
      errorMessage: (err) =>
        (err as { error?: { message?: string } })?.error?.message || 'Unable to update status'
    });
  }

  async remove(user: User): Promise<void> {
    this.menuOpenId = null;
    await this.alerts.confirmAction({
      text: `Delete ${user.fullName} from the operations directory?`,
      confirmText: 'Delete',
      loadingText: 'Removing customer…',
      action: async () => {
        await this.admin.removeUser(user.id);
        return true;
      },
      successMessage: 'Customer removed from directory.',
      errorMessage: (err) =>
        (err as { error?: { message?: string } })?.error?.message || 'Unable to remove customer'
    });
  }

  prev(): void {
    if (this.pagination.page > 1) {
      this.loadPage(this.pagination.page - 1);
    }
  }

  next(): void {
    if (this.pagination.page < this.pagination.pages) {
      this.loadPage(this.pagination.page + 1);
    }
  }
}
