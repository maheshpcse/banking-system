import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AlertService } from '../../../core/services/alert.service';
import { BillingService } from '../../../core/services/billing.service';
import { BillingCustomer } from '../../../core/models/banking.models';
import { SHIMMER_MS, withShimmerDelay } from '../../../core/utils/shimmer';

@Component({
  selector: 'app-billing-customers',
  templateUrl: './billing-customers.component.html',
  styleUrls: ['./billing-customers.component.scss']
})
export class BillingCustomersComponent implements OnInit {
  pageLoading = true;
  busy = false;
  query = '';
  customers: BillingCustomer[] = [];
  editingId: string | null = null;
  drawerCustomer: BillingCustomer | null = null;

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: [''],
    phone: [''],
    address: [''],
    bankingAccountNumber: ['']
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
    withShimmerDelay(this.billing.listCustomers(this.query.trim()), SHIMMER_MS).subscribe({
      next: (res) => {
        this.customers = res.items || [];
        this.pageLoading = false;
      },
      error: async () => {
        this.pageLoading = false;
        await this.alerts.error('Unable to load customers.');
      }
    });
  }

  search(): void {
    this.load();
  }

  initials(name: string): string {
    return (name || '?')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || '')
      .join('');
  }

  openDrawer(customer: BillingCustomer): void {
    this.drawerCustomer = customer;
  }

  closeDrawer(): void {
    this.drawerCustomer = null;
  }

  edit(customer: BillingCustomer): void {
    this.editingId = customer.id;
    this.drawerCustomer = null;
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

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy = true;
    const raw = this.form.getRawValue();
    const payload = {
      name: String(raw.name || ''),
      email: String(raw.email || ''),
      phone: String(raw.phone || ''),
      address: String(raw.address || ''),
      bankingAccountNumber: String(raw.bankingAccountNumber || '') || null
    };
    const req$ = this.editingId
      ? this.billing.updateCustomer(this.editingId, payload)
      : this.billing.createCustomer(payload);

    withShimmerDelay(req$, SHIMMER_MS).subscribe({
      next: async (res) => {
        this.busy = false;
        await this.alerts.toastSuccess(res.message || 'Customer saved');
        this.cancelEdit();
        this.load();
      },
      error: async (err) => {
        this.busy = false;
        await this.alerts.error(err?.error?.message || 'Could not save customer.');
      }
    });
  }

  async remove(customer: BillingCustomer): Promise<void> {
    const ok = await this.alerts.confirm({
      text: `Remove “${customer.name}” from the billing directory?`,
      confirmText: 'Remove'
    });
    if (!ok) {
      return;
    }
    this.busy = true;
    withShimmerDelay(this.billing.deleteCustomer(customer.id), SHIMMER_MS).subscribe({
      next: async (res) => {
        this.busy = false;
        await this.alerts.toastSuccess(res.message || 'Removed');
        if (this.drawerCustomer?.id === customer.id) {
          this.closeDrawer();
        }
        this.load();
      },
      error: async (err) => {
        this.busy = false;
        await this.alerts.error(err?.error?.message || 'Remove failed.');
      }
    });
  }
}
