import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { AlertService } from '../../../core/services/alert.service';
import { BillingService } from '../../../core/services/billing.service';
import { BillingProduct } from '../../../core/models/banking.models';
import { SHIMMER_MS, withShimmerDelay } from '../../../core/utils/shimmer';
import { ThemeSelectOption } from '../../../shared/theme-select/theme-select.component';

type ProductSort = 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc' | 'stock-asc';
type StockFilter = 'all' | 'in' | 'low' | 'out';
type ViewMode = 'list' | 'grid' | 'table';

@Component({
  selector: 'app-billing-products',
  templateUrl: './billing-products.component.html',
  styleUrls: ['./billing-products.component.scss']
})
export class BillingProductsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('addForm')
  set addForm(ref: ElementRef<HTMLElement> | undefined) {
    this.addFormRef = ref;
    if (ref && this.showForm) {
      setTimeout(() => this.bindFormHeightObserver(), 0);
    }
  }
  private addFormRef?: ElementRef<HTMLElement>;

  listLoading = true;
  filterLoading = false;
  busy = false;
  query = '';
  products: BillingProduct[] = [];
  editingId: string | null = null;
  showForm = true;
  panelAnimating = false;
  detail: BillingProduct | null = null;
  detailLeaving = false;
  private detailTimer: ReturnType<typeof setTimeout> | null = null;
  matchedPanelHeight: number | null = null;
  /** Locked to first form-measured height so Hide form keeps the same data-panel height. */
  lockedPanelHeight: number | null = null;

  sort: ProductSort = 'name-asc';
  stockFilter: StockFilter = 'all';
  view: ViewMode = 'table';
  page = 1;
  readonly pageSize = 8;

  readonly sortOptions: ThemeSelectOption[] = [
    { value: 'name-asc', label: 'Name A–Z' },
    { value: 'name-desc', label: 'Name Z–A' },
    { value: 'price-asc', label: 'Price low–high' },
    { value: 'price-desc', label: 'Price high–low' },
    { value: 'stock-asc', label: 'Stock low–high' }
  ];

  readonly stockOptions: ThemeSelectOption[] = [
    { value: 'all', label: 'All stock' },
    { value: 'in', label: 'In stock' },
    { value: 'low', label: 'Low (≤5)' },
    { value: 'out', label: 'Out of stock' }
  ];

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    sku: [''],
    price: [0, [Validators.required, Validators.min(0)]],
    stock: [0, [Validators.required, Validators.min(0)]],
    gstPercentage: [18, [Validators.required, Validators.min(0), Validators.max(100)]]
  });

  private readonly search$ = new Subject<string>();
  private readonly destroy$ = new Subject<void>();
  private panelTimer: ReturnType<typeof setTimeout> | null = null;
  private formResizeObserver: ResizeObserver | null = null;

  constructor(
    private readonly billing: BillingService,
    private readonly alerts: AlertService,
    private readonly fb: FormBuilder,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.search$
      .pipe(debounceTime(250), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.page = 1;
        this.reloadForFilters();
      });
    this.load();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.bindFormHeightObserver(), 0);
  }

  ngOnDestroy(): void {
    if (this.panelTimer) {
      clearTimeout(this.panelTimer);
    }
    if (this.detailTimer) {
      clearTimeout(this.detailTimer);
    }
    this.formResizeObserver?.disconnect();
    this.destroy$.next();
    this.destroy$.complete();
  }

  get dataPanelHeight(): number | null {
    if (this.showForm) {
      return this.matchedPanelHeight;
    }
    return this.lockedPanelHeight ?? this.matchedPanelHeight;
  }

  toggleForm(): void {
    this.panelAnimating = true;
    this.showForm = !this.showForm;
    if (this.panelTimer) {
      clearTimeout(this.panelTimer);
    }
    this.panelTimer = setTimeout(() => {
      this.panelAnimating = false;
      this.bindFormHeightObserver();
    }, 320);
  }

  private bindFormHeightObserver(): void {
    this.formResizeObserver?.disconnect();
    this.formResizeObserver = null;
    if (!this.showForm || typeof ResizeObserver === 'undefined') {
      return;
    }
    const el = this.addFormRef?.nativeElement;
    if (!el) {
      return;
    }
    const sync = (): void => {
      const height = Math.ceil(el.getBoundingClientRect().height);
      this.matchedPanelHeight = height;
      this.lockedPanelHeight = height;
      this.cdr.markForCheck();
    };
    this.formResizeObserver = new ResizeObserver(() => sync());
    this.formResizeObserver.observe(el);
    sync();
  }

  get filtered(): BillingProduct[] {
    let items = [...this.products];
    if (this.stockFilter === 'in') {
      items = items.filter((p) => p.stock > 5);
    } else if (this.stockFilter === 'low') {
      items = items.filter((p) => p.stock > 0 && p.stock <= 5);
    } else if (this.stockFilter === 'out') {
      items = items.filter((p) => p.stock <= 0);
    }

    const cmp = (a: BillingProduct, b: BillingProduct): number => {
      switch (this.sort) {
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'stock-asc':
          return a.stock - b.stock;
        case 'name-asc':
        default:
          return a.name.localeCompare(b.name);
      }
    };
    return items.sort(cmp);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
  }

  get paged(): BillingProduct[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }

  onQueryChange(value: string): void {
    this.query = value;
    if (!value.trim()) {
      this.search$.next('');
      return;
    }
    this.search$.next(value.trim());
  }

  clearQuery(): void {
    this.query = '';
    this.search$.next('');
  }

  search(): void {
    if (!this.query.trim()) {
      void this.alerts.toastWarning('Enter a search term', 'Type something before searching products.');
      return;
    }
    this.page = 1;
    this.reloadForFilters();
  }

  onFilterChange(): void {
    this.page = 1;
    this.refreshFilteredView();
  }

  setView(mode: ViewMode): void {
    if (this.view === mode) {
      return;
    }
    this.view = mode;
    this.refreshFilteredView();
  }

  goPage(delta: number): void {
    this.page = Math.min(this.totalPages, Math.max(1, this.page + delta));
  }

  /** Client-side sort/stock/view flash — data already in memory. */
  private refreshFilteredView(): void {
    this.filterLoading = true;
    setTimeout(() => {
      this.filterLoading = false;
    }, 220);
  }

  load(): void {
    this.listLoading = true;
    withShimmerDelay(this.billing.listProducts(this.query.trim()), SHIMMER_MS).subscribe({
      next: (res) => {
        this.products = res.items || [];
        if (this.page > this.totalPages) {
          this.page = this.totalPages;
        }
        this.listLoading = false;
        setTimeout(() => this.bindFormHeightObserver(), 0);
      },
      error: async () => {
        this.listLoading = false;
        await this.alerts.error('Unable to load products.');
      }
    });
  }

  /** Search / query changes — refresh data panel only. */
  private reloadForFilters(): void {
    this.filterLoading = true;
    withShimmerDelay(this.billing.listProducts(this.query.trim()), SHIMMER_MS).subscribe({
      next: (res) => {
        this.products = res.items || [];
        if (this.page > this.totalPages) {
          this.page = this.totalPages;
        }
        this.filterLoading = false;
      },
      error: async () => {
        this.filterLoading = false;
        await this.alerts.error('Unable to load products.');
      }
    });
  }

  /** Soft list refresh after mutate — no full-page shimmer. */
  private softReload(): void {
    this.billing.listProducts(this.query.trim()).subscribe({
      next: (res) => {
        this.products = res.items || [];
        if (this.page > this.totalPages) {
          this.page = this.totalPages;
        }
      },
      error: async () => {
        await this.alerts.error('Unable to refresh products.');
      }
    });
  }

  openDetail(product: BillingProduct): void {
    if (this.detailTimer) {
      clearTimeout(this.detailTimer);
      this.detailTimer = null;
    }
    this.detailLeaving = false;
    this.detail = product;
  }

  closeDetail(): void {
    if (!this.detail || this.detailLeaving) {
      return;
    }
    this.detailLeaving = true;
    this.detailTimer = setTimeout(() => {
      this.detail = null;
      this.detailLeaving = false;
      this.detailTimer = null;
    }, 200);
  }

  edit(product: BillingProduct): void {
    this.editingId = product.id;
    this.showForm = true;
    if (this.detailTimer) {
      clearTimeout(this.detailTimer);
      this.detailTimer = null;
    }
    this.detailLeaving = false;
    this.detail = null;
    this.form.patchValue({
      name: product.name,
      sku: product.sku,
      price: product.price,
      stock: product.stock,
      gstPercentage: product.gstPercentage
    });
  }

  cancelEdit(): void {
    this.editingId = null;
    this.form.reset({ name: '', sku: '', price: 0, stock: 0, gstPercentage: 18 });
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const payload = {
      name: String(raw.name || ''),
      sku: String(raw.sku || ''),
      price: Number(raw.price || 0),
      stock: Number(raw.stock || 0),
      gstPercentage: Number(raw.gstPercentage || 0)
    };
    const editingId = this.editingId;
    const label = editingId ? 'Update' : 'Create';

    this.busy = true;
    const outcome = await this.alerts.confirmAction({
      text: editingId
        ? `Save changes to “${payload.name}”?`
        : `Add “${payload.name}” to the catalog?`,
      confirmText: label,
      loadingText: 'Saving product…',
      action: () =>
        editingId
          ? this.billing.updateProduct(editingId, payload)
          : this.billing.createProduct(payload),
      successMessage: (res) => res.message || 'Product saved',
      errorMessage: (err) =>
        (err as { error?: { message?: string } })?.error?.message || 'Could not save product.'
    });
    this.busy = false;
    if (outcome.ok) {
      this.cancelEdit();
      this.softReload();
    }
  }

  async archive(product: BillingProduct): Promise<void> {
    this.busy = true;
    const outcome = await this.alerts.confirmAction({
      text: `Archive “${product.name}”? It will leave the active catalog.`,
      confirmText: 'Archive',
      loadingText: 'Archiving…',
      action: () => this.billing.archiveProduct(product.id),
      successMessage: (res) => res.message || 'Archived',
      errorMessage: (err) =>
        (err as { error?: { message?: string } })?.error?.message || 'Archive failed.'
    });
    this.busy = false;
    if (outcome.ok) {
      if (this.detail?.id === product.id) {
        this.closeDetail();
      }
      if (this.editingId === product.id) {
        this.cancelEdit();
      }
      this.softReload();
    }
  }

  stockTone(stock: number): string {
    if (stock <= 0) {
      return 'stock stock--out';
    }
    if (stock <= 5) {
      return 'stock stock--low';
    }
    return 'stock stock--ok';
  }

  stockLabel(stock: number): string {
    if (stock <= 0) {
      return 'Out';
    }
    if (stock <= 5) {
      return 'Low';
    }
    return 'In stock';
  }
}
