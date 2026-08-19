import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { AdminAnalytics, AdminRequestRow, AdminService } from '../../../core/services/admin.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AlertService } from '../../../core/services/alert.service';
import { withShimmerDelay } from '../../../core/utils/shimmer';

export type FlowFilter = 'all' | 'deposit' | 'withdraw' | 'transfer';
export type FlowCategoryKey = 'deposit' | 'withdraw' | 'transfer';
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

  private readonly dayLabels = this.buildLast14Days();

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
      500
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
    this.filter = filter;
  }

  toggleView(): void {
    this.view = this.view === 'chart' ? 'table' : 'chart';
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
      // Donut trick: r=15.9155 makes circumference ≈ 100, so dasharray/offset
      // can be expressed directly as percentages. Offset 25 starts at 12 o'clock.
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
    return [base.deposit, base.withdraw, base.transfer];
  }

  get maxVolumeTotal(): number {
    return Math.max(1, ...this.volumeCategories.map((c) => c.total));
  }

  barHeightPct(category: VolumeCategory): number {
    return Math.round((category.total / this.maxVolumeTotal) * 100);
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

  private buildLast14Days(): string[] {
    const days: string[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      days.push(`${y}-${m}-${day}`);
    }
    return days;
  }
}
