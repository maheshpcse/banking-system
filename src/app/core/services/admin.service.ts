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

  refreshCustomers(page = 1, limit = 5): Observable<AdminCustomersPage> {
    const params = new HttpParams().set('page', String(page)).set('limit', String(limit));
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

  getAnalytics(): Observable<AdminAnalytics> {
    return this.http.get<AdminAnalytics>(`${environment.apiUrl}/admin/analytics`);
  }

  listStaffPendingSnapshot(): User[] {
    return this.staffPendingSubject.value;
  }

  /** Super Admin only — backend enforces requireSuperAdmin */
  listStaffPending(): Observable<User[]> {
    return this.http.get<{ items: User[] }>(`${environment.apiUrl}/admin/staff-pending`).pipe(
      map((res) => res.items || []),
      tap((items) => this.staffPendingSubject.next(items))
    );
  }

  async approveStaff(userId: string): Promise<User | null> {
    const res = await firstValueFrom(
      this.http.post<{ message: string; user: User }>(
        `${environment.apiUrl}/admin/staff/${userId}/approve`,
        {}
      )
    );
    await firstValueFrom(this.listStaffPending());
    return res.user || null;
  }

  async rejectStaff(userId: string): Promise<User | null> {
    const res = await firstValueFrom(
      this.http.post<{ message: string; user: User }>(
        `${environment.apiUrl}/admin/staff/${userId}/reject`,
        {}
      )
    );
    await firstValueFrom(this.listStaffPending());
    return res.user || null;
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
