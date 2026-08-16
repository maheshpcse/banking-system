import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { TransactionService } from '../../../core/services/transaction.service';
import { AlertService } from '../../../core/services/alert.service';
import { Transaction } from '../../../core/models/banking.models';
import { withShimmerDelay } from '../../../core/utils/shimmer';

const HISTORY_TYPES = new Set(['deposit', 'withdraw', 'transfer_in', 'transfer_out']);

@Component({
  selector: 'app-history',
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.scss']
})
export class HistoryComponent implements OnInit, OnDestroy {
  /** Full-page shimmer only on first boot */
  pageLoading = true;
  /** Ledger-only shimmer when filtering / paging */
  listLoading = false;
  error = '';
  items: Transaction[] = [];
  page = 1;
  pages = 1;
  type = '';

  private querySub: Subscription | null = null;
  private bootstrapped = false;

  constructor(
    private transactionService: TransactionService,
    private alerts: AlertService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.querySub = this.route.queryParamMap.subscribe((params) => {
      const next = this.normalizeType(params.get('type'));
      const typeChanged = next !== this.type;
      this.type = next;

      if (!this.bootstrapped) {
        this.bootstrapped = true;
        this.load(1, true);
        return;
      }

      if (typeChanged) {
        this.load(1, false);
      }
    });
  }

  ngOnDestroy(): void {
    this.querySub?.unsubscribe();
  }

  load(page = 1, initial = false): void {
    if (initial) {
      this.pageLoading = true;
    } else {
      this.listLoading = true;
    }
    this.error = '';
    const request$ = initial
      ? withShimmerDelay(this.transactionService.list({ page, limit: 12, type: this.type || undefined }))
      : this.transactionService.list({ page, limit: 12, type: this.type || undefined });

    request$.subscribe({
      next: (res) => {
        this.items = res.items;
        this.page = res.pagination.page;
        this.pages = res.pagination.pages;
        this.pageLoading = false;
        this.listLoading = false;
      },
      error: async (err) => {
        this.error = err?.error?.message || 'Unable to load history';
        this.pageLoading = false;
        this.listLoading = false;
        await this.alerts.error(this.error || 'Unable to load history');
      }
    });
  }

  setType(type: string): void {
    const next = this.normalizeType(type);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: next ? { type: next } : {},
      replaceUrl: true
    });
  }

  prev(): void {
    if (this.page > 1) {
      this.load(this.page - 1, false);
    }
  }

  next(): void {
    if (this.page < this.pages) {
      this.load(this.page + 1, false);
    }
  }

  typeLabel(type: Transaction['type']): string {
    switch (type) {
      case 'deposit':
        return 'Deposit';
      case 'withdraw':
        return 'Withdrawal';
      case 'transfer_in':
        return 'Transfer in';
      case 'transfer_out':
        return 'Transfer out';
      default:
        return type;
    }
  }

  isCredit(type: Transaction['type']): boolean {
    return type === 'deposit' || type === 'transfer_in';
  }

  private normalizeType(raw: string | null | undefined): string {
    const value = String(raw || '');
    return HISTORY_TYPES.has(value) ? value : '';
  }
}
