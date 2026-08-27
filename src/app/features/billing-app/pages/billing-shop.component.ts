import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { firstValueFrom, forkJoin, of, Subject } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';
import { AlertService } from '../../../core/services/alert.service';
import { AuthService } from '../../../core/services/auth.service';
import { BillingService } from '../../../core/services/billing.service';
import { PortalLaunchService } from '../../../core/services/portal-launch.service';
import { ShellBootService } from '../../../core/services/shell-boot.service';
import {
  BillingBill,
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
  image?: string;
}

type StockFilter = 'all' | 'in_stock' | 'low';
type SortKey = 'name' | 'price_asc' | 'price_desc' | 'stock' | 'rating' | 'newest';
type CheckoutStep = 'cart' | 'pay' | 'processing' | 'result';

@Component({
  selector: 'app-billing-shop',
  templateUrl: './billing-shop.component.html',
  styleUrls: ['./billing-shop.component.scss']
})
export class BillingShopComponent implements OnInit, OnDestroy {
  pageLoading = true;
  catalogLoading = false;
  customerBusy = false;
  customerSearched = false;
  checkoutBusy = false;

  productQuery = '';
  customerQuery = '';
  stockFilter: StockFilter = 'all';
  categoryFilter = '';
  sortKey: SortKey = 'name';

  products: BillingProduct[] = [];
  categories: string[] = [];
  slideIndex: Record<string, number> = {};

  customers: BillingCustomer[] = [];
  selectedCustomer: BillingCustomer | null = null;
  showAddCustomer = false;
  addCustomerLeaving = false;
  newCustomer = { name: '', email: '', phone: '', address: '' };

  cart: CartLine[] = [];
  settings: BillingGatewaySettings | null = null;

  productModalOpen = false;
  productModalLeaving = false;
  activeProduct: BillingProduct | null = null;
  activeSlide = 0;

  checkoutOpen = false;
  checkoutLeaving = false;
  checkoutStep: CheckoutStep = 'cart';
  checkoutPaneLeaving = false;
  activeInvoice: BillingBill | null = null;
  lastPayment: BillingPayment | null = null;
  payResultOk: boolean | null = null;
  payResultMessage = '';
  payProgress = 0;
  payMethod: BillingPaymentMethod = 'upi';
  cardName = '';
  cardNumber = '';
  cardExpiry = '';
  cardCvv = '';
  upiVpa = '';
  otp = '';
  otpSent = false;
  private payProgressTimer: ReturnType<typeof setInterval> | null = null;
  private checkoutPaneTimer: ReturnType<typeof setTimeout> | null = null;

  readonly stockOptions: Array<{ id: StockFilter; label: string }> = [
    { id: 'all', label: 'Any stock' },
    { id: 'in_stock', label: 'In stock' },
    { id: 'low', label: 'Low stock' }
  ];

  readonly sortOptions: Array<{ id: SortKey; label: string }> = [
    { id: 'name', label: 'Name' },
    { id: 'price_asc', label: 'Price ↑' },
    { id: 'price_desc', label: 'Price ↓' },
    { id: 'stock', label: 'Stock' },
    { id: 'rating', label: 'Rating' },
    { id: 'newest', label: 'Newest' }
  ];

  private readonly destroy$ = new Subject<void>();
  private readonly productSearch$ = new Subject<string>();
  private readonly customerSearch$ = new Subject<string>();
  private leaveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly billing: BillingService,
    private readonly auth: AuthService,
    private readonly alerts: AlertService,
    private readonly shellBoot: ShellBootService,
    private readonly portalLaunch: PortalLaunchService
  ) {}

  ngOnInit(): void {
    this.shellBoot.complete();
    document.documentElement.dataset['nbBilling'] = '1';
    document.body.classList.add('billing-mode');
    this.productSearch$
      .pipe(debounceTime(220), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => this.reloadCatalog(false));
    this.customerSearch$
      .pipe(
        debounceTime(220),
        distinctUntilChanged(),
        switchMap((q) => {
          this.customerBusy = true;
          this.customerSearched = true;
          return withShimmerDelay(this.billing.listCustomers(q), Math.min(SHIMMER_MS, 420)).pipe(
            catchError(() => of({ items: [] as BillingCustomer[] }))
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((res) => {
        this.customers = res.items || [];
        this.customerBusy = false;
      });
    this.boot();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.leaveTimer) {
      clearTimeout(this.leaveTimer);
    }
    if (this.checkoutPaneTimer) {
      clearTimeout(this.checkoutPaneTimer);
    }
    if (this.payProgressTimer) {
      clearInterval(this.payProgressTimer);
    }
    delete document.documentElement.dataset['nbBilling'];
    document.body.classList.remove('billing-mode');
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.checkoutBusy || this.checkoutStep === 'processing') {
      return;
    }
    if (this.showAddCustomer) {
      this.closeAddCustomer();
      return;
    }
    if (this.checkoutOpen) {
      this.closeCheckout();
      return;
    }
    if (this.productModalOpen) {
      this.closeProductModal();
    }
  }

  get operatorName(): string {
    return this.auth.currentUser?.fullName || this.auth.currentUser?.username || 'Manager';
  }

  get avatarStyle(): string {
    return this.auth.currentUser?.avatar?.style || 'mint';
  }

  get avatarInitials(): string {
    return (this.auth.currentUser?.avatar?.initials || 'NB').trim().toUpperCase() || 'NB';
  }

  get avatarSrc(): string | null {
    const avatar = this.auth.currentUser?.avatar;
    if (avatar?.image) {
      return avatar.image;
    }
    const presetId = String(avatar?.presetId || '').trim();
    if (!/^(customer|manager|admin)\/preset-\d{2}$/.test(presetId)) {
      return null;
    }
    return `assets/avatars/${presetId}.webp`;
  }

  get cartCount(): number {
    return this.cart.reduce((sum, line) => sum + line.quantity, 0);
  }

  get cartSubtotal(): number {
    return this.round(this.cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0));
  }

  get cartTax(): number {
    return this.round(
      this.cart.reduce((sum, line) => sum + (line.unitPrice * line.quantity * line.gstPercentage) / 100, 0)
    );
  }

  get cartGrandTotal(): number {
    return this.round(this.cartSubtotal + this.cartTax);
  }

  get enabledMethods(): BillingPaymentMethod[] {
    const m = this.settings?.methods;
    if (!m) {
      return ['cash', 'card', 'upi', 'qr'];
    }
    return (['cash', 'card', 'upi', 'qr'] as BillingPaymentMethod[]).filter((k) => !!m[k]);
  }

  get categoryOptions(): ThemeSelectOption[] {
    return [
      { value: '', label: 'All categories' },
      ...this.categories.map((cat) => ({ value: cat, label: cat }))
    ];
  }

  get sortSelectOptions(): ThemeSelectOption[] {
    return this.sortOptions.map((opt) => ({ value: opt.id, label: opt.label }));
  }

  get filteredProducts(): BillingProduct[] {
    let rows = this.products.filter((p) => p.active !== false);
    if (this.stockFilter === 'in_stock') {
      rows = rows.filter((p) => p.stock > 0);
    } else if (this.stockFilter === 'low') {
      rows = rows.filter((p) => p.stock > 0 && p.stock <= 5);
    }
    if (this.categoryFilter) {
      rows = rows.filter(
        (p) => String(p.category || '').toLowerCase() === this.categoryFilter.toLowerCase()
      );
    }
    return rows;
  }

  boot(): void {
    this.pageLoading = true;
    withShimmerDelay(
      forkJoin({
        products: this.billing
          .listProducts('', { active: true, sort: this.sortKey })
          .pipe(catchError(() => of({ items: [] as BillingProduct[] }))),
        settings: this.billing.getSettings().pipe(catchError(() => of(null))),
        customers: this.billing.listCustomers('').pipe(catchError(() => of({ items: [] as BillingCustomer[] })))
      }),
      SHIMMER_MS
    ).subscribe({
      next: ({ products, settings, customers }) => {
        this.applyProducts(products.items || []);
        this.settings = settings?.settings ?? null;
        this.customers = customers.items || [];
        this.pageLoading = false;
      },
      error: async () => {
        this.pageLoading = false;
        await this.alerts.error('Unable to open NovaBill Shop.');
      }
    });
  }

  onProductQuery(value: string): void {
    this.productQuery = value;
    this.productSearch$.next(value.trim());
  }

  clearProductQuery(): void {
    this.productQuery = '';
    this.productSearch$.next('');
    this.reloadCatalog(false);
  }

  runProductSearch(): void {
    this.productSearch$.next(this.productQuery.trim());
    this.reloadCatalog(false);
  }

  onCustomerQuery(value: string): void {
    this.customerQuery = value;
    this.customerSearch$.next(value.trim());
  }

  clearCustomerQuery(): void {
    this.customerQuery = '';
    this.customerSearched = false;
    this.customers = [];
    this.customerSearch$.next('');
  }

  runCustomerSearch(): void {
    this.customerSearch$.next(this.customerQuery.trim());
  }

  setStockFilter(id: StockFilter): void {
    if (this.stockFilter === id) {
      return;
    }
    this.stockFilter = id;
    this.reloadCatalog(false);
  }

  setCategory(category: string): void {
    if (this.categoryFilter === category) {
      return;
    }
    this.categoryFilter = category;
    this.reloadCatalog(false);
  }

  setSort(key: SortKey): void {
    if (this.sortKey === key) {
      return;
    }
    this.sortKey = key;
    this.reloadCatalog(false);
  }

  reloadCatalog(initial: boolean): void {
    if (!initial) {
      this.catalogLoading = true;
    }
    withShimmerDelay(
      this.billing.listProducts(this.productQuery.trim(), {
        active: true,
        inStock: this.stockFilter === 'in_stock',
        category: this.categoryFilter || undefined,
        sort: this.sortKey
      }),
      Math.min(SHIMMER_MS, 500)
    ).subscribe({
      next: (res) => {
        this.applyProducts(res.items || []);
        this.catalogLoading = false;
      },
      error: async () => {
        this.catalogLoading = false;
        await this.alerts.error('Unable to refresh products.');
      }
    });
  }

  productSlides(product: BillingProduct): string[] {
    const uploaded = (product.images || []).filter(Boolean);
    if (uploaded.length) {
      return uploaded;
    }
    return this.generatedSlides(product);
  }

  trackSlide(_index: number, src: string): string {
    return src;
  }

  slideFor(product: BillingProduct): number {
    const slides = this.productSlides(product);
    const idx = this.slideIndex[product.id] || 0;
    return ((idx % slides.length) + slides.length) % slides.length;
  }

  prevSlide(product: BillingProduct, event?: Event): void {
    event?.stopPropagation();
    const n = this.productSlides(product).length;
    const cur = this.slideFor(product);
    this.slideIndex = { ...this.slideIndex, [product.id]: (cur - 1 + n) % n };
  }

  nextSlide(product: BillingProduct, event?: Event): void {
    event?.stopPropagation();
    const n = this.productSlides(product).length;
    const cur = this.slideFor(product);
    this.slideIndex = { ...this.slideIndex, [product.id]: (cur + 1) % n };
  }

  openProduct(product: BillingProduct): void {
    this.activeProduct = product;
    this.activeSlide = this.slideFor(product);
    this.productModalLeaving = false;
    this.productModalOpen = true;
  }

  closeProductModal(): void {
    if (!this.productModalOpen || this.productModalLeaving) {
      return;
    }
    this.productModalLeaving = true;
    this.leaveTimer = setTimeout(() => {
      this.productModalOpen = false;
      this.productModalLeaving = false;
      this.activeProduct = null;
    }, 240);
  }

  modalPrev(event?: Event): void {
    event?.stopPropagation();
    if (!this.activeProduct) {
      return;
    }
    const n = this.productSlides(this.activeProduct).length;
    this.activeSlide = (this.activeSlide - 1 + n) % n;
    this.slideIndex = { ...this.slideIndex, [this.activeProduct.id]: this.activeSlide };
  }

  modalNext(event?: Event): void {
    event?.stopPropagation();
    if (!this.activeProduct) {
      return;
    }
    const n = this.productSlides(this.activeProduct).length;
    this.activeSlide = (this.activeSlide + 1) % n;
    this.slideIndex = { ...this.slideIndex, [this.activeProduct.id]: this.activeSlide };
  }

  selectCustomer(customer: BillingCustomer): void {
    this.selectedCustomer = customer;
    this.customerQuery = customer.name;
    this.customers = [customer];
    this.customerSearched = false;
  }

  clearCustomer(): void {
    this.selectedCustomer = null;
    this.customerQuery = '';
    this.customerSearched = false;
    this.customerSearch$.next('');
  }

  openAddCustomer(): void {
    this.showAddCustomer = true;
    this.addCustomerLeaving = false;
    this.newCustomer = {
      name: this.customerQuery.trim(),
      email: '',
      phone: '',
      address: ''
    };
  }

  closeAddCustomer(): void {
    if (!this.showAddCustomer || this.addCustomerLeaving) {
      return;
    }
    this.addCustomerLeaving = true;
    this.leaveTimer = setTimeout(() => {
      this.showAddCustomer = false;
      this.addCustomerLeaving = false;
    }, 200);
  }

  async saveNewCustomer(): Promise<void> {
    const name = this.newCustomer.name.trim();
    if (!name) {
      await this.alerts.error('Customer name is required.');
      return;
    }
    this.customerBusy = true;
    try {
      const res = await firstValueFrom(
        withShimmerDelay(
          this.billing.createCustomer({
            name,
            email: this.newCustomer.email.trim(),
            phone: this.newCustomer.phone.trim(),
            address: this.newCustomer.address.trim()
          }),
          SHIMMER_MS
        )
      );
      this.selectedCustomer = res.customer;
      this.customerQuery = res.customer.name;
      this.customers = [res.customer];
      this.customerSearched = false;
      this.showAddCustomer = false;
      this.addCustomerLeaving = false;
      await this.alerts.toastSuccessCorner('Customer added', res.customer.name);
    } catch (err) {
      await this.alerts.error(
        (err as { error?: { message?: string } })?.error?.message || 'Unable to add customer.'
      );
    } finally {
      this.customerBusy = false;
    }
  }

  qtyInCart(productId: string): number {
    return this.cart.find((line) => line.productId === productId)?.quantity || 0;
  }

  addToCart(product: BillingProduct, event?: Event): void {
    event?.stopPropagation();
    if (product.stock <= 0) {
      void this.alerts.error('This product is out of stock.');
      return;
    }
    const existing = this.cart.find((line) => line.productId === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) {
        void this.alerts.error('No more stock available for this product.');
        return;
      }
      existing.quantity += 1;
      this.cart = [...this.cart];
    } else {
      this.cart = [
        ...this.cart,
        {
          productId: product.id,
          name: product.name,
          unitPrice: product.price,
          gstPercentage: product.gstPercentage,
          quantity: 1,
          stock: product.stock,
          image: this.productSlides(product)[0]
        }
      ];
    }
  }

  clearProductFromCart(product: BillingProduct, event?: Event): void {
    event?.stopPropagation();
    this.cart = this.cart.filter((line) => line.productId !== product.id);
  }

  changeQty(line: CartLine, delta: number): void {
    const next = line.quantity + delta;
    if (next <= 0) {
      this.cart = this.cart.filter((l) => l.productId !== line.productId);
      return;
    }
    if (next > line.stock) {
      void this.alerts.error('Quantity exceeds available stock.');
      return;
    }
    line.quantity = next;
    this.cart = [...this.cart];
  }

  removeLine(line: CartLine): void {
    this.cart = this.cart.filter((l) => l.productId !== line.productId);
  }

  clearCart(): void {
    this.cart = [];
    this.activeInvoice = null;
    this.lastPayment = null;
    this.checkoutStep = 'cart';
  }

  openCheckout(): void {
    if (!this.cart.length) {
      void this.alerts.error('Add products to the cart first.');
      return;
    }
    this.checkoutStep = 'cart';
    this.checkoutPaneLeaving = false;
    this.checkoutLeaving = false;
    this.payResultOk = null;
    this.payResultMessage = '';
    this.resetPayForm();
    this.checkoutOpen = true;
  }

  closeCheckout(): void {
    if (!this.checkoutOpen || this.checkoutLeaving || this.checkoutBusy || this.checkoutStep === 'processing') {
      return;
    }
    const shouldReset = this.checkoutStep === 'result';
    this.checkoutLeaving = true;
    this.leaveTimer = setTimeout(() => {
      this.checkoutOpen = false;
      this.checkoutLeaving = false;
      if (shouldReset) {
        this.resetShopSession(false);
      }
    }, 240);
  }

  async goCheckoutStep(step: CheckoutStep): Promise<void> {
    if (this.checkoutStep === step || this.checkoutPaneLeaving) {
      return;
    }
    this.checkoutPaneLeaving = true;
    await new Promise((r) => setTimeout(r, 180));
    this.checkoutStep = step;
    this.checkoutPaneLeaving = false;
  }

  backToCart(): void {
    if (this.checkoutBusy || this.checkoutStep === 'processing') {
      return;
    }
    void this.goCheckoutStep('cart');
  }

  async beginPayment(): Promise<void> {
    if (!this.selectedCustomer) {
      await this.alerts.error('Select or add a customer before checkout.');
      return;
    }
    if (!this.cart.length) {
      await this.alerts.error('Cart is empty.');
      return;
    }
    this.checkoutBusy = true;
    try {
      const created = await firstValueFrom(
        withShimmerDelay(
          this.billing.createBill({
            customerId: this.selectedCustomer.id,
            items: this.cart.map((line) => ({
              productId: line.productId,
              quantity: line.quantity
            })),
            discount: 0,
            notes: 'NovaBill Shop checkout'
          }),
          SHIMMER_MS
        )
      );
      const pending = await firstValueFrom(this.billing.awaitBillPayment(created.bill.id));
      this.activeInvoice = pending.bill;
      this.resetPayForm();
      await this.goCheckoutStep('pay');
    } catch (err) {
      await this.alerts.error(
        (err as { error?: { message?: string } })?.error?.message || 'Unable to create invoice.'
      );
    } finally {
      this.checkoutBusy = false;
    }
  }

  selectPayMethod(method: BillingPaymentMethod): void {
    this.payMethod = method;
    this.otpSent = false;
    this.otp = '';
  }

  methodLabel(method: BillingPaymentMethod): string {
    if (method === 'card') return this.settings?.cardLabel || 'Card';
    if (method === 'upi') return this.settings?.upiVpa ? `UPI · ${this.settings.upiVpa}` : 'UPI';
    if (method === 'qr') return 'QR Scan';
    return 'Cash';
  }

  async continuePay(): Promise<void> {
    if (this.payMethod === 'cash' || this.payMethod === 'qr') {
      await this.runEmbeddedPayment();
      return;
    }
    if (this.payMethod === 'upi') {
      const vpa = String(this.upiVpa || this.settings?.upiVpa || '').trim();
      if (!vpa.includes('@')) {
        await this.alerts.toastWarning('UPI ID required', 'Enter a VPA like name@bank.');
        return;
      }
      this.upiVpa = vpa;
      await this.runEmbeddedPayment();
      return;
    }
    // card
    if (!this.cardReady()) {
      await this.alerts.toastWarning('Card details incomplete', 'Fill name, number, expiry, and CVV.');
      return;
    }
    if (!this.otpSent) {
      this.otpSent = true;
      this.otp = '';
      await this.alerts.toastSuccess('OTP sent', 'Demo OTP is 123456');
      return;
    }
    if (String(this.otp).trim() !== '123456') {
      await this.alerts.toastWarning('Invalid OTP', 'Use demo OTP 123456.');
      return;
    }
    await this.runEmbeddedPayment();
  }

  async finishCheckoutResult(): Promise<void> {
    this.checkoutLeaving = true;
    await new Promise((r) => setTimeout(r, 200));
    this.checkoutOpen = false;
    this.checkoutLeaving = false;
    this.resetShopSession(true);
  }

  private cardReady(): boolean {
    const digits = String(this.cardNumber || '').replace(/\D/g, '');
    return (
      String(this.cardName || '').trim().length >= 2 &&
      digits.length >= 12 &&
      /^\d{2}\/\d{2}$/.test(String(this.cardExpiry || '').trim()) &&
      String(this.cardCvv || '').trim().length >= 3
    );
  }

  private async runEmbeddedPayment(): Promise<void> {
    if (!this.activeInvoice || this.checkoutBusy) {
      return;
    }
    this.checkoutBusy = true;
    this.payProgress = 8;
    this.payResultOk = null;
    await this.goCheckoutStep('processing');
    this.startPayProgress();
    const waitMs = this.payMethod === 'cash' ? 900 : this.payMethod === 'qr' ? 1600 : 1200;
    await new Promise((r) => setTimeout(r, waitMs));
    try {
      const res = await firstValueFrom(
        this.billing.payBill({
          billId: this.activeInvoice.id,
          paymentMethod: this.payMethod,
          provider: 'novapay',
          sessionId: `shop-${Date.now()}`,
          channel: 'modal',
          cardLast4:
            this.payMethod === 'card'
              ? String(this.cardNumber || '').replace(/\D/g, '').slice(-4)
              : undefined,
          upiVpa: this.payMethod === 'upi' ? String(this.upiVpa || '').trim() : undefined
        })
      );
      this.payProgress = 100;
      this.stopPayProgress();
      this.lastPayment = res.payment;
      this.activeInvoice = res.bill;
      this.payResultOk = res.payment.status === 'success';
      this.payResultMessage = res.message || (this.payResultOk ? 'Payment successful' : 'Payment failed');
      await this.goCheckoutStep('result');
      if (this.payResultOk) {
        void this.alerts.toastSuccessCorner('Paid', `Invoice ${res.bill.billNumber}`);
      } else {
        void this.alerts.error(this.payResultMessage);
      }
    } catch (err) {
      this.payProgress = 100;
      this.stopPayProgress();
      this.payResultOk = false;
      this.payResultMessage =
        (err as { error?: { message?: string } })?.error?.message || 'Payment could not be completed.';
      await this.goCheckoutStep('result');
      void this.alerts.error(this.payResultMessage);
    } finally {
      this.checkoutBusy = false;
    }
  }

  private startPayProgress(): void {
    this.stopPayProgress();
    this.payProgressTimer = setInterval(() => {
      if (this.payProgress < 90) {
        this.payProgress = Math.min(90, this.payProgress + 7);
      }
    }, 120);
  }

  private stopPayProgress(): void {
    if (this.payProgressTimer) {
      clearInterval(this.payProgressTimer);
      this.payProgressTimer = null;
    }
  }

  private resetPayForm(): void {
    const methods = this.enabledMethods;
    this.payMethod = methods[0] || 'upi';
    this.cardName = '';
    this.cardNumber = '';
    this.cardExpiry = '';
    this.cardCvv = '';
    this.upiVpa = this.settings?.upiVpa || '';
    this.otp = '';
    this.otpSent = false;
    this.payProgress = 0;
  }

  private resetShopSession(reload: boolean): void {
    this.cart = [];
    this.selectedCustomer = null;
    this.customerQuery = '';
    this.customerSearched = false;
    this.customers = [];
    this.productQuery = '';
    this.stockFilter = 'all';
    this.categoryFilter = '';
    this.sortKey = 'name';
    this.activeInvoice = null;
    this.lastPayment = null;
    this.checkoutStep = 'cart';
    this.payResultOk = null;
    this.payResultMessage = '';
    this.resetPayForm();
    if (reload) {
      this.reloadCatalog(false);
    }
  }

  goBankingPos(): void {
    this.portalLaunch.launch('billing-desk', '/billing/pos');
  }

  goBillingDesk(): void {
    this.portalLaunch.launch('billing-desk', '/billing');
  }

  signOut(): void {
    this.auth.logout({ home: '/novabill' });
  }

  private applyProducts(items: BillingProduct[]): void {
    this.products = items;
    const cats = new Set<string>();
    items.forEach((p) => {
      const c = String(p.category || '').trim();
      if (c) {
        cats.add(c);
      }
    });
    this.categories = Array.from(cats).sort((a, b) => a.localeCompare(b));
  }

  private generatedSlides(product: BillingProduct): string[] {
    const seed = this.hash(product.id || product.name);
    const palettes = [
      ['#5fc4b0', '#0f766e', '#ffc801'],
      ['#6aa8e8', '#1d4ed8', '#ff9932'],
      ['#d9e8e2', '#2f8f7f', '#dc143c'],
      ['#f0d7a8', '#b45309', '#5fc4b0'],
      ['#c4b5fd', '#5b21b6', '#ffc801']
    ];
    const palette = palettes[seed % palettes.length];
    return [0, 1, 2].map((i) => {
      const a = palette[i % palette.length];
      const b = palette[(i + 1) % palette.length];
      const c = palette[(i + 2) % palette.length];
      const label = encodeURIComponent((product.name || 'NB').slice(0, 18));
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 640' preserveAspectRatio='xMidYMid slice'>
        <defs>
          <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
            <stop offset='0%' stop-color='${a}'/>
            <stop offset='55%' stop-color='${b}'/>
            <stop offset='100%' stop-color='${c}'/>
          </linearGradient>
        </defs>
        <rect width='800' height='640' fill='url(#g)'/>
        <circle cx='640' cy='120' r='140' fill='rgba(255,255,255,0.18)'/>
        <circle cx='120' cy='520' r='180' fill='rgba(22,50,58,0.16)'/>
        <rect x='70' y='430' width='280' height='18' rx='9' fill='rgba(255,255,255,0.35)'/>
        <rect x='70' y='470' width='190' height='14' rx='7' fill='rgba(255,255,255,0.22)'/>
        <text x='70' y='120' fill='rgba(255,255,255,0.92)' font-family='Sora,Manrope,sans-serif' font-size='42' font-weight='700'>${label}</text>
        <text x='70' y='170' fill='rgba(255,255,255,0.7)' font-family='IBM Plex Mono,monospace' font-size='28'>Slide ${
          i + 1
        }</text>
      </svg>`;
      return `data:image/svg+xml;charset=utf-8,${svg.replace(/\n/g, '').replace(/#/g, '%23')}`;
    });
  }

  private hash(value: string): number {
    let h = 0;
    for (let i = 0; i < value.length; i += 1) {
      h = (h << 5) - h + value.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  }

  private round(n: number): number {
    return Math.round((Number(n) || 0) * 100) / 100;
  }
}
