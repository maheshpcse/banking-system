import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AccountService } from '../../../core/services/account.service';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { withShimmerDelay } from '../../../core/utils/shimmer';
import { fieldError } from '../../../core/utils/form-errors';
import { of } from 'rxjs';
import { delay } from 'rxjs/operators';

@Component({
  selector: 'app-send',
  templateUrl: './send.component.html',
  styleUrls: ['./send.component.scss']
})
export class SendComponent implements OnInit {
  loading = false;
  pageLoading = true;
  error = '';

  form = this.fb.group({
    toAccountNumber: ['', [Validators.required, Validators.minLength(6)]],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    description: ['']
  });

  readonly fieldError = fieldError;

  constructor(
    private fb: FormBuilder,
    private accountService: AccountService,
    private auth: AuthService,
    private alerts: AlertService
  ) {}

  ngOnInit(): void {
    // Page-layout shimmer: API response time (none) + 0.5s
    of(true)
      .pipe(delay(500))
      .subscribe(() => {
        this.pageLoading = false;
      });
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { toAccountNumber, amount, description } = this.form.getRawValue();
    const confirmed = await this.alerts.confirm({
      text: `Send $${Number(amount).toFixed(2)} to account ${toAccountNumber}? This cannot be undone.`,
      confirmText: 'Send transfer',
      cancelText: 'Cancel'
    });

    if (!confirmed) {
      return;
    }

    this.loading = true;
    this.error = '';

    withShimmerDelay(
      this.accountService.transfer({
        toAccountNumber: toAccountNumber!,
        amount: Number(amount),
        description: description || undefined
      }),
      500
    ).subscribe({
      next: async (res) => {
        this.loading = false;
        this.auth.updateLocalUser(res.user);
        this.form.reset();
        await this.alerts.success(res.message || 'Transfer successful');
      },
      error: async (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Transfer failed';
        await this.alerts.error(this.error);
      }
    });
  }
}
