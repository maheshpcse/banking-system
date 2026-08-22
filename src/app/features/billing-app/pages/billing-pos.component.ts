import { Component, OnInit } from '@angular/core';
import { firstValueFrom, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AlertService } from '../../../core/services/alert.service';
import { BillingService } from '../../../core/services/billing.service';
import {
  BillingBill,
  BillingCustomer,
  BillingGatewaySettings,
  BillingPaymentMethod,
  BillingProduct
} from '../../../core/models/banking.models';
import { SHIMMER_MS, withShimmerDelay } from '../../../core/utils/shimmer';

interface CartLine {
  productId: string;
  name: string;
  unitPrice: number;
  gstPercentage: number;
  quantity: number;
  stock: number;
}

@Component({
  selector: 'app-billing-pos',
  templateUrl: './billing-pos.component.html',
  styleUrls: ['./billing-pos.component.scss']
})
export class BillingPosComponent implements OnInit {
  pageLoading = true;
  busy = false;
  paying = false;
  productQuery = '';
  products: BillingProduct[] = [];
  customers: BillingCustomer[] = [];
  settings: BillingGatewaySettings | null = null;
  cart: CartLine[] = [];
  discount = 0;
  selectedCustomerId = '';
  paymentMethod: BillingPaymentMethod = 'cash';
  showPayModal = false;
  qrPhase: 'idle' | 'scanning' | 'success' | 'failed' = 'idle';
  activeInvoice: BillingBill | null = null;

  constructor(
    private readonly billing: BillingService,
    private readonly alerts: AlertService
  ) {}

  ngOnInit(): void {
    this.boot();
  }

  get cartSubtotal(): number {
    return this.round(this.cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0));
  }

  get safeDiscount(): number {
    return Math.min(this.round(Number(this.discount) || 0), this.cartSubtotal);
  }

  get cartTax(): number {
    const scale = this.cartSubtotal > 0 ? (this.cartSubtotal - this.safeDiscount) / this.cartSubtotal : 0;
    const rawTax = this.cart.reduce(
      (sum, line) => sum + (line.unitPrice * line.quantity * line.gstPercentage) / 100,
      0
    );
    return this.round(rawTax * scale);
  }

  get cartGrandTotal(): number {
    return this.round(this.cartSubtotal - this.safeDiscount + this.cartTax);
  }

  get enabledMethods(): BillingPaymentMethod[] {
    const m = this.settings?.methods;
    const all: BillingPaymentMethod[] = ['cash', 'card', 'upi', 'qr'];
    if (!m) {
      return all;
    }
    return all.filter((key) => m[key] !== false);
  }

  boot(): void {
    this.pageLoading = true;
    withShimmerDelay(
      forkJoin({
        products: this.billing.listProducts().pipe(catchError(() => of({ items: [] as BillingProduct[] }))),
        customers: this.billing
          .listCustomers()
          .pipe(catchError(() => of({ items: [] as BillingCustomer[] }))),
        settings: this.billing
          .getSettings()
          .pipe(catchError(() => of({ settings: null as BillingGatewaySettings | null })))
      }),
      SHIMMER_MS
    ).subscribe({
      next: (bundle) => {
        this.products = (bundle.products.items || []).filter((p) => p.active !== false);
        this.customers = bundle.customers.items || [];
        this.settings = bundle.settings.settings;
        const methods = this.enabledMethods;
        if (methods.length) {
          this.paymentMethod = methods[0];
        }
        this.pageLoading = false;
      },
      error: async () => {
        this.pageLoading = false;
        await this.alerts.error('Unable to open POS.');
      }
    });
  }

  searchProducts(): void {
    this.pageLoading = true;
    withShimmerDelay(this.billing.listProducts(this.productQuery.trim()), SHIMMER_MS).subscribe({
      next: (res) => {
        this.products = (res.items || []).filter((p) => p.active !== false);
        this.pageLoading = false;
      },
      error: async () => {
        this.pageLoading = false;
        await this.alerts.error('Product search failed.');
      }
    });
  }

  clearProductQuery(): void {
    this.productQuery = '';
    this.searchProducts();
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
    this.showPayModal = false;
  }

  async createInvoice(): Promise<void> {
    if (!this.selectedCustomerId || !this.cart.length) {
      void this.alerts.warning('Choose a customer and add at least one product.');
      return;
    }
    const items = this.cart.map((c) => ({ productId: c.productId, quantity: c.quantity }));
    const discount = this.safeDiscount;
    this.busy = true;
    const outcome = await this.alerts.confirmAction({
      text: `Create invoice for ${this.cartGrandTotal.toFixed(2)}?`,
      confirmText: 'Create invoice',
      loadingText: 'Creating invoice…',
      action: () =>
        withShimmerDelay(
          this.billing.createBill({
            customerId: this.selectedCustomerId,
            items,
            discount
          }),
          SHIMMER_MS
        ),
      successMessage: (res) => res.message || 'Invoice created',
      errorMessage: (err) =>
        (err as { error?: { message?: string } })?.error?.message || 'Unable to create invoice.'
    });
    this.busy = false;
    if (outcome.ok) {
      this.activeInvoice = outcome.result.bill;
      this.cart = [];
      this.discount = 0;
      this.showPayModal = true;
      this.qrPhase = 'idle';
    }
  }

  openPayModal(bill?: BillingBill): void {
    if (bill) {
      this.activeInvoice = bill;
    }
    if (!this.activeInvoice || this.activeInvoice.paymentStatus === 'paid') {
      return;
    }
    this.showPayModal = true;
    this.qrPhase = 'idle';
  }

  closePayModal(): void {
    this.showPayModal = false;
    this.qrPhase = 'idle';
  }

  async collectPayment(): Promise<void> {
    if (!this.activeInvoice || this.activeInvoice.paymentStatus === 'paid') {
      return;
    }
    const billId = this.activeInvoice.id;
    const method = this.paymentMethod;
    this.paying = true;
    if (method === 'qr') {
      this.qrPhase = 'scanning';
    }

    const outcome = await this.alerts.confirmAction({
      text: `Collect ${this.activeInvoice.grandTotal.toFixed(2)} via ${this.methodLabel(method)}?`,
      confirmText: 'Confirm payment',
      loadingText: method === 'qr' ? 'Scanning QR…' : 'Processing payment…',
      action: async () => {
        if (method === 'qr') {
          await new Promise((r) => setTimeout(r, 1400));
        }
        return firstValueFrom(
          withShimmerDelay(
            this.billing.payBill({
              billId,
              paymentMethod: method
            }),
            SHIMMER_MS
          )
        );
      },
      successMessage: (res) => res.message || 'Payment recorded',
      errorMessage: (err) =>
        (err as { error?: { message?: string } })?.error?.message || 'Payment failed.'
    });

    this.paying = false;
    if (outcome.ok) {
      this.activeInvoice = outcome.result.bill;
      this.qrPhase = method === 'qr' ? 'success' : 'idle';
      if (outcome.result.bill.paymentStatus === 'paid') {
        setTimeout(() => this.closePayModal(), 700);
      }
    } else if (!outcome.cancelled) {
      this.qrPhase = method === 'qr' ? 'failed' : 'idle';
    } else {
      this.qrPhase = 'idle';
    }
  }

  printInvoice(): void {
    if (!this.activeInvoice) {
      return;
    }
    const bill = this.activeInvoice;
    const lines = bill.items
      .map(
        (i) =>
          `<tr><td>${i.name}</td><td>${i.quantity}</td><td>${i.unitPrice.toFixed(2)}</td><td>${i.lineTotal.toFixed(2)}</td></tr>`
      )
      .join('');
    const html = `<!doctype html><html><head><title>${bill.billNumber}</title>
      <style>body{font-family:system-ui,sans-serif;padding:24px;color:#16323a}
      h1{font-size:18px;margin:0 0 8px}table{width:100%;border-collapse:collapse;margin-top:16px}
      th,td{border-bottom:1px solid #d9e8e2;padding:8px;text-align:left;font-size:13px}
      .tot{margin-top:16px;font-weight:700}</style></head><body>
      <h1>Invoice ${bill.billNumber}</h1>
      <div>${bill.customerName}</div>
      <table><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
      <tbody>${lines}</tbody></table>
      <div class="tot">Grand total: ${bill.grandTotal.toFixed(2)} · ${bill.paymentStatus}</div>
      </body></html>`;
    const win = window.open('', '_blank', 'noopener,noreferrer,width=720,height=900');
    if (!win) {
      void this.alerts.warning('Allow pop-ups to print the invoice.');
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }

  methodLabel(method: BillingPaymentMethod): string {
    if (method === 'card') {
      return this.settings?.cardLabel || 'Card';
    }
    if (method === 'upi') {
      return this.settings?.upiVpa ? `UPI (${this.settings.upiVpa})` : 'UPI';
    }
    return method.toUpperCase();
  }

  private round(n: number): number {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }
}
