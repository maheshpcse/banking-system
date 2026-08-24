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

  ngOnInit(): void {
    this.sub = this.notifications.notifications$.subscribe((items) => (this.items = items));
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
    this.listLoading = true;
    shimmerPause(SHIMMER_MS).subscribe(() => {
      this.listLoading = false;
    });
  }

  setView(view: 'list' | 'grid' | 'table'): void {
    if (this.view === view) {
      return;
    }
    this.view = view;
    this.listLoading = true;
    shimmerPause(SHIMMER_MS).subscribe(() => {
      this.listLoading = false;
    });
  }

  markRead(item: AppNotification): void {
    this.notifications.markRead(item.id);
  }

  markAll(): void {
    this.notifications.markAllRead();
  }
}
