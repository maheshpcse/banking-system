import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AccountService } from '../../../core/services/account.service';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { withShimmerDelay } from '../../../core/utils/shimmer';

@Component({
  selector: 'app-send',
  templateUrl: './send.component.html',
  styleUrls: ['./send.component.scss']
})
export class SendComponent {
  loading = false;
  pageLoading = false;
  error = '';

  form = this.fb.group({
    toAccountNumber: ['', [Validators.required, Validators.minLength(6)]],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    description: ['']
  });

  constructor(
    private fb: FormBuilder,
    private accountService: AccountService,
    private auth: AuthService,
    private alerts: AlertService
  ) {}

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { toAccountNumber, amount, description } = this.form.getRawValue();
    const confirmed = await this.alerts.confirm({
      title: `Send $${Number(amount).toFixed(2)}?`,
      text: `Transfer to account ${toAccountNumber}. This cannot be undone.`,
      confirmText: 'Send transfer',
      cancelText: 'Cancel'
    });

    if (!confirmed) {
      return;
    }

    this.loading = true;
    this.pageLoading = true;
    this.error = '';

    withShimmerDelay(
      this.accountService.transfer({
        toAccountNumber: toAccountNumber!,
        amount: Number(amount),
        description: description || undefined
      })
    ).subscribe({
      next: async (res) => {
        this.loading = false;
        this.pageLoading = false;
        this.auth.updateLocalUser(res.user);
        this.form.reset();
        await this.alerts.success('Transfer successful', res.message);
      },
      error: async (err) => {
        this.loading = false;
        this.pageLoading = false;
        this.error = err?.error?.message || 'Transfer failed';
        await this.alerts.error('Transfer failed', this.error);
      }
    });
  }
}
