import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly usersSubject = new BehaviorSubject<User[]>([]);
  private readonly requestsSubject = new BehaviorSubject<AdminRequestRow[]>([]);

  readonly users$ = this.usersSubject.asObservable();
  readonly requests$ = this.requestsSubject.asObservable();

  constructor(private readonly http: HttpClient) {}

  listUsers(): User[] {
    return this.usersSubject.value;
  }

  listRequests(): AdminRequestRow[] {
    return this.requestsSubject.value;
  }

  refreshCustomers(): Observable<User[]> {
    return this.http.get<{ items: User[] }>(`${environment.apiUrl}/admin/customers`).pipe(
      map((res) => res.items || []),
      tap((items) => this.usersSubject.next(items))
    );
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
    await firstValueFrom(this.refreshCustomers());
    return res.user;
  }

  async removeUser(userId: string): Promise<void> {
    await firstValueFrom(this.http.delete<{ message: string }>(`${environment.apiUrl}/admin/customers/${userId}`));
    await firstValueFrom(this.refreshCustomers());
    await firstValueFrom(this.refreshRequests());
  }

  async approveRequest(requestId: string): Promise<User | null> {
    const res = await firstValueFrom(
      this.http.post<{ message: string; user: User }>(
        `${environment.apiUrl}/admin/requests/${requestId}/approve`,
        {}
      )
    );
    await firstValueFrom(this.refreshCustomers());
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
    await firstValueFrom(this.refreshCustomers());
    await firstValueFrom(this.refreshRequests());
    return res.user || null;
  }
}
