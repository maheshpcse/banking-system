import { Component, OnInit } from '@angular/core';
import Swal from 'sweetalert2';
import { BillingService } from '../../../core/services/billing.service';
import { BillingSalesReport, BillingSalesReportRow } from '../../../core/models/banking.models';
import { AlertService } from '../../../core/services/alert.service';
import { SHIMMER_MS, shimmerPause, withShimmerDelay } from '../../../core/utils/shimmer';

type Cadence = 'daily' | 'weekly' | 'biweekly' | 'monthly';
type RangePreset =
  | 'last_week'
  | 'last_month'
  | 'last_3_months'
  | 'last_6_months'
  | 'last_year'
  | 'custom';
type ViewMode = 'chart' | 'table';

@Component({
  selector: 'app-manager-sales-targets',
  templateUrl: './manager-sales-targets.component.html',
  styleUrls: ['./manager-shared.scss', './manager-sales-targets.component.scss']
})
export class ManagerSalesTargetsComponent implements OnInit {
  pageLoading = true;
  reportLoading = false;
  productPageLoading = false;
  customerPageLoading = false;
  report: BillingSalesReport | null = null;
  view: ViewMode = 'table';
  /** Tracks which body shimmer layout to show while filters refetch */
  shimmerView: ViewMode = 'table';

  cadence: Cadence = 'weekly';
  range: RangePreset = 'last_month';
  customFrom = '';
  customTo = '';

  readonly pageSize = 8;
  productPage = 1;
  customerPage = 1;

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

  private readonly barPalette = ['#5fc4b0', '#d4a017', '#2f8f7f', '#f59e0b', '#0f766e', '#b45309'];

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

  get productPages(): number {
    return Math.max(1, Math.ceil(this.productRows.length / this.pageSize));
  }

  get customerPages(): number {
    return Math.max(1, Math.ceil(this.customerRows.length / this.pageSize));
  }

  get pagedProductRows(): BillingSalesReportRow[] {
    const start = (this.productPage - 1) * this.pageSize;
    return this.productRows.slice(start, start + this.pageSize);
  }

  get pagedCustomerRows(): BillingSalesReportRow[] {
    const start = (this.customerPage - 1) * this.pageSize;
    return this.customerRows.slice(start, start + this.pageSize);
  }

  get seriesBars(): Array<{ name: string; revenue: number; qty: number; pct: number; color: string }> {
    const rows = this.report?.series || [];
    return this.toBars(
      rows.map((row) => ({
        name: row.label || row.key,
        qty: row.qty,
        revenue: row.revenue,
        orderCount: row.orderCount
      }))
    );
  }

  get seriesLinePath(): string {
    return this.buildLinePath(this.seriesBars);
  }

  get seriesAreaPath(): string {
    const line = this.seriesLinePath;
    return line ? `${line} L100,40 L0,40 Z` : '';
  }

  get productChartBars(): Array<{ name: string; revenue: number; qty: number; pct: number; color: string }> {
    return this.toBars(this.productRows.slice(0, 10));
  }

  get customerChartBars(): Array<{ name: string; revenue: number; qty: number; pct: number; color: string }> {
    return this.toBars(this.customerRows.slice(0, 10));
  }

  get productLinePath(): string {
    return this.buildLinePath(this.productChartBars);
  }

  get productAreaPath(): string {
    const line = this.productLinePath;
    return line ? `${line} L100,40 L0,40 Z` : '';
  }

  get customerLinePath(): string {
    return this.buildLinePath(this.customerChartBars);
  }

  get customerAreaPath(): string {
    const line = this.customerLinePath;
    return line ? `${line} L100,40 L0,40 Z` : '';
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

  toggleView(): void {
    this.view = this.view === 'chart' ? 'table' : 'chart';
    this.shimmerView = this.view;
    this.reportLoading = true;
    shimmerPause(SHIMMER_MS).subscribe(() => {
      this.reportLoading = false;
    });
  }

  prevProductPage(): void {
    if (this.productPage <= 1) {
      return;
    }
    this.flashProductPage(() => {
      this.productPage -= 1;
    });
  }

  nextProductPage(): void {
    if (this.productPage >= this.productPages) {
      return;
    }
    this.flashProductPage(() => {
      this.productPage += 1;
    });
  }

  prevCustomerPage(): void {
    if (this.customerPage <= 1) {
      return;
    }
    this.flashCustomerPage(() => {
      this.customerPage -= 1;
    });
  }

  nextCustomerPage(): void {
    if (this.customerPage >= this.customerPages) {
      return;
    }
    this.flashCustomerPage(() => {
      this.customerPage += 1;
    });
  }

  chartPointX(index: number, total: number): number {
    return (index * 100) / Math.max(1, total - 1);
  }

  chartPointY(revenue: number, bars: Array<{ revenue: number }>): number {
    const max = Math.max(1, ...bars.map((b) => b.revenue));
    return 38 - (revenue / max) * 32;
  }

  async exportCsv(): Promise<void> {
    if (!this.report) {
      return;
    }

    const hasRows = this.productRows.length > 0 || this.customerRows.length > 0;
    if (!hasRows) {
      await Swal.fire({
        title: 'No data found',
        html: `
          <div class="nb-export-empty">
            <svg viewBox="0 0 160 120" width="140" height="105" aria-hidden="true">
              <rect x="18" y="78" width="124" height="14" rx="5" fill="rgba(95,196,176,0.28)"/>
              <rect x="42" y="28" width="76" height="58" rx="10" fill="rgba(212,160,23,0.22)" stroke="rgba(212,160,23,0.45)"/>
              <path d="M52 28h28l8 10h30v-4a6 6 0 0 0-6-6H52z" fill="rgba(95,196,176,0.45)"/>
              <circle cx="80" cy="58" r="10" fill="rgba(15,118,110,0.35)"/>
              <path d="M74 58h12M80 52v12" stroke="#0f766e" stroke-width="3" stroke-linecap="round"/>
            </svg>
            <p>No paid product or customer rows for this cadence and range.</p>
          </div>
        `,
        confirmButtonText: 'OK',
        confirmButtonColor: '#5fc4b0',
        background: '#f7fbfe',
        color: '#1d2a36',
        allowOutsideClick: false,
        allowEscapeKey: false,
        customClass: {
          popup: 'nb-alert',
          confirmButton: 'nb-alert__confirm',
          title: 'nb-alert__title',
          htmlContainer: 'nb-alert__text'
        }
      });
      return;
    }

    const confirmed = await this.alerts.confirm({
      text: 'Export the current sales targets report as CSV?',
      confirmText: 'Export CSV',
      cancelText: 'Cancel',
      icon: 'question'
    });
    if (!confirmed) {
      return;
    }

    await Swal.fire({
      title: 'Exporting…',
      html: `
        <p class="nb-export-copy">Preparing NovaBill sales targets CSV</p>
        <div class="nb-export-progress" aria-hidden="true">
          <i class="nb-export-progress__fill" style="width:0%"></i>
        </div>
        <p class="nb-export-pct"><span data-export-pct>0</span>%</p>
      `,
      showConfirmButton: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
      background: '#f7fbfe',
      color: '#1d2a36',
      customClass: {
        popup: 'nb-alert',
        title: 'nb-alert__title',
        htmlContainer: 'nb-alert__text'
      },
      didOpen: (popup) => {
        popup.setAttribute('data-backdrop', 'static');
        const fill = popup.querySelector('.nb-export-progress__fill') as HTMLElement | null;
        const label = popup.querySelector('[data-export-pct]') as HTMLElement | null;
        let progress = 0;
        const tick = window.setInterval(() => {
          progress = Math.min(100, progress + Math.max(2, Math.round((100 - progress) * 0.12)));
          if (fill) {
            fill.style.width = `${progress}%`;
          }
          if (label) {
            label.textContent = String(progress);
          }
          if (progress >= 100) {
            window.clearInterval(tick);
            try {
              this.downloadCsv();
              void Swal.fire({
                icon: 'success',
                title: 'Success',
                text: 'Sales targets CSV downloaded.',
                confirmButtonText: 'Continue',
                confirmButtonColor: '#5fc4b0',
                background: '#f7fbfe',
                color: '#1d2a36',
                allowOutsideClick: false,
                allowEscapeKey: false,
                customClass: {
                  popup: 'nb-alert',
                  confirmButton: 'nb-alert__confirm',
                  title: 'nb-alert__title',
                  htmlContainer: 'nb-alert__text'
                }
              });
            } catch {
              void Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Unable to export sales targets CSV.',
                confirmButtonText: 'OK',
                confirmButtonColor: '#c45b6c',
                background: '#f7fbfe',
                color: '#1d2a36',
                allowOutsideClick: false,
                allowEscapeKey: false,
                customClass: {
                  popup: 'nb-alert',
                  confirmButton: 'nb-alert__confirm nb-alert__confirm--danger',
                  title: 'nb-alert__title',
                  htmlContainer: 'nb-alert__text'
                }
              });
            }
          }
        }, 40);
      }
    });
  }

  private downloadCsv(): void {
    if (!this.report) {
      throw new Error('No report');
    }
    const lines: string[] = [];
    lines.push('Section,Name,Qty,Revenue,OrderCount');
    this.productRows.forEach((row) => {
      lines.push(['Product', this.csvCell(row.name), row.qty, row.revenue, row.orderCount].join(','));
    });
    this.customerRows.forEach((row) => {
      lines.push(['Customer', this.csvCell(row.name), row.qty, row.revenue, row.orderCount].join(','));
    });
    lines.push(['Totals', '', this.totals.qty, this.totals.revenue, this.totals.orderCount].join(','));

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const stamp = this.isoDay(new Date());
    anchor.href = url;
    anchor.download = `novabill-sales-targets-${this.range}-${stamp}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private flashProductPage(mutate: () => void): void {
    this.productPageLoading = true;
    shimmerPause(SHIMMER_MS).subscribe(() => {
      mutate();
      this.productPageLoading = false;
    });
  }

  private flashCustomerPage(mutate: () => void): void {
    this.customerPageLoading = true;
    shimmerPause(SHIMMER_MS).subscribe(() => {
      mutate();
      this.customerPageLoading = false;
    });
  }

  private toBars(rows: BillingSalesReportRow[]): Array<{ name: string; revenue: number; qty: number; pct: number; color: string }> {
    const max = Math.max(1, ...rows.map((r) => r.revenue));
    return rows.map((row, i) => ({
      name: row.name,
      revenue: row.revenue,
      qty: row.qty,
      pct: Math.max(6, Math.round((row.revenue / max) * 100)),
      color: this.barPalette[i % this.barPalette.length]
    }));
  }

  private buildLinePath(bars: Array<{ revenue: number }>): string {
    if (!bars.length) {
      return '';
    }
    const max = Math.max(1, ...bars.map((b) => b.revenue));
    const stepX = 100 / Math.max(1, bars.length - 1);
    return bars
      .map((b, i) => {
        const x = i * stepX;
        const y = 38 - (b.revenue / max) * 32;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');
  }

  private loadReport(initial: boolean): void {
    if (initial) {
      this.pageLoading = true;
      this.shimmerView = this.view;
    } else {
      this.shimmerView = this.view;
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
        this.productPage = 1;
        this.customerPage = 1;
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
