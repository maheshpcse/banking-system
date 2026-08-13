import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TransactionListResponse } from '../models/banking.models';

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  constructor(private http: HttpClient) {}

  list(options: { page?: number; limit?: number; type?: string } = {}): Observable<TransactionListResponse> {
    let params = new HttpParams();
    if (options.page) {
      params = params.set('page', String(options.page));
    }
    if (options.limit) {
      params = params.set('limit', String(options.limit));
    }
    if (options.type) {
      params = params.set('type', options.type);
    }
    return this.http.get<TransactionListResponse>(`${environment.apiUrl}/transactions`, { params });
  }
}
