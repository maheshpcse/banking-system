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
  readonly pageSize = 5;
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

  sectionPage: Record<DemoSectionId, number> = {
    users: 1,
    products: 1,
    customers: 1,
    coupons: 1
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

  get pagedUsers(): DemoStaffUser[] {
    return this.slicePage(this.users, 'users');
  }

  get pagedProducts(): DemoProduct[] {
    return this.slicePage(this.products, 'products');
  }

  get pagedCustomers(): DemoCustomer[] {
    return this.slicePage(this.customers, 'customers');
  }

  get pagedCoupons(): DemoCoupon[] {
    return this.slicePage(this.coupons, 'coupons');
  }

  toggleEntity(id: DemoSectionId): void {
    this.selectedEntities[id] = !this.selectedEntities[id];
  }

  pagesFor(section: DemoSectionId): number {
    const total = this.rowsFor(section).length;
    return Math.max(1, Math.ceil(total / this.pageSize));
  }

  prevPage(section: DemoSectionId): void {
    if (this.sectionPage[section] > 1) {
      this.sectionPage[section] -= 1;
    }
  }

  nextPage(section: DemoSectionId): void {
    if (this.sectionPage[section] < this.pagesFor(section)) {
      this.sectionPage[section] += 1;
    }
  }

  generate(): void {
    if (this.form.invalid || this.generating) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.selectedEntityCount) {
      void this.alerts.toastWarning('Nothing selected', 'Select at least one data type to generate.');
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
          this.resetPages();
          this.commonPasswordFromServer = res.commonPassword || this.commonPassword;
          this.hasGenerated = true;
          this.generating = false;
        },
        error: async (err) => {
          this.generating = false;
          await this.alerts.toastError('Unable to generate', err?.error?.message || 'Unable to generate demo data');
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
    this.clampPages();
  }

  clearAll(): void {
    this.users = [];
    this.products = [];
    this.customers = [];
    this.coupons = [];
    this.hasGenerated = false;
    this.resetPages();
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
      await this.alerts.toastWarning('Nothing selected', 'Select at least one row to commit.');
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
        this.clampPages();
        const parts: string[] = [];
        if (res.users.created || res.users.skipped) {
          parts.push(`Users ${res.users.created}`);
        }
        if (res.products.created || res.products.skipped) {
          parts.push(`Products ${res.products.created}`);
        }
        if (res.customers.created || res.customers.skipped) {
          parts.push(`Customers ${res.customers.created}`);
        }
        if (res.coupons.created || res.coupons.skipped) {
          parts.push(`Coupons ${res.coupons.created}`);
        }
        await this.alerts.toastSuccessCorner(
          'Commit selected',
          parts.length ? parts.join(' · ') : 'Selected rows committed'
        );
      },
      error: async (err) => {
        this.committing = false;
        await this.alerts.toastError('Commit selected failed', err?.error?.message || 'Unable to commit demo data');
      }
    });
  }

  private slicePage<T>(rows: T[], section: DemoSectionId): T[] {
    const page = this.sectionPage[section];
    const start = (page - 1) * this.pageSize;
    return rows.slice(start, start + this.pageSize);
  }

  private resetPages(): void {
    this.sectionPage = { users: 1, products: 1, customers: 1, coupons: 1 };
  }

  private clampPages(): void {
    (Object.keys(this.sectionPage) as DemoSectionId[]).forEach((key) => {
      const max = this.pagesFor(key);
      if (this.sectionPage[key] > max) {
        this.sectionPage[key] = max;
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
