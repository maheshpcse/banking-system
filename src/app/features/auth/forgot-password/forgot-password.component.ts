import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription, of } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { fieldError } from '../../../core/utils/form-errors';
import { SHIMMER_MS, withShimmerDelay } from '../../../core/utils/shimmer';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent implements OnInit, OnDestroy {
  pageLoading = true;
  loading = false;
  formError = '';
  form = this.fb.group({
    identifier: ['', [Validators.required, Validators.minLength(3)]]
  });

  readonly fieldError = fieldError;
  private formSub?: Subscription;

  constructor(
    private readonly fb: FormBuilder,
    private readonly auth: AuthService,
    private readonly alerts: AlertService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.formSub = this.form.valueChanges.subscribe(() => {
      if (this.formError) {
        this.formError = '';
      }
    });
    withShimmerDelay(of(true), SHIMMER_MS).subscribe(() => {
      this.pageLoading = false;
    });
  }

  ngOnDestroy(): void {
    this.formSub?.unsubscribe();
  }

  submit(): void {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.formError = '';
    const identifier = String(this.form.value.identifier || '').trim();

    this.auth.forgotPassword(identifier).subscribe({
      next: (res) => {
        this.loading = false;
        void this.router.navigate(['/auth/reset-password'], {
          state: {
            resetToken: res.resetToken,
            username: res.username,
            maskedEmail: res.maskedEmail
          }
        });
      },
      error: async (err) => {
        this.loading = false;
        const code = err?.error?.code;
        const message = err?.error?.message || 'Unable to verify that account.';
        if (code === 'ACCOUNT_BLOCKED' || code === 'ACCOUNT_DEACTIVATED') {
          const action = await this.alerts.accountRestricted({
            title: code === 'ACCOUNT_BLOCKED' ? 'Sign-in blocked' : 'Sign-in deactivated',
            text: message,
            supportEmail: err?.error?.supportEmail
          });
          if (action === 'contact') {
            void this.router.navigateByUrl(
              `/auth/contact-admin?identifier=${encodeURIComponent(identifier)}`
            );
          }
          return;
        }
        this.formError = message;
      }
    });
  }
}
