import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Subscription, of } from 'rxjs';
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
import { SHIMMER_MS, withShimmerDelay } from '../../../core/utils/shimmer';

type DemoSectionId = 'users' | 'products' | 'customers' | 'coupons';

@Component({
  selector: 'app-super-admin-data-lab',
  templateUrl: './super-admin-data-lab.component.html',
  styleUrls: ['./super-admin-data-lab.component.scss']
})
export class SuperAdminDataLabComponent implements OnInit, OnDestroy {
  readonly commonPassword = 'Demo@12345';
  pageLoading = true;

  readonly entityOptions: Array<{ id: DemoSectionId; label: string; hint: string }> = [
    { id: 'users', label: 'Staff users', hint: 'Managers & admins' },
    { id: 'products', label: 'Products', hint: 'Billing catalog' },
    { id: 'customers', label: 'Customers', hint: 'Billing patrons' },
    { id: 'coupons', label: 'Coupons', hint: 'Discount codes' }
  ];

  selectedEntities: Record<DemoSectionId, boolean> = {
    users: true,
    products: false,
    customers: false,
    coupons: false
  };

  form = this.fb.group({
    count: [8, [Validators.required, Validators.min(1), Validators.max(40)]]
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

  ngOnInit(): void {
    withShimmerDelay(of(true), SHIMMER_MS).subscribe(() => {
      this.pageLoading = false;
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  get selectedEntityCount(): number {
    return this.entityOptions.filter((o) => this.selectedEntities[o.id]).length;
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

  toggleEntity(id: DemoSectionId): void {
    this.selectedEntities[id] = !this.selectedEntities[id];
  }

  generate(): void {
    if (this.form.invalid || this.generating) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.selectedEntityCount) {
      void this.alerts.info('Select at least one data type to generate.', 'Nothing selected');
      return;
    }
    this.generating = true;
    const count = Number(this.form.getRawValue().count) || 0;
    this.sub = this.demo
      .generate({
        users: this.selectedEntities.users ? count : 0,
        products: this.selectedEntities.products ? count : 0,
        customers: this.selectedEntities.customers ? count : 0,
        coupons: this.selectedEntities.coupons ? count : 0
      })
      .subscribe({
        next: (res: DemoGenerateResult) => {
          if (this.selectedEntities.users) {
            this.users = res.users || [];
          }
          if (this.selectedEntities.products) {
            this.products = res.products || [];
          }
          if (this.selectedEntities.customers) {
            this.customers = res.customers || [];
          }
          if (this.selectedEntities.coupons) {
            this.coupons = res.coupons || [];
          }
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
