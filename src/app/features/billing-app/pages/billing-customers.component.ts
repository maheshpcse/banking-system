import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { AlertService } from '../../../core/services/alert.service';
import { BillingService } from '../../../core/services/billing.service';
import { BillingCustomer } from '../../../core/models/banking.models';
import { SHIMMER_MS, withShimmerDelay } from '../../../core/utils/shimmer';
import { ThemeSelectOption } from '../../../shared/theme-select/theme-select.component';

type CustomerSort = 'name-asc' | 'name-desc' | 'newest';
type BankingFilter = 'all' | 'yes' | 'no';
type ViewMode = 'list' | 'grid' | 'table';

@Component({
  selector: 'app-billing-customers',
  templateUrl: './billing-customers.component.html',
  styleUrls: ['./billing-customers.component.scss']
})
export class BillingCustomersComponent implements OnInit, OnDestroy {
  listLoading = true;
  filterLoading = false;
  busy = false;
  query = '';
  customers: BillingCustomer[] = [];
  editingId: string | null = null;
  formOpen = false;
  formLeaving = false;
  detail: BillingCustomer | null = null;
  detailLeaving = false;
  private detailTimer: ReturnType<typeof setTimeout> | null = null;
  private formTimer: ReturnType<typeof setTimeout> | null = null;
  bulkOpen = false;

  sort: CustomerSort = 'name-asc';
  bankingFilter: BankingFilter = 'all';
  view: ViewMode = 'table';
  page = 1;
  readonly pageSize = 8;

  readonly sortOptions: ThemeSelectOption[] = [
    { value: 'name-asc', label: 'Name A–Z' },
    { value: 'name-desc', label: 'Name Z–A' },
    { value: 'newest', label: 'Newest first' }
  ];

  readonly bankingOptions: ThemeSelectOption[] = [
    { value: 'all', label: 'All accounts' },
    { value: 'yes', label: 'Has banking account' },
    { value: 'no', label: 'No banking account' }
  ];

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: [''],
    phone: [''],
    address: [''],
    bankingAccountNumber: ['']
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
        this.reloadForFilters();
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

  get filtered(): BillingCustomer[] {
    let items = [...this.customers];
    if (this.bankingFilter === 'yes') {
      items = items.filter((c) => !!c.bankingAccountNumber);
    } else if (this.bankingFilter === 'no') {
      items = items.filter((c) => !c.bankingAccountNumber);
    }

    items.sort((a, b) => {
      if (this.sort === 'newest') {
        return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
      }
      if (this.sort === 'name-desc') {
        return b.name.localeCompare(a.name);
      }
      return a.name.localeCompare(b.name);
    });
    return items;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
  }

  get paged(): BillingCustomer[] {
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
      void this.alerts.toastWarning('Enter a search term', 'Type something before searching customers.');
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
      this.filterLoading = false;
    }, 260);
  }

  load(): void {
    this.listLoading = true;
    withShimmerDelay(this.billing.listCustomers(this.query.trim()), SHIMMER_MS).subscribe({
      next: (res) => {
        this.customers = res.items || [];
        if (this.page > this.totalPages) {
          this.page = this.totalPages;
        }
        this.listLoading = false;
      },
      error: async () => {
        this.listLoading = false;
        await this.alerts.error('Unable to load customers.');
      }
    });
  }

  private reloadForFilters(): void {
    this.filterLoading = true;
    withShimmerDelay(this.billing.listCustomers(this.query.trim()), SHIMMER_MS).subscribe({
      next: (res) => {
        this.customers = res.items || [];
        if (this.page > this.totalPages) {
          this.page = this.totalPages;
        }
        this.filterLoading = false;
      },
      error: async () => {
        this.filterLoading = false;
        await this.alerts.error('Unable to load customers.');
      }
    });
  }

  private softReload(): void {
    this.filterLoading = true;
    withShimmerDelay(this.billing.listCustomers(this.query.trim()), SHIMMER_MS).subscribe({
      next: (res) => {
        this.customers = res.items || [];
        if (this.page > this.totalPages) {
          this.page = this.totalPages;
        }
        this.filterLoading = false;
      },
      error: async () => {
        this.filterLoading = false;
        await this.alerts.error('Unable to refresh customers.');
      }
    });
  }

  initials(name: string): string {
    return (name || '?')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || '')
      .join('');
  }

  rewardsLabel(points?: number): string {
    const n = Number(points) || 0;
    return `${n} point${n === 1 ? '' : 's'}`;
  }

  openDetail(customer: BillingCustomer): void {
    if (this.detailTimer) {
      clearTimeout(this.detailTimer);
      this.detailTimer = null;
    }
    this.detailLeaving = false;
    this.detail = customer;
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

  edit(customer: BillingCustomer): void {
    this.editingId = customer.id;
    if (this.detailTimer) {
      clearTimeout(this.detailTimer);
      this.detailTimer = null;
    }
    this.detailLeaving = false;
    this.detail = null;
    this.form.patchValue({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      bankingAccountNumber: customer.bankingAccountNumber || ''
    });
    this.formLeaving = false;
    this.formOpen = true;
  }

  cancelEdit(): void {
    this.editingId = null;
    this.form.reset({ name: '', email: '', phone: '', address: '', bankingAccountNumber: '' });
  }

  openBulkUpload(): void {
    this.bulkOpen = true;
  }

  closeBulkUpload(): void {
    this.bulkOpen = false;
  }

  onBulkCompleted(): void {
    this.bulkOpen = false;
    this.softReload();
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const payload = {
      name: String(raw.name || ''),
      email: String(raw.email || ''),
      phone: String(raw.phone || ''),
      address: String(raw.address || ''),
      bankingAccountNumber: String(raw.bankingAccountNumber || '') || null
    };
    const editingId = this.editingId;
    const label = editingId ? 'Update' : 'Create';

    this.busy = true;
    const outcome = await this.alerts.confirmAction({
      text: editingId
        ? `Save changes to “${payload.name}”?`
        : `Add “${payload.name}” to the directory?`,
      confirmText: label,
      loadingText: 'Saving customer…',
      action: () =>
        editingId
          ? this.billing.updateCustomer(editingId, payload)
          : this.billing.createCustomer(payload),
      successMessage: (res) => res.message || 'Customer saved',
      errorMessage: (err) =>
        (err as { error?: { message?: string } })?.error?.message || 'Could not save customer.'
    });
    this.busy = false;
    if (outcome.ok) {
      this.formOpen = false;
      this.formLeaving = false;
      this.cancelEdit();
      this.softReload();
    }
  }

  async remove(customer: BillingCustomer): Promise<void> {
    this.busy = true;
    const outcome = await this.alerts.confirmAction({
      text: `Remove “${customer.name}” from the billing directory?`,
      confirmText: 'Remove',
      loadingText: 'Removing…',
      action: () => this.billing.deleteCustomer(customer.id),
      successMessage: (res) => res.message || 'Removed',
      errorMessage: (err) =>
        (err as { error?: { message?: string } })?.error?.message || 'Remove failed.'
    });
    this.busy = false;
    if (outcome.ok) {
      if (this.detail?.id === customer.id) {
        this.closeDetail();
      }
      if (this.editingId === customer.id) {
        this.formOpen = false;
        this.formLeaving = false;
        this.cancelEdit();
      }
      this.softReload();
    }
  }
}
