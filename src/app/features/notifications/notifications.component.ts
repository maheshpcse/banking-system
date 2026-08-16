import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { AppNotification, NotificationKind } from '../../core/models/banking.models';
import { NotificationService } from '../../core/services/notification.service';

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
  private sub?: Subscription;

  readonly kinds: Array<{ id: '' | NotificationKind; label: string }> = [
    { id: '', label: 'All' },
    { id: 'transfer', label: 'Transfers' },
    { id: 'account', label: 'Account' },
    { id: 'admin', label: 'Admin' },
    { id: 'security', label: 'Security' },
    { id: 'system', label: 'System' }
  ];

  constructor(private readonly notifications: NotificationService, private readonly router: Router) {}

  get filtered(): AppNotification[] {
    if (!this.kindFilter) {
      return this.items;
    }
    return this.items.filter((item) => item.kind === this.kindFilter);
  }

  ngOnInit(): void {
    this.sub = this.notifications.notifications$.subscribe((items) => (this.items = items));
    of(true)
      .pipe(delay(500))
      .subscribe(() => {
        this.pageLoading = false;
      });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  setKind(kind: '' | NotificationKind): void {
    this.kindFilter = kind;
  }

  markRead(item: AppNotification): void {
    this.notifications.markRead(item.id);
    if (item.href) {
      void this.router.navigateByUrl(item.href);
    }
  }

  markAll(): void {
    this.notifications.markAllRead();
  }
}
