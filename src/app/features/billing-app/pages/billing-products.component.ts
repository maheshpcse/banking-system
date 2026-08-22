import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AlertService } from '../../../core/services/alert.service';
import { BillingService } from '../../../core/services/billing.service';
import { BillingProduct } from '../../../core/models/banking.models';
import { SHIMMER_MS, withShimmerDelay } from '../../../core/utils/shimmer';

@Component({
  selector: 'app-billing-products',
  templateUrl: './billing-products.component.html',
  styleUrls: ['./billing-products.component.scss']
})
export class BillingProductsComponent implements OnInit {
  pageLoading = true;
  busy = false;
  query = '';
  products: BillingProduct[] = [];
  editingId: string | null = null;

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    sku: [''],
    price: [0, [Validators.required, Validators.min(0)]],
    stock: [0, [Validators.required, Validators.min(0)]],
    gstPercentage: [18, [Validators.required, Validators.min(0), Validators.max(100)]]
  });

  constructor(
    private readonly billing: BillingService,
    private readonly alerts: AlertService,
    private readonly fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.pageLoading = true;
    withShimmerDelay(this.billing.listProducts(this.query.trim()), SHIMMER_MS).subscribe({
      next: (res) => {
        this.products = res.items || [];
        this.pageLoading = false;
      },
      error: async () => {
        this.pageLoading = false;
        await this.alerts.error('Unable to load products.');
      }
    });
  }

  search(): void {
    this.load();
  }

  edit(product: BillingProduct): void {
    this.editingId = product.id;
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

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy = true;
    const payload = this.form.getRawValue();
    const req$ = this.editingId
      ? this.billing.updateProduct(this.editingId, payload)
      : this.billing.createProduct(payload);

    withShimmerDelay(req$, SHIMMER_MS).subscribe({
      next: async (res) => {
        this.busy = false;
        await this.alerts.toastSuccess(res.message || 'Product saved');
        this.cancelEdit();
        this.load();
      },
      error: async (err) => {
        this.busy = false;
        await this.alerts.error(err?.error?.message || 'Could not save product.');
      }
    });
  }

  async archive(product: BillingProduct): Promise<void> {
    const ok = await this.alerts.confirm({
      text: `Archive “${product.name}”? It will leave the active catalog.`,
      confirmText: 'Archive'
    });
    if (!ok) {
      return;
    }
    this.busy = true;
    withShimmerDelay(this.billing.archiveProduct(product.id), SHIMMER_MS).subscribe({
      next: async (res) => {
        this.busy = false;
        await this.alerts.toastSuccess(res.message || 'Archived');
        this.load();
      },
      error: async (err) => {
        this.busy = false;
        await this.alerts.error(err?.error?.message || 'Archive failed.');
      }
    });
  }

  stockTone(stock: number): string {
    if (stock <= 0) {
      return 'stock stock--out';
    }
    if (stock < 8) {
      return 'stock stock--low';
    }
    return 'stock stock--ok';
  }
}
