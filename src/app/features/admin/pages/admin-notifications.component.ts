import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AppNotification } from '../../../core/models/banking.models';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-admin-notifications',
  templateUrl: './admin-notifications.component.html',
  styleUrls: ['./admin-shared.scss']
})
export class AdminNotificationsComponent implements OnInit, OnDestroy {
  items: AppNotification[] = [];
  view: 'list' | 'table' = 'table';
  private sub?: Subscription;

  constructor(private readonly notifications: NotificationService) {}

  ngOnInit(): void {
    this.sub = this.notifications.notifications$.subscribe((items) => (this.items = items));
    this.notifications.refresh().subscribe();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  markAll(): void {
    this.notifications.markAllRead();
  }
}
