import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AccountSummary, Transaction, User } from '../models/banking.models';

export interface AccountDirectoryItem {
  accountNumber: string;
  displayName: string;
}

@Injectable({
  providedIn: 'root'
})
export class AccountService {
  constructor(private http: HttpClient) {}

  getSummary(): Observable<AccountSummary> {
    return this.http.get<AccountSummary>(`${environment.apiUrl}/account/summary`);
  }

  lookupDirectory(query: string): Observable<AccountDirectoryItem[]> {
    const q = String(query || '').trim();
    if (q.length < 2) {
      return of([]);
    }
    const params = new HttpParams().set('q', q);
    return this.http
      .get<{ items: AccountDirectoryItem[] }>(`${environment.apiUrl}/account/directory`, { params })
      .pipe(
        map((res) => res.items || []),
        catchError(() => of([]))
      );
  }

  deposit(payload: { amount: number; description?: string }): Observable<{ message: string; user: User; transaction: Transaction }> {
    return this.http.post<{ message: string; user: User; transaction: Transaction }>(
      `${environment.apiUrl}/account/deposit`,
      payload
    );
  }

  withdraw(payload: { amount: number; description?: string }): Observable<{ message: string; user: User; transaction: Transaction }> {
    return this.http.post<{ message: string; user: User; transaction: Transaction }>(
      `${environment.apiUrl}/account/withdraw`,
      payload
    );
  }

  transfer(payload: {
    toAccountNumber: string;
    amount: number;
    description?: string;
  }): Observable<{ message: string; user: User; transaction: Transaction }> {
    return this.http.post<{ message: string; user: User; transaction: Transaction }>(
      `${environment.apiUrl}/account/transfer`,
      payload
    );
  }
}
