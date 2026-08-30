import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AppNotification } from '../../../core/models/banking.models';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { SHIMMER_MS, withShimmerDelay } from '../../../core/utils/shimmer';

@Component({
  selector: 'app-admin-notifications',
  templateUrl: './admin-notifications.component.html',
  styleUrls: ['./admin-shared.scss']
})
export class AdminNotificationsComponent implements OnInit, OnDestroy {
  items: AppNotification[] = [];
  view: 'list' | 'table' = 'table';
  pageLoading = true;
  private sub?: Subscription;

  constructor(
    private readonly notifications: NotificationService,
    private readonly auth: AuthService
  ) {}

  get isSuperAdmin(): boolean {
    return !!this.auth.currentUser?.isSuperAdmin;
  }

  ngOnInit(): void {
    this.sub = this.notifications.notifications$.subscribe((items) => (this.items = items));
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
  }

  markAll(): void {
    this.notifications.markAllRead();
  }
}
