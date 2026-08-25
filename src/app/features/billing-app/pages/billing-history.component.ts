import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertService } from '../../../core/services/alert.service';
import { BillingService } from '../../../core/services/billing.service';
import { BillingBill, BillingPayment, BillingPaymentStatus } from '../../../core/models/banking.models';
import { SHIMMER_MS, withShimmerDelay } from '../../../core/utils/shimmer';

type StatusFilter = '' | BillingPaymentStatus;

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
  statusFilter: StatusFilter = '';
  page = 1;
  pages = 1;
  total = 0;
  limit = 8;
  bills: BillingBill[] = [];
  detailBill: BillingBill | null = null;
  detailPayments: BillingPayment[] = [];
  detailLoading = false;
  detailLeaving = false;
  private detailTimer: ReturnType<typeof setTimeout> | null = null;

  readonly statusChips: Array<{ id: StatusFilter; label: string }> = [
    { id: '', label: 'All' },
    { id: 'draft', label: 'Bill Created' },
    { id: 'pending', label: 'Payment Pending' },
    { id: 'paid', label: 'Payment Success' },
    { id: 'error', label: 'Payment Error' },
    { id: 'failed', label: 'Payment Failure' }
  ];

  constructor(
    private readonly billing: BillingService,
    private readonly alerts: AlertService,
    private readonly router: Router
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
        paymentStatus: this.statusFilter || undefined,
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

  setStatusFilter(id: StatusFilter): void {
    if (this.statusFilter === id) {
      return;
    }
    this.statusFilter = id;
    this.load(1, 'filter');
  }

  applyFilters(): void {
    if (!this.query.trim() && !this.from && !this.to && !this.statusFilter) {
      void this.alerts.toastWarning(
        'Enter a filter',
        'Add a search term, date range, or status before filtering.'
      );
      return;
    }
    this.load(1, 'filter');
  }

  clearQuery(): void {
    this.query = '';
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
    if (this.detailTimer) {
      clearTimeout(this.detailTimer);
      this.detailTimer = null;
    }
    this.detailLeaving = false;
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
    if (!this.detailBill || this.detailLeaving) {
      return;
    }
    this.detailLeaving = true;
    this.detailTimer = setTimeout(() => {
      this.detailBill = null;
      this.detailPayments = [];
      this.detailLeaving = false;
      this.detailTimer = null;
    }, 200);
  }

  continueOnPos(bill: BillingBill): void {
    void this.router.navigate(['/billing/pos'], { queryParams: { billId: bill.id } });
  }

  canContinueOnPos(status: string): boolean {
    return status === 'draft' || status === 'pending' || status === 'failed' || status === 'error';
  }

  canDeleteBill(status: string): boolean {
    return status === 'draft' || status === 'pending' || status === 'failed' || status === 'error';
  }

  async deleteBill(bill: BillingBill, event?: Event): Promise<void> {
    event?.stopPropagation();
    if (!this.canDeleteBill(bill.paymentStatus)) {
      return;
    }
    const outcome = await this.alerts.confirmAction({
      text: `Delete ${bill.billNumber}? Stock will be restored and this invoice removed from history.`,
      confirmText: 'Delete invoice',
      loadingText: 'Deleting invoice…',
      action: () => withShimmerDelay(this.billing.deleteBill(bill.id), SHIMMER_MS),
      successMessage: (res) => res.message || 'Invoice deleted',
      errorMessage: (err) =>
        (err as { error?: { message?: string } })?.error?.message || 'Unable to delete invoice.'
    });
    if (!outcome.ok) {
      return;
    }
    if (this.detailBill?.id === bill.id) {
      this.detailBill = null;
      this.detailPayments = [];
      this.detailLeaving = false;
    }
    this.load(this.page, 'filter');
  }

  printInvoice(bill: BillingBill): void {
    const lines = bill.items
      .map(
        (i) =>
          `<tr><td>${i.name}</td><td>${i.quantity}</td><td>${i.unitPrice.toFixed(2)}</td><td>${i.lineTotal.toFixed(2)}</td></tr>`
      )
      .join('');
    const html = `<!doctype html><html><head><title>${bill.billNumber}</title>
      <style>body{font-family:system-ui,sans-serif;padding:24px;color:#16323a}
      h1{font-size:18px;margin:0 0 8px}table{width:100%;border-collapse:collapse;margin-top:16px}
      th,td{border-bottom:1px solid #d9e8e2;padding:8px;text-align:left;font-size:13px}
      .tot{margin-top:16px;font-weight:700}</style></head><body>
      <h1>Invoice ${bill.billNumber}</h1>
      <div>${bill.customerName}</div>
      <table><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
      <tbody>${lines}</tbody></table>
      <div class="tot">Grand total: ${bill.grandTotal.toFixed(2)} · ${bill.paymentStatus}</div>
      </body></html>`;
    const win = window.open('', '_blank', 'noopener,noreferrer,width=720,height=900');
    if (!win) {
      void this.alerts.warning('Allow pop-ups to print the invoice.');
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'draft':
        return 'Bill Created';
      case 'pending':
        return 'Payment Pending';
      case 'paid':
        return 'Payment Success';
      case 'error':
        return 'Payment Error';
      case 'failed':
        return 'Payment Failure';
      case 'refunded':
        return 'Refunded';
      default:
        return status || 'Unknown';
    }
  }

  statusClass(status: string): string {
    return `pill pill--${status || 'draft'}`;
  }

  statusReason(bill: BillingBill): string {
    const reason = String(bill.statusReason || '').trim();
    if (reason) {
      return reason;
    }
    if (bill.paymentStatus === 'error') {
      return 'Gateway error while processing payment.';
    }
    if (bill.paymentStatus === 'failed') {
      return 'Payment was declined or the payment window expired.';
    }
    return '';
  }
}
