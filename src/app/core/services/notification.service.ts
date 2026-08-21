import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subscription, of, interval } from 'rxjs';
import { catchError, filter, map, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AppNotification, NotificationKind } from '../models/banking.models';
import { AuthService } from './auth.service';
import { AlertService } from './alert.service';

@Injectable({ providedIn: 'root' })
export class NotificationService implements OnDestroy {
  private readonly subject = new BehaviorSubject<AppNotification[]>([]);
  private readonly knownIds = new Set<string>();
  private primed = false;
  private pollSub?: Subscription;
  private authSub?: Subscription;

  readonly notifications$ = this.subject.asObservable();

  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthService,
    private readonly alerts: AlertService
  ) {
    this.authSub = this.auth.user$.subscribe((user) => {
      if (user) {
        this.startRealtime();
      } else {
        this.stopRealtime();
        this.clear();
      }
    });
  }

  ngOnDestroy(): void {
    this.stopRealtime();
    this.authSub?.unsubscribe();
  }

  get unreadCount(): number {
    return this.subject.value.filter((n) => !n.read).length;
  }

  get snapshot(): AppNotification[] {
    return this.subject.value;
  }

  /** Load notifications from MongoDB via API */
  refresh(): Observable<AppNotification[]> {
    return this.http
      .get<{ items: AppNotification[]; unreadCount: number }>(`${environment.apiUrl}/notifications`)
      .pipe(
        map((res) => res.items || []),
        tap((items) => this.subject.next(items)),
        catchError(() => {
          this.subject.next([]);
          return of([]);
        })
      );
  }

  /** Soft poll so admin↔customer events surface without a full page refresh */
  startRealtime(): void {
    this.stopRealtime();
    this.primed = false;
    this.pollSub = this.refresh()
      .pipe(
        tap((items) => {
          this.knownIds.clear();
          items.forEach((item) => this.knownIds.add(item.id));
          this.primed = true;
        }),
        switchMap(() =>
          interval(10000).pipe(
            filter(() => this.auth.isAuthenticated()),
            switchMap(() => this.refresh())
          )
        )
      )
      .subscribe((items) => this.onPolled(items));
  }

  stopRealtime(): void {
    this.pollSub?.unsubscribe();
    this.pollSub = undefined;
    this.primed = false;
    this.knownIds.clear();
  }

  push(input: {
    kind: NotificationKind;
    title: string;
    body: string;
    href?: string;
    browserPush?: boolean;
  }): void {
    this.http
      .post<{ message: string; item: AppNotification }>(`${environment.apiUrl}/notifications`, {
        kind: input.kind,
        title: input.title,
        body: input.body,
        href: input.href
      })
      .subscribe({
        next: (res) => {
          const item = res.item;
          this.knownIds.add(item.id);
          this.subject.next([item, ...this.subject.value.filter((n) => n.id !== item.id)].slice(0, 100));
          if (input.browserPush !== false) {
            void this.tryBrowserPush(item.title, item.body);
          }
        },
        error: () => {
          // Keep UI responsive if API is briefly unavailable; refresh will reconcile.
        }
      });
  }

  markRead(id: string): void {
    this.http.patch<{ item: AppNotification }>(`${environment.apiUrl}/notifications/${id}/read`, {}).subscribe({
      next: (res) => {
        const next = this.subject.value.map((n) => (n.id === id ? { ...n, read: true } : n));
        if (res.item) {
          const idx = next.findIndex((n) => n.id === id);
          if (idx >= 0) {
            next[idx] = res.item;
          }
        }
        this.subject.next(next);
      }
    });
  }

  markAllRead(): void {
    this.http.post<{ items: AppNotification[] }>(`${environment.apiUrl}/notifications/read-all`, {}).subscribe({
      next: (res) => {
        this.subject.next(res.items || this.subject.value.map((n) => ({ ...n, read: true })));
      },
      error: () => {
        this.subject.next(this.subject.value.map((n) => ({ ...n, read: true })));
      }
    });
  }

  clear(): void {
    this.subject.next([]);
  }

  private onPolled(items: AppNotification[]): void {
    if (!this.primed) {
      return;
    }
    const fresh = items.filter((item) => !this.knownIds.has(item.id));
    items.forEach((item) => this.knownIds.add(item.id));
    for (const item of fresh) {
      void this.alerts.toastSuccess(item.title, item.body);
      void this.tryBrowserPush(item.title, item.body);
    }
  }

  private async tryBrowserPush(title: string, body: string): Promise<void> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }
    try {
      let permission = Notification.permission;
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }
      if (permission === 'granted') {
        new Notification(title, {
          body,
          icon: new URL('assets/icons/favicon-192.png', document.baseURI).toString()
        });
      }
    } catch {
      // Browser may block notifications; in-app list still works.
    }
  }
}
