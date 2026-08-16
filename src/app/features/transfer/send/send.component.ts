import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AccountService } from '../../../core/services/account.service';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { AccountLifecycleService } from '../../../core/services/account-lifecycle.service';
import { NotificationService } from '../../../core/services/notification.service';
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
    private alerts: AlertService,
    private lifecycle: AccountLifecycleService,
    private notifications: NotificationService
  ) {}

  get canTransfer(): boolean {
    return this.lifecycle.canMoveMoney(this.auth.currentUser);
  }

  ngOnInit(): void {
    of(true)
      .pipe(delay(500))
      .subscribe(() => {
        this.pageLoading = false;
      });
  }

  async submit(): Promise<void> {
    if (!this.canTransfer) {
      await this.alerts.warning('Your account number must be issued before transfers.');
      return;
    }
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
        this.notifications.push({
          kind: 'transfer',
          title: 'Transfer sent',
          body: `$${Number(amount).toFixed(2)} sent to ${toAccountNumber}.`,
          href: '/transactions',
          browserPush: true
        });
        await this.alerts.success(res.message || 'Transfer successful');
      },
      error: async (err) => {
        this.loading = false;
        // Modal only — do not bind API errors under the recipient field.
        await this.alerts.error(err?.error?.message || 'Transfer failed');
      }
    });
  }
}
