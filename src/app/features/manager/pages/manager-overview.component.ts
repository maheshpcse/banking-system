import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { AdminAnalytics, AdminRequestRow, AdminService } from '../../../core/services/admin.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AlertService } from '../../../core/services/alert.service';
import { SHIMMER_MS, shimmerPause, withShimmerDelay } from '../../../core/utils/shimmer';

export type FlowFilter = 'all' | 'deposit' | 'withdraw' | 'transfer';
export type FlowCategoryKey = 'deposit' | 'withdraw' | 'transfer';
export type RangeFilter = 'week' | 'month' | 'quarter' | 'half' | 'custom';
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

  /** Server currently reports the trailing 14 days — longer ranges show all of it. */
  private static readonly AVAILABLE_DAYS = 14;

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

  constructor(
    private readonly admin: AdminService,
    private readonly notifications: NotificationService,
    private readonly alerts: AlertService
  ) {}

  ngOnInit(): void {
    withShimmerDelay(
      forkJoin({
        customers: this.admin.refreshCustomers(1, 5),
        requests: this.admin.refreshRequests(),
        analytics: this.admin.getAnalytics()
      }),
      SHIMMER_MS
    ).subscribe({
      next: ({ customers, requests, analytics }) => {
        this.customers = customers.pagination.total;
        this.pending = requests.filter((r: AdminRequestRow) => r.status === 'under_review').length;
        this.unread = this.notifications.unreadCount;
        this.analytics = analytics;
        this.pageLoading = false;
      },
      error: async (err: { error?: { message?: string } }) => {
        this.pageLoading = false;
        await this.alerts.error(err?.error?.message || 'Unable to load manager desk');
      }
    });
  }

  setFilter(filter: FlowFilter): void {
    if (this.filter === filter) {
      return;
    }
    this.filter = filter;
    this.flashFlow();
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
    this.flashFlow();
  }

  onCustomRangeChange(): void {
    this.flashFlow();
  }

  private flashFlow(): void {
    this.flowLoading = true;
    shimmerPause(SHIMMER_MS).subscribe(() => {
      this.flowLoading = false;
    });
  }

  get rangeLabel(): string {
    return this.rangeOptions.find((r) => r.id === this.range)?.label || 'Last 30 days';
  }

  /** True once the selected window exceeds the data the server currently reports. */
  get rangeExceedsAvailableData(): boolean {
    if (this.range === 'custom') {
      return this.dayLabels.length > ManagerOverviewComponent.AVAILABLE_DAYS;
    }
    const option = this.rangeOptions.find((r) => r.id === this.range);
    return (option?.days || 0) > ManagerOverviewComponent.AVAILABLE_DAYS;
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

  private get dayLabels(): string[] {
    if (this.range === 'custom' && this.customStart && this.customEnd) {
      return this.buildDayRange(this.customStart, this.customEnd);
    }
    const option = this.rangeOptions.find((r) => r.id === this.range);
    const days = Math.min(option?.days || 30, ManagerOverviewComponent.AVAILABLE_DAYS);
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
      return this.buildLastNDays(ManagerOverviewComponent.AVAILABLE_DAYS);
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
