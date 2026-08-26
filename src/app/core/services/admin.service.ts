import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, firstValueFrom, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AccountStatus, User } from '../models/banking.models';

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

export interface AdminPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface AdminCustomersPage {
  items: User[];
  pagination: AdminPagination;
}

export interface AdminAnalyticsCustomers {
  total: number;
  active: number;
  underReview: number;
  blocked: number;
}

export interface AdminAnalyticsVolumeRow {
  type: string;
  total: number;
  count: number;
}

export interface AdminAnalyticsDailyRow {
  day: string;
  type: string;
  total: number;
  count: number;
}

export interface AdminAnalytics {
  customers: AdminAnalyticsCustomers;
  staff?: { managers: number; admins: number; pending: number };
  volumeByType: AdminAnalyticsVolumeRow[];
  dailyFlow: AdminAnalyticsDailyRow[];
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly usersSubject = new BehaviorSubject<User[]>([]);
  private readonly requestsSubject = new BehaviorSubject<AdminRequestRow[]>([]);
  private readonly paginationSubject = new BehaviorSubject<AdminPagination>({
    page: 1,
    limit: 5,
    total: 0,
    pages: 1
  });
  private readonly staffPendingSubject = new BehaviorSubject<User[]>([]);
  private readonly limitRequestsSubject = new BehaviorSubject<User[]>([]);
  private lastCustomerOpts: { scope?: 'all' | 'customers'; role?: string; status?: string } = {};

  readonly users$ = this.usersSubject.asObservable();
  readonly requests$ = this.requestsSubject.asObservable();
  readonly pagination$ = this.paginationSubject.asObservable();
  readonly staffPending$ = this.staffPendingSubject.asObservable();
  readonly limitRequests$ = this.limitRequestsSubject.asObservable();

  constructor(private readonly http: HttpClient) {}

  listUsers(): User[] {
    return this.usersSubject.value;
  }

  listRequests(): AdminRequestRow[] {
    return this.requestsSubject.value;
  }

  get pagination(): AdminPagination {
    return this.paginationSubject.value;
  }

  refreshCustomers(
    page = 1,
    limit = 5,
    opts?: { scope?: 'all' | 'customers'; role?: string; status?: string }
  ): Observable<AdminCustomersPage> {
    if (opts !== undefined) {
      this.lastCustomerOpts = { ...opts };
    }
    const effective = opts ?? this.lastCustomerOpts ?? {};
    let params = new HttpParams().set('page', String(page)).set('limit', String(limit));
    if (effective.scope === 'all') {
      params = params.set('scope', 'all');
    }
    if (effective.role) {
      params = params.set('role', effective.role);
    }
    if (effective.status && effective.status !== 'all') {
      params = params.set('status', effective.status);
    }
    return this.http
      .get<AdminCustomersPage>(`${environment.apiUrl}/admin/customers`, { params })
      .pipe(
        map((res) => ({
          items: res.items || [],
          pagination: res.pagination || { page, limit, total: (res.items || []).length, pages: 1 }
        })),
        tap((res) => {
          this.usersSubject.next(res.items);
          this.paginationSubject.next(res.pagination);
        })
      );
  }

  getCustomerTransactions(
    userId: string,
    opts?: { page?: number; limit?: number; type?: string }
  ): Observable<{ items: import('../models/banking.models').Transaction[]; pagination: AdminPagination }> {
    let params = new HttpParams()
      .set('page', String(opts?.page || 1))
      .set('limit', String(opts?.limit || 20));
    if (opts?.type) {
      params = params.set('type', opts.type);
    }
    return this.http.get<{ items: import('../models/banking.models').Transaction[]; pagination: AdminPagination }>(
      `${environment.apiUrl}/admin/customers/${userId}/transactions`,
      { params }
    );
  }

  getCustomer(userId: string): Observable<User> {
    return this.http
      .get<{ user: User }>(`${environment.apiUrl}/admin/customers/${userId}`)
      .pipe(map((res) => res.user));
  }

  refreshRequests(): Observable<AdminRequestRow[]> {
    return this.http.get<{ items: AdminRequestRow[] }>(`${environment.apiUrl}/admin/requests`).pipe(
      map((res) => res.items || []),
      tap((items) => this.requestsSubject.next(items))
    );
  }

  async setStatus(userId: string, status: AccountStatus): Promise<User> {
    const res = await firstValueFrom(
      this.http.patch<{ message: string; user: User }>(
        `${environment.apiUrl}/admin/customers/${userId}/status`,
        { status }
      )
    );
    const { page, limit } = this.paginationSubject.value;
    await firstValueFrom(this.refreshCustomers(page, limit));
    return res.user;
  }

  /** Super Admin only — clears a customer's failed sign-in counter/lock. */
  async resetLoginAttempts(userId: string): Promise<User | null> {
    const res = await firstValueFrom(
      this.http.post<{ message: string; user: User }>(
        `${environment.apiUrl}/admin/customers/${userId}/reset-login-attempts`,
        {}
      )
    );
    const { page, limit } = this.paginationSubject.value;
    await firstValueFrom(this.refreshCustomers(page, limit));
    return res.user || null;
  }

  async removeUser(userId: string): Promise<void> {
    await firstValueFrom(this.http.delete<{ message: string }>(`${environment.apiUrl}/admin/customers/${userId}`));
    const { page, limit } = this.paginationSubject.value;
    await firstValueFrom(this.refreshCustomers(page, limit));
    await firstValueFrom(this.refreshRequests());
  }

  async approveRequest(requestId: string): Promise<User | null> {
    const res = await firstValueFrom(
      this.http.post<{ message: string; user: User }>(
        `${environment.apiUrl}/admin/requests/${requestId}/approve`,
        {}
      )
    );
    const { page, limit } = this.paginationSubject.value;
    await firstValueFrom(this.refreshCustomers(page, limit));
    await firstValueFrom(this.refreshRequests());
    return res.user || null;
  }

  async rejectRequest(requestId: string, reviewNote?: string): Promise<User | null> {
    const res = await firstValueFrom(
      this.http.post<{ message: string; user: User }>(
        `${environment.apiUrl}/admin/requests/${requestId}/reject`,
        { reviewNote }
      )
    );
    const { page, limit } = this.paginationSubject.value;
    await firstValueFrom(this.refreshCustomers(page, limit));
    await firstValueFrom(this.refreshRequests());
    return res.user || null;
  }

  getAnalytics(params?: { from?: string; to?: string; type?: string }): Observable<AdminAnalytics> {
    let httpParams = new HttpParams();
    if (params?.from) {
      httpParams = httpParams.set('from', params.from);
    }
    if (params?.to) {
      httpParams = httpParams.set('to', params.to);
    }
    if (params?.type) {
      httpParams = httpParams.set('type', params.type);
    }
    return this.http.get<AdminAnalytics>(`${environment.apiUrl}/admin/analytics`, {
      params: httpParams
    });
  }

  listStaffPendingSnapshot(): User[] {
    return this.staffPendingSubject.value;
  }

  /** Super Admin — full staff directory (keeps activated users) */
  listStaff(status: 'all' | 'pending_approval' | 'active' | 'rejected' = 'all'): Observable<User[]> {
    const params = new HttpParams().set('status', status);
    return this.http.get<{ items: User[] }>(`${environment.apiUrl}/admin/staff`, { params }).pipe(
      map((res) => res.items || []),
      tap((items) => this.staffPendingSubject.next(items))
    );
  }

  /** @deprecated prefer listStaff — kept for compatibility */
  listStaffPending(): Observable<User[]> {
    return this.listStaff('pending_approval');
  }

  async approveStaff(userId: string): Promise<User | null> {
    const res = await firstValueFrom(
      this.http.post<{ message: string; user: User }>(
        `${environment.apiUrl}/admin/staff/${userId}/approve`,
        {}
      )
    );
    await firstValueFrom(this.listStaff('all'));
    return res.user || null;
  }

  async rejectStaff(userId: string): Promise<User | null> {
    const res = await firstValueFrom(
      this.http.post<{ message: string; user: User }>(
        `${environment.apiUrl}/admin/staff/${userId}/reject`,
        {}
      )
    );
    await firstValueFrom(this.listStaff('all'));
    return res.user || null;
  }

  async setStaffStatus(userId: string, status: AccountStatus): Promise<User | null> {
    const res = await firstValueFrom(
      this.http.patch<{ message: string; user: User }>(
        `${environment.apiUrl}/admin/staff/${userId}/status`,
        { status }
      )
    );
    await firstValueFrom(this.listStaff('all'));
    return res.user || null;
  }

  async removeStaff(userId: string): Promise<void> {
    await firstValueFrom(
      this.http.delete<{ message: string }>(`${environment.apiUrl}/admin/staff/${userId}`)
    );
    await firstValueFrom(this.listStaff('all'));
  }

  listLimitRequestsSnapshot(): User[] {
    return this.limitRequestsSubject.value;
  }

  listLimitRequests(): Observable<User[]> {
    return this.http.get<{ items: User[] }>(`${environment.apiUrl}/admin/limit-requests`).pipe(
      map((res) => res.items || []),
      tap((items) => this.limitRequestsSubject.next(items))
    );
  }

  async approveLimitRequest(userId: string, reviewNote?: string): Promise<User | null> {
    const res = await firstValueFrom(
      this.http.post<{ message: string; user: User }>(
        `${environment.apiUrl}/admin/limit-requests/${userId}/approve`,
        { reviewNote }
      )
    );
    await firstValueFrom(this.listLimitRequests());
    return res.user || null;
  }

  async rejectLimitRequest(userId: string, reviewNote?: string): Promise<User | null> {
    const res = await firstValueFrom(
      this.http.post<{ message: string; user: User }>(
        `${environment.apiUrl}/admin/limit-requests/${userId}/reject`,
        { reviewNote }
      )
    );
    await firstValueFrom(this.listLimitRequests());
    return res.user || null;
  }
}
