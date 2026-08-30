import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AppNotification, NotificationKind } from '../../../core/models/banking.models';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { SHIMMER_MS, shimmerPause, withShimmerDelay } from '../../../core/utils/shimmer';

@Component({
  selector: 'app-admin-notifications',
  templateUrl: './admin-notifications.component.html',
  styleUrls: ['./admin-shared.scss']
})
export class AdminNotificationsComponent implements OnInit, OnDestroy {
  items: AppNotification[] = [];
  view: 'list' | 'grid' | 'table' = 'list';
  kindFilter: '' | NotificationKind = '';
  draftKindFilter: '' | NotificationKind = '';
  filterDrawerOpen = false;
  pageLoading = true;
  listLoading = false;
  readonly pageSize = 8;
  page = 1;
  private sub?: Subscription;

  readonly kinds: Array<{ id: '' | NotificationKind; label: string }> = [
    { id: '', label: 'All' },
    { id: 'transfer', label: 'Transfers' },
    { id: 'account', label: 'Account' },
    { id: 'admin', label: 'Admin' },
    { id: 'billing', label: 'Bills' },
    { id: 'complaint', label: 'Complaints' },
    { id: 'security', label: 'Security' },
    { id: 'system', label: 'System' }
  ];

  constructor(
    private readonly notifications: NotificationService,
    private readonly auth: AuthService
  ) {}

  get isSuperAdmin(): boolean {
    return !!this.auth.currentUser?.isSuperAdmin;
  }

  get filterLabel(): string {
    return this.kinds.find((k) => k.id === this.kindFilter)?.label || 'All';
  }

  get kindSelectOptions(): Array<{ value: string; label: string }> {
    return this.kinds.map((k) => ({
      value: k.id || 'all',
      label: k.label
    }));
  }

  get draftKindSelectValue(): string {
    return this.draftKindFilter || 'all';
  }

  get filtered(): AppNotification[] {
    if (!this.kindFilter) {
      return this.items;
    }
    return this.items.filter((item) => item.kind === this.kindFilter);
  }

  get pages(): number {
    return Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
  }

  get paged(): AppNotification[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }

  ngOnInit(): void {
    this.sub = this.notifications.notifications$.subscribe((items) => {
      this.items = items;
      if (this.page > this.pages) {
        this.page = this.pages;
      }
    });
    withShimmerDelay(this.notifications.refresh(), SHIMMER_MS).subscribe({
      next: () => {
        this.pageLoading = false;
      },
      error: () => {
        this.pageLoading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.setFilterDrawerBodyClass(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.filterDrawerOpen) {
      this.closeFilterDrawer();
    }
  }

  setKind(kind: '' | NotificationKind): void {
    if (this.kindFilter === kind) {
      return;
    }
    this.kindFilter = kind;
    this.flashList(() => {
      this.page = 1;
    });
  }

  setView(view: 'list' | 'grid' | 'table'): void {
    if (this.view === view) {
      return;
    }
    this.view = view;
    this.flashList();
  }

  openFilterDrawer(): void {
    this.draftKindFilter = this.kindFilter;
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
  }

  applyFilters(): void {
    const next = this.draftKindFilter;
    this.closeFilterDrawer();
    this.flashList(() => {
      this.kindFilter = next;
      this.page = 1;
    });
  }

  resetDraftFilters(): void {
    this.draftKindFilter = '';
    this.applyFilters();
  }

  onDraftKindChange(value: string): void {
    this.draftKindFilter = !value || value === 'all' ? '' : (value as NotificationKind);
  }

  prev(): void {
    if (this.page <= 1) {
      return;
    }
    this.flashList(() => {
      this.page -= 1;
    });
  }

  next(): void {
    if (this.page >= this.pages) {
      return;
    }
    this.flashList(() => {
      this.page += 1;
    });
  }

  markRead(item: AppNotification): void {
    this.notifications.markRead(item.id);
  }

  markAll(): void {
    this.notifications.markAllRead();
  }

  private flashList(mutate?: () => void): void {
    this.listLoading = true;
    shimmerPause(SHIMMER_MS).subscribe(() => {
      mutate?.();
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
}
