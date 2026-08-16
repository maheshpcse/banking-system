import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AppNotification, NotificationKind } from '../models/banking.models';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly storageKey = 'nb_notifications';
  private readonly subject = new BehaviorSubject<AppNotification[]>(this.read());

  readonly notifications$ = this.subject.asObservable();

  get unreadCount(): number {
    return this.subject.value.filter((n) => !n.read).length;
  }

  get snapshot(): AppNotification[] {
    return this.subject.value;
  }

  push(input: {
    kind: NotificationKind;
    title: string;
    body: string;
    href?: string;
    browserPush?: boolean;
  }): void {
    const item: AppNotification = {
      id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      kind: input.kind,
      title: input.title,
      body: input.body,
      href: input.href,
      createdAt: new Date().toISOString(),
      read: false
    };
    const next = [item, ...this.subject.value].slice(0, 100);
    this.persist(next);

    if (input.browserPush !== false) {
      void this.tryBrowserPush(item.title, item.body);
    }
  }

  markRead(id: string): void {
    const next = this.subject.value.map((n) => (n.id === id ? { ...n, read: true } : n));
    this.persist(next);
  }

  markAllRead(): void {
    const next = this.subject.value.map((n) => ({ ...n, read: true }));
    this.persist(next);
  }

  clear(): void {
    this.persist([]);
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

  private persist(items: AppNotification[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(items));
    this.subject.next(items);
  }

  private read(): AppNotification[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? (JSON.parse(raw) as AppNotification[]) : [];
    } catch {
      return [];
    }
  }
}
