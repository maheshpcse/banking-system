import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AppNotification } from '../../core/models/banking.models';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss']
})
export class NotificationsComponent implements OnInit, OnDestroy {
  items: AppNotification[] = [];
  view: 'list' | 'grid' = 'list';
  private sub?: Subscription;

  constructor(private readonly notifications: NotificationService, private readonly router: Router) {}

  ngOnInit(): void {
    this.sub = this.notifications.notifications$.subscribe((items) => (this.items = items));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
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

  clear(): void {
    this.notifications.clear();
  }
}
