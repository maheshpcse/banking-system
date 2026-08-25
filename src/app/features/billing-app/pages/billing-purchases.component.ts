import { Component, OnInit } from '@angular/core';
import { AlertService } from '../../../core/services/alert.service';
import { BillingService } from '../../../core/services/billing.service';
import {
  BillingCustomer,
  BillingPaymentMethod,
  BillingProduct,
  BillingPurchase
} from '../../../core/models/banking.models';
import { ThemeSelectOption } from '../../../shared/theme-select/theme-select.component';
import { SHIMMER_MS, withShimmerDelay } from '../../../core/utils/shimmer';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

type PurchaseView = 'list' | 'grid' | 'table';

@Component({
  selector: 'app-billing-purchases',
  templateUrl: './billing-purchases.component.html',
  styleUrls: ['./billing-purchases.component.scss']
})
export class BillingPurchasesComponent implements OnInit {
  pageLoading = true;
  filterLoading = false;
  query = '';
  from = '';
  to = '';
  customerId = '';
  productId = '';
  paymentMethod = '';
  page = 1;
  pages = 1;
  total = 0;
  limit = 12;
  items: BillingPurchase[] = [];
  customers: BillingCustomer[] = [];
  products: BillingProduct[] = [];
  view: PurchaseView = 'list';

  readonly methodOptions: ThemeSelectOption[] = [
    { value: '', label: 'All methods' },
    { value: 'cash', label: 'Cash' },
    { value: 'card', label: 'Card' },
    { value: 'upi', label: 'UPI' },
    { value: 'qr', label: 'QR' }
  ];

  constructor(private readonly billing: BillingService, private readonly alerts: AlertService) {}

  get customerOptions(): ThemeSelectOption[] {
    return [
      { value: '', label: 'All customers' },
      ...this.customers.map((c) => ({ value: c.id, label: c.name }))
    ];
  }

  get productOptions(): ThemeSelectOption[] {
    return [
      { value: '', label: 'All products' },
      ...this.products.map((p) => ({ value: p.id, label: p.name }))
    ];
  }

  ngOnInit(): void {
    this.boot();
  }

  boot(): void {
    this.pageLoading = true;
    withShimmerDelay(
      forkJoin({
        purchases: this.billing.listPurchases({ page: 1, limit: this.limit }),
        customers: this.billing.listCustomers().pipe(catchError(() => of({ items: [] as BillingCustomer[] }))),
        products: this.billing.listProducts().pipe(catchError(() => of({ items: [] as BillingProduct[] })))
      }),
      SHIMMER_MS
    ).subscribe({
      next: (bundle) => {
        this.applyPage(bundle.purchases);
        this.customers = bundle.customers.items || [];
        this.products = (bundle.products.items || []).filter((p) => p.active !== false);
        this.pageLoading = false;
      },
      error: async () => {
        this.pageLoading = false;
        await this.alerts.error('Unable to load purchases.');
      }
    });
  }

  setView(view: PurchaseView): void {
    this.view = view;
  }

  applyFilters(): void {
    this.load(1, 'filter');
  }

  clearQuery(): void {
    this.query = '';
    this.load(1, 'filter');
  }

  load(page = 1, mode: 'full' | 'filter' | 'page' = 'page'): void {
    this.page = page;
    if (mode === 'full') {
      this.pageLoading = true;
    } else if (mode === 'filter') {
      this.filterLoading = true;
    }
    withShimmerDelay(
      this.billing.listPurchases({
        q: this.query.trim() || undefined,
        customerId: this.customerId || undefined,
        productId: this.productId || undefined,
        paymentMethod: this.paymentMethod || undefined,
        from: this.from || undefined,
        to: this.to || undefined,
        page: this.page,
        limit: this.limit
      }),
      mode === 'full' || mode === 'filter' ? (mode === 'full' ? SHIMMER_MS : 280) : 0
    ).subscribe({
      next: (res) => {
        this.applyPage(res);
        this.pageLoading = false;
        this.filterLoading = false;
      },
      error: async () => {
        this.pageLoading = false;
        this.filterLoading = false;
        await this.alerts.error('Unable to filter purchases.');
      }
    });
  }

  prev(): void {
    if (this.page > 1) {
      this.load(this.page - 1, 'page');
    }
  }

  next(): void {
    if (this.page < this.pages) {
      this.load(this.page + 1, 'page');
    }
  }

  methodLabel(method?: BillingPaymentMethod | string | null): string {
    if (!method) {
      return '—';
    }
    return String(method).toUpperCase();
  }

  private applyPage(res: {
    items: BillingPurchase[];
    page: number;
    pages: number;
    total: number;
  }): void {
    this.items = res.items || [];
    this.page = res.page;
    this.pages = res.pages || 1;
    this.total = res.total || 0;
  }
}
