import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AccountService } from '../../../core/services/account.service';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { AccountSummary, Transaction } from '../../../core/models/banking.models';
import { withShimmerDelay } from '../../../core/utils/shimmer';

@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss']
})
export class OverviewComponent implements OnInit {
  loading = true;
  actionLoading = false;
  error = '';
  summary: AccountSummary | null = null;
  mode: 'deposit' | 'withdraw' = 'deposit';

  actionForm = this.fb.group({
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    description: ['']
  });

  constructor(
    private accountService: AccountService,
    private auth: AuthService,
    private fb: FormBuilder,
    private alerts: AlertService
  ) {}

  ngOnInit(): void {
    this.loadSummary();
  }

  loadSummary(): void {
    this.loading = true;
    withShimmerDelay(this.accountService.getSummary()).subscribe({
      next: (summary) => {
        this.summary = summary;
        this.auth.updateLocalUser(summary.user);
        this.loading = false;
      },
      error: async (err) => {
        this.error = err?.error?.message || 'Unable to load dashboard';
        this.loading = false;
        await this.alerts.error('Dashboard unavailable', this.error);
      }
    });
  }

  setMode(mode: 'deposit' | 'withdraw'): void {
    this.mode = mode;
    this.error = '';
  }

  async submitAction(): Promise<void> {
    if (this.actionForm.invalid) {
      this.actionForm.markAllAsTouched();
      return;
    }

    const amount = Number(this.actionForm.value.amount);
    const description = this.actionForm.value.description || undefined;
    const actionLabel = this.mode === 'deposit' ? 'Deposit' : 'Withdraw';

    const confirmed = await this.alerts.confirm({
      title: `${actionLabel} $${amount.toFixed(2)}?`,
      text:
        this.mode === 'deposit'
          ? 'Funds will be added to your available balance.'
          : 'Funds will be deducted from your available balance.',
      confirmText: actionLabel,
      cancelText: 'Cancel'
    });

    if (!confirmed) {
      return;
    }

    this.actionLoading = true;
    this.loading = true;
    this.error = '';

    const request =
      this.mode === 'deposit'
        ? this.accountService.deposit({ amount, description })
        : this.accountService.withdraw({ amount, description });

    withShimmerDelay(request).subscribe({
      next: async (res) => {
        this.actionLoading = false;
        this.actionForm.reset();
        this.auth.updateLocalUser(res.user);
        this.summary = null;
        await this.alerts.success(`${actionLabel} successful`, res.message);
        this.loadSummary();
      },
      error: async (err) => {
        this.actionLoading = false;
        this.loading = false;
        this.error = err?.error?.message || 'Action failed';
        await this.alerts.error(`${actionLabel} failed`, this.error);
      }
    });
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
