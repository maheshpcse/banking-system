import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertService } from '../../../core/services/alert.service';
import { BillingService } from '../../../core/services/billing.service';
import { BillingBill, BillingDashboardStats } from '../../../core/models/banking.models';
import { SHIMMER_MS, withShimmerDelay } from '../../../core/utils/shimmer';

@Component({
  selector: 'app-billing-dashboard',
  templateUrl: './billing-dashboard.component.html',
  styleUrls: ['./billing-dashboard.component.scss']
})
export class BillingDashboardComponent implements OnInit {
  pageLoading = true;
  seeding = false;
  stats: BillingDashboardStats | null = null;
  recentBills: BillingBill[] = [];

  constructor(
    private readonly billing: BillingService,
    private readonly alerts: AlertService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.pageLoading = true;
    withShimmerDelay(this.billing.getStats(), SHIMMER_MS).subscribe({
      next: (stats) => {
        this.stats = stats;
        this.recentBills = stats.recentBills || [];
        this.pageLoading = false;
      },
      error: async () => {
        this.pageLoading = false;
        await this.alerts.error('Unable to load billing dashboard.');
      }
    });
  }

  async seedCatalog(): Promise<void> {
    this.seeding = true;
    withShimmerDelay(this.billing.seedCatalog(false), SHIMMER_MS).subscribe({
      next: async (res) => {
        this.seeding = false;
        await this.alerts.toastSuccess(res.message || 'Catalog seeded');
        this.load();
      },
      error: async (err) => {
        this.seeding = false;
        await this.alerts.error(err?.error?.message || 'Seed failed.');
      }
    });
  }

  goPos(): void {
    void this.router.navigateByUrl('/billing/pos');
  }

  statusClass(status: string): string {
    return `status status--${status || 'draft'}`;
  }
}
