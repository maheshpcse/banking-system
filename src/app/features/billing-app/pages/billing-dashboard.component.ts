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
    const outcome = await this.alerts.confirmAction({
      text: 'Seed demo products and customers into this billing desk?',
      confirmText: 'Seed catalog',
      loadingText: 'Seeding catalog…',
      action: () => withShimmerDelay(this.billing.seedCatalog(false), SHIMMER_MS),
      successMessage: (res) => res.message || 'Catalog seeded',
      errorMessage: (err) =>
        (err as { error?: { message?: string } })?.error?.message || 'Seed failed.'
    });
    this.seeding = false;
    if (outcome.ok) {
      this.load();
    }
  }

  goPos(): void {
    void this.router.navigateByUrl('/billing/pos');
  }

  statusClass(status: string): string {
    return `status status--${status || 'draft'}`;
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'draft':
        return 'Bill Created';
      case 'pending':
        return 'Pending';
      case 'paid':
        return 'Paid';
      case 'failed':
        return 'Failure';
      case 'error':
        return 'Error';
      case 'refunded':
        return 'Refunded';
      default:
        return status || 'Unknown';
    }
  }
}
