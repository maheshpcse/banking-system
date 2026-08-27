import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AlertService } from '../../../core/services/alert.service';
import { BillingService } from '../../../core/services/billing.service';
import { BillingCategory } from '../../../core/models/banking.models';
import { SHIMMER_MS, withShimmerDelay } from '../../../core/utils/shimmer';

@Component({
  selector: 'app-billing-categories',
  templateUrl: './billing-categories.component.html',
  styleUrls: ['./billing-categories.component.scss']
})
export class BillingCategoriesComponent implements OnInit, OnDestroy {
  listLoading = true;
  busy = false;
  categories: BillingCategory[] = [];
  editingId: string | null = null;
  detail: BillingCategory | null = null;
  detailLeaving = false;
  private detailTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly destroy$ = new Subject<void>();

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    slug: [''],
    description: [''],
    sortOrder: [0],
    active: [true]
  });

  constructor(
    private readonly billing: BillingService,
    private readonly alerts: AlertService,
    private readonly fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    if (this.detailTimer) {
      clearTimeout(this.detailTimer);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  get activeCount(): number {
    return this.categories.filter((c) => c.active !== false).length;
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
      this.cancelEdit();
      this.load();
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
        this.cancelEdit();
      }
      this.load();
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
        this.cancelEdit();
      }
      this.load();
    }
  }
}
