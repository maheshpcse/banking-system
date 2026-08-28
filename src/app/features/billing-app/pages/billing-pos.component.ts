import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AlertService } from '../../../core/services/alert.service';
import { BillingService } from '../../../core/services/billing.service';
import {
  BillingBill,
  BillingCoupon,
  BillingCustomer,
  BillingGatewaySettings,
  BillingPayment,
  BillingPaymentMethod,
  BillingProduct
} from '../../../core/models/banking.models';
import { SHIMMER_MS, withShimmerDelay } from '../../../core/utils/shimmer';
import { ThemeSelectOption } from '../../../shared/theme-select/theme-select.component';

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
  productLoading = false;
  findBusy = false;
  busy = false;
  couponBusy = false;
  productQuery = '';
  products: BillingProduct[] = [];
  customers: BillingCustomer[] = [];
  coupons: BillingCoupon[] = [];
  settings: BillingGatewaySettings | null = null;
  cart: CartLine[] = [];
  discount = 0;
  selectedCustomerId = '';
  selectedCouponCode = '';
  appliedCoupon: BillingCoupon | null = null;
  gatewayOpen = false;
  activeInvoice: BillingBill | null = null;
  private resumeBillId = '';

  get customerSelectOptions(): ThemeSelectOption[] {
    return this.customers.map((c) => ({ value: c.id, label: c.name }));
  }

  get couponSelectOptions(): ThemeSelectOption[] {
    return this.coupons
      .filter((c) => c.active !== false)
      .map((c) => {
        const disc =
          c.discountType === 'percent' ? `${c.value}%` : `$${Number(c.value).toFixed(2)}`;
        const min = Number(c.minSubtotal) || 0;
        const minNote = min > 0 ? ` · min ${min.toFixed(2)}` : '';
        return {
          value: c.code,
          label: `${c.code} · ${disc}${minNote}`
        };
      });
  }

  constructor(
    private readonly billing: BillingService,
    private readonly alerts: AlertService,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.resumeBillId = String(this.route.snapshot.queryParamMap.get('billId') || '').trim();
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
          .pipe(catchError(() => of({ settings: null as BillingGatewaySettings | null }))),
        coupons: this.billing.listCoupons().pipe(catchError(() => of({ items: [] as BillingCoupon[] })))
      }),
      SHIMMER_MS
    ).subscribe({
      next: (bundle) => {
        this.products = (bundle.products.items || []).filter((p) => p.active !== false);
        this.customers = bundle.customers.items || [];
        this.settings = bundle.settings.settings;
        this.coupons = bundle.coupons.items || [];
        this.pageLoading = false;
        if (this.resumeBillId) {
          void this.resumeBill(this.resumeBillId);
        }
      },
      error: async () => {
        this.pageLoading = false;
        await this.alerts.error('Unable to open POS.');
      }
    });
  }

  private async resumeBill(billId: string): Promise<void> {
    try {
      const res = await firstValueFrom(this.billing.getBill(billId));
      const bill = res.bill;
      this.activeInvoice = bill;
      this.selectedCustomerId = bill.customerId || '';
      this.cart = (bill.items || []).map((item) => {
        const product = this.products.find((p) => p.id === item.productId);
        return {
          productId: item.productId,
          name: item.name,
          unitPrice: item.unitPrice,
          gstPercentage: item.gstPercentage,
          quantity: item.quantity,
          stock: Math.max(item.quantity, product?.stock ?? item.quantity)
        };
      });
      this.discount = Number(bill.discount) || 0;
      if (bill.couponCode) {
        const match = this.coupons.find(
          (c) => c.code.toUpperCase() === String(bill.couponCode).toUpperCase()
        );
        this.appliedCoupon = match || null;
        this.selectedCouponCode = bill.couponCode;
      } else {
        this.clearCoupon();
        this.discount = Number(bill.discount) || 0;
      }
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {},
        replaceUrl: true
      });
      await this.openGateway(bill);
    } catch {
      await this.alerts.error('Unable to resume that bill on POS.');
    }
  }

  onProductQueryChange(value: string): void {
    const previous = this.productQuery;
    this.productQuery = value;
    if (!value.trim() && previous.trim()) {
      this.reloadProducts(false);
    }
  }

  searchProducts(): void {
    if (!this.productQuery.trim()) {
      void this.alerts.toastWarning('Enter a search term', 'Type something before finding products.');
      return;
    }
    this.reloadProducts(true);
  }

  clearProductQuery(): void {
    this.productQuery = '';
    this.reloadProducts(false);
  }

  private reloadProducts(fromFind: boolean): void {
    this.productLoading = true;
    this.findBusy = fromFind;
    withShimmerDelay(this.billing.listProducts(this.productQuery.trim()), SHIMMER_MS).subscribe({
      next: (res) => {
        this.products = (res.items || []).filter((p) => p.active !== false);
        this.productLoading = false;
        this.findBusy = false;
      },
      error: async () => {
        this.productLoading = false;
        this.findBusy = false;
        await this.alerts.error('Product search failed.');
      }
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
    this.resetCheckout();
  }

  resetCheckoutPublic(): void {
    this.resetCheckout();
  }

  /** Reset cart, discounts, coupon, and active invoice after a successful payment. */
  private resetCheckout(): void {
    this.cart = [];
    this.discount = 0;
    this.appliedCoupon = null;
    this.selectedCouponCode = '';
    this.selectedCustomerId = '';
    this.productQuery = '';
    this.activeInvoice = null;
    this.gatewayOpen = false;
  }

  async applyCoupon(): Promise<void> {
    const code = String(this.selectedCouponCode || '').trim();
    if (!code) {
      void this.alerts.toastWarning('Select a coupon', 'Pick a coupon before applying.');
      return;
    }
    if (!this.cart.length) {
      void this.alerts.toastWarning('Cart empty', 'Add products before applying a coupon.');
      return;
    }
    const coupon = this.coupons.find(
      (c) => c.code.toUpperCase() === code.toUpperCase()
    );
    // Prefer local listCoupons minSubtotal when the dropdown selection is known.
    const minSubtotal = Number(coupon?.minSubtotal) || 0;
    if (coupon && minSubtotal > 0 && this.cartSubtotal < minSubtotal) {
      void this.alerts.toastWarning(
        'Minimum subtotal not met',
        `“${coupon.code}” requires a cart subtotal of at least ${minSubtotal.toFixed(2)} (current: ${this.cartSubtotal.toFixed(2)}).`
      );
      return;
    }
    // If not found locally, still call the API so the server can validate min/rules.
    this.couponBusy = true;
    try {
      const res = await firstValueFrom(
        withShimmerDelay(
          this.billing.validateCoupon({ code, subtotal: this.cartSubtotal }),
          SHIMMER_MS
        )
      );
      this.appliedCoupon = res.coupon;
      this.discount = res.discount;
      this.selectedCouponCode = res.coupon.code;
      void this.alerts.toastSuccess('Coupon applied', res.coupon.usageNote || res.message);
    } catch (err) {
      this.appliedCoupon = null;
      const message =
        (err as { error?: { message?: string } })?.error?.message || 'Invalid coupon.';
      void this.alerts.toastWarning('Coupon not applied', message);
    } finally {
      this.couponBusy = false;
    }
  }

  clearCoupon(): void {
    this.appliedCoupon = null;
    this.selectedCouponCode = '';
    this.discount = 0;
  }

  async createInvoice(): Promise<void> {
    if (this.activeInvoice) {
      void this.alerts.toastWarning(
        'Invoice already open',
        'Finish or reset the resumed bill before creating another invoice.'
      );
      return;
    }
    if (!this.selectedCustomerId || !this.cart.length) {
      void this.alerts.warning('Choose a customer and add at least one product.');
      return;
    }
    const items = this.cart.map((c) => ({ productId: c.productId, quantity: c.quantity }));
    const discount = this.appliedCoupon ? undefined : this.safeDiscount;
    const couponCode = this.appliedCoupon?.code;
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
            discount,
            couponCode
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
      // Keep customer, cart, amounts, and coupons until Reset or successful payment.
      await this.openGateway();
    }
  }

  async openGateway(bill?: BillingBill): Promise<void> {
    if (bill) {
      this.activeInvoice = bill;
    }
    if (!this.activeInvoice || this.activeInvoice.paymentStatus === 'paid') {
      return;
    }
    if (this.activeInvoice.paymentStatus === 'draft') {
      try {
        const res = await firstValueFrom(this.billing.awaitBillPayment(this.activeInvoice.id));
        this.activeInvoice = res.bill;
      } catch (err) {
        await this.alerts.error(
          (err as { error?: { message?: string } })?.error?.message ||
            'Unable to move bill to payment pending.'
        );
        return;
      }
    }
    this.gatewayOpen = true;
  }

  onGatewayClosed(): void {
    this.gatewayOpen = false;
  }

  onGatewayCompleted(event: { bill: BillingBill; payment: BillingPayment; ok: boolean }): void {
    this.activeInvoice = event.bill;
    if (event.ok) {
      this.gatewayOpen = false;
      this.resetCheckout();
      // Refresh catalog so stock + product rating averages reflect the settled bill.
      this.reloadProducts(false);
      void this.alerts.toastSuccess('Payment complete', 'Checkout cleared for the next bill.');
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

  private round(n: number): number {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }
}
