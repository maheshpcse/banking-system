import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { AlertService } from '../../../core/services/alert.service';
import { BillingService } from '../../../core/services/billing.service';
import { BillingCategory } from '../../../core/models/banking.models';
import { SHIMMER_MS, withShimmerDelay } from '../../../core/utils/shimmer';
import { ThemeSelectOption } from '../../../shared/theme-select/theme-select.component';

type CategorySort = 'name-asc' | 'name-desc' | 'sort-asc' | 'sort-desc';
type StatusFilter = 'all' | 'active' | 'inactive';
type ViewMode = 'list' | 'grid' | 'table';

@Component({
  selector: 'app-billing-categories',
  templateUrl: './billing-categories.component.html',
  styleUrls: ['./billing-categories.component.scss']
})
export class BillingCategoriesComponent implements OnInit, OnDestroy {
  listLoading = true;
  filterLoading = false;
  busy = false;
  query = '';
  categories: BillingCategory[] = [];
  editingId: string | null = null;
  formOpen = false;
  formLeaving = false;
  detail: BillingCategory | null = null;
  detailLeaving = false;
  private detailTimer: ReturnType<typeof setTimeout> | null = null;
  private formTimer: ReturnType<typeof setTimeout> | null = null;

  sort: CategorySort = 'name-asc';
  statusFilter: StatusFilter = 'all';
  view: ViewMode = 'table';
  page = 1;
  readonly pageSize = 8;

  readonly sortOptions: ThemeSelectOption[] = [
    { value: 'name-asc', label: 'Name A–Z' },
    { value: 'name-desc', label: 'Name Z–A' },
    { value: 'sort-asc', label: 'Sort low–high' },
    { value: 'sort-desc', label: 'Sort high–low' }
  ];

  readonly statusOptions: ThemeSelectOption[] = [
    { value: 'all', label: 'All status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ];

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    slug: [''],
    description: [''],
    sortOrder: [0],
    active: [true]
  });

  private readonly search$ = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

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
        this.refreshFilteredView();
      });
    this.load();
  }

  ngOnDestroy(): void {
    if (this.detailTimer) {
      clearTimeout(this.detailTimer);
    }
    if (this.formTimer) {
      clearTimeout(this.formTimer);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  get activeCount(): number {
    return this.categories.filter((c) => c.active !== false).length;
  }

  get dataShimmerVariant():
    | 'catalog-data-list'
    | 'catalog-data-grid'
    | 'catalog-data-table' {
    if (this.view === 'list') {
      return 'catalog-data-list';
    }
    if (this.view === 'grid') {
      return 'catalog-data-grid';
    }
    return 'catalog-data-table';
  }

  get filtered(): BillingCategory[] {
    const q = this.query.trim().toLowerCase();
    let items = [...this.categories];
    if (q) {
      items = items.filter(
        (c) => c.name.toLowerCase().includes(q) || String(c.slug || '').toLowerCase().includes(q)
      );
    }
    if (this.statusFilter === 'active') {
      items = items.filter((c) => c.active !== false);
    } else if (this.statusFilter === 'inactive') {
      items = items.filter((c) => c.active === false);
    }

    items.sort((a, b) => {
      switch (this.sort) {
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'sort-asc':
          return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
        case 'sort-desc':
          return (b.sortOrder ?? 0) - (a.sortOrder ?? 0);
        case 'name-asc':
        default:
          return a.name.localeCompare(b.name);
      }
    });
    return items;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
  }

  get paged(): BillingCategory[] {
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
    this.refreshFilteredView();
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
    const next = Math.min(this.totalPages, Math.max(1, this.page + delta));
    if (next === this.page) {
      return;
    }
    this.page = next;
    this.refreshFilteredView();
  }

  private refreshFilteredView(): void {
    this.filterLoading = true;
    setTimeout(() => {
      if (this.page > this.totalPages) {
        this.page = this.totalPages;
      }
      this.filterLoading = false;
    }, 260);
  }

  load(): void {
    this.listLoading = true;
    withShimmerDelay(this.billing.listCategories(true), SHIMMER_MS)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.categories = res.items || [];
          this.listLoading = false;
        },
        error: async () => {
          this.listLoading = false;
          await this.alerts.error('Unable to load categories.');
        }
      });
  }

  private softReload(): void {
    this.filterLoading = true;
    withShimmerDelay(this.billing.listCategories(true), SHIMMER_MS)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.categories = res.items || [];
          if (this.page > this.totalPages) {
            this.page = this.totalPages;
          }
          this.filterLoading = false;
        },
        error: async () => {
          this.filterLoading = false;
          await this.alerts.error('Unable to refresh categories.');
        }
      });
  }

  openForm(): void {
    this.cancelEdit();
    this.formLeaving = false;
    this.formOpen = true;
  }

  closeForm(): void {
    if (!this.formOpen || this.formLeaving || this.busy) {
      return;
    }
    this.formLeaving = true;
    this.formTimer = setTimeout(() => {
      this.formOpen = false;
      this.formLeaving = false;
      this.cancelEdit();
      this.formTimer = null;
    }, 180);
  }

  openDetail(category: BillingCategory): void {
    if (this.detailTimer) {
      clearTimeout(this.detailTimer);
      this.detailTimer = null;
    }
    this.detailLeaving = false;
    this.detail = category;
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

  edit(category: BillingCategory): void {
    this.editingId = category.id;
    if (this.detailTimer) {
      clearTimeout(this.detailTimer);
      this.detailTimer = null;
    }
    this.detailLeaving = false;
    this.detail = null;
    this.form.patchValue({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      sortOrder: category.sortOrder ?? 0,
      active: category.active !== false
    });
    this.formLeaving = false;
    this.formOpen = true;
  }

  cancelEdit(): void {
    this.editingId = null;
    this.form.reset({ name: '', slug: '', description: '', sortOrder: 0, active: true });
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const payload: Partial<BillingCategory> = {
      name: String(raw.name || '').trim(),
      slug: String(raw.slug || '').trim(),
      description: String(raw.description || '').trim(),
      sortOrder: Number(raw.sortOrder) || 0,
      active: raw.active !== false
    };
    const editingId = this.editingId;
    this.busy = true;
    const outcome = await this.alerts.confirmAction({
      text: editingId ? `Save changes to “${payload.name}”?` : `Add category “${payload.name}”?`,
      confirmText: editingId ? 'Update' : 'Create',
      loadingText: 'Saving category…',
      action: () =>
        editingId
          ? this.billing.updateCategory(editingId, payload)
          : this.billing.createCategory(payload),
      successMessage: (res) => res.message || 'Category saved',
      errorMessage: (err) =>
        (err as { error?: { message?: string } })?.error?.message || 'Could not save category.'
    });
    this.busy = false;
    if (outcome.ok) {
      this.formOpen = false;
      this.formLeaving = false;
      this.cancelEdit();
      this.softReload();
    }
  }

  async deactivate(category: BillingCategory): Promise<void> {
    this.busy = true;
    const outcome = await this.alerts.confirmAction({
      text: `Deactivate “${category.name}”? It will leave active pickers.`,
      confirmText: 'Deactivate',
      loadingText: 'Deactivating…',
      action: () => this.billing.deactivateCategory(category.id),
      successMessage: (res) => res.message || 'Category deactivated',
      errorMessage: (err) =>
        (err as { error?: { message?: string } })?.error?.message || 'Deactivate failed.'
    });
    this.busy = false;
    if (outcome.ok) {
      if (this.detail?.id === category.id) {
        this.closeDetail();
      }
      if (this.editingId === category.id) {
        this.formOpen = false;
        this.formLeaving = false;
        this.cancelEdit();
      }
      this.softReload();
    }
  }

  async remove(category: BillingCategory): Promise<void> {
    this.busy = true;
    const outcome = await this.alerts.confirmAction({
      text: `Permanently delete “${category.name}”? This cannot be undone.`,
      confirmText: 'Delete',
      loadingText: 'Deleting…',
      action: () => this.billing.deleteCategory(category.id),
      successMessage: (res) => res.message || 'Category deleted',
      errorMessage: (err) =>
        (err as { error?: { message?: string } })?.error?.message || 'Delete failed.'
    });
    this.busy = false;
    if (outcome.ok) {
      if (this.detail?.id === category.id) {
        this.closeDetail();
      }
      if (this.editingId === category.id) {
        this.formOpen = false;
        this.formLeaving = false;
        this.cancelEdit();
      }
      this.softReload();
    }
  }
}
