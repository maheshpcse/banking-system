import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { AlertService } from '../../../core/services/alert.service';
import { BillingService } from '../../../core/services/billing.service';
import { BillingCustomer } from '../../../core/models/banking.models';
import { SHIMMER_MS, withShimmerDelay } from '../../../core/utils/shimmer';

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
  busy = false;
  query = '';
  customers: BillingCustomer[] = [];
  editingId: string | null = null;
  showForm = true;
  panelAnimating = false;
  detail: BillingCustomer | null = null;

  sort: CustomerSort = 'name-asc';
  bankingFilter: BankingFilter = 'all';
  view: ViewMode = 'table';
  page = 1;
  readonly pageSize = 8;

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: [''],
    phone: [''],
    address: [''],
    bankingAccountNumber: ['']
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
        this.load();
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
    this.search$.next(value.trim());
  }

  clearQuery(): void {
    this.query = '';
    this.search$.next('');
  }

  search(): void {
    this.page = 1;
    this.load();
  }

  onFilterChange(): void {
    this.page = 1;
    this.listLoading = true;
    setTimeout(() => {
      this.listLoading = false;
    }, 220);
  }

  setView(mode: ViewMode): void {
    this.view = mode;
  }

  goPage(delta: number): void {
    this.page = Math.min(this.totalPages, Math.max(1, this.page + delta));
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

  initials(name: string): string {
    return (name || '?')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || '')
      .join('');
  }

  openDetail(customer: BillingCustomer): void {
    this.detail = customer;
  }

  closeDetail(): void {
    this.detail = null;
  }

  edit(customer: BillingCustomer): void {
    this.editingId = customer.id;
    this.showForm = true;
    this.detail = null;
    this.form.patchValue({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      bankingAccountNumber: customer.bankingAccountNumber || ''
    });
  }

  cancelEdit(): void {
    this.editingId = null;
    this.form.reset({ name: '', email: '', phone: '', address: '', bankingAccountNumber: '' });
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
    this.listLoading = true;
    const outcome = await this.alerts.confirmAction({
      text: editingId
        ? `Save changes to “${payload.name}”?`
        : `Add “${payload.name}” to the directory?`,
      confirmText: label,
      loadingText: 'Saving customer…',
      action: () =>
        withShimmerDelay(
          editingId
            ? this.billing.updateCustomer(editingId, payload)
            : this.billing.createCustomer(payload),
          SHIMMER_MS
        ),
      successMessage: (res) => res.message || 'Customer saved',
      errorMessage: (err) =>
        (err as { error?: { message?: string } })?.error?.message || 'Could not save customer.'
    });
    this.busy = false;
    this.listLoading = false;
    if (outcome.ok) {
      this.cancelEdit();
      this.load();
    }
  }

  async remove(customer: BillingCustomer): Promise<void> {
    this.busy = true;
    this.listLoading = true;
    const outcome = await this.alerts.confirmAction({
      text: `Remove “${customer.name}” from the billing directory?`,
      confirmText: 'Remove',
      loadingText: 'Removing…',
      action: () => withShimmerDelay(this.billing.deleteCustomer(customer.id), SHIMMER_MS),
      successMessage: (res) => res.message || 'Removed',
      errorMessage: (err) =>
        (err as { error?: { message?: string } })?.error?.message || 'Remove failed.'
    });
    this.busy = false;
    this.listLoading = false;
    if (outcome.ok) {
      if (this.detail?.id === customer.id) {
        this.closeDetail();
      }
      if (this.editingId === customer.id) {
        this.cancelEdit();
      }
      this.load();
    }
  }
}
