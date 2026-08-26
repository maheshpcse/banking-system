import { Component, OnInit } from '@angular/core';
import { AlertService } from '../../../core/services/alert.service';
import { BillingService } from '../../../core/services/billing.service';
import {
  BillingBill,
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
  detailRow: BillingPurchase | null = null;
  detailBill: BillingBill | null = null;
  detailCustomer: BillingCustomer | null = null;
  detailLoading = false;
  detailLeaving = false;
  private detailTimer: ReturnType<typeof setTimeout> | null = null;
  private viewTimer: ReturnType<typeof setTimeout> | null = null;

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

  get dataShimmerVariant():
    | 'purchases-data-list'
    | 'purchases-data-grid'
    | 'purchases-data-table' {
    if (this.view === 'list') {
      return 'purchases-data-list';
    }
    if (this.view === 'grid') {
      return 'purchases-data-grid';
    }
    return 'purchases-data-table';
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
    if (this.view === view || this.filterLoading) {
      return;
    }
    this.view = view;
    this.filterLoading = true;
    if (this.viewTimer) {
      clearTimeout(this.viewTimer);
    }
    this.viewTimer = setTimeout(() => {
      this.filterLoading = false;
      this.viewTimer = null;
    }, 280);
  }

  applyFilters(): void {
    if (
      !this.query.trim() &&
      !this.from &&
      !this.to &&
      !this.customerId &&
      !this.productId &&
      !this.paymentMethod
    ) {
      void this.alerts.toastWarning(
        'Enter a filter',
        'Add a search term, customer, product, method, or date before filtering.'
      );
      return;
    }
    this.load(1, 'filter');
  }

  /** Dropdown / date changes always reload — no empty-criteria toast. */
  onCriteriaChange(): void {
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
    } else {
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
      mode === 'full' ? SHIMMER_MS : 280
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

  openDetail(row: BillingPurchase): void {
    if (this.detailTimer) {
      clearTimeout(this.detailTimer);
      this.detailTimer = null;
    }
    this.detailLeaving = false;
    this.detailRow = row;
    this.detailBill = null;
    this.detailCustomer = this.customers.find((c) => c.id === row.customerId) || null;
    this.detailLoading = true;
    withShimmerDelay(this.billing.getBill(row.billId), SHIMMER_MS).subscribe({
      next: (res) => {
        this.detailBill = res.bill;
        if (!this.detailCustomer && res.bill.customerId) {
          this.detailCustomer = this.customers.find((c) => c.id === res.bill.customerId) || null;
        }
        this.detailLoading = false;
      },
      error: async () => {
        this.detailLoading = false;
        await this.alerts.error('Unable to open purchase detail.');
      }
    });
  }

  closeDetail(): void {
    if (!this.detailRow || this.detailLeaving) {
      return;
    }
    this.detailLeaving = true;
    this.detailTimer = setTimeout(() => {
      this.detailRow = null;
      this.detailBill = null;
      this.detailCustomer = null;
      this.detailLeaving = false;
      this.detailTimer = null;
    }, 200);
  }

  methodLabel(method?: BillingPaymentMethod | string | null): string {
    if (!method) {
      return '—';
    }
    return String(method).toUpperCase();
  }

  statusLabel(status?: string | null): string {
    switch (status) {
      case 'paid':
        return 'Payment Success';
      case 'pending':
        return 'Payment Pending';
      case 'failed':
        return 'Payment Failure';
      case 'error':
        return 'Payment Error';
      case 'draft':
        return 'Bill Created';
      default:
        return status || 'Paid';
    }
  }

  private applyPage(res: {
    items: BillingPurchase[];
    page: number;
    pages: number;
    total: number;
  }): void {
    this.items = res.items || [];
    this.page = res.page;
    this.pages = Math.max(1, res.pages || 1);
    this.total = res.total || 0;
  }
}
