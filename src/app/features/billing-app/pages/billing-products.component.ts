import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { AlertService } from '../../../core/services/alert.service';
import { BillingService } from '../../../core/services/billing.service';
import { BillingProduct } from '../../../core/models/banking.models';
import { SHIMMER_MS, withShimmerDelay } from '../../../core/utils/shimmer';

type ProductSort = 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc' | 'stock-asc';
type StockFilter = 'all' | 'in' | 'low' | 'out';
type ViewMode = 'list' | 'grid' | 'table';

@Component({
  selector: 'app-billing-products',
  templateUrl: './billing-products.component.html',
  styleUrls: ['./billing-products.component.scss']
})
export class BillingProductsComponent implements OnInit, OnDestroy {
  listLoading = true;
  filterLoading = false;
  busy = false;
  query = '';
  products: BillingProduct[] = [];
  editingId: string | null = null;
  showForm = true;
  panelAnimating = false;
  detail: BillingProduct | null = null;

  sort: ProductSort = 'name-asc';
  stockFilter: StockFilter = 'all';
  view: ViewMode = 'table';
  page = 1;
  readonly pageSize = 8;

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

  constructor(
    private readonly billing: BillingService,
    private readonly alerts: AlertService,
    private readonly fb: FormBuilder
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

  ngOnDestroy(): void {
    if (this.panelTimer) {
      clearTimeout(this.panelTimer);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleForm(): void {
    this.panelAnimating = true;
    this.showForm = !this.showForm;
    if (this.panelTimer) {
      clearTimeout(this.panelTimer);
    }
    this.panelTimer = setTimeout(() => {
      this.panelAnimating = false;
    }, 320);
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
    this.search$.next(value.trim());
  }

  clearQuery(): void {
    this.query = '';
    this.search$.next('');
  }

  search(): void {
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
    this.detail = product;
  }

  closeDetail(): void {
    this.detail = null;
  }

  edit(product: BillingProduct): void {
    this.editingId = product.id;
    this.showForm = true;
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
