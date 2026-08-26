import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AppNotification, NotificationKind } from '../../core/models/banking.models';
import { NotificationService } from '../../core/services/notification.service';
import { SHIMMER_MS, shimmerPause, withShimmerDelay } from '../../core/utils/shimmer';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss']
})
export class NotificationsComponent implements OnInit, OnDestroy {
  items: AppNotification[] = [];
  view: 'list' | 'grid' | 'table' = 'list';
  kindFilter: '' | NotificationKind = '';
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
    { id: 'billing', label: 'Bills / Invoices' },
    { id: 'complaint', label: 'Complaints' },
    { id: 'security', label: 'Security' },
    { id: 'system', label: 'System' }
  ];

  constructor(private readonly notifications: NotificationService) {}

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
    withShimmerDelay(this.notifications.refresh(), SHIMMER_MS).subscribe(() => {
      this.pageLoading = false;
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
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
}
