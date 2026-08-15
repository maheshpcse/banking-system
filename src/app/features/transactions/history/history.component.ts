import { Component, OnInit } from '@angular/core';
import { TransactionService } from '../../../core/services/transaction.service';
import { AlertService } from '../../../core/services/alert.service';
import { Transaction } from '../../../core/models/banking.models';
import { withShimmerDelay } from '../../../core/utils/shimmer';

@Component({
  selector: 'app-history',
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.scss']
})
export class HistoryComponent implements OnInit {
  loading = true;
  error = '';
  items: Transaction[] = [];
  page = 1;
  pages = 1;
  type = '';

  constructor(
    private transactionService: TransactionService,
    private alerts: AlertService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(page = 1): void {
    this.loading = true;
    this.error = '';
    withShimmerDelay(
      this.transactionService.list({ page, limit: 12, type: this.type || undefined })
    ).subscribe({
      next: (res) => {
        this.items = res.items;
        this.page = res.pagination.page;
        this.pages = res.pagination.pages;
        this.loading = false;
      },
      error: async (err) => {
        this.error = err?.error?.message || 'Unable to load history';
        this.loading = false;
        await this.alerts.error(this.error || 'Unable to load history');
      }
    });
  }

  setType(type: string): void {
    this.type = type;
    this.load(1);
  }

  prev(): void {
    if (this.page > 1) {
      this.load(this.page - 1);
    }
  }

  next(): void {
    if (this.page < this.pages) {
      this.load(this.page + 1);
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
}
