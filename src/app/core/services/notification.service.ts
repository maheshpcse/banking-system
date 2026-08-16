import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AppNotification, NotificationKind } from '../models/banking.models';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly subject = new BehaviorSubject<AppNotification[]>([]);

  readonly notifications$ = this.subject.asObservable();

  constructor(private readonly http: HttpClient) {}

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
        new Notification(title, { body, icon: '/favicon.ico' });
      }
    } catch {
      // Browser may block notifications; in-app list still works.
    }
  }
}
