import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AccountService } from '../../../core/services/account.service';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { ShellBootService } from '../../../core/services/shell-boot.service';
import { AccountLifecycleService } from '../../../core/services/account-lifecycle.service';
import { AccountApplication, AccountSummary, Transaction } from '../../../core/models/banking.models';
import { withShimmerDelay } from '../../../core/utils/shimmer';
import { fieldError } from '../../../core/utils/form-errors';
import { map } from 'rxjs/operators';

const ACCOUNT_REVEAL_MS = 3500;

@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss']
})
export class OverviewComponent implements OnInit, OnDestroy {
  loading = true;
  error = '';
  summary: AccountSummary | null = null;
  mode: 'deposit' | 'withdraw' = 'deposit';
  accountVisible = false;

  private accountHideTimer: ReturnType<typeof setTimeout> | null = null;

  actionForm = this.fb.group({
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    description: ['']
  });

  readonly fieldError = fieldError;

  constructor(
    private accountService: AccountService,
    private auth: AuthService,
    private fb: FormBuilder,
    private alerts: AlertService,
    private lifecycle: AccountLifecycleService,
    public shellBoot: ShellBootService
  ) {}

  get hasAccountNumber(): boolean {
    return this.lifecycle.hasAccountNumber(this.summary?.user);
  }

  get canMoveMoney(): boolean {
    return this.lifecycle.canMoveMoney(this.summary?.user);
  }

  get application(): AccountApplication | null {
    return this.lifecycle.applicationFor(this.summary?.user || null);
  }

  ngOnInit(): void {
    this.loadSummary(true);
  }

  ngOnDestroy(): void {
    this.clearAccountHideTimer();
  }

  /** Full-page shimmer only on initial boot / hard load */
  loadSummary(withPageShimmer = false): void {
    if (withPageShimmer) {
      this.loading = true;
    }
    const request$ = withPageShimmer
      ? withShimmerDelay(this.accountService.getSummary(), 500)
      : this.accountService.getSummary();

    request$.subscribe({
      next: (summary) => {
        this.summary = summary;
        this.auth.updateLocalUser(summary.user);
        this.loading = false;
        this.shellBoot.complete();
      },
      error: async (err) => {
        this.error = err?.error?.message || 'Unable to load dashboard';
        this.loading = false;
        this.shellBoot.complete();
        await this.alerts.error(this.error || 'Unable to load dashboard');
      }
    });
  }

  maskedAccountNumber(accountNumber: string | null | undefined): string {
    const value = String(accountNumber || '');
    if (value.length <= 4) {
      return value;
    }
    return `${'•'.repeat(value.length - 4)}${value.slice(-4)}`;
  }

  toggleAccountVisibility(): void {
    if (this.accountVisible) {
      this.hideAccountNumber();
      return;
    }
    this.accountVisible = true;
    this.clearAccountHideTimer();
    this.accountHideTimer = setTimeout(() => this.hideAccountNumber(), ACCOUNT_REVEAL_MS);
  }

  private hideAccountNumber(): void {
    this.accountVisible = false;
    this.clearAccountHideTimer();
  }

  private clearAccountHideTimer(): void {
    if (this.accountHideTimer) {
      clearTimeout(this.accountHideTimer);
      this.accountHideTimer = null;
    }
  }

  setMode(mode: 'deposit' | 'withdraw'): void {
    this.mode = mode;
    this.error = '';
  }

  async submitAction(): Promise<void> {
    if (!this.canMoveMoney) {
      await this.alerts.warning('Account number is required before deposit or withdraw.');
      return;
    }
    if (this.actionForm.invalid) {
      this.actionForm.markAllAsTouched();
      return;
    }

    const amount = Number(this.actionForm.value.amount);
    const description = this.actionForm.value.description || undefined;
    const actionLabel = this.mode === 'deposit' ? 'Deposit' : 'Withdraw';

    const outcome = await this.alerts.confirmAction({
      text:
        this.mode === 'deposit'
          ? `Deposit $${amount.toFixed(2)}? Funds will be added to your available balance.`
          : `Withdraw $${amount.toFixed(2)}? Funds will be deducted from your available balance.`,
      confirmText: actionLabel,
      cancelText: 'Cancel',
      loadingText: `${actionLabel} in progress…`,
      action: () =>
        (this.mode === 'deposit'
          ? this.accountService.deposit({ amount, description })
          : this.accountService.withdraw({ amount, description })
        ).pipe(map((res) => res)),
      successMessage: (res) => res.message || `${actionLabel} successful`,
      errorMessage: (err) =>
        (err as { error?: { message?: string } })?.error?.message || `${actionLabel} failed`
    });

    if (!outcome.ok) {
      return;
    }

    this.actionForm.reset();
    this.auth.updateLocalUser(outcome.result.user);
    // Soft refresh: update amounts + recent activity without page shimmer
    this.loadSummary(false);
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
