import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AccountService } from '../../../core/services/account.service';
import { AuthService } from '../../../core/services/auth.service';
import { AccountSummary, Transaction } from '../../../core/models/banking.models';

@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss']
})
export class OverviewComponent implements OnInit {
  loading = true;
  actionLoading = false;
  error = '';
  success = '';
  summary: AccountSummary | null = null;
  mode: 'deposit' | 'withdraw' = 'deposit';

  actionForm = this.fb.group({
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    description: ['']
  });

  constructor(
    private accountService: AccountService,
    private auth: AuthService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.loadSummary();
  }

  loadSummary(): void {
    this.loading = true;
    this.accountService.getSummary().subscribe({
      next: (summary) => {
        this.summary = summary;
        this.auth.updateLocalUser(summary.user);
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Unable to load dashboard';
        this.loading = false;
      }
    });
  }

  setMode(mode: 'deposit' | 'withdraw'): void {
    this.mode = mode;
    this.success = '';
    this.error = '';
  }

  submitAction(): void {
    if (this.actionForm.invalid) {
      this.actionForm.markAllAsTouched();
      return;
    }

    const amount = Number(this.actionForm.value.amount);
    const description = this.actionForm.value.description || undefined;
    this.actionLoading = true;
    this.error = '';
    this.success = '';

    const request =
      this.mode === 'deposit'
        ? this.accountService.deposit({ amount, description })
        : this.accountService.withdraw({ amount, description });

    request.subscribe({
      next: (res) => {
        this.actionLoading = false;
        this.success = res.message;
        this.actionForm.reset();
        this.auth.updateLocalUser(res.user);
        this.loadSummary();
      },
      error: (err) => {
        this.actionLoading = false;
        this.error = err?.error?.message || 'Action failed';
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
