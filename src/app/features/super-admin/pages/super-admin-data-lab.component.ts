import { Component, OnDestroy } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import {
  AdminDemoService,
  DemoCommitResult,
  DemoCoupon,
  DemoCustomer,
  DemoGenerateResult,
  DemoProduct,
  DemoStaffUser
} from '../../../core/services/admin-demo.service';
import { AlertService } from '../../../core/services/alert.service';

type DemoSectionId = 'users' | 'products' | 'customers' | 'coupons';

@Component({
  selector: 'app-super-admin-data-lab',
  templateUrl: './super-admin-data-lab.component.html',
  styleUrls: ['./super-admin-data-lab.component.scss']
})
export class SuperAdminDataLabComponent implements OnDestroy {
  readonly commonPassword = 'Demo@12345';

  form = this.fb.group({
    users: [8, [Validators.required, Validators.min(0), Validators.max(50)]],
    products: [12, [Validators.required, Validators.min(0), Validators.max(200)]],
    customers: [10, [Validators.required, Validators.min(0), Validators.max(200)]],
    coupons: [6, [Validators.required, Validators.min(0), Validators.max(50)]]
  });

  generating = false;
  committing = false;
  hasGenerated = false;
  commonPasswordFromServer = '';

  users: DemoStaffUser[] = [];
  products: DemoProduct[] = [];
  customers: DemoCustomer[] = [];
  coupons: DemoCoupon[] = [];

  private sub?: Subscription;

  constructor(
    private readonly fb: FormBuilder,
    private readonly demo: AdminDemoService,
    private readonly alerts: AlertService
  ) {}

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  get totalRows(): number {
    return this.users.length + this.products.length + this.customers.length + this.coupons.length;
  }

  get selectedCount(): number {
    return (
      this.users.filter((u) => u.selected).length +
      this.products.filter((p) => p.selected).length +
      this.customers.filter((c) => c.selected).length +
      this.coupons.filter((c) => c.selected).length
    );
  }

  generate(): void {
    if (this.form.invalid || this.generating) {
      this.form.markAllAsTouched();
      return;
    }
    this.generating = true;
    const raw = this.form.getRawValue();
    this.sub = this.demo
      .generate({
        users: Number(raw.users) || 0,
        products: Number(raw.products) || 0,
        customers: Number(raw.customers) || 0,
        coupons: Number(raw.coupons) || 0
      })
      .subscribe({
        next: (res: DemoGenerateResult) => {
          this.users = res.users || [];
          this.products = res.products || [];
          this.customers = res.customers || [];
          this.coupons = res.coupons || [];
          this.commonPasswordFromServer = res.commonPassword || this.commonPassword;
          this.hasGenerated = true;
          this.generating = false;
        },
        error: async (err) => {
          this.generating = false;
          await this.alerts.error(err?.error?.message || 'Unable to generate demo data');
        }
      });
  }

  isSectionAllSelected(section: DemoSectionId): boolean {
    const rows = this.rowsFor(section);
    return rows.length > 0 && rows.every((row) => !!row.selected);
  }

  isSectionPartiallySelected(section: DemoSectionId): boolean {
    const rows = this.rowsFor(section);
    const selected = rows.filter((row) => row.selected).length;
    return selected > 0 && selected < rows.length;
  }

  toggleSectionAll(section: DemoSectionId): void {
    const rows = this.rowsFor(section);
    const nextValue = !this.isSectionAllSelected(section);
    rows.forEach((row) => {
      row.selected = nextValue;
    });
  }

  toggleRow(row: { selected?: boolean }): void {
    row.selected = !row.selected;
  }

  removeSelected(): void {
    this.users = this.users.filter((u) => !u.selected);
    this.products = this.products.filter((p) => !p.selected);
    this.customers = this.customers.filter((c) => !c.selected);
    this.coupons = this.coupons.filter((c) => !c.selected);
  }

  clearAll(): void {
    this.users = [];
    this.products = [];
    this.customers = [];
    this.coupons = [];
    this.hasGenerated = false;
  }

  async commitSelected(): Promise<void> {
    if (this.committing) {
      return;
    }
    const users = this.users.filter((u) => u.selected);
    const products = this.products.filter((p) => p.selected);
    const customers = this.customers.filter((c) => c.selected);
    const coupons = this.coupons.filter((c) => c.selected);
    if (!users.length && !products.length && !customers.length && !coupons.length) {
      await this.alerts.info('Select at least one row to commit.', 'Nothing selected');
      return;
    }
    this.committing = true;
    this.demo.commit({ users, products, customers, coupons }).subscribe({
      next: async (res: DemoCommitResult) => {
        this.committing = false;
        this.users = this.users.filter((u) => !u.selected);
        this.products = this.products.filter((p) => !p.selected);
        this.customers = this.customers.filter((c) => !c.selected);
        this.coupons = this.coupons.filter((c) => !c.selected);
        const summary =
          `Users ${res.users.created}/${res.users.created + res.users.skipped} · ` +
          `Products ${res.products.created}/${res.products.created + res.products.skipped} · ` +
          `Customers ${res.customers.created}/${res.customers.created + res.customers.skipped} · ` +
          `Coupons ${res.coupons.created}/${res.coupons.created + res.coupons.skipped}`;
        await this.alerts.toastSuccessCorner('Demo data committed', summary);
      },
      error: async (err) => {
        this.committing = false;
        await this.alerts.error(err?.error?.message || 'Unable to commit demo data');
      }
    });
  }

  private rowsFor(section: DemoSectionId): { selected?: boolean }[] {
    if (section === 'users') {
      return this.users;
    }
    if (section === 'products') {
      return this.products;
    }
    if (section === 'customers') {
      return this.customers;
    }
    return this.coupons;
  }
}
