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
  filterLoading = false;
  stats: BillingDashboardStats | null = null;
  recentBills: BillingBill[] = [];
  complaints: BillingComplaint[] = [];

  readonly billPageSize = 8;
  readonly complaintPageSize = 5;
  billPage = 1;
  complaintPage = 1;

  constructor(
    private readonly billing: BillingService,
    private readonly alerts: AlertService,
    private readonly auth: AuthService
  ) {}

  get canLaunchBillingApp(): boolean {
    const user = this.auth.currentUser;
    return !!user && !user.isSuperAdmin && (user.role === 'manager' || user.role === 'admin');
  }

  get billPages(): number {
    return Math.max(1, Math.ceil(this.recentBills.length / this.billPageSize));
  }

  get complaintPages(): number {
    return Math.max(1, Math.ceil(this.complaints.length / this.complaintPageSize));
  }

  get pagedBills(): BillingBill[] {
    const start = (this.billPage - 1) * this.billPageSize;
    return this.recentBills.slice(start, start + this.billPageSize);
  }

  get pagedComplaints(): BillingComplaint[] {
    const start = (this.complaintPage - 1) * this.complaintPageSize;
    return this.complaints.slice(start, start + this.complaintPageSize);
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
    this.filterLoading = true;
    withShimmerDelay(this.loadMonitor(), SHIMMER_MS).subscribe({
      next: (bundle) => {
        this.apply(bundle);
        this.billPage = 1;
        this.complaintPage = 1;
        this.filterLoading = false;
      },
      error: async () => {
        this.filterLoading = false;
        await this.alerts.error('Refresh failed.');
      }
    });
  }

  prevBills(): void {
    if (this.billPage > 1) {
      this.billPage -= 1;
    }
  }

  nextBills(): void {
    if (this.billPage < this.billPages) {
      this.billPage += 1;
    }
  }

  prevComplaints(): void {
    if (this.complaintPage > 1) {
      this.complaintPage -= 1;
    }
  }

  nextComplaints(): void {
    if (this.complaintPage < this.complaintPages) {
      this.complaintPage += 1;
    }
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
