import { Component, OnDestroy, OnInit } from '@angular/core';
import { of, Subscription, interval } from 'rxjs';
import { AlertService } from '../../../core/services/alert.service';
import { NotificationService } from '../../../core/services/notification.service';
import { SHIMMER_MS, withShimmerDelay } from '../../../core/utils/shimmer';

type Cadence = 'daily' | 'weekly' | 'biweekly' | 'monthly';
type ReportScope = 'all' | 'custom';
type ReportDataset =
  | 'deposits'
  | 'withdrawals'
  | 'transfers'
  | 'openings'
  | 'blocked'
  | 'complaints'
  | 'settlements';

interface ReportColumnOption {
  id: string;
  label: string;
  dataset: ReportDataset;
}

interface ReportFilterState {
  status: string;
  accountType: string;
  minAmount: number | null;
  maxAmount: number | null;
  keyword: string;
}

export interface SavedReportSchedule {
  id: string;
  name: string;
  cadence: Cadence;
  scope: ReportScope;
  datasets: ReportDataset[];
  columns: string[];
  filters: ReportFilterState;
  runAt: string;
  expiresAt: string | null;
  autoFromFilters: boolean;
  savedAt: string;
  lastNotifiedExpiryAt?: string | null;
}

interface ReviewRow {
  dataset: string;
  column: string;
  filter: string;
  sample: string;
  included: boolean;
}

const SCHEDULE_KEY = 'nb.manager.reportSchedule.v2';
const LEGACY_SCHEDULE_KEY = 'nb.manager.reportSchedule';

@Component({
  selector: 'app-manager-reports',
  templateUrl: './manager-reports.component.html',
  styleUrls: ['./manager-shared.scss', './manager-reports.component.scss']
})
export class ManagerReportsComponent implements OnInit, OnDestroy {
  pageLoading = true;
  saving = false;
  reviewing = false;
  cadence: Cadence = 'weekly';
  scope: ReportScope = 'custom';
  scheduleName = '';
  runAt = '';
  expiresAt = '';
  autoFromFilters = true;
  selectedDatasets = new Set<ReportDataset>(['deposits', 'withdrawals', 'transfers']);
  selectedColumns = new Set<string>([
    'date',
    'amount',
    'account',
    'status',
    'counterparty'
  ]);
  filters: ReportFilterState = {
    status: 'all',
    accountType: 'all',
    minAmount: null,
    maxAmount: null,
    keyword: ''
  };
  schedules: SavedReportSchedule[] = [];
  reviewRows: ReviewRow[] = [];
  showReview = false;

  readonly cadenceOptions = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'biweekly', label: 'Bi-weekly' },
    { value: 'monthly', label: 'Monthly' }
  ];

  readonly scopeOptions = [
    { value: 'custom', label: 'Custom (filters + columns)' },
    { value: 'all', label: 'All available data' }
  ];

  readonly statusOptions = [
    { value: 'all', label: 'All statuses' },
    { value: 'posted', label: 'Posted' },
    { value: 'pending', label: 'Pending' },
    { value: 'failed', label: 'Failed' },
    { value: 'blocked', label: 'Blocked' }
  ];

  readonly accountTypeOptions = [
    { value: 'all', label: 'All account types' },
    { value: 'savings', label: 'Savings' },
    { value: 'current', label: 'Current' },
    { value: 'salary', label: 'Salary' }
  ];

  readonly datasetOptions: { id: ReportDataset; label: string; hint: string }[] = [
    { id: 'deposits', label: 'Deposits', hint: 'Inbound ledger credits' },
    { id: 'withdrawals', label: 'Withdrawals', hint: 'Cash and ATM outflows' },
    { id: 'transfers', label: 'Transfers', hint: 'Peer and internal moves' },
    { id: 'openings', label: 'Pending openings', hint: 'Accounts awaiting approval' },
    { id: 'blocked', label: 'Blocked accounts', hint: 'Restricted banking status' },
    { id: 'complaints', label: 'Complaint volume', hint: 'Billing dispute queue' },
    { id: 'settlements', label: 'Settlements', hint: 'Shared invoice references' }
  ];

  readonly columnOptions: ReportColumnOption[] = [
    { id: 'date', label: 'Date / time', dataset: 'deposits' },
    { id: 'amount', label: 'Amount', dataset: 'deposits' },
    { id: 'account', label: 'Account number', dataset: 'transfers' },
    { id: 'status', label: 'Status', dataset: 'openings' },
    { id: 'counterparty', label: 'Counterparty', dataset: 'transfers' },
    { id: 'reference', label: 'Reference', dataset: 'settlements' },
    { id: 'channel', label: 'Channel', dataset: 'withdrawals' },
    { id: 'note', label: 'Note', dataset: 'complaints' }
  ];

  private expirySub?: Subscription;

  constructor(
    private readonly alerts: AlertService,
    private readonly notifications: NotificationService
  ) {}

  ngOnInit(): void {
    this.schedules = this.readSchedules();
    this.seedDefaults();
    this.purgeExpired(true);
    this.expirySub = interval(30000).subscribe(() => this.purgeExpired(true));
    withShimmerDelay(of(true), SHIMMER_MS).subscribe(() => {
      this.pageLoading = false;
    });
  }

  ngOnDestroy(): void {
    this.expirySub?.unsubscribe();
  }

  get cadenceLabel(): string {
    return this.cadenceOptions.find((o) => o.value === this.cadence)?.label || this.cadence;
  }

  get activeScheduleCount(): number {
    return this.schedules.length;
  }

  get selectedDatasetLabels(): string {
    return this.datasetOptions
      .filter((d) => this.selectedDatasets.has(d.id))
      .map((d) => d.label)
      .join(', ');
  }

  isDatasetSelected(id: ReportDataset): boolean {
    return this.selectedDatasets.has(id);
  }

  toggleDataset(id: ReportDataset): void {
    if (this.selectedDatasets.has(id)) {
      if (this.selectedDatasets.size === 1) {
        return;
      }
      this.selectedDatasets.delete(id);
    } else {
      this.selectedDatasets.add(id);
    }
    if (this.autoFromFilters) {
      this.syncColumnsFromDatasets();
    }
  }

  isColumnSelected(id: string): boolean {
    return this.selectedColumns.has(id);
  }

  toggleColumn(id: string): void {
    if (this.selectedColumns.has(id)) {
      if (this.selectedColumns.size === 1) {
        return;
      }
      this.selectedColumns.delete(id);
    } else {
      this.selectedColumns.add(id);
    }
  }

  onAutoFromFiltersChange(value: boolean): void {
    this.autoFromFilters = value;
    if (value) {
      this.syncColumnsFromDatasets();
    }
  }

  buildReview(): void {
    this.reviewing = true;
    withShimmerDelay(of(this.composeReviewRows()), SHIMMER_MS).subscribe({
      next: (rows) => {
        this.reviewRows = rows;
        this.showReview = true;
        this.reviewing = false;
      },
      error: () => {
        this.reviewing = false;
      }
    });
  }

  async schedule(): Promise<void> {
    if (this.saving) {
      return;
    }
    if (!this.selectedDatasets.size) {
      await this.alerts.error('Select at least one data source to schedule.');
      return;
    }
    if (this.scope === 'custom' && !this.selectedColumns.size) {
      await this.alerts.error('Select at least one column for a custom schedule.');
      return;
    }
    if (!this.runAt) {
      await this.alerts.error('Choose a run date and time.');
      return;
    }
    const runMs = Date.parse(this.runAt);
    if (!Number.isFinite(runMs)) {
      await this.alerts.error('Run date and time is invalid.');
      return;
    }
    let expiresAt: string | null = null;
    if (this.expiresAt) {
      const expMs = Date.parse(this.expiresAt);
      if (!Number.isFinite(expMs)) {
        await this.alerts.error('Expiry date and time is invalid.');
        return;
      }
      if (expMs <= runMs) {
        await this.alerts.error('Expiry must be after the scheduled run time.');
        return;
      }
      if (expMs <= Date.now()) {
        await this.alerts.error('Expiry must be in the future.');
        return;
      }
      expiresAt = new Date(expMs).toISOString();
    }

    this.saving = true;
    const payload: SavedReportSchedule = {
      id: `rpt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      name: (this.scheduleName || `${this.cadenceLabel} report`).trim(),
      cadence: this.cadence,
      scope: this.scope,
      datasets: Array.from(this.selectedDatasets),
      columns:
        this.scope === 'all'
          ? this.columnOptions.map((c) => c.id)
          : Array.from(this.selectedColumns),
      filters: { ...this.filters },
      runAt: new Date(runMs).toISOString(),
      expiresAt,
      autoFromFilters: this.autoFromFilters,
      savedAt: new Date().toISOString(),
      lastNotifiedExpiryAt: null
    };

    withShimmerDelay(of(payload), SHIMMER_MS).subscribe({
      next: async (next) => {
        try {
          this.schedules = [next, ...this.schedules];
          this.persist();
          this.saving = false;
          this.showReview = true;
          this.reviewRows = this.composeReviewRows(next);
          await this.alerts.success(
            `Saved “${next.name}”. It stays until you clear it or it auto-expires.`
          );
          this.notifications.push({
            kind: 'system',
            title: 'Report schedule saved',
            body: `${next.name} · ${this.cadenceLabel} · runs ${new Date(next.runAt).toLocaleString()}`,
            href: '/manager/reports',
            browserPush: false
          });
        } catch {
          this.saving = false;
          await this.alerts.error('Unable to save schedule on this device.');
        }
      },
      error: async () => {
        this.saving = false;
        await this.alerts.error('Unable to save schedule.');
      }
    });
  }

  deleteSchedule(id: string): void {
    this.schedules = this.schedules.filter((s) => s.id !== id);
    this.persist();
  }

  clearAllSchedules(): void {
    this.schedules = [];
    localStorage.removeItem(SCHEDULE_KEY);
    localStorage.removeItem(LEGACY_SCHEDULE_KEY);
  }

  datasetLabel(id: ReportDataset | string): string {
    return this.datasetOptions.find((d) => d.id === id)?.label || String(id);
  }

  columnLabel(id: string): string {
    return this.columnOptions.find((c) => c.id === id)?.label || id;
  }

  filterSummary(filters: ReportFilterState): string {
    const parts: string[] = [];
    if (filters.status && filters.status !== 'all') {
      parts.push(`status=${filters.status}`);
    }
    if (filters.accountType && filters.accountType !== 'all') {
      parts.push(`type=${filters.accountType}`);
    }
    if (filters.minAmount != null) {
      parts.push(`min=${filters.minAmount}`);
    }
    if (filters.maxAmount != null) {
      parts.push(`max=${filters.maxAmount}`);
    }
    if (filters.keyword?.trim()) {
      parts.push(`q=${filters.keyword.trim()}`);
    }
    return parts.length ? parts.join(' · ') : 'No extra filters';
  }

  private seedDefaults(): void {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30, 0, 0);
    this.runAt = this.toLocalInput(now);
    const exp = new Date(now);
    exp.setDate(exp.getDate() + 30);
    this.expiresAt = this.toLocalInput(exp);
    this.scheduleName = `${this.cadenceLabel} desk digest`;
  }

  private syncColumnsFromDatasets(): void {
    const next = new Set<string>();
    for (const col of this.columnOptions) {
      if (this.selectedDatasets.has(col.dataset) || col.id === 'date' || col.id === 'amount') {
        next.add(col.id);
      }
    }
    if (!next.size) {
      next.add('date');
      next.add('amount');
    }
    this.selectedColumns = next;
  }

  private composeReviewRows(schedule?: SavedReportSchedule): ReviewRow[] {
    const datasets = schedule?.datasets || Array.from(this.selectedDatasets);
    const columns =
      schedule?.columns ||
      (this.scope === 'all'
        ? this.columnOptions.map((c) => c.id)
        : Array.from(this.selectedColumns));
    const filters = schedule?.filters || this.filters;
    const rows: ReviewRow[] = [];
    for (const dataset of datasets) {
      for (const column of columns) {
        rows.push({
          dataset: this.datasetLabel(dataset),
          column: this.columnLabel(column),
          filter: this.filterSummary(filters),
          sample: this.sampleValue(dataset, column),
          included: true
        });
      }
    }
    return rows.slice(0, 24);
  }

  private sampleValue(dataset: string, column: string): string {
    if (column === 'amount') {
      return '1,250.00';
    }
    if (column === 'account') {
      return 'MBxxxxxxxxxxxx';
    }
    if (column === 'status') {
      return dataset === 'blocked' ? 'blocked' : 'posted';
    }
    if (column === 'date') {
      return new Date().toLocaleString();
    }
    return '—';
  }

  private purgeExpired(notify: boolean): void {
    if (!this.schedules.length) {
      return;
    }
    const now = Date.now();
    const kept: SavedReportSchedule[] = [];
    let changed = false;
    for (const schedule of this.schedules) {
      if (!schedule.expiresAt) {
        kept.push(schedule);
        continue;
      }
      const exp = Date.parse(schedule.expiresAt);
      if (!Number.isFinite(exp) || exp > now) {
        kept.push(schedule);
        continue;
      }
      changed = true;
      if (notify && schedule.lastNotifiedExpiryAt !== schedule.expiresAt) {
        this.notifications.push({
          kind: 'system',
          title: 'Report schedule expired',
          body: `“${schedule.name}” expired and was removed automatically.`,
          href: '/manager/reports',
          browserPush: true
        });
      }
    }
    if (changed) {
      this.schedules = kept;
      this.persist();
    }
  }

  private persist(): void {
    localStorage.setItem(SCHEDULE_KEY, JSON.stringify(this.schedules));
  }

  private readSchedules(): SavedReportSchedule[] {
    try {
      const raw = localStorage.getItem(SCHEDULE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SavedReportSchedule[];
        if (Array.isArray(parsed)) {
          return parsed.filter((s) => s?.id && s?.cadence && s?.savedAt);
        }
      }
      const legacy = localStorage.getItem(LEGACY_SCHEDULE_KEY);
      if (legacy) {
        const old = JSON.parse(legacy) as { cadence?: Cadence; savedAt?: string };
        if (old?.cadence && old?.savedAt) {
          const migrated: SavedReportSchedule = {
            id: `legacy_${old.savedAt}`,
            name: `${old.cadence} report (migrated)`,
            cadence: old.cadence,
            scope: 'all',
            datasets: ['deposits', 'withdrawals', 'transfers'],
            columns: this.columnOptions.map((c) => c.id),
            filters: {
              status: 'all',
              accountType: 'all',
              minAmount: null,
              maxAmount: null,
              keyword: ''
            },
            runAt: old.savedAt,
            expiresAt: null,
            autoFromFilters: false,
            savedAt: old.savedAt,
            lastNotifiedExpiryAt: null
          };
          localStorage.setItem(SCHEDULE_KEY, JSON.stringify([migrated]));
          return [migrated];
        }
      }
    } catch {
      return [];
    }
    return [];
  }

  private toLocalInput(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
      date.getHours()
    )}:${pad(date.getMinutes())}`;
  }
}
