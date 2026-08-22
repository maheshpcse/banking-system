import { Component, OnInit } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AlertService } from '../../../core/services/alert.service';
import { AuthService } from '../../../core/services/auth.service';
import { BillingService } from '../../../core/services/billing.service';
import {
  BillingBill,
  BillingComplaint,
  BillingDashboardStats
} from '../../../core/models/banking.models';
import { SHIMMER_MS, withShimmerDelay } from '../../../core/utils/shimmer';

@Component({
  selector: 'app-manager-billing',
  templateUrl: './manager-billing.component.html',
  styleUrls: ['./manager-billing.component.scss', './manager-shared.scss']
})
export class ManagerBillingComponent implements OnInit {
  pageLoading = true;
  busy = false;
  stats: BillingDashboardStats | null = null;
  recentBills: BillingBill[] = [];
  complaints: BillingComplaint[] = [];

  constructor(
    private readonly billing: BillingService,
    private readonly alerts: AlertService,
    private readonly auth: AuthService
  ) {}

  get canLaunchBillingApp(): boolean {
    const user = this.auth.currentUser;
    return !!user && !user.isSuperAdmin && (user.role === 'manager' || user.role === 'admin');
  }

  ngOnInit(): void {
    withShimmerDelay(this.loadMonitor(), SHIMMER_MS).subscribe({
      next: (bundle) => {
        this.apply(bundle);
        this.pageLoading = false;
      },
      error: async () => {
        this.pageLoading = false;
        await this.alerts.error('Unable to load Billing monitor.');
      }
    });
  }

  refresh(): void {
    this.busy = true;
    this.loadMonitor().subscribe({
      next: (bundle) => {
        this.apply(bundle);
        this.busy = false;
      },
      error: async () => {
        this.busy = false;
        await this.alerts.error('Refresh failed.');
      }
    });
  }

  resolveComplaint(
    complaint: BillingComplaint,
    action: 'accepted' | 'adjusted' | 'rejected' | 'escalated' | 'resolved'
  ): void {
    this.billing.updateComplaint(complaint.id, { action }).subscribe({
      next: async (res) => {
        await this.alerts.success(res.message);
        this.refresh();
      },
      error: async (err) => this.alerts.error(err?.error?.message || 'Unable to update complaint.')
    });
  }

  private loadMonitor() {
    return forkJoin({
      stats: this.billing.getStats().pipe(catchError(() => of(null))),
      complaints: this.billing.listComplaints().pipe(catchError(() => of({ items: [] as BillingComplaint[] })))
    });
  }

  private apply(bundle: {
    stats: BillingDashboardStats | null;
    complaints: { items: BillingComplaint[] };
  }): void {
    this.stats = bundle.stats;
    this.recentBills = bundle.stats?.recentBills || [];
    this.complaints = bundle.complaints.items;
  }
}
