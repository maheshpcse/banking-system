import { Component, OnInit } from '@angular/core';
import { BillingService } from '../../../core/services/billing.service';
import { BillingSalesReport, BillingSalesReportRow } from '../../../core/models/banking.models';
import { AlertService } from '../../../core/services/alert.service';
import { SHIMMER_MS, withShimmerDelay } from '../../../core/utils/shimmer';

type Cadence = 'daily' | 'weekly' | 'biweekly' | 'monthly';
type RangePreset =
  | 'last_week'
  | 'last_month'
  | 'last_3_months'
  | 'last_6_months'
  | 'last_year'
  | 'custom';

@Component({
  selector: 'app-manager-sales-targets',
  templateUrl: './manager-sales-targets.component.html',
  styleUrls: ['./manager-shared.scss', './manager-sales-targets.component.scss']
})
export class ManagerSalesTargetsComponent implements OnInit {
  pageLoading = true;
  reportLoading = false;
  report: BillingSalesReport | null = null;

  cadence: Cadence = 'weekly';
  range: RangePreset = 'last_month';
  customFrom = '';
  customTo = '';

  readonly cadenceOptions: Array<{ value: Cadence; label: string }> = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'biweekly', label: 'Bi-weekly' },
    { value: 'monthly', label: 'Monthly' }
  ];

  readonly rangeOptions: Array<{ value: RangePreset; label: string }> = [
    { value: 'last_week', label: 'Last week' },
    { value: 'last_month', label: 'Last month' },
    { value: 'last_3_months', label: 'Last 3 months' },
    { value: 'last_6_months', label: 'Last 6 months' },
    { value: 'last_year', label: 'Last year' },
    { value: 'custom', label: 'Custom range' }
  ];

  constructor(private readonly billing: BillingService, private readonly alerts: AlertService) {}

  ngOnInit(): void {
    this.loadReport(true);
  }

  get productRows(): BillingSalesReportRow[] {
    return this.report?.productSales || [];
  }

  get customerRows(): BillingSalesReportRow[] {
    return this.report?.customerPurchases || [];
  }

  get totals(): BillingSalesReport['totals'] {
    return this.report?.totals || { revenue: 0, qty: 0, orderCount: 0 };
  }

  onCadenceChange(value: string): void {
    this.cadence = (value || 'weekly') as Cadence;
    this.loadReport(false);
  }

  onRangeChange(value: string): void {
    this.range = (value || 'last_month') as RangePreset;
    if (this.range === 'custom' && !this.customFrom && !this.customTo) {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 29);
      this.customTo = this.isoDay(end);
      this.customFrom = this.isoDay(start);
    }
    this.loadReport(false);
  }

  onCustomRangeChange(): void {
    if (this.range !== 'custom') {
      return;
    }
    this.loadReport(false);
  }

  exportCsv(): void {
    if (!this.report) {
      return;
    }
    const lines: string[] = [];
    lines.push('Section,Name,Qty,Revenue,OrderCount');
    this.productRows.forEach((row) => {
      lines.push(
        ['Product', this.csvCell(row.name), row.qty, row.revenue, row.orderCount].join(',')
      );
    });
    this.customerRows.forEach((row) => {
      lines.push(
        ['Customer', this.csvCell(row.name), row.qty, row.revenue, row.orderCount].join(',')
      );
    });
    lines.push(
      ['Totals', '', this.totals.qty, this.totals.revenue, this.totals.orderCount].join(',')
    );

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const stamp = this.isoDay(new Date());
    anchor.href = url;
    anchor.download = `novabill-sales-targets-${this.range}-${stamp}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private loadReport(initial: boolean): void {
    if (initial) {
      this.pageLoading = true;
    } else {
      this.reportLoading = true;
    }

    const query: { cadence: Cadence; range: RangePreset; from?: string; to?: string } = {
      cadence: this.cadence,
      range: this.range
    };
    if (this.range === 'custom') {
      query.from = this.customFrom;
      query.to = this.customTo;
    }

    withShimmerDelay(this.billing.getSalesReports(query), SHIMMER_MS).subscribe({
      next: (report) => {
        this.report = report;
        this.pageLoading = false;
        this.reportLoading = false;
      },
      error: async (err: { error?: { message?: string } }) => {
        this.pageLoading = false;
        this.reportLoading = false;
        await this.alerts.error(err?.error?.message || 'Unable to load sales target reports');
      }
    });
  }

  private csvCell(value: string): string {
    const raw = String(value || '');
    if (/[",\n]/.test(raw)) {
      return `"${raw.replace(/"/g, '""')}"`;
    }
    return raw;
  }

  private isoDay(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
