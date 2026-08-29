import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DemoStaffUser {
  tempId: string;
  fullName: string;
  username: string;
  email: string;
  role: 'manager' | 'admin';
  password: string;
  staffStatus: string;
  selected?: boolean;
}

export interface DemoProduct {
  tempId: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  gstPercentage: number;
  category: string;
  active: boolean;
  selected?: boolean;
}

export interface DemoCustomer {
  tempId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  bankingAccountNumber?: string | null;
  rewardPoints: number;
  selected?: boolean;
}

export interface DemoCoupon {
  tempId: string;
  code: string;
  title: string;
  kind: string;
  discountType: string;
  value: number;
  paymentScopes: string[];
  usageNote: string;
  minSubtotal: number;
  active: boolean;
  selected?: boolean;
}

export interface DemoGenerateResult {
  users: DemoStaffUser[];
  products: DemoProduct[];
  customers: DemoCustomer[];
  coupons: DemoCoupon[];
  commonPassword: string;
}

export interface DemoCommitResult {
  users: { created: number; skipped: number };
  products: { created: number; skipped: number };
  customers: { created: number; skipped: number };
  coupons: { created: number; skipped: number };
}

@Injectable({ providedIn: 'root' })
export class AdminDemoService {
  constructor(private readonly http: HttpClient) {}

  generate(payload: {
    users?: number;
    products?: number;
    customers?: number;
    coupons?: number;
  }): Observable<DemoGenerateResult> {
    return this.http.post<DemoGenerateResult>(`${environment.apiUrl}/admin/demo/generate`, payload);
  }

  commit(payload: {
    users: DemoStaffUser[];
    products: DemoProduct[];
    customers: DemoCustomer[];
    coupons: DemoCoupon[];
  }): Observable<DemoCommitResult> {
    return this.http.post<DemoCommitResult>(`${environment.apiUrl}/admin/demo/commit`, payload);
  }
}
