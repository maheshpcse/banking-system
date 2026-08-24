import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  BillingBill,
  BillingComplaint,
  BillingComplaintStatus,
  BillingCoupon,
  BillingCustomer,
  BillingDashboardStats,
  BillingGatewaySettings,
  BillingPayment,
  BillingPaymentMethod,
  BillingProduct
} from '../models/banking.models';

@Injectable({ providedIn: 'root' })
export class BillingService {
  private readonly base = `${environment.apiUrl}/billing`;

  constructor(private readonly http: HttpClient) {}

  getStats(): Observable<BillingDashboardStats> {
    return this.http.get<BillingDashboardStats>(`${this.base}/dashboard/stats`);
  }

  listProducts(q = ''): Observable<{ items: BillingProduct[] }> {
    let params = new HttpParams();
    if (q) params = params.set('q', q);
    return this.http.get<{ items: BillingProduct[] }>(`${this.base}/products`, { params });
  }

  createProduct(payload: Partial<BillingProduct>): Observable<{ message: string; product: BillingProduct }> {
    return this.http.post<{ message: string; product: BillingProduct }>(`${this.base}/products`, payload);
  }

  updateProduct(
    id: string,
    payload: Partial<BillingProduct>
  ): Observable<{ message: string; product: BillingProduct }> {
    return this.http.put<{ message: string; product: BillingProduct }>(`${this.base}/products/${id}`, payload);
  }

  archiveProduct(id: string): Observable<{ message: string; product: BillingProduct }> {
    return this.http.delete<{ message: string; product: BillingProduct }>(`${this.base}/products/${id}`);
  }

  listCustomers(q = ''): Observable<{ items: BillingCustomer[] }> {
    let params = new HttpParams();
    if (q) params = params.set('q', q);
    return this.http.get<{ items: BillingCustomer[] }>(`${this.base}/customers`, { params });
  }

  createCustomer(
    payload: Partial<BillingCustomer>
  ): Observable<{ message: string; customer: BillingCustomer }> {
    return this.http.post<{ message: string; customer: BillingCustomer }>(`${this.base}/customers`, payload);
  }

  updateCustomer(
    id: string,
    payload: Partial<BillingCustomer>
  ): Observable<{ message: string; customer: BillingCustomer }> {
    return this.http.put<{ message: string; customer: BillingCustomer }>(
      `${this.base}/customers/${id}`,
      payload
    );
  }

  deleteCustomer(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/customers/${id}`);
  }

  listBills(query: {
    q?: string;
    customerId?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  } = {}): Observable<{ items: BillingBill[]; page: number; limit: number; total: number; pages: number }> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value != null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<{
      items: BillingBill[];
      page: number;
      limit: number;
      total: number;
      pages: number;
    }>(`${this.base}/bills`, { params });
  }

  getBill(id: string): Observable<{ bill: BillingBill; payments: BillingPayment[] }> {
    return this.http.get<{ bill: BillingBill; payments: BillingPayment[] }>(`${this.base}/bills/${id}`);
  }

  createBill(payload: {
    customerId: string;
    items: Array<{ productId: string; quantity: number }>;
    discount?: number;
    couponCode?: string;
    notes?: string;
  }): Observable<{ message: string; bill: BillingBill }> {
    return this.http.post<{ message: string; bill: BillingBill }>(`${this.base}/bills`, payload);
  }

  payBill(payload: {
    billId: string;
    paymentMethod: BillingPaymentMethod;
    simulateFail?: boolean;
    provider?: string;
    sessionId?: string;
    channel?: string;
    cardLast4?: string;
    upiVpa?: string;
  }): Observable<{ message: string; payment: BillingPayment; bill: BillingBill }> {
    return this.http.post<{ message: string; payment: BillingPayment; bill: BillingBill }>(
      `${this.base}/payments`,
      payload
    );
  }

  listCoupons(includeInactive = false): Observable<{ items: BillingCoupon[] }> {
    let params = new HttpParams();
    if (includeInactive) params = params.set('includeInactive', '1');
    return this.http.get<{ items: BillingCoupon[] }>(`${this.base}/coupons`, { params });
  }

  validateCoupon(payload: {
    code: string;
    subtotal: number;
    paymentMethod?: BillingPaymentMethod | string;
  }): Observable<{ message: string; discount: number; coupon: BillingCoupon }> {
    return this.http.post<{ message: string; discount: number; coupon: BillingCoupon }>(
      `${this.base}/coupons/validate`,
      payload
    );
  }

  createCoupon(
    payload: Partial<BillingCoupon>
  ): Observable<{ message: string; coupon: BillingCoupon }> {
    return this.http.post<{ message: string; coupon: BillingCoupon }>(`${this.base}/coupons`, payload);
  }

  updateCoupon(
    id: string,
    payload: Partial<BillingCoupon>
  ): Observable<{ message: string; coupon: BillingCoupon }> {
    return this.http.put<{ message: string; coupon: BillingCoupon }>(
      `${this.base}/coupons/${id}`,
      payload
    );
  }

  deleteCoupon(id: string): Observable<{ message: string; coupon: BillingCoupon }> {
    return this.http.delete<{ message: string; coupon: BillingCoupon }>(`${this.base}/coupons/${id}`);
  }

  listComplaints(status = ''): Observable<{ items: BillingComplaint[] }> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<{ items: BillingComplaint[] }>(`${this.base}/complaints`, { params });
  }

  createComplaint(payload: {
    customerName: string;
    subject: string;
    detail: string;
    billId?: string;
    billNumber?: string;
    customerId?: string;
    bankingAccountNumber?: string;
  }): Observable<{ message: string; complaint: BillingComplaint }> {
    return this.http.post<{ message: string; complaint: BillingComplaint }>(
      `${this.base}/complaints`,
      payload
    );
  }

  updateComplaint(
    id: string,
    payload: { action: BillingComplaintStatus; resolutionNote?: string }
  ): Observable<{ message: string; complaint: BillingComplaint }> {
    return this.http.patch<{ message: string; complaint: BillingComplaint }>(
      `${this.base}/complaints/${id}`,
      payload
    );
  }

  seedCatalog(force = false): Observable<{ message: string; products?: number; customers?: number }> {
    return this.http.post<{ message: string; products?: number; customers?: number }>(
      `${this.base}/seed`,
      { force }
    );
  }

  getSettings(): Observable<{ settings: BillingGatewaySettings }> {
    return this.http.get<{ settings: BillingGatewaySettings }>(`${this.base}/settings`);
  }

  updateSettings(
    payload: Partial<BillingGatewaySettings>
  ): Observable<{ message: string; settings: BillingGatewaySettings }> {
    return this.http.put<{ message: string; settings: BillingGatewaySettings }>(
      `${this.base}/settings`,
      payload
    );
  }
}
