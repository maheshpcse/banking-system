import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AccountSummary, Transaction, User } from '../models/banking.models';

@Injectable({
  providedIn: 'root'
})
export class AccountService {
  constructor(private http: HttpClient) {}

  getSummary(): Observable<AccountSummary> {
    return this.http.get<AccountSummary>(`${environment.apiUrl}/account/summary`);
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
