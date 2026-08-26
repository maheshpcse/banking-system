import { Component, OnInit } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AdminAnalytics, AdminRequestRow, AdminService } from '../../../core/services/admin.service';
import { BillingService } from '../../../core/services/billing.service';
import { BillingDashboardStats, BillingSalesReport } from '../../../core/models/banking.models';
import { NotificationService } from '../../../core/services/notification.service';
import { AlertService } from '../../../core/services/alert.service';
import { SHIMMER_MS, shimmerPause, withShimmerDelay } from '../../../core/utils/shimmer';

export type FlowFilter = 'all' | 'deposit' | 'withdraw' | 'transfer';
export type FlowCategoryKey = 'deposit' | 'withdraw' | 'transfer';
export type RangeFilter = 'week' | 'month' | 'quarter' | 'half' | 'custom';
export type BillingPulseFilter = 'all' | 'draft' | 'pending' | 'paid' | 'error' | 'failed';
type ViewMode = 'chart' | 'table';

export interface VolumeCategory {
  key: FlowCategoryKey;
  label: string;
  color: string;
  total: number;
  count: number;
}

export interface DailyPoint {
  day: string;
  label: string;
  total: number;
}

export interface DailyGridRow {
  day: string;
  label: string;
  deposit: number;
  withdraw: number;
  transfer: number;
  total: number;
  count: number;
}

export interface DailyLedgerRow {
  day: string;
  label: string;
  key: FlowCategoryKey;
  typeLabel: string;
  total: number;
  count: number;
}

export interface DonutSegment {
  key: string;
  label: string;
  color: string;
  value: number;
  pct: number;
  dashArray: string;
  dashOffset: number;
}

function categoryForType(type: string): FlowCategoryKey | null {
  if (type === 'deposit') {
    return 'deposit';
  }
  if (type === 'withdraw') {
    return 'withdraw';
  }
  if (type === 'transfer_in' || type === 'transfer_out') {
    return 'transfer';
  }
  return null;
}

@Component({
  selector: 'app-manager-overview',
  templateUrl: './manager-overview.component.html',
  styleUrls: ['./manager-shared.scss', './manager-overview.component.scss']
})
export class ManagerOverviewComponent implements OnInit {
  pageLoading = true;
  /** Chart / table content shimmer when filters or range change */
  flowLoading = false;
  billingLoading = true;
  billingFlowLoading = false;
  billingStats: BillingDashboardStats | null = null;
  salesSummary: BillingSalesReport | null = null;
  salesSummaryLoading = true;
  salesChart: BillingSalesReport | null = null;
  salesChartLoading = true;
  salesChartCadence: 'daily' | 'weekly' | 'biweekly' | 'monthly' = 'weekly';
  salesChartRange:
    | 'last_week'
    | 'last_month'
    | 'last_3_months'
    | 'last_6_months' = 'last_month';

  readonly salesChartCadenceOptions: Array<{ value: string; label: string }> = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'biweekly', label: 'Bi-weekly' },
    { value: 'monthly', label: 'Monthly' }
  ];

  readonly salesChartRangeOptions: Array<{ value: string; label: string }> = [
    { value: 'last_week', label: 'Last week' },
    { value: 'last_month', label: 'Last month' },
    { value: 'last_3_months', label: 'Last 3 months' },
    { value: 'last_6_months', label: 'Last 6 months' }
  ];

  billingKpis: Array<{ label: string; display: string; pct: number; color: string }> = [];
  billingStatusBars: Array<{ id: BillingPulseFilter; label: string; count: number; color: string }> = [];
  billingView: ViewMode = 'chart';
  billingFilter: BillingPulseFilter = 'all';
  readonly flowTablePageSize = 8;
  readonly billingTablePageSize = 5;
  flowTablePage = 1;
  billingTablePage = 1;
  customers = 0;
  pending = 0;
  unread = 0;
  analytics: AdminAnalytics | null = null;
  filter: FlowFilter = 'all';
  view: ViewMode = 'chart';

  readonly filters: Array<{ id: FlowFilter; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'deposit', label: 'Deposits' },
    { id: 'withdraw', label: 'Withdrawals' },
    { id: 'transfer', label: 'Transfers' }
  ];

  readonly billingFilters: Array<{ id: BillingPulseFilter; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'draft', label: 'Bill Created' },
    { id: 'pending', label: 'Payment Pending' },
    { id: 'paid', label: 'Payment Success' },
    { id: 'error', label: 'Payment Error' },
    { id: 'failed', label: 'Payment Failure' }
  ];

  /** Preferred range options — server analytics accepts from/to filters. */
  range: RangeFilter = 'month';
  customStart = '';
  customEnd = '';

  readonly rangeOptions: Array<{ id: RangeFilter; label: string; days: number }> = [
    { id: 'week', label: 'Last one week', days: 7 },
    { id: 'month', label: 'Last 30 days', days: 30 },
    { id: 'quarter', label: 'Last 3 months', days: 90 },
    { id: 'half', label: 'Last 6 months', days: 180 },
    { id: 'custom', label: 'Custom range', days: 0 }
  ];

  get rangeSelectOptions(): Array<{ value: string; label: string }> {
    return this.rangeOptions.map((r) => ({ value: r.id, label: r.label }));
  }

  constructor(
    private readonly admin: AdminService,
    private readonly billing: BillingService,
    private readonly notifications: NotificationService,
    private readonly alerts: AlertService
  ) {}

  ngOnInit(): void {
    withShimmerDelay(
      forkJoin({
        customers: this.admin.refreshCustomers(1, 5),
        requests: this.admin.refreshRequests(),
        analytics: this.admin.getAnalytics(this.analyticsQuery()),
        billing: this.billing.getStats().pipe(catchError(() => of(null))),
        sales: this.billing
          .getSalesReports({ cadence: 'weekly', range: 'last_month' })
          .pipe(catchError(() => of(null)))
      }),
      SHIMMER_MS
    ).subscribe({
      next: ({ customers, requests, analytics, billing, sales }) => {
        this.customers = customers.pagination.total;
        this.pending = requests.filter((r: AdminRequestRow) => r.status === 'under_review').length;
        this.unread = this.notifications.unreadCount;
        this.analytics = analytics;
        this.billingStats = billing;
        this.salesSummary = sales;
        this.salesChart = sales;
        this.rebuildBillingPulse();
        this.billingLoading = false;
        this.salesSummaryLoading = false;
        this.salesChartLoading = false;
        this.pageLoading = false;
      },
      error: async (err: { error?: { message?: string } }) => {
        this.pageLoading = false;
        this.billingLoading = false;
        this.salesSummaryLoading = false;
        this.salesChartLoading = false;
        await this.alerts.error(err?.error?.message || 'Unable to load manager desk');
      }
    });
  }

  onSalesChartCadenceChange(value: string): void {
    this.salesChartCadence = (value || 'weekly') as typeof this.salesChartCadence;
    this.reloadSalesChart();
  }

  onSalesChartRangeChange(value: string): void {
    this.salesChartRange = (value || 'last_month') as typeof this.salesChartRange;
    this.reloadSalesChart();
  }

  get salesChartBars(): Array<{
    name: string;
    revenue: number;
    qty: number;
    pct: number;
    color: string;
  }> {
    const rows = (this.salesChart?.productSales || []).slice(0, 8);
    const max = Math.max(1, ...rows.map((r) => r.revenue));
    const palette = ['#5fc4b0', '#d4a017', '#2f8f7f', '#f59e0b', '#0f766e', '#b45309'];
    return rows.map((row, i) => ({
      name: row.name,
      revenue: row.revenue,
      qty: row.qty,
      pct: Math.max(6, Math.round((row.revenue / max) * 100)),
      color: palette[i % palette.length]
    }));
  }

  get salesChartLinePath(): string {
    const bars = this.salesChartBars;
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

  get salesChartAreaPath(): string {
    const line = this.salesChartLinePath;
    if (!line) {
      return '';
    }
    return `${line} L100,40 L0,40 Z`;
  }

  salesChartPointX(index: number): number {
    const n = this.salesChartBars.length;
    return (index * 100) / Math.max(1, n - 1);
  }

  salesChartPointY(revenue: number): number {
    const max = Math.max(1, ...this.salesChartBars.map((b) => b.revenue));
    return 38 - (revenue / max) * 32;
  }

  get salesChartRangeLabel(): string {
    return (
      this.salesChartRangeOptions.find((r) => r.value === this.salesChartRange)?.label ||
      'Last month'
    );
  }

  private reloadSalesChart(): void {
    this.salesChartLoading = true;
    withShimmerDelay(
      this.billing
        .getSalesReports({
          cadence: this.salesChartCadence,
          range: this.salesChartRange
        })
        .pipe(catchError(() => of(null))),
      SHIMMER_MS
    ).subscribe({
      next: (report) => {
        this.salesChart = report;
        this.salesChartLoading = false;
      },
      error: async (err: { error?: { message?: string } }) => {
        this.salesChartLoading = false;
        await this.alerts.error(err?.error?.message || 'Unable to reload sales chart');
      }
    });
  }

  private rebuildBillingPulse(): void {
    const s = this.billingStats;
    if (!s) {
      this.billingKpis = [];
      this.billingStatusBars = [];
      return;
    }
    const values = [
      { label: 'Total sales', value: s.totalSales, display: this.formatMoney(s.totalSales), color: '#5fc4b0' },
      { label: 'Orders', value: s.totalOrders, display: String(s.totalOrders), color: '#6aa8e8' },
      { label: 'Products', value: s.totalProducts, display: String(s.totalProducts), color: '#d4a017' },
      { label: 'Customers', value: s.totalCustomers, display: String(s.totalCustomers), color: '#c45b6c' }
    ];
    const max = Math.max(1, ...values.map((v) => v.value));
    this.billingKpis = values.map((v) => ({
      label: v.label,
      display: v.display,
      pct: Math.max(8, Math.round((v.value / max) * 100)),
      color: v.color
    }));

    const c = s.statusCounts || {};
    const allBars: Array<{ id: BillingPulseFilter; label: string; count: number; color: string }> = [
      { id: 'draft', label: 'Created', count: c.draft || 0, color: '#d97706' },
      { id: 'pending', label: 'Pending', count: c.pending || 0, color: '#f59e0b' },
      { id: 'paid', label: 'Success', count: c.paid || 0, color: '#059669' },
      { id: 'error', label: 'Error', count: c.error || 0, color: '#ea580c' },
      { id: 'failed', label: 'Failure', count: c.failed || 0, color: '#dc2626' }
    ];
    this.billingStatusBars =
      this.billingFilter === 'all' ? allBars : allBars.filter((b) => b.id === this.billingFilter);
  }

  get billingFilterLabel(): string {
    return this.billingFilters.find((f) => f.id === this.billingFilter)?.label || 'All';
  }

  get billingRecentRows(): BillingDashboardStats['recentBills'] {
    const items = this.billingStats?.recentBills || [];
    if (this.billingFilter === 'all') {
      return items;
    }
    return items.filter((b) => b.paymentStatus === this.billingFilter);
  }

  get billingRecentPages(): number {
    return Math.max(1, Math.ceil(this.billingRecentRows.length / this.billingTablePageSize));
  }

  get pagedBillingRecentRows(): BillingDashboardStats['recentBills'] {
    const start = (this.billingTablePage - 1) * this.billingTablePageSize;
    return this.billingRecentRows.slice(start, start + this.billingTablePageSize);
  }

  setBillingFilter(filter: BillingPulseFilter): void {
    if (this.billingFilter === filter) {
      return;
    }
    this.billingFilter = filter;
    this.billingTablePage = 1;
    this.flashBillingFlow();
  }

  prevBillingTable(): void {
    if (this.billingTablePage > 1) {
      this.billingTablePage -= 1;
    }
  }

  nextBillingTable(): void {
    if (this.billingTablePage < this.billingRecentPages) {
      this.billingTablePage += 1;
    }
  }

  toggleBillingView(): void {
    this.billingView = this.billingView === 'chart' ? 'table' : 'chart';
    this.flashBillingFlow();
  }

  private flashBillingFlow(): void {
    this.billingFlowLoading = true;
    shimmerPause(SHIMMER_MS).subscribe(() => {
      this.rebuildBillingPulse();
      this.billingFlowLoading = false;
    });
  }

  private formatMoney(n: number): string {
    return (Number(n) || 0).toLocaleString(undefined, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    });
  }

  setFilter(filter: FlowFilter): void {
    if (this.filter === filter) {
      return;
    }
    this.filter = filter;
    this.flowTablePage = 1;
    this.reloadAnalytics();
  }

  toggleView(): void {
    this.view = this.view === 'chart' ? 'table' : 'chart';
    this.flashFlow();
  }

  onRangeChange(value: string): void {
    this.range = (value || 'month') as RangeFilter;
    if (this.range === 'custom' && !this.customStart && !this.customEnd) {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 29);
      this.customEnd = this.isoDay(end);
      this.customStart = this.isoDay(start);
    }
    this.flowTablePage = 1;
    this.reloadAnalytics();
  }

  onCustomRangeChange(): void {
    this.flowTablePage = 1;
    this.reloadAnalytics();
  }

  get flowDailyPages(): number {
    const total =
      this.filter === 'all' ? this.dailyGridRows.length : this.dailyLedgerRows.length;
    return Math.max(1, Math.ceil(total / this.flowTablePageSize));
  }

  get pagedDailyGridRows(): DailyGridRow[] {
    const start = (this.flowTablePage - 1) * this.flowTablePageSize;
    return this.dailyGridRows.slice(start, start + this.flowTablePageSize);
  }

  get pagedDailyLedgerRows(): DailyLedgerRow[] {
    const start = (this.flowTablePage - 1) * this.flowTablePageSize;
    return this.dailyLedgerRows.slice(start, start + this.flowTablePageSize);
  }

  prevFlowTable(): void {
    if (this.flowTablePage > 1) {
      this.flowTablePage -= 1;
    }
  }

  nextFlowTable(): void {
    if (this.flowTablePage < this.flowDailyPages) {
      this.flowTablePage += 1;
    }
  }

  private flashFlow(): void {
    this.flowLoading = true;
    shimmerPause(SHIMMER_MS).subscribe(() => {
      this.flowLoading = false;
    });
  }

  private analyticsQuery(): { from?: string; to?: string; type?: string } {
    const days = this.dayLabels;
    const from = days[0];
    const to = days[days.length - 1];
    const type = this.filter === 'all' ? undefined : this.filter;
    return { from, to, type };
  }

  private reloadAnalytics(): void {
    this.flowLoading = true;
    const params = this.analyticsQuery();
    withShimmerDelay(this.admin.getAnalytics(params), SHIMMER_MS).subscribe({
      next: (analytics) => {
        this.analytics = analytics;
        this.flowLoading = false;
      },
      error: async (err: { error?: { message?: string } }) => {
        this.flowLoading = false;
        await this.alerts.error(err?.error?.message || 'Unable to reload analytics');
      }
    });
  }

  get rangeLabel(): string {
    return this.rangeOptions.find((r) => r.id === this.range)?.label || 'Last 30 days';
  }

  /** Soft empty-range notice when the selected window has no flow rows. */
  get rangeHasNoFlowData(): boolean {
    return !(this.analytics?.dailyFlow || []).length && !(this.analytics?.volumeByType || []).length;
  }

  isFilterActive(key: FlowCategoryKey): boolean {
    return this.filter === 'all' || this.filter === key;
  }

  get customerTotal(): number {
    return this.analytics?.customers.total || 0;
  }

  get customerDonut(): DonutSegment[] {
    const c = this.analytics?.customers;
    if (!c || c.total <= 0) {
      return [];
    }
    const other = Math.max(0, c.total - c.active - c.underReview - c.blocked);
    const raw: Array<{ key: string; label: string; value: number; color: string }> = [
      { key: 'active', label: 'Active', value: c.active, color: '#5fc4b0' },
      { key: 'underReview', label: 'Under review', value: c.underReview, color: '#d4a017' },
      { key: 'blocked', label: 'Blocked', value: c.blocked, color: '#c45b6c' },
      { key: 'other', label: 'Other', value: other, color: '#94a3b8' }
    ].filter((seg) => seg.value > 0);

    const total = c.total;
    let cumulativeBefore = 0;
    return raw.map((seg) => {
      const pct = (seg.value / total) * 100;
      const dashArray = `${pct} ${100 - pct}`;
      const dashOffset = 25 - cumulativeBefore;
      cumulativeBefore += pct;
      return {
        key: seg.key,
        label: seg.label,
        color: seg.color,
        value: seg.value,
        pct: Math.round(pct),
        dashArray,
        dashOffset
      };
    });
  }

  get volumeCategories(): VolumeCategory[] {
    const base: Record<FlowCategoryKey, VolumeCategory> = {
      deposit: { key: 'deposit', label: 'Deposits', color: '#5fc4b0', total: 0, count: 0 },
      withdraw: { key: 'withdraw', label: 'Withdrawals', color: '#6aa8e8', total: 0, count: 0 },
      transfer: { key: 'transfer', label: 'Transfers', color: '#d4a017', total: 0, count: 0 }
    };
    (this.analytics?.volumeByType || []).forEach((row) => {
      const cat = categoryForType(row.type);
      if (!cat) {
        return;
      }
      base[cat].total += row.total;
      base[cat].count += row.count;
    });
    const all = [base.deposit, base.withdraw, base.transfer];
    if (this.filter === 'all') {
      return all;
    }
    return all.filter((c) => c.key === this.filter);
  }

  get maxVolumeTotal(): number {
    return Math.max(1, ...this.volumeCategories.map((c) => c.total));
  }

  barHeightPct(category: VolumeCategory): number {
    return Math.round((category.total / this.maxVolumeTotal) * 100);
  }

  volumeSharePct(category: VolumeCategory): number {
    const sum = this.volumeCategories.reduce((acc, row) => acc + row.total, 0);
    if (sum <= 0) {
      return 0;
    }
    return Math.round((category.total / sum) * 100);
  }

  /** Table grid for All — only days with activity in the selected range. */
  get dailyGridRows(): DailyGridRow[] {
    const byDay = new Map<
      string,
      { deposit: number; withdraw: number; transfer: number; count: number }
    >();
    this.dayLabels.forEach((day) => {
      byDay.set(day, { deposit: 0, withdraw: 0, transfer: 0, count: 0 });
    });
    (this.analytics?.dailyFlow || []).forEach((row) => {
      const cat = categoryForType(row.type);
      const bucket = byDay.get(row.day);
      if (!cat || !bucket) {
        return;
      }
      bucket[cat] += row.total;
      bucket.count += row.count;
    });
    return this.dayLabels
      .map((day) => {
        const bucket = byDay.get(day) || { deposit: 0, withdraw: 0, transfer: 0, count: 0 };
        const total = bucket.deposit + bucket.withdraw + bucket.transfer;
        return {
          day,
          label: this.shortDayLabel(day),
          deposit: Math.round(bucket.deposit * 100) / 100,
          withdraw: Math.round(bucket.withdraw * 100) / 100,
          transfer: Math.round(bucket.transfer * 100) / 100,
          total: Math.round(total * 100) / 100,
          count: bucket.count
        };
      })
      .filter((row) => row.count > 0 || row.total > 0);
  }

  /** Table rows for a single type filter — only active days. */
  get dailyLedgerRows(): DailyLedgerRow[] {
    if (this.filter === 'all') {
      return [];
    }
    const byDay = new Map<string, { total: number; count: number }>();
    this.dayLabels.forEach((day) => byDay.set(day, { total: 0, count: 0 }));
    (this.analytics?.dailyFlow || []).forEach((row) => {
      const cat = categoryForType(row.type);
      const bucket = byDay.get(row.day);
      if (!cat || cat !== this.filter || !bucket) {
        return;
      }
      bucket.total += row.total;
      bucket.count += row.count;
    });
    return this.dayLabels
      .map((day) => {
        const bucket = byDay.get(day) || { total: 0, count: 0 };
        return {
          day,
          label: this.shortDayLabel(day),
          key: this.filter as FlowCategoryKey,
          typeLabel: this.filterLabel,
          total: Math.round(bucket.total * 100) / 100,
          count: bucket.count
        };
      })
      .filter((row) => row.count > 0 || row.total > 0);
  }

  private get dayLabels(): string[] {
    if (this.range === 'custom' && this.customStart && this.customEnd) {
      return this.buildDayRange(this.customStart, this.customEnd);
    }
    const option = this.rangeOptions.find((r) => r.id === this.range);
    const days = option?.days || 30;
    return this.buildLastNDays(days);
  }

  get dailyPoints(): DailyPoint[] {
    const totals = new Map<string, number>();
    this.dayLabels.forEach((day) => totals.set(day, 0));
    (this.analytics?.dailyFlow || []).forEach((row) => {
      const cat = categoryForType(row.type);
      if (!cat || !totals.has(row.day)) {
        return;
      }
      if (this.filter !== 'all' && this.filter !== cat) {
        return;
      }
      totals.set(row.day, (totals.get(row.day) || 0) + row.total);
    });
    return this.dayLabels.map((day) => ({
      day,
      label: this.shortDayLabel(day),
      total: Math.round((totals.get(day) || 0) * 100) / 100
    }));
  }

  get maxDailyTotal(): number {
    return Math.max(1, ...this.dailyPoints.map((p) => p.total));
  }

  get linePath(): string {
    const points = this.dailyPoints;
    if (!points.length) {
      return '';
    }
    const max = this.maxDailyTotal;
    const stepX = 100 / Math.max(1, points.length - 1);
    return points
      .map((p, i) => {
        const x = i * stepX;
        const y = 42 - (p.total / max) * 38 - 2;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');
  }

  get areaPath(): string {
    const line = this.linePath;
    if (!line) {
      return '';
    }
    return `${line} L100,42 L0,42 Z`;
  }

  pointX(index: number): number {
    const points = this.dailyPoints;
    const stepX = 100 / Math.max(1, points.length - 1);
    return index * stepX;
  }

  pointY(total: number): number {
    const max = this.maxDailyTotal;
    return 42 - (total / max) * 38 - 2;
  }

  get filterLabel(): string {
    return this.filters.find((f) => f.id === this.filter)?.label || 'All';
  }

  private shortDayLabel(day: string): string {
    const parsed = new Date(`${day}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return day;
    }
    return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  private buildLastNDays(n: number): string[] {
    const days: string[] = [];
    const now = new Date();
    for (let i = Math.max(0, n - 1); i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      days.push(this.isoDay(d));
    }
    return days;
  }

  private buildDayRange(startStr: string, endStr: string): string[] {
    const start = new Date(`${startStr}T00:00:00`);
    const end = new Date(`${endStr}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
      return this.buildLastNDays(30);
    }
    const days: string[] = [];
    const cursor = new Date(start);
    const maxSpan = 186;
    let guard = 0;
    while (cursor.getTime() <= end.getTime() && guard < maxSpan) {
      days.push(this.isoDay(cursor));
      cursor.setDate(cursor.getDate() + 1);
      guard += 1;
    }
    return days;
  }

  private isoDay(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
