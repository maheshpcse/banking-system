import { Component, OnInit } from '@angular/core';
import { AlertService } from '../../../core/services/alert.service';
import { BillingService } from '../../../core/services/billing.service';
import { BillingBill, BillingPayment } from '../../../core/models/banking.models';
import { SHIMMER_MS, withShimmerDelay } from '../../../core/utils/shimmer';

@Component({
  selector: 'app-billing-history',
  templateUrl: './billing-history.component.html',
  styleUrls: ['./billing-history.component.scss']
})
export class BillingHistoryComponent implements OnInit {
  pageLoading = true;
  filterLoading = false;
  query = '';
  from = '';
  to = '';
  page = 1;
  pages = 1;
  total = 0;
  limit = 8;
  bills: BillingBill[] = [];
  detailBill: BillingBill | null = null;
  detailPayments: BillingPayment[] = [];
  detailLoading = false;

  constructor(
    private readonly billing: BillingService,
    private readonly alerts: AlertService
  ) {}

  ngOnInit(): void {
    this.load(1, 'full');
  }

  load(page = 1, mode: 'full' | 'filter' | 'page' = 'page'): void {
    this.page = page;
    if (mode === 'full') {
      this.pageLoading = true;
    } else if (mode === 'filter') {
      this.filterLoading = true;
    }
    withShimmerDelay(
      this.billing.listBills({
        q: this.query.trim(),
        from: this.from || undefined,
        to: this.to || undefined,
        page: this.page,
        limit: this.limit
      }),
      mode === 'full' || mode === 'filter' ? (mode === 'full' ? SHIMMER_MS : 280) : 0
    ).subscribe({
      next: (res) => {
        this.bills = res.items || [];
        this.page = res.page;
        this.pages = res.pages || 1;
        this.total = res.total || 0;
        this.pageLoading = false;
        this.filterLoading = false;
      },
      error: async () => {
        this.pageLoading = false;
        this.filterLoading = false;
        await this.alerts.error('Unable to load billing history.');
      }
    });
  }

  applyFilters(): void {
    this.load(1, 'filter');
  }

  prev(): void {
    if (this.page > 1) {
      this.load(this.page - 1, 'page');
    }
  }

  next(): void {
    if (this.page < this.pages) {
      this.load(this.page + 1, 'page');
    }
  }

  openDetail(bill: BillingBill): void {
    this.detailBill = bill;
    this.detailPayments = [];
    this.detailLoading = true;
    withShimmerDelay(this.billing.getBill(bill.id), SHIMMER_MS).subscribe({
      next: (res) => {
        this.detailBill = res.bill;
        this.detailPayments = res.payments || [];
        this.detailLoading = false;
      },
      error: async () => {
        this.detailLoading = false;
        await this.alerts.error('Unable to open bill detail.');
      }
    });
  }

  closeDetail(): void {
    this.detailBill = null;
    this.detailPayments = [];
  }

  statusClass(status: string): string {
    return `pill pill--${status || 'draft'}`;
  }
}
