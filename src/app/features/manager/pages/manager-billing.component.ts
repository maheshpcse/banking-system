import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AlertService } from '../../../core/services/alert.service';
import { BillingService } from '../../../core/services/billing.service';
import {
  BillingBill,
  BillingComplaint,
  BillingCustomer,
  BillingDashboardStats,
  BillingPaymentMethod,
  BillingProduct
} from '../../../core/models/banking.models';
import { SHIMMER_MS, withShimmerDelay } from '../../../core/utils/shimmer';

type BillingTab = 'desk' | 'catalog' | 'pos' | 'history' | 'disputes';

interface CartLine {
  productId: string;
  name: string;
  unitPrice: number;
  gstPercentage: number;
  quantity: number;
  stock: number;
}

@Component({
  selector: 'app-manager-billing',
  templateUrl: './manager-billing.component.html',
  styleUrls: ['./manager-billing.component.scss', './manager-shared.scss']
})
export class ManagerBillingComponent implements OnInit {
  pageLoading = true;
  busy = false;
  activeTab: BillingTab = 'desk';
  readonly tabs: Array<{ id: BillingTab; label: string; hint: string }> = [
    { id: 'desk', label: 'Desk', hint: 'Sales pulse' },
    { id: 'catalog', label: 'Catalog', hint: 'Products & clients' },
    { id: 'pos', label: 'POS', hint: 'Create invoice' },
    { id: 'history', label: 'History', hint: 'Past bills' },
    { id: 'disputes', label: 'Disputes', hint: 'Complaint queue' }
  ];

  stats: BillingDashboardStats | null = null;
  products: BillingProduct[] = [];
  customers: BillingCustomer[] = [];
  bills: BillingBill[] = [];
  complaints: BillingComplaint[] = [];
  billPages = 1;
  billPage = 1;

  productQuery = '';
  customerQuery = '';
  historyQuery = '';
  historyFrom = '';
  historyTo = '';

  cart: CartLine[] = [];
  discount = 0;
  selectedCustomerId = '';
  paymentMethod: BillingPaymentMethod = 'card';
  paying = false;
  qrPhase: 'idle' | 'scanning' | 'success' | 'failed' = 'idle';
  activeInvoice: BillingBill | null = null;

  editingProductId: string | null = null;
  editingCustomerId: string | null = null;

  productForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    sku: [''],
    price: [0, [Validators.required, Validators.min(0)]],
    stock: [0, [Validators.required, Validators.min(0)]],
    gstPercentage: [18, [Validators.required, Validators.min(0), Validators.max(100)]]
  });

  customerForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: [''],
    phone: [''],
    address: [''],
    bankingAccountNumber: ['']
  });

  complaintForm = this.fb.group({
    customerName: ['', Validators.required],
    billNumber: [''],
    subject: ['', Validators.required],
    detail: ['', [Validators.required, Validators.minLength(8)]]
  });

  constructor(
    private readonly billing: BillingService,
    private readonly alerts: AlertService,
    private readonly fb: FormBuilder
  ) {}

  ngOnInit(): void {
    withShimmerDelay(this.reloadAll(), SHIMMER_MS).subscribe({
      next: (bundle) => {
        this.applyBundle(bundle);
        this.pageLoading = false;
      },
      error: async () => {
        this.pageLoading = false;
        await this.alerts.error('Unable to open Billing desk.');
      }
    });
  }

  get cartSubtotal(): number {
    return this.round(
      this.cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)
    );
  }

  get cartTax(): number {
    const scale =
      this.cartSubtotal > 0 ? (this.cartSubtotal - this.safeDiscount) / this.cartSubtotal : 0;
    const rawTax = this.cart.reduce(
      (sum, line) => sum + (line.unitPrice * line.quantity * line.gstPercentage) / 100,
      0
    );
    return this.round(rawTax * scale);
  }

  get safeDiscount(): number {
    return Math.min(this.round(Number(this.discount) || 0), this.cartSubtotal);
  }

  get cartGrandTotal(): number {
    return this.round(this.cartSubtotal - this.safeDiscount + this.cartTax);
  }

  setTab(tab: BillingTab): void {
    this.activeTab = tab;
    if (tab === 'history') {
      this.loadBills();
    }
    if (tab === 'disputes') {
      this.loadComplaints();
    }
  }

  reloadAll() {
    return forkJoin({
      stats: this.billing.getStats().pipe(catchError(() => of(null))),
      products: this.billing.listProducts().pipe(catchError(() => of({ items: [] as BillingProduct[] }))),
      customers: this.billing
        .listCustomers()
        .pipe(catchError(() => of({ items: [] as BillingCustomer[] }))),
      bills: this.billing.listBills({ page: 1, limit: 8 }).pipe(
        catchError(() => of({ items: [] as BillingBill[], page: 1, pages: 1, total: 0, limit: 8 }))
      ),
      complaints: this.billing
        .listComplaints()
        .pipe(catchError(() => of({ items: [] as BillingComplaint[] })))
    });
  }

  private applyBundle(bundle: {
    stats: BillingDashboardStats | null;
    products: { items: BillingProduct[] };
    customers: { items: BillingCustomer[] };
    bills: { items: BillingBill[]; page: number; pages: number };
    complaints: { items: BillingComplaint[] };
  }): void {
    this.stats = bundle.stats;
    this.products = bundle.products.items.filter((p) => p.active !== false);
    this.customers = bundle.customers.items;
    this.bills = bundle.bills.items;
    this.billPage = bundle.bills.page;
    this.billPages = bundle.bills.pages;
    this.complaints = bundle.complaints.items;
  }

  async refresh(): Promise<void> {
    this.busy = true;
    this.reloadAll().subscribe({
      next: (bundle) => {
        this.applyBundle(bundle);
        this.busy = false;
      },
      error: async () => {
        this.busy = false;
        await this.alerts.error('Refresh failed.');
      }
    });
  }

  async seedCatalog(): Promise<void> {
    this.busy = true;
    this.billing.seedCatalog(false).subscribe({
      next: async (res) => {
        await this.alerts.success(res.message || 'Sample catalog ready.');
        await this.refresh();
      },
      error: async (err) => {
        this.busy = false;
        await this.alerts.error(err?.error?.message || 'Unable to seed catalog.');
      }
    });
  }

  searchProducts(): void {
    this.billing.listProducts(this.productQuery).subscribe({
      next: (res) => {
        this.products = res.items.filter((p) => p.active !== false);
      }
    });
  }

  searchCustomers(): void {
    this.billing.listCustomers(this.customerQuery).subscribe({
      next: (res) => {
        this.customers = res.items;
      }
    });
  }

  startEditProduct(product?: BillingProduct): void {
    this.editingProductId = product?.id || null;
    this.productForm.reset({
      name: product?.name || '',
      sku: product?.sku || '',
      price: product?.price ?? 0,
      stock: product?.stock ?? 0,
      gstPercentage: product?.gstPercentage ?? 18
    });
  }

  saveProduct(): void {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }
    const raw = this.productForm.getRawValue();
    const payload = {
      name: String(raw.name || ''),
      sku: String(raw.sku || ''),
      price: Number(raw.price || 0),
      stock: Number(raw.stock || 0),
      gstPercentage: Number(raw.gstPercentage || 0)
    };
    const req$ = this.editingProductId
      ? this.billing.updateProduct(this.editingProductId, payload)
      : this.billing.createProduct(payload);
    req$.subscribe({
      next: async (res) => {
        await this.alerts.success(res.message);
        this.startEditProduct();
        this.searchProducts();
        void this.refresh();
      },
      error: async (err) => this.alerts.error(err?.error?.message || 'Unable to save product.')
    });
  }

  archiveProduct(product: BillingProduct): void {
    this.billing.archiveProduct(product.id).subscribe({
      next: async (res) => {
        await this.alerts.success(res.message);
        this.searchProducts();
        void this.refresh();
      },
      error: async (err) => this.alerts.error(err?.error?.message || 'Unable to archive product.')
    });
  }

  startEditCustomer(customer?: BillingCustomer): void {
    this.editingCustomerId = customer?.id || null;
    this.customerForm.reset({
      name: customer?.name || '',
      email: customer?.email || '',
      phone: customer?.phone || '',
      address: customer?.address || '',
      bankingAccountNumber: customer?.bankingAccountNumber || ''
    });
  }

  saveCustomer(): void {
    if (this.customerForm.invalid) {
      this.customerForm.markAllAsTouched();
      return;
    }
    const raw = this.customerForm.getRawValue();
    const payload = {
      name: String(raw.name || ''),
      email: String(raw.email || ''),
      phone: String(raw.phone || ''),
      address: String(raw.address || ''),
      bankingAccountNumber: String(raw.bankingAccountNumber || '') || null
    };
    const req$ = this.editingCustomerId
      ? this.billing.updateCustomer(this.editingCustomerId, payload)
      : this.billing.createCustomer(payload);
    req$.subscribe({
      next: async (res) => {
        await this.alerts.success(res.message);
        this.startEditCustomer();
        this.searchCustomers();
        void this.refresh();
      },
      error: async (err) => this.alerts.error(err?.error?.message || 'Unable to save customer.')
    });
  }

  removeCustomer(customer: BillingCustomer): void {
    this.billing.deleteCustomer(customer.id).subscribe({
      next: async (res) => {
        await this.alerts.success(res.message);
        this.searchCustomers();
        void this.refresh();
      },
      error: async (err) => this.alerts.error(err?.error?.message || 'Unable to remove customer.')
    });
  }

  addToCart(product: BillingProduct): void {
    if (product.stock < 1) {
      void this.alerts.warning('Out of stock.');
      return;
    }
    const existing = this.cart.find((c) => c.productId === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) {
        void this.alerts.warning('Stock limit reached.');
        return;
      }
      existing.quantity += 1;
      return;
    }
    this.cart = [
      ...this.cart,
      {
        productId: product.id,
        name: product.name,
        unitPrice: product.price,
        gstPercentage: product.gstPercentage,
        quantity: 1,
        stock: product.stock
      }
    ];
  }

  updateQty(line: CartLine, delta: number): void {
    line.quantity = Math.max(1, Math.min(line.stock, line.quantity + delta));
  }

  removeLine(line: CartLine): void {
    this.cart = this.cart.filter((c) => c.productId !== line.productId);
  }

  clearCart(): void {
    this.cart = [];
    this.discount = 0;
    this.activeInvoice = null;
    this.qrPhase = 'idle';
  }

  createInvoice(): void {
    if (!this.selectedCustomerId || !this.cart.length) {
      void this.alerts.warning('Choose a customer and add at least one product.');
      return;
    }
    this.busy = true;
    this.billing
      .createBill({
        customerId: this.selectedCustomerId,
        items: this.cart.map((c) => ({ productId: c.productId, quantity: c.quantity })),
        discount: this.safeDiscount
      })
      .subscribe({
        next: async (res) => {
          this.busy = false;
          this.activeInvoice = res.bill;
          this.cart = [];
          await this.alerts.success(res.message);
          void this.refresh();
        },
        error: async (err) => {
          this.busy = false;
          await this.alerts.error(err?.error?.message || 'Unable to create invoice.');
        }
      });
  }

  async collectPayment(simulateFail = false): Promise<void> {
    if (!this.activeInvoice || this.activeInvoice.paymentStatus === 'paid') {
      return;
    }
    this.paying = true;
    if (this.paymentMethod === 'qr') {
      this.qrPhase = 'scanning';
      await new Promise((r) => setTimeout(r, 1400));
    }
    this.billing
      .payBill({
        billId: this.activeInvoice.id,
        paymentMethod: this.paymentMethod,
        simulateFail
      })
      .subscribe({
        next: async (res) => {
          this.paying = false;
          this.activeInvoice = res.bill;
          this.qrPhase = res.payment.status === 'success' ? 'success' : 'failed';
          if (res.payment.status === 'success') {
            await this.alerts.success(res.message);
          } else {
            await this.alerts.error(res.message);
          }
          void this.refresh();
        },
        error: async (err) => {
          this.paying = false;
          this.qrPhase = 'failed';
          await this.alerts.error(err?.error?.message || 'Payment failed.');
        }
      });
  }

  loadBills(page = 1): void {
    this.billing
      .listBills({
        q: this.historyQuery,
        from: this.historyFrom,
        to: this.historyTo,
        page,
        limit: 10
      })
      .subscribe({
        next: (res) => {
          this.bills = res.items;
          this.billPage = res.page;
          this.billPages = res.pages;
        }
      });
  }

  openInvoice(bill: BillingBill): void {
    this.activeInvoice = bill;
    this.activeTab = 'pos';
    this.qrPhase = bill.paymentStatus === 'paid' ? 'success' : 'idle';
  }

  printInvoice(): void {
    window.print();
  }

  loadComplaints(): void {
    this.billing.listComplaints().subscribe({
      next: (res) => {
        this.complaints = res.items;
      }
    });
  }

  fileComplaint(): void {
    if (this.complaintForm.invalid) {
      this.complaintForm.markAllAsTouched();
      return;
    }
    const raw = this.complaintForm.getRawValue();
    this.billing
      .createComplaint({
        customerName: String(raw.customerName || ''),
        billNumber: String(raw.billNumber || ''),
        subject: String(raw.subject || ''),
        detail: String(raw.detail || '')
      })
      .subscribe({
      next: async (res) => {
        await this.alerts.success(res.message);
        this.complaintForm.reset({ customerName: '', billNumber: '', subject: '', detail: '' });
        this.loadComplaints();
        void this.refresh();
      },
      error: async (err) => this.alerts.error(err?.error?.message || 'Unable to file complaint.')
    });
  }

  resolveComplaint(
    complaint: BillingComplaint,
    action: 'accepted' | 'adjusted' | 'rejected' | 'escalated' | 'resolved'
  ): void {
    this.billing.updateComplaint(complaint.id, { action }).subscribe({
      next: async (res) => {
        await this.alerts.success(res.message);
        this.loadComplaints();
        void this.refresh();
      },
      error: async (err) => this.alerts.error(err?.error?.message || 'Unable to update complaint.')
    });
  }

  private round(n: number): number {
    return Math.round(n * 100) / 100;
  }
}
