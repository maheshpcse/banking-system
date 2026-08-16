import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AccountLifecycleService } from './account-lifecycle.service';
import { NotificationService } from './notification.service';
import { AccountStatus, AdminUserRow, User, UserRole } from '../models/banking.models';

export interface AdminRequestRow {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  submittedAt: string;
  status: AccountStatus;
  address?: User['address'];
  card?: User['card'];
  reviewNote?: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly usersKey = 'nb_admin_users';
  private readonly requestsKey = 'nb_admin_requests';
  private readonly usersSubject = new BehaviorSubject<User[]>(this.readUsers());
  private readonly requestsSubject = new BehaviorSubject<AdminRequestRow[]>(this.readRequests());

  readonly users$ = this.usersSubject.asObservable();
  readonly requests$ = this.requestsSubject.asObservable();

  constructor(
    private readonly lifecycle: AccountLifecycleService,
    private readonly notifications: NotificationService
  ) {
    this.ensureSeed();
  }

  listUsers(): User[] {
    return this.usersSubject.value;
  }

  listRequests(): AdminRequestRow[] {
    return this.requestsSubject.value;
  }

  upsertUser(user: User): void {
    const users = [...this.usersSubject.value];
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx >= 0) {
      users[idx] = user;
    } else {
      users.unshift(user);
    }
    this.persistUsers(users);
  }

  setStatus(userId: string, status: AccountStatus): User | null {
    const users = this.usersSubject.value.map((u) =>
      u.id === userId
        ? {
            ...u,
            accountStatus: status,
            accountNumber: status === 'blocked' || status === 'deactivated' ? u.accountNumber : u.accountNumber
          }
        : u
    );
    this.persistUsers(users);
    const user = users.find((u) => u.id === userId) || null;
    if (user) {
      this.notifications.push({
        kind: 'admin',
        title: 'Account status updated',
        body: `${user.fullName} is now ${status}.`,
        href: '/admin/customers'
      });
    }
    return user;
  }

  removeUser(userId: string): void {
    const user = this.usersSubject.value.find((u) => u.id === userId);
    this.persistUsers(this.usersSubject.value.filter((u) => u.id !== userId));
    this.persistRequests(this.requestsSubject.value.filter((r) => r.userId !== userId));
    this.notifications.push({
      kind: 'admin',
      title: 'Customer removed',
      body: user ? `${user.fullName}'s profile was deleted from NovaBank.` : 'A customer profile was deleted.',
      href: '/admin/customers'
    });
  }

  approveRequest(requestId: string): User | null {
    const req = this.requestsSubject.value.find((r) => r.id === requestId);
    if (!req) {
      return null;
    }
    let user = this.usersSubject.value.find((u) => u.id === req.userId);
    if (!user) {
      user = {
        id: req.userId,
        fullName: req.fullName,
        email: req.email,
        accountNumber: null,
        balance: 0,
        role: 'customer',
        accountStatus: 'under_review',
        address: req.address || null,
        card: req.card || null
      };
    }
    const activated = this.lifecycle.activateAccountLocal({
      ...user,
      address: req.address || user.address,
      card: req.card || user.card
    });
    this.upsertUser(activated);
    // Sync into mb_user if same session user
    try {
      const raw = localStorage.getItem('mb_user');
      if (raw) {
        const current = JSON.parse(raw) as User;
        if (current.id === activated.id) {
          localStorage.setItem('mb_user', JSON.stringify(activated));
        }
      }
    } catch {}
    this.persistRequests(
      this.requestsSubject.value.map((r) =>
        r.id === requestId ? { ...r, status: 'active', reviewNote: 'Approved' } : r
      )
    );
    this.notifications.push({
      kind: 'account',
      title: 'Account approved',
      body: `${activated.fullName} account ${activated.accountNumber} is active.`,
      href: '/settings?tab=banking'
    });
    return activated;
  }

  rejectRequest(requestId: string, note: string): void {
    this.persistRequests(
      this.requestsSubject.value.map((r) =>
        r.id === requestId ? { ...r, status: 'rejected', reviewNote: note || 'Rejected' } : r
      )
    );
    const req = this.requestsSubject.value.find((r) => r.id === requestId);
    if (req) {
      const users = this.usersSubject.value.map((u) =>
        u.id === req.userId ? { ...u, accountStatus: 'rejected' as AccountStatus } : u
      );
      this.persistUsers(users);
      this.notifications.push({
        kind: 'account',
        title: 'Application rejected',
        body: note || 'Please update address / card details and resubmit.',
        href: '/settings?tab=banking'
      });
    }
  }

  toAdminRow(user: User): AdminUserRow {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      username: user.username,
      role: (user.role || 'customer') as UserRole,
      accountStatus: (user.accountStatus || 'pending') as AccountStatus,
      accountNumber: user.accountNumber,
      balance: user.balance,
      createdAt: user.createdAt
    };
  }

  private ensureSeed(): void {
    if (!this.usersSubject.value.length) {
      this.persistUsers([
        {
          id: 'admin1',
          fullName: 'Nova Manager',
          email: 'manager@novabank.demo',
          username: 'manager',
          role: 'manager',
          accountStatus: 'active',
          accountNumber: 'MB000000000001',
          balance: 0
        }
      ]);
    }

    this.seedPendingRequestFromLocalUser();
  }

  /** Backfills a pending request entry if the signed-in demo user is under review but was never queued. */
  private seedPendingRequestFromLocalUser(): void {
    let current: User | null = null;
    try {
      const raw = localStorage.getItem('mb_user');
      current = raw ? (JSON.parse(raw) as User) : null;
    } catch {
      current = null;
    }
    if (!current || current.accountStatus !== 'under_review') {
      return;
    }
    const alreadyQueued = this.requestsSubject.value.some((r) => r.userId === current?.id);
    if (alreadyQueued) {
      return;
    }
    if (!this.usersSubject.value.some((u) => u.id === current?.id)) {
      this.upsertUser(current);
    }
    this.persistRequests([
      {
        id: `req_${current.id}`,
        userId: current.id,
        fullName: current.fullName,
        email: current.email,
        submittedAt: current.application?.submittedAt || new Date().toISOString(),
        status: 'under_review',
        address: current.address || null,
        card: current.card || null
      },
      ...this.requestsSubject.value
    ]);
  }

  private readUsers(): User[] {
    try {
      return JSON.parse(localStorage.getItem(this.usersKey) || '[]') as User[];
    } catch {
      return [];
    }
  }

  private readRequests(): AdminRequestRow[] {
    try {
      return JSON.parse(localStorage.getItem(this.requestsKey) || '[]') as AdminRequestRow[];
    } catch {
      return [];
    }
  }

  private persistUsers(users: User[]): void {
    localStorage.setItem(this.usersKey, JSON.stringify(users));
    this.usersSubject.next(users);
  }

  private persistRequests(rows: AdminRequestRow[]): void {
    localStorage.setItem(this.requestsKey, JSON.stringify(rows));
    this.requestsSubject.next(rows);
  }
}
